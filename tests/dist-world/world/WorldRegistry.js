"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldRegistry = void 0;
const fs = require("fs");
const path = require("path");
const LevelMap_1 = require("./LevelMap");
const LevelLoader_1 = require("./LevelLoader");
const ProceduralLevelMap_1 = require("./ProceduralLevelMap");

class WorldRegistry {
  static worlds = new Map();
  static initialized = false;

  static initDefaults() {
    if (this.initialized) return;
    this.initialized = true;

    const dataDir = path.resolve(__dirname, "../../../worlds");
    if (!fs.existsSync(dataDir)) return;

    const entries = fs.readdirSync(dataDir, { withFileTypes: true });

    // A. Discover worlds in subdirectories (directories with world.json)
    for (const ent of entries) {
      if (ent.isDirectory() && ent.name !== "schemas") {
        const manifestPath = path.join(dataDir, ent.name, "world.json");
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          const roomsDir = path.join(dataDir, ent.name, "rooms");
          const roomFiles = fs.existsSync(roomsDir) ? fs.readdirSync(roomsDir) : [];
          const rooms = roomFiles
            .filter((f) => f.endsWith(".json"))
            .map((f) => JSON.parse(fs.readFileSync(path.join(roomsDir, f), "utf8")));

          const startingCoords = manifest.startingCoords
            ? (Array.isArray(manifest.startingCoords)
                ? { x: manifest.startingCoords[0], y: manifest.startingCoords[1] }
                : manifest.startingCoords)
            : { x: 0, y: 0 };

          const isInlined = Array.isArray(manifest.rooms) && manifest.rooms.length > 0 && typeof manifest.rooms[0] !== "string";

          this.registerWorld({
            id: manifest.id,
            name: manifest.title || manifest.id,
            description: manifest.description,
            source: "builtin",
            load: () => isInlined
              ? LevelLoader_1.LevelLoader.loadWorld(manifest)
              : LevelLoader_1.LevelLoader.loadWorld(manifest, rooms),
            startingCoords,
          });
        }
      } else if (ent.isFile() && ent.name.endsWith(".json")) {
        // B. Discover single-file worlds directly in data/
        const filePath = path.join(dataDir, ent.name);
        try {
          const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
          if (Array.isArray(parsed.rooms) && parsed.rooms.length > 0 && typeof parsed.rooms[0] !== "string") {
            const startingCoords = parsed.startingCoords
              ? (Array.isArray(parsed.startingCoords)
                  ? { x: parsed.startingCoords[0], y: parsed.startingCoords[1] }
                  : parsed.startingCoords)
              : { x: 0, y: 0 };

            this.registerWorld({
              id: parsed.id,
              name: parsed.title || parsed.id,
              description: parsed.description,
              source: "builtin",
              load: () => LevelLoader_1.LevelLoader.loadWorld(parsed),
              startingCoords,
            });
          }
        } catch {}
      }
    }

    // C. Register built-in Infinite Procedural Void
    this.worlds.set('procedural', {
      id: 'procedural',
      name: 'Infinite Procedural Void (Endless)',
      description: 'Endless non-Euclidean sectors with procedural hazards, dynamic biomes, and escalating difficulty.',
      source: 'builtin',
      load: () => new ProceduralLevelMap_1.ProceduralLevelMap('normal', 'HYPERFOLD'),
      startingCoords: { x: 0, y: 0 },
    });
  }

  static createProceduralWorld(difficulty = 'normal', seed = 'HYPERFOLD') {
    this.initDefaults();
    const entry = {
      id: 'procedural',
      name: `Infinite Procedural Void [${difficulty.toUpperCase()}]`,
      description: `Endless non-Euclidean sectors on ${difficulty} difficulty (Seed: ${seed}).`,
      source: 'builtin',
      load: () => new ProceduralLevelMap_1.ProceduralLevelMap(difficulty, seed),
      startingCoords: { x: 0, y: 0 },
    };
    this.worlds.set(entry.id, entry);
    return entry;
  }

  static registerWorld(entry) {
    this.initDefaults();
    this.worlds.set(entry.id, entry);
  }

  static getAvailableWorlds() {
    this.initDefaults();
    return Array.from(this.worlds.values());
  }

  static getWorld(id) {
    this.initDefaults();
    return this.worlds.get(id);
  }

  static loadWorldFromJsonString(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      throw new Error(`Invalid JSON: ${err?.message || 'Syntax error'}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed JSON is not an object');
    }

    if (Array.isArray(parsed.rooms)) {
      const map = LevelLoader_1.LevelLoader.loadWorld(parsed);
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

    if (Array.isArray(parsed.grid)) {
      const room = LevelLoader_1.LevelLoader.parseRoom(parsed);
      const map = new LevelMap_1.LevelMap();
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
exports.WorldRegistry = WorldRegistry;
