import { LevelMap } from './LevelMap';
import { LevelLoader, RoomDataJson, WorldDataJson } from './LevelLoader';
import { ProceduralLevelMap } from './ProceduralLevelMap';
import { DifficultyLevel } from './ProceduralWorldGen';

export interface WorldEntry {
  id: string;
  name: string;
  description?: string;
  source: 'builtin' | 'custom';
  load: () => LevelMap;
  startingCoords?: { x: number; y: number };
}

// 1. Vite eager glob for all world manifests under @worlds/**/world.json
const modularManifests = import.meta.glob<WorldDataJson>('@worlds/**/world.json', {
  eager: true,
  import: 'default',
});

// 2. Vite eager glob for all rooms under @worlds/**/rooms/*.json
const allRoomsByPath = import.meta.glob<RoomDataJson>('@worlds/**/rooms/*.json', {
  eager: true,
  import: 'default',
});

// 3. Vite eager glob for all single-file worlds directly under @worlds/*.json
const singleFileWorldModules = import.meta.glob<WorldDataJson>('@worlds/*.json', {
  eager: true,
  import: 'default',
});

export class WorldRegistry {
  private static worlds: Map<string, WorldEntry> = new Map();
  private static initialized: boolean = false;

  /**
   * Automatically discovers and registers all worlds found in the worlds/ folder.
   * Pulls metadata (id, name, description, startingCoords) directly from JSON manifests.
   */
  private static initDefaults(): void {
    if (this.initialized) return;
    this.initialized = true;

    // A. Discover all world manifests under @worlds/**/world.json
    for (const [manifestPath, manifest] of Object.entries(modularManifests)) {
      if (!manifest || typeof manifest !== 'object' || !manifest.id) continue;

      const startingCoords = manifest.startingCoords
        ? (Array.isArray(manifest.startingCoords)
            ? { x: manifest.startingCoords[0], y: manifest.startingCoords[1] }
            : manifest.startingCoords)
        : { x: 0, y: 0 };

      // Case 1: Single-file bundle with inlined room objects
      if (
        Array.isArray(manifest.rooms) &&
        manifest.rooms.length > 0 &&
        typeof manifest.rooms[0] !== 'string'
      ) {
        this.registerWorld({
          id: manifest.id,
          name: manifest.title || manifest.id,
          description: manifest.description,
          source: 'builtin',
          load: () => LevelLoader.loadWorld(manifest),
          startingCoords,
        });
      } else {
        // Case 2: Modular world referencing external rooms
        const folderPath = manifestPath.replace(/world\.json$/, '');
        const roomsPrefix = `${folderPath}rooms/`;

        const worldRooms: RoomDataJson[] = [];
        for (const [roomPath, roomData] of Object.entries(allRoomsByPath)) {
          if (roomPath.startsWith(roomsPrefix) || (folderPath && roomPath.includes(folderPath))) {
            worldRooms.push(roomData);
          }
        }

        this.registerWorld({
          id: manifest.id,
          name: manifest.title || manifest.id,
          description: manifest.description,
          source: 'builtin',
          load: () => LevelLoader.loadWorld(manifest, worldRooms),
          startingCoords,
        });
      }
    }

    // B. Discover any single-file worlds directly under @worlds/*.json
    for (const [, bundle] of Object.entries(singleFileWorldModules)) {
      if (!bundle || typeof bundle !== 'object' || !bundle.id) continue;
      if (Array.isArray(bundle.rooms) && bundle.rooms.length > 0 && typeof bundle.rooms[0] !== 'string') {
        const startingCoords = bundle.startingCoords
          ? (Array.isArray(bundle.startingCoords)
              ? { x: bundle.startingCoords[0], y: bundle.startingCoords[1] }
              : bundle.startingCoords)
          : { x: 0, y: 0 };

        this.registerWorld({
          id: bundle.id,
          name: bundle.title || bundle.id,
          description: bundle.description,
          source: 'builtin',
          load: () => LevelLoader.loadWorld(bundle),
          startingCoords,
        });
      }
    }

    // C. Register built-in Infinite Procedural Void
    this.worlds.set('procedural', {
      id: 'procedural',
      name: 'Infinite Procedural Void (Endless)',
      description: 'Endless non-Euclidean sectors with procedural hazards, dynamic biomes, and escalating difficulty.',
      source: 'builtin',
      load: () => new ProceduralLevelMap('normal', 'HYPERFOLD'),
      startingCoords: { x: 0, y: 0 },
    });
  }

  public static createProceduralWorld(
    difficulty: DifficultyLevel = 'normal',
    seed: string | number = 'HYPERFOLD'
  ): WorldEntry {
    this.initDefaults();
    const entry: WorldEntry = {
      id: 'procedural',
      name: `Infinite Procedural Void [${difficulty.toUpperCase()}]`,
      description: `Endless non-Euclidean sectors on ${difficulty} difficulty (Seed: ${seed}).`,
      source: 'builtin',
      load: () => new ProceduralLevelMap(difficulty, seed),
      startingCoords: { x: 0, y: 0 },
    };
    this.worlds.set(entry.id, entry);
    return entry;
  }

  public static registerWorld(entry: WorldEntry): void {
    this.initDefaults();
    this.worlds.set(entry.id, entry);
  }

  public static getAvailableWorlds(): WorldEntry[] {
    this.initDefaults();
    return Array.from(this.worlds.values());
  }

  public static getWorld(id: string): WorldEntry | undefined {
    this.initDefaults();
    return this.worlds.get(id);
  }

  /**
   * Parses an arbitrary JSON string representing either a WorldDataJson bundle
   * or a single RoomDataJson file into a playable LevelMap.
   */
  public static loadWorldFromJsonString(jsonText: string): {
    map: LevelMap;
    title: string;
    startingCoords: { x: number; y: number };
  } {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err: any) {
      throw new Error(`Invalid JSON: ${err?.message || 'Syntax error'}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed JSON is not an object');
    }

    // Case A: Single-file world bundle with "rooms" array
    if (Array.isArray(parsed.rooms)) {
      const map = LevelLoader.loadWorld(parsed as WorldDataJson);
      let startingCoords = { x: 0, y: 0 };
      if (parsed.startingCoords) {
        startingCoords = Array.isArray(parsed.startingCoords)
          ? { x: parsed.startingCoords[0], y: parsed.startingCoords[1] }
          : { x: parsed.startingCoords.x, y: parsed.startingCoords.y };
      }
      return {
        map,
        title: parsed.title || parsed.id || 'Custom World',
        startingCoords,
      };
    }

    // Case B: Standalone single room with "grid" array
    if (Array.isArray(parsed.grid)) {
      const room = LevelLoader.parseRoom(parsed as RoomDataJson);
      const map = new LevelMap();
      map.addRoom(room);
      return {
        map,
        title: room.title || room.id || 'Custom Sector',
        startingCoords: { x: room.coords.x, y: room.coords.y },
      };
    }

    throw new Error(
      'JSON format not recognized: expected a World bundle (with "rooms") or a Sector (with "grid")'
    );
  }
}
