import {
  GRID_COLS,
  GRID_ROWS,
} from '../types/world.ts';
import type {
  LaserTurretConfig,
  RoomData,
  WorldData,
} from '../types/world.ts';

/**
 * Creates a blank standard room with perimeter walls, bottom floor, and safe spawn.
 */
export function createEmptyRoom(coords: [number, number], customId?: string): RoomData {
  const [x, y] = coords;
  const id = customId || `room_${x}_${y}`.replace(/-/g, 'neg_');

  // Standard 20x20 template with walls and floor
  const grid: string[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    if (r === 0 || r === GRID_ROWS - 1 || r === GRID_ROWS - 2) {
      grid.push('#'.repeat(GRID_COLS));
    } else {
      // Hollow with side borders
      grid.push('#' + ' '.repeat(GRID_COLS - 2) + '#');
    }
  }

  return {
    $schema: './schemas/room.schema.json',
    id,
    coords: [x, y],
    title: `Sector ${x},${y}: New Sector`,
    subtitle: 'Sector description and hints',
    themeColor: '#00e5ff',
    accentColor: '#0066ff',
    exits: {
      left: false,
      right: false,
      up: false,
      down: false,
    },
    spawnPoint: [120, 680],
    grid,
    collectibles: [],
    bounceProps: {},
    spikeProps: {},
    movingPlatforms: [],
    laserBarriers: [],
    laserTurrets: [],
  };
}

/**
 * Creates a brand new starter world.
 */
export function createEmptyWorld(): WorldData {
  const startingCoords: [number, number] = [0, 0];
  const initialRoom = createEmptyRoom(startingCoords, 'room_0_0');
  initialRoom.title = 'Sector 0: Genesis Chamber';
  initialRoom.subtitle = 'Welcome to your custom world!';
  
  // Add a goal in the starter room at top-right
  const rGrid = [...initialRoom.grid];
  // Put goal at row 15, col 16
  const rowChars = rGrid[15].split('');
  rowChars[16] = 'G';
  rGrid[15] = rowChars.join('');
  initialRoom.grid = rGrid;

  return {
    $schema: './schemas/world.schema.json',
    id: 'custom_world',
    title: 'Custom Hypercube World',
    description: 'A custom Hyperfold world created with the Hyperfold World Editor.',
    startingCoords,
    rooms: [initialRoom],
  };
}

/**
 * Deep clones a room, assigning new coordinates and ID.
 */
export function cloneRoom(source: RoomData, newCoords: [number, number]): RoomData {
  const [x, y] = newCoords;
  const cloned: RoomData = JSON.parse(JSON.stringify(source));
  cloned.coords = [x, y];
  cloned.id = `room_${x}_${y}`.replace(/-/g, 'neg_');
  cloned.title = `${source.title} (Copy)`;
  return cloned;
}

/**
 * Normalizes a grid to ensure exactly 20 rows of 20 characters.
 */
export function normalizeGrid(grid: string[]): string[] {
  const normalized: string[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    let row = (grid && grid[r]) ? grid[r] : '';
    if (row.length < GRID_COLS) {
      row = row.padEnd(GRID_COLS, ' ');
    } else if (row.length > GRID_COLS) {
      row = row.substring(0, GRID_COLS);
    }
    normalized.push(row);
  }
  return normalized;
}

import { DEMO_ROOMS_MAP } from './demoWorldData.ts';

/**
 * Sanitizes a LaserTurretConfig ensuring parameters match its mode
 * (strips projectile parameters in beam mode, strips beam parameters in projectile mode).
 */
export function sanitizeLaserTurret(turret: any): LaserTurretConfig {
  const t: LaserTurretConfig = {
    id: turret.id,
    x: turret.x,
    y: turret.y,
  };
  if (turret.direction) t.direction = turret.direction;
  if (turret.angle !== undefined) t.angle = turret.angle;
  if (turret.autoTarget) t.autoTarget = true;
  if (turret.targetRange !== undefined && turret.targetRange !== null && !isNaN(turret.targetRange)) {
    t.targetRange = turret.targetRange;
  }
  if (turret.mode) t.mode = turret.mode;
  if (turret.themeColor) t.themeColor = turret.themeColor;

  if (turret.mode === 'beam') {
    if (turret.activeDuration !== undefined) t.activeDuration = turret.activeDuration;
    if (turret.inactiveDuration !== undefined) t.inactiveDuration = turret.inactiveDuration;
    if (turret.warningDuration !== undefined) t.warningDuration = turret.warningDuration;
    if (turret.initialPhase !== undefined) t.initialPhase = turret.initialPhase;
  } else {
    if (turret.fireInterval !== undefined) t.fireInterval = turret.fireInterval;
    if (turret.fireOffset !== undefined) t.fireOffset = turret.fireOffset;
    if (turret.projectileSpeed !== undefined) t.projectileSpeed = turret.projectileSpeed;
    if (turret.projectileLength !== undefined) t.projectileLength = turret.projectileLength;
  }

  return t;
}

/**
 * Normalizes and parses raw Room JSON into a validated RoomData object.
 */
export function parseRoomData(rm: any, defaultCoords: [number, number] = [0, 0]): RoomData {
  if (!rm || typeof rm !== 'object') {
    throw new Error('Invalid room data: object expected.');
  }

  const coords: [number, number] = Array.isArray(rm.coords)
    ? [rm.coords[0], rm.coords[1]]
    : rm.coords && typeof rm.coords === 'object'
    ? [rm.coords.x, rm.coords.y]
    : defaultCoords;

  const spawnPoint: [number, number] | undefined = rm.spawnPoint
    ? (Array.isArray(rm.spawnPoint)
        ? [rm.spawnPoint[0], rm.spawnPoint[1]]
        : [rm.spawnPoint.x, rm.spawnPoint.y])
    : undefined;

  const collectibles = (rm.collectibles || []).map((c: any) => ({
    id: c.id,
    type: c.type,
    x: c.pos ? c.pos[0] : (c.x ?? 0),
    y: c.pos ? c.pos[1] : (c.y ?? 0),
  }));

  return {
    $schema: rm.$schema || './schemas/room.schema.json',
    id: rm.id || `room_${coords[0]}_${coords[1]}`,
    coords,
    title: rm.title || `Sector ${coords[0]},${coords[1]}`,
    subtitle: rm.subtitle,
    themeColor: rm.themeColor || '#00e5ff',
    accentColor: rm.accentColor || '#0066ff',
    exits: {
      left: !!rm.exits?.left,
      right: !!rm.exits?.right,
      up: !!rm.exits?.up,
      down: !!rm.exits?.down,
    },
    spawnPoint,
    grid: normalizeGrid(rm.grid || []),
    collectibles,
    bounceProps: rm.bounceProps || {},
    spikeProps: rm.spikeProps || {},
    movingPlatforms: rm.movingPlatforms || [],
    laserBarriers: rm.laserBarriers || [],
    laserTurrets: (rm.laserTurrets || []).map(sanitizeLaserTurret),
  };
}

/**
 * Resolves a room file reference string against an external rooms lookup or built-in demo rooms.
 */
function resolveRoomReference(
  ref: string,
  externalRooms?: Record<string, any> | any[]
): any | undefined {
  const trimmed = ref.trim();
  const cleanKey = trimmed.replace(/^\.\//, '');
  const fileName = trimmed.split('/').pop() || '';
  const idKey = fileName.replace(/\.json$/, '');

  // 1. Check user-supplied external rooms
  if (externalRooms) {
    if (Array.isArray(externalRooms)) {
      for (const item of externalRooms) {
        if (!item || typeof item !== 'object') continue;
        if (
          item.id === idKey ||
          item.id === cleanKey ||
          item.fileName === fileName ||
          item.path === trimmed ||
          item.path === cleanKey
        ) {
          return item;
        }
      }
    } else if (typeof externalRooms === 'object') {
      const candidates = [trimmed, cleanKey, fileName, idKey, `./${cleanKey}`, `./rooms/${fileName}`];
      for (const c of candidates) {
        if (externalRooms[c]) return externalRooms[c];
      }
    }
  }

  // 2. Fall back to built-in demo rooms
  const demoCandidates = [trimmed, cleanKey, fileName, idKey, `./rooms/${fileName}`];
  for (const c of demoCandidates) {
    if (DEMO_ROOMS_MAP[c]) return DEMO_ROOMS_MAP[c];
  }

  return undefined;
}

/**
 * Parses raw JSON string into WorldData.
 * Supports:
 * - Single-file world bundle with inlined rooms
 * - Modular world manifest referencing external room files (via externalRooms or built-in demo rooms)
 * - Standalone single room
 */
export function parseWorldJson(
  jsonString: string,
  externalRooms?: Record<string, any> | any[]
): WorldData {
  const raw = JSON.parse(jsonString);

  if (!raw || typeof raw !== 'object') {
    throw new Error('Provided JSON is not an object.');
  }

  // Case A: Full World Bundle or Modular World Manifest
  if (Array.isArray(raw.rooms)) {
    const startingCoords: [number, number] = Array.isArray(raw.startingCoords)
      ? [raw.startingCoords[0], raw.startingCoords[1]]
      : raw.startingCoords && typeof raw.startingCoords === 'object'
      ? [raw.startingCoords.x, raw.startingCoords.y]
      : [0, 0];

    const missingRooms: string[] = [];
    const rooms: RoomData[] = raw.rooms.map((rm: any, index: number) => {
      let roomObj = rm;
      if (typeof rm === 'string') {
        const resolved = resolveRoomReference(rm, externalRooms);
        if (!resolved) {
          missingRooms.push(rm);
          return null as any;
        }
        roomObj = resolved;
      }
      return parseRoomData(roomObj, [index, 0]);
    });

    if (missingRooms.length > 0) {
      throw new Error(
        `World "${raw.title || raw.id || 'unnamed'}" references external room files that could not be resolved: ${missingRooms.join(', ')}. Please upload all room JSON files together with the world manifest, or choose the world folder.`
      );
    }

    return {
      $schema: raw.$schema || './schemas/world.schema.json',
      id: raw.id || 'imported_world',
      title: raw.title || 'Imported World',
      description: raw.description,
      startingCoords,
      rooms,
    };
  }

  // Case B: Standalone Single Room
  if (Array.isArray(raw.grid)) {
    const coords: [number, number] = Array.isArray(raw.coords)
      ? [raw.coords[0], raw.coords[1]]
      : raw.coords && typeof raw.coords === 'object'
      ? [raw.coords.x, raw.coords.y]
      : [0, 0];

    const singleRoom = parseRoomData(raw, coords);

    return {
      $schema: './schemas/world.schema.json',
      id: raw.id ? `${raw.id}_world` : 'single_sector_world',
      title: raw.title ? `${raw.title} World` : 'Single Sector World',
      description: 'Imported from a single standalone sector file.',
      startingCoords: coords,
      rooms: [singleRoom],
    };
  }

  throw new Error('Unrecognized JSON format: expected a world bundle with "rooms" or a sector with "grid".');
}

/**
 * Serializes WorldData into a cleanly formatted JSON string.
 */
export function exportWorldJson(world: WorldData): string {
  const exportPayload = {
    $schema: './schemas/world.schema.json',
    id: world.id,
    title: world.title,
    description: world.description,
    startingCoords: world.startingCoords,
    rooms: world.rooms.map((room) => {
      const roomPayload: any = {
        $schema: './schemas/room.schema.json',
        id: room.id,
        coords: room.coords,
        title: room.title,
        ...(room.subtitle ? { subtitle: room.subtitle } : {}),
        themeColor: room.themeColor,
        accentColor: room.accentColor,
        exits: room.exits,
        ...(room.spawnPoint ? { spawnPoint: room.spawnPoint } : {}),
        grid: room.grid,
      };

      if (room.collectibles && room.collectibles.length > 0) {
        roomPayload.collectibles = room.collectibles.map((c) => ({
          id: c.id,
          type: c.type,
          pos: [c.x, c.y],
        }));
      }

      if (room.bounceProps && Object.keys(room.bounceProps).length > 0) {
        roomPayload.bounceProps = room.bounceProps;
      }

      if (room.spikeProps && Object.keys(room.spikeProps).length > 0) {
        roomPayload.spikeProps = room.spikeProps;
      }

      if (room.movingPlatforms && room.movingPlatforms.length > 0) {
        roomPayload.movingPlatforms = room.movingPlatforms;
      }

      if (room.laserBarriers && room.laserBarriers.length > 0) {
        roomPayload.laserBarriers = room.laserBarriers;
      }

      if (room.laserTurrets && room.laserTurrets.length > 0) {
        roomPayload.laserTurrets = room.laserTurrets.map(sanitizeLaserTurret);
      }

      return roomPayload;
    }),
  };

  return JSON.stringify(exportPayload, null, 2);
}

