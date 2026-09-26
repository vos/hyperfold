import {
  GRID_COLS,
  GRID_ROWS,
  ScreenData,
  TileType,
  RoomExits,
  ExitDirection,
  ExitGateConfig,
  getGateColor,
  BouncePadConfig,
  SpikeConfig,
  CollectibleData,
  getSpikeDirection,
  glyphToTileType,
  tileTypeToGlyph,
  getGlyphSpikeDirection,
} from './ScreenData';
import type { RoomData, WorldManifest } from '../../shared/index.ts';
import { LevelMap } from './LevelMap';

export type RoomDataJson = RoomData;
export type WorldDataJson = WorldManifest;

export class LevelLoader {
  /**
   * Parses a declarative JSON room definition into a runtime ScreenData structure.
   */
  public static parseRoom(data: RoomData): ScreenData {
    if (!data.grid || data.grid.length !== GRID_ROWS) {
      throw new Error(`Room ${data.id} grid must contain exactly ${GRID_ROWS} rows, got ${data.grid?.length}`);
    }

    const tiles: TileType[][] = [];
    const spikeProps: Record<string, SpikeConfig> = { ...(data.spikeProps || {}) };
    const bounceProps: Record<string, BouncePadConfig> = { ...(data.bounceProps || {}) };

    for (let r = 0; r < GRID_ROWS; r++) {
      const rowStr = data.grid[r];
      if (rowStr.length !== GRID_COLS) {
        throw new Error(
          `Room ${data.id} row ${r} must contain exactly ${GRID_COLS} characters, got ${rowStr.length} ("${rowStr}")`
        );
      }
      tiles[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const ch = rowStr[c];
        const key = `${r},${c}`;
        tiles[r][c] = glyphToTileType(ch);
        const spikeDir = getGlyphSpikeDirection(ch);
        if (spikeDir && !spikeProps[key]) {
          spikeProps[key] = { direction: spikeDir };
        }
      }
    }

    const coords = Array.isArray(data.coords)
      ? { x: data.coords[0], y: data.coords[1] }
      : { x: (data.coords as any).x, y: (data.coords as any).y };

    let spawnPoint: { x: number; y: number } | undefined;
    if (data.spawnPoint) {
      spawnPoint = Array.isArray(data.spawnPoint)
        ? { x: data.spawnPoint[0], y: data.spawnPoint[1] }
        : { x: (data.spawnPoint as any).x, y: (data.spawnPoint as any).y };
    }

    const exits: RoomExits = {
      left: false,
      right: false,
      up: false,
      down: false,
    };
    const gates: Partial<Record<ExitDirection, ExitGateConfig>> = {};
    const dirs: ExitDirection[] = ['left', 'right', 'up', 'down'];

    if (data.exits) {
      for (const d of dirs) {
        const val = (data.exits as any)[d];
        if (typeof val === 'boolean') {
          exits[d] = val;
        } else if (typeof val === 'string' && val.trim().length > 0) {
          const gate: ExitGateConfig = {
            id: val.trim(),
            color: getGateColor(val.trim()),
          };
          gates[d] = gate;
          exits[d] = gate;
        } else if (typeof val === 'object' && val !== null && val.id) {
          const gate: ExitGateConfig = {
            id: val.id,
            color: getGateColor(val.id, val.color),
            label: val.label,
          };
          gates[d] = gate;
          exits[d] = gate;
        }
      }
    }

    // Optional legacy fallback if top-level gates/closedExits were supplied:
    const legacyGates = (data as any).gates || (data as any).closedExits;
    if (legacyGates) {
      if (Array.isArray(legacyGates)) {
        for (const g of legacyGates) {
          if (g && g.direction && g.id) {
            const gate: ExitGateConfig = {
              id: g.id,
              color: getGateColor(g.id, g.color),
              label: g.label,
            };
            const dir = g.direction as ExitDirection;
            gates[dir] = gate;
            exits[dir] = gate;
          }
        }
      } else if (typeof legacyGates === 'object') {
        for (const d of dirs) {
          const g = (legacyGates as any)[d];
          if (typeof g === 'string' && g.trim().length > 0) {
            const gate: ExitGateConfig = {
              id: g.trim(),
              color: getGateColor(g.trim()),
            };
            gates[d] = gate;
            exits[d] = gate;
          } else if (typeof g === 'object' && g !== null && g.id) {
            const gate: ExitGateConfig = {
              id: g.id,
              color: getGateColor(g.id, g.color),
              label: g.label,
            };
            gates[d] = gate;
            exits[d] = gate;
          }
        }
      }
    }

    const collectibles: CollectibleData[] = (data.collectibles || []).map((c: any) => {
      const x = c.pos ? c.pos[0] : (c.x ?? 0);
      const y = c.pos ? c.pos[1] : (c.y ?? 0);
      return {
        id: c.id,
        type: c.type,
        x,
        y,
        collected: c.collected ?? false,
        color: c.color || (c.type === 'key' ? getGateColor(c.id) : undefined),
        label: c.label,
      };
    });

    const room: ScreenData = {
      id: data.id,
      coords,
      title: data.title,
      subtitle: data.subtitle,
      themeColor: data.themeColor,
      accentColor: data.accentColor,
      tiles,
      exits,
      gates: Object.keys(gates).length > 0 ? gates : undefined,
      collectibles,
      spawnPoint,
      bounceProps: Object.keys(bounceProps).length > 0 ? bounceProps : undefined,
      spikeProps: Object.keys(spikeProps).length > 0 ? spikeProps : undefined,
      movingPlatforms: data.movingPlatforms && data.movingPlatforms.length > 0 ? [...data.movingPlatforms] : undefined,
      laserBarriers: data.laserBarriers && data.laserBarriers.length > 0 ? [...data.laserBarriers] : undefined,
      laserTurrets: data.laserTurrets && data.laserTurrets.length > 0 ? [...data.laserTurrets] : undefined,
      portals: data.portals && data.portals.length > 0 ? [...data.portals] : undefined,
    };

    return room;
  }

  /**
   * Loads a complete LevelMap from either:
   * 1. A single-file world bundle where world.rooms contains RoomData objects.
   * 2. A modular world manifest where modularRooms contains the loaded room files.
   */
  public static loadWorld(world: WorldManifest, modularRooms?: RoomData[]): LevelMap {
    const map = new LevelMap();
    let roomsToLoad: RoomData[] = [];

    if (modularRooms && modularRooms.length > 0) {
      roomsToLoad = modularRooms;
    } else {
      // Single-file world bundle: rooms are inlined in world.rooms
      for (const item of world.rooms) {
        if (typeof item === 'string') {
          throw new Error(
            `World ${world.id} contains string room reference '${item}', but no modularRooms were supplied to LevelLoader.loadWorld()`
          );
        }
        roomsToLoad.push(item);
      }
    }

    for (const roomData of roomsToLoad) {
      const room = LevelLoader.parseRoom(roomData);
      map.addRoom(room);
    }

    return map;
  }

  /**
   * Encodes a runtime ScreenData object into a 20x20 ASCII string grid.
   * Useful for serialization and tools/editors.
   */
  public static encodeRoomToGrid(room: ScreenData): string[] {
    const lines: string[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      let rowChars = '';
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = room.tiles[r][c];
        const key = `${r},${c}`;
        const dir = room.spikeProps?.[key]?.direction || getSpikeDirection(room, r, c);
        rowChars += tileTypeToGlyph(tile, dir);
      }
      lines.push(rowChars);
    }
    return lines;
  }
}
