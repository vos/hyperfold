import {
  COLS,
  ROWS,
  ScreenData,
  TileType,
  RoomExits,
  ExitDirection,
  ExitGateConfig,
  getGateColor,
  BouncePadConfig,
  SpikeConfig,
  MovingPlatformConfig,
  LaserBarrierConfig,
  LaserTurretConfig,
  CollectibleData,
  getSpikeDirection,
} from './ScreenData';
import { LevelMap } from './LevelMap';

export interface RoomDataJson {
  $schema?: string;
  id: string;
  coords: [number, number] | { x: number; y: number };
  title: string;
  subtitle?: string;
  themeColor: string;
  accentColor: string;
  exits: RoomExits | Record<string, any>;
  spawnPoint?: [number, number] | { x: number; y: number };
  grid: string[];
  collectibles?: Array<{
    id: string;
    type: 'core' | 'prism' | 'key';
    x?: number;
    y?: number;
    pos?: [number, number];
    collected?: boolean;
    color?: string;
    label?: string;
  }>;
  bounceProps?: Record<string, BouncePadConfig>;
  spikeProps?: Record<string, SpikeConfig>;
  movingPlatforms?: MovingPlatformConfig[];
  laserBarriers?: LaserBarrierConfig[];
  laserTurrets?: LaserTurretConfig[];
}

export interface WorldDataJson {
  $schema?: string;
  id: string;
  title: string;
  description?: string;
  startingCoords?: [number, number] | { x: number; y: number };
  rooms: Array<string | RoomDataJson>;
}

export class LevelLoader {
  /**
   * Parses a declarative JSON room definition into a runtime ScreenData structure.
   */
  public static parseRoom(data: RoomDataJson): ScreenData {
    if (!data.grid || data.grid.length !== ROWS) {
      throw new Error(`Room ${data.id} grid must contain exactly ${ROWS} rows, got ${data.grid?.length}`);
    }

    const tiles: number[][] = [];
    const spikeProps: Record<string, SpikeConfig> = { ...(data.spikeProps || {}) };
    const bounceProps: Record<string, BouncePadConfig> = { ...(data.bounceProps || {}) };

    for (let r = 0; r < ROWS; r++) {
      const rowStr = data.grid[r];
      if (rowStr.length !== COLS) {
        throw new Error(
          `Room ${data.id} row ${r} must contain exactly ${COLS} characters, got ${rowStr.length} ("${rowStr}")`
        );
      }
      tiles[r] = [];
      for (let c = 0; c < COLS; c++) {
        const ch = rowStr[c];
        const key = `${r},${c}`;
        switch (ch) {
          case '#':
            tiles[r][c] = TileType.SOLID;
            break;
          case '=':
          case '-':
            tiles[r][c] = TileType.ONE_WAY;
            break;
          case '^':
            tiles[r][c] = TileType.SPIKE;
            if (!spikeProps[key]) spikeProps[key] = { direction: 'up' };
            break;
          case 'v':
            tiles[r][c] = TileType.SPIKE;
            if (!spikeProps[key]) spikeProps[key] = { direction: 'down' };
            break;
          case '<':
            tiles[r][c] = TileType.SPIKE;
            if (!spikeProps[key]) spikeProps[key] = { direction: 'left' };
            break;
          case '>':
            tiles[r][c] = TileType.SPIKE;
            if (!spikeProps[key]) spikeProps[key] = { direction: 'right' };
            break;
          case 'S':
            tiles[r][c] = TileType.SPIKE;
            break;
          case 'B':
            tiles[r][c] = TileType.BOUNCE;
            break;
          case 'C':
            tiles[r][c] = TileType.CRUMBLE;
            break;
          case 'G':
            tiles[r][c] = TileType.GOAL;
            break;
          case '.':
          case ' ':
            tiles[r][c] = TileType.EMPTY;
            break;
          default:
            throw new Error(`Room ${data.id} contains unrecognized tile glyph '${ch}' at row ${r}, col ${c}`);
        }
      }
    }

    const coords = Array.isArray(data.coords)
      ? { x: data.coords[0], y: data.coords[1] }
      : { x: data.coords.x, y: data.coords.y };

    let spawnPoint: { x: number; y: number } | undefined;
    if (data.spawnPoint) {
      spawnPoint = Array.isArray(data.spawnPoint)
        ? { x: data.spawnPoint[0], y: data.spawnPoint[1] }
        : { x: data.spawnPoint.x, y: data.spawnPoint.y };
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

    const collectibles: CollectibleData[] = (data.collectibles || []).map((c) => {
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
    };

    return room;
  }

  /**
   * Loads a complete LevelMap from either:
   * 1. A single-file world bundle where world.rooms contains RoomDataJson objects.
   * 2. A modular world manifest where modularRooms contains the loaded room files.
   */
  public static loadWorld(world: WorldDataJson, modularRooms?: RoomDataJson[]): LevelMap {
    const map = new LevelMap();
    let roomsToLoad: RoomDataJson[] = [];

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
    for (let r = 0; r < ROWS; r++) {
      let rowChars = '';
      for (let c = 0; c < COLS; c++) {
        const tile = room.tiles[r][c];
        const key = `${r},${c}`;
        switch (tile) {
          case TileType.SOLID:
            rowChars += '#';
            break;
          case TileType.ONE_WAY:
            rowChars += '=';
            break;
          case TileType.BOUNCE:
            rowChars += 'B';
            break;
          case TileType.CRUMBLE:
            rowChars += 'C';
            break;
          case TileType.GOAL:
            rowChars += 'G';
            break;
          case TileType.SPIKE: {
            const dir = room.spikeProps?.[key]?.direction || getSpikeDirection(room, r, c);
            if (dir === 'up') rowChars += '^';
            else if (dir === 'down') rowChars += 'v';
            else if (dir === 'left') rowChars += '<';
            else if (dir === 'right') rowChars += '>';
            else rowChars += '^';
            break;
          }
          case TileType.EMPTY:
          default:
            rowChars += ' ';
            break;
        }
      }
      lines.push(rowChars);
    }
    return lines;
  }
}

