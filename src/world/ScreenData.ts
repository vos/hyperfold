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
  movingPlatforms?: MovingPlatformConfig[];
}
