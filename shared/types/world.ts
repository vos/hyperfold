/**
 * Canonical Room and World Type Definitions for Hyperfold
 * Single source of truth shared between the Game Engine, Visual Editor, and World Schemas.
 */

import type {
  BouncePadConfig,
  CollectibleData,
  LaserBarrierConfig,
  LaserTurretConfig,
  MovingPlatformConfig,
  PortalConfig,
  SpikeConfig,
} from './entities.ts';

/**
 * Cardinal directions for sector boundaries and exit transitions.
 */
export type ExitDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Configuration for a locked security gate blocking a sector exit.
 * Automatically opens when the player collects the key with a matching ID.
 */
export interface ExitGateConfig {
  /** Unique key ID required to unlock this exit barrier (matches CollectibleData.id of type 'key') */
  id: string;
  /** Custom gate barrier neon color hex (defaults to deterministic gate palette) */
  color?: string;
  /** Friendly display label for HUD alerts and editor inspector (e.g. "Security Gate Alpha") */
  label?: string;
}

/**
 * Exit configuration for a single cardinal boundary of a sector:
 * - `true`: Open doorway corridor permitting traversal to adjacent sector.
 * - `false`: Solid impenetrable perimeter wall.
 * - `ExitGateConfig`: Locked gate barrier requiring a matching key to traverse.
 */
export type ExitConfig = boolean | ExitGateConfig;

/**
 * Complete perimeter boundary exit configuration across all four cardinal sides.
 */
export interface RoomExits {
  /** Left boundary exit (-X neighbor) */
  left: ExitConfig;
  /** Right boundary exit (+X neighbor) */
  right: ExitConfig;
  /** Ceiling boundary exit (-Y neighbor) */
  up: ExitConfig;
  /** Floor boundary exit (+Y neighbor) */
  down: ExitConfig;
}

/**
 * Declarative specification of a single sector/room in Hyperfold.
 * Conforms to `room.schema.json` and serves as the JSON file format on disk.
 */
export interface RoomData {
  /** Optional JSON schema reference URI */
  $schema?: string;
  /** Unique room identifier (e.g. 'room_0_0' or 'sector_spire') */
  id: string;
  /** Grid coordinate [x, y] in the world hypercube lattice */
  coords: [number, number];
  /** Sector display title displayed on entrance and HUD (e.g. "Sector 0: Genesis Core") */
  title: string;
  /** Optional narrative subtitle or tactical hint shown on sector entrance */
  subtitle?: string;
  /** Primary neon theme color hex code for wireframes and accents (e.g. '#00ffff') */
  themeColor: string;
  /** Secondary accent neon color hex code (e.g. '#0088ff') */
  accentColor: string;
  /** Four-way cardinal boundary exit definitions */
  exits: RoomExits;
  /** Default player spawn coordinates [x, y] in pixels (defaults to [120, 680]) */
  spawnPoint?: [number, number];
  /** 20 rows of 20 ASCII glyph characters defining the static tile layout */
  grid: string[];
  /** Placed collectibles in this sector (power cores, quantum prisms, gate keys) */
  collectibles?: CollectibleData[];
  /** Custom launch velocity properties for bounce pads, keyed by "row,col" (e.g. "17,1") */
  bounceProps?: Record<string, BouncePadConfig>;
  /** Directional orientation overrides for spike tiles, keyed by "row,col" */
  spikeProps?: Record<string, SpikeConfig>;
  /** Dynamic harmonic moving hover platforms */
  movingPlatforms?: MovingPlatformConfig[];
  /** Timed pulsing or moving laser hazard barriers */
  laserBarriers?: LaserBarrierConfig[];
  /** Stationary or auto-tracking laser sentry turrets */
  laserTurrets?: LaserTurretConfig[];
  /** Quantum teleportation portals within or between sectors */
  portals?: PortalConfig[];
}

/**
 * Self-contained bundled world package with inlined room definitions.
 * Conforms to `world.schema.json` when fully bundled for distribution or web export.
 */
export interface WorldData {
  /** Optional JSON schema reference URI */
  $schema?: string;
  /** Unique world identifier (e.g. 'demo_world') */
  id: string;
  /** Display title for the world campaign (e.g. "Hyperfold Dimension Alpha") */
  title: string;
  /** Narrative description or gameplay overview */
  description?: string;
  /** Initial spawn sector coordinates [x, y] in the world graph */
  startingCoords: [number, number];
  /** Array of complete inlined room definitions */
  rooms: RoomData[];
}

/**
 * Modular world manifest definition.
 * Allows room entries to be either relative file paths (e.g. "./rooms/room_0_0.json")
 * for modular editing, or inlined RoomData objects for bundled playback.
 */
export interface WorldManifest {
  /** Optional JSON schema reference URI */
  $schema?: string;
  /** Unique world identifier (e.g. 'demo_world') */
  id: string;
  /** Display title for the world campaign */
  title: string;
  /** Narrative description or gameplay overview */
  description?: string;
  /** Initial spawn sector coordinates [x, y] in the world graph */
  startingCoords: [number, number];
  /** List of room file paths or inlined room definitions */
  rooms: Array<string | RoomData>;
}
