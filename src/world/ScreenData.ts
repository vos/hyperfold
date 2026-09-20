export const FACE_SIZE = 800;
export const TILE_SIZE = 40;
export const COLS = FACE_SIZE / TILE_SIZE; // 20
export const ROWS = FACE_SIZE / TILE_SIZE; // 20

export enum TileType {
  EMPTY = 0,
  SOLID = 1,
  ONE_WAY = 2,
  SPIKE = 3,
  BOUNCE = 4,
  CRUMBLE = 5,
  GOAL = 6,
}

export interface CollectibleData {
  id: string;
  x: number; // in pixels
  y: number; // in pixels
  type: 'core' | 'prism' | 'key';
  collected?: boolean;
}

export interface RoomExits {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface BouncePadConfig {
  vy?: number; // Custom vertical launch velocity (defaults to -1400)
  vx?: number; // Optional horizontal launch velocity (e.g. for angled vaults)
}

export interface MovingPlatformConfig {
  id: string;
  startX: number;           // in pixels
  startY: number;           // in pixels
  endX: number;             // in pixels
  endY: number;             // in pixels
  width: number;            // in pixels (e.g. 80, 100, 120)
  height?: number;          // in pixels (defaults to 16)
  speed: number;            // in pixels per second
  pauseTime?: number;       // dwell time at endpoints in seconds (defaults to 0.4)
  initialProgress?: number; // 0 to 1 starting phase offset (default: 0)
  themeColor?: string;      // custom neon color override (optional)
  oneWay?: boolean;         // whether platform is jump-through from below (defaults to true)
}

export interface LaserBarrierConfig {
  id: string;
  startX1: number;          // in pixels
  startY1: number;          // in pixels
  startX2: number;          // in pixels
  startY2: number;          // in pixels
  endX1?: number;           // optional endpoint for pylon 1 movement
  endY1?: number;
  endX2?: number;           // optional endpoint for pylon 2 movement
  endY2?: number;
  speed?: number;           // in pixels per second if moving
  pauseTime?: number;       // dwell time at endpoints in seconds (defaults to 0.4)
  initialProgress?: number; // 0 to 1 movement phase offset (defaults to 0)
  activeDuration: number;   // seconds laser is energized and lethal
  inactiveDuration: number; // seconds laser is turned off
  warningDuration?: number; // seconds of telegraph warning before active (defaults to 0.6)
  initialPhase?: number;    // 0 to 1 timing phase offset (defaults to 0)
  themeColor?: string;      // custom neon beam color override (defaults to #ff0055)
  width?: number;           // beam visual width (defaults to 4)
}

export interface LaserTurretConfig {
  id: string;
  x: number;                // turret mount center X in pixels
  y: number;                // turret mount center Y in pixels
  direction?: 'left' | 'right' | 'up' | 'down'; // optional preset cardinal direction
  angle?: number;           // custom firing angle in degrees (0 = right, 90 = down, 180 = left, 270 = up, e.g. 45 = down-right)
  mode?: 'projectile' | 'beam'; // defaults to 'projectile'
  fireInterval?: number;    // seconds between shots (defaults to 2.0)
  fireOffset?: number;      // initial firing offset in seconds (defaults to 0)
  projectileSpeed?: number; // projectile speed in px/s (defaults to 320)
  projectileLength?: number;// projectile length in px (defaults to 20)
  activeDuration?: number;  // for beam mode: duration beam stays active (defaults to 2.0)
  inactiveDuration?: number;// for beam mode: duration beam stays inactive (defaults to 2.0)
  warningDuration?: number; // for beam mode: telegraph duration (defaults to 0.6)
  initialPhase?: number;    // for beam mode: 0 to 1 phase offset (defaults to 0)
  themeColor?: string;      // custom neon color override
}

export interface SpikeConfig {
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface ScreenData {
  id: string;
  coords: { x: number; y: number };
  title: string;
  subtitle?: string;
  themeColor: string;      // Primary neon color (e.g. #00ffff, #ff007f, #00ff66, #ffcc00)
  accentColor: string;     // Secondary accent color
  tiles: number[][];       // 20x20 grid of TileType
  collectibles: CollectibleData[];
  exits: RoomExits;
  spawnPoint?: { x: number; y: number };
  bounceProps?: Record<string, BouncePadConfig>; // Keyed by "${row},${col}"
  spikeProps?: Record<string, SpikeConfig>;      // Keyed by "${row},${col}"
  movingPlatforms?: MovingPlatformConfig[];
  laserBarriers?: LaserBarrierConfig[];
  laserTurrets?: LaserTurretConfig[];
}

/**
 * Resolves the orientation of a spike at (r, c) based on explicit config or adjacent solid surfaces.
 */
export function getSpikeDirection(
  room: ScreenData,
  r: number,
  c: number
): 'up' | 'down' | 'left' | 'right' {
  if (room.spikeProps?.[`${r},${c}`]?.direction) {
    return room.spikeProps[`${r},${c}`].direction!;
  }
  // Auto-detect based on adjacent tiles:
  // 1. Attached to floor/platform below:
  if (r + 1 < ROWS && (room.tiles[r + 1][c] === TileType.SOLID || room.tiles[r + 1][c] === TileType.ONE_WAY)) {
    return 'up';
  }
  // 2. Attached to roof/ceiling above:
  if (r - 1 >= 0 && room.tiles[r - 1][c] === TileType.SOLID) {
    return 'down';
  }
  // 3. Attached to left wall:
  if (c - 1 >= 0 && room.tiles[r][c - 1] === TileType.SOLID) {
    return 'right';
  }
  // 4. Attached to right wall:
  if (c + 1 < COLS && room.tiles[r][c + 1] === TileType.SOLID) {
    return 'left';
  }
  // 5. Default boundary fallbacks:
  if (r === ROWS - 1) return 'up';
  if (r === 0) return 'down';
  if (c === 0) return 'right';
  if (c === COLS - 1) return 'left';
  return 'up';
}

