export const GRID_COLS = 20;
export const GRID_ROWS = 20;
export const ROOM_PIXEL_SIZE = 800;
export const TILE_PIXEL_SIZE = ROOM_PIXEL_SIZE / GRID_COLS; // 40px

export interface RoomExits {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface CollectibleData {
  id: string;
  type: 'core' | 'prism' | 'key';
  x: number;
  y: number;
}

export interface BouncePadConfig {
  vy?: number;
  vx?: number;
}

export interface SpikeConfig {
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface MovingPlatformConfig {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height?: number;
  speed: number;
  pauseTime?: number;
  initialProgress?: number;
  themeColor?: string;
  oneWay?: boolean;
}

export interface LaserBarrierConfig {
  id: string;
  startX1: number;
  startY1: number;
  startX2: number;
  startY2: number;
  endX1?: number;
  endY1?: number;
  endX2?: number;
  endY2?: number;
  speed?: number;
  pauseTime?: number;
  initialProgress?: number;
  activeDuration: number;
  inactiveDuration: number;
  warningDuration?: number;
  initialPhase?: number;
  themeColor?: string;
  width?: number;
}

export interface LaserTurretConfig {
  id: string;
  x: number;
  y: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  angle?: number;
  autoTarget?: boolean;
  targetRange?: number;
  mode?: 'projectile' | 'beam';
  fireInterval?: number;
  fireOffset?: number;
  projectileSpeed?: number;
  projectileLength?: number;
  activeDuration?: number;
  inactiveDuration?: number;
  warningDuration?: number;
  initialPhase?: number;
  themeColor?: string;
}

export interface RoomData {
  $schema?: string;
  id: string;
  coords: [number, number];
  title: string;
  subtitle?: string;
  themeColor: string;
  accentColor: string;
  exits: RoomExits;
  spawnPoint?: [number, number];
  grid: string[]; // 20 strings of length 20
  collectibles?: CollectibleData[];
  bounceProps?: Record<string, BouncePadConfig>;
  spikeProps?: Record<string, SpikeConfig>;
  movingPlatforms?: MovingPlatformConfig[];
  laserBarriers?: LaserBarrierConfig[];
  laserTurrets?: LaserTurretConfig[];
}

export interface WorldData {
  $schema?: string;
  id: string;
  title: string;
  description?: string;
  startingCoords: [number, number];
  rooms: RoomData[];
}

export type TileGlyph = '#' | '=' | '^' | 'v' | '<' | '>' | 'B' | 'C' | 'G' | ' ';

export interface TileDefinition {
  glyph: TileGlyph;
  name: string;
  description: string;
  color: string;
  category: 'terrain' | 'hazard' | 'mechanic' | 'goal';
}

export type EditorTool =
  | 'pencil'
  | 'line'
  | 'rect'
  | 'fill'
  | 'eraser'
  | 'eyedropper'
  | 'select';

export type SelectedEntity =
  | { type: 'spawn' }
  | { type: 'collectible'; id: string }
  | { type: 'movingPlatform'; id: string }
  | { type: 'laserBarrier'; id: string }
  | { type: 'laserTurret'; id: string }
  | { type: 'bouncePad'; row: number; col: number }
  | null;

export interface DiagnosticIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  roomId?: string;
  message: string;
  actionLabel?: string;
  onFix?: () => void;
}

