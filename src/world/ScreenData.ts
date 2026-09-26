import type {
  BouncePadConfig,
  CollectibleData,
  ExitDirection,
  ExitGateConfig,
  LaserBarrierConfig,
  LaserTurretConfig,
  MovingPlatformConfig,
  PortalConfig,
  RoomExits,
  SpikeConfig,
  TileType,
} from '../../shared/index.ts';

export * from '../../shared/index.ts';

/**
 * Runtime screen data structure used by the game engine, physics engine, and renderers.
 * Represents an active, parsed 20x20 tile sector with runtime entities and collision geometry.
 */
export interface ScreenData {
  /** Unique sector identifier */
  id: string;
  /** Coordinate position { x, y } in the world hypercube lattice */
  coords: { x: number; y: number };
  /** Sector display title (e.g. "Sector 0: Genesis Core") */
  title: string;
  /** Optional narrative subtitle or tactical hint shown on sector entrance */
  subtitle?: string;
  /** Primary neon theme color (e.g. #00ffff, #ff007f, #00ff66, #ffcc00) */
  themeColor: string;
  /** Secondary accent neon color */
  accentColor: string;
  /** 20x20 runtime matrix of TileType values for collision and rendering */
  tiles: TileType[][];
  /** Collectibles located in this sector */
  collectibles: CollectibleData[];
  /** Cardinal border exit configurations */
  exits: RoomExits;
  /** Key-locked exit gates mapped by cardinal direction */
  gates?: Partial<Record<ExitDirection, ExitGateConfig>>;
  /** Default player spawn coordinates { x, y } in pixels */
  spawnPoint?: { x: number; y: number };
  /** Custom launch velocity properties for bounce pads, keyed by "${row},${col}" */
  bounceProps?: Record<string, BouncePadConfig>;
  /** Directional orientation overrides for spike tiles, keyed by "${row},${col}" */
  spikeProps?: Record<string, SpikeConfig>;
  /** Active dynamic harmonic moving platforms */
  movingPlatforms?: MovingPlatformConfig[];
  /** Active pulsing or translating laser barrier hazards */
  laserBarriers?: LaserBarrierConfig[];
  /** Active sentry laser turrets (projectile or continuous beam) */
  laserTurrets?: LaserTurretConfig[];
  /** Quantum teleportation portals in this sector */
  portals?: PortalConfig[];
}
