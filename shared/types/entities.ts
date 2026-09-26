/**
 * Canonical Entity Type Definitions for Hyperfold
 * Single source of truth shared between the Game Engine and the Visual Editor.
 */

/**
 * Real-time kinematic state of a moving platform at an instantaneous point in time.
 */
export interface PlatformState {
  /** Current horizontal position in room pixels [0, ROOM_SIZE] */
  x: number;
  /** Current vertical position in room pixels [0, ROOM_SIZE] */
  y: number;
  /** Instantaneous horizontal velocity vector in pixels/second */
  vx: number;
  /** Instantaneous vertical velocity vector in pixels/second */
  vy: number;
  /** Normalized phase position along transit: 0.0 (at start) to 1.0 (at end) */
  progress: number;
}

/**
 * Declarative configuration for a dynamic harmonic moving platform.
 * Platforms follow smooth sinusoidal acceleration/deceleration between two endpoints.
 */
export interface MovingPlatformConfig {
  /** Unique entity identifier within the sector (e.g. 'platform_lift_1') */
  id: string;
  /** Starting anchor X position in room pixels */
  startX: number;
  /** Starting anchor Y position in room pixels */
  startY: number;
  /** Destination anchor X position in room pixels */
  endX: number;
  /** Destination anchor Y position in room pixels */
  endY: number;
  /** Platform visual width in pixels (e.g. 80, 100, 120) */
  width: number;
  /** Platform visual height in pixels (defaults to 16) */
  height?: number;
  /** Transit speed in pixels per second */
  speed: number;
  /** Dwell pause time at each endpoint in seconds (defaults to 0.4) */
  pauseTime?: number;
  /** Starting transit phase offset normalized from 0.0 to 1.0 (defaults to 0) */
  initialProgress?: number;
  /** Custom neon glowing border color override in hex (e.g. '#00e5ff') */
  themeColor?: string;
  /** Whether the platform can be jumped through from below (one-way surface, defaults to true) */
  oneWay?: boolean;
}

/**
 * Activation state cycle for laser hazards.
 * - INACTIVE: Laser is unpowered and harmless.
 * - WARNING: Laser is telegraphing with an energy charging arc/beam flicker before firing. Harmless.
 * - ACTIVE: Laser is fully energized and lethal to the player on contact.
 */
export type LaserState = 'INACTIVE' | 'WARNING' | 'ACTIVE';

/**
 * Real-time computed state of a laser barrier at an instantaneous point in time.
 */
export interface LaserBarrierState {
  /** Current interpolated X position of pylon 1 in room pixels */
  x1: number;
  /** Current interpolated Y position of pylon 1 in room pixels */
  y1: number;
  /** Current interpolated X position of pylon 2 in room pixels */
  x2: number;
  /** Current interpolated Y position of pylon 2 in room pixels */
  y2: number;
  /** Current activation phase state ('INACTIVE', 'WARNING', or 'ACTIVE') */
  state: LaserState;
  /** Whether the laser is currently energized and lethal to the player */
  isActive: boolean;
  /** Movement interpolation progress along pylon transit path: 0.0 (start) to 1.0 (end) */
  progress: number;
  /** Normalized charging/telegraph progress: 0.0 (uncharged) to 1.0 (firing) */
  chargeProgress: number;
}

/**
 * Declarative configuration for a stationary or moving pulsing laser barrier.
 * Lasers span between two pylon endpoints (x1,y1) and (x2,y2) and cycle through
 * inactive, warning telegraph, and lethal active states.
 */
export interface LaserBarrierConfig {
  /** Unique entity identifier within the sector (e.g. 'laser_gate_1') */
  id: string;
  /** Anchor X position of pylon 1 in room pixels */
  startX1: number;
  /** Anchor Y position of pylon 1 in room pixels */
  startY1: number;
  /** Anchor X position of pylon 2 in room pixels */
  startX2: number;
  /** Anchor Y position of pylon 2 in room pixels */
  startY2: number;
  /** Optional destination X position for pylon 1 linear movement */
  endX1?: number;
  /** Optional destination Y position for pylon 1 linear movement */
  endY1?: number;
  /** Optional destination X position for pylon 2 linear movement */
  endX2?: number;
  /** Optional destination Y position for pylon 2 linear movement */
  endY2?: number;
  /** Movement speed in pixels per second if pylons translate (defaults to 0 / stationary) */
  speed?: number;
  /** Dwell pause time at movement endpoints in seconds (defaults to 0.4) */
  pauseTime?: number;
  /** Starting movement phase offset normalized from 0.0 to 1.0 (defaults to 0) */
  initialProgress?: number;
  /** If true (or inactiveDuration <= 0), the beam is continuously energized and lethal without cycling */
  alwaysActive?: boolean;
  /** Duration in seconds that the beam stays energized and lethal during each cycle (defaults to 2.0) */
  activeDuration?: number;
  /** Duration in seconds that the beam remains unpowered during each cycle (defaults to 2.0) */
  inactiveDuration?: number;
  /** Telegraph warning duration in seconds before beam activates (defaults to 0.6) */
  warningDuration?: number;
  /** Starting cycle timing phase offset normalized from 0.0 to 1.0 (defaults to 0) */
  initialPhase?: number;
  /** Custom neon beam color hex override (defaults to '#ff0055') */
  themeColor?: string;
  /** Visual thickness of the laser beam in pixels (defaults to 4) */
  width?: number;
}

/**
 * Operational firing mode for laser turrets:
 * - 'projectile': Fires discrete moving energy bolts at regular intervals.
 * - 'beam': Emits a sustained continuous laser beam raycast across the sector.
 */
export type TurretMode = 'projectile' | 'beam';

/**
 * Declarative configuration for stationary or auto-tracking laser turrets.
 */
export interface LaserTurretConfig {
  /** Unique entity identifier within the sector (e.g. 'turret_sentry_1') */
  id: string;
  /** Turret mount center X in room pixels */
  x: number;
  /** Turret mount center Y in room pixels */
  y: number;
  /** Preset cardinal firing direction ('left' | 'right' | 'up' | 'down') */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** Custom base aim angle in degrees (0 = right, 90 = down, 180 = left, 270 = up) */
  angle?: number;
  /** Whether the turret automatically swivels to track and target the player */
  autoTarget?: boolean;
  /** Maximum tracking and engagement range in pixels (defaults to full sector) */
  targetRange?: number;
  /** Firing mode: 'projectile' bolts or sustained 'beam' raycast (defaults to 'projectile') */
  mode?: TurretMode;
  /** Interval in seconds between shots for projectile mode (defaults to 2.0) */
  fireInterval?: number;
  /** Initial fire timer offset in seconds for projectile staggering (defaults to 0) */
  fireOffset?: number;
  /** Speed of fired energy bolts in pixels per second (defaults to 320) */
  projectileSpeed?: number;
  /** Visual length of energy bolts in pixels (defaults to 20) */
  projectileLength?: number;
  /** Duration in seconds the beam stays energized for beam mode (defaults to 2.0) */
  activeDuration?: number;
  /** Duration in seconds the beam stays unpowered between cycles for beam mode (defaults to 2.0) */
  inactiveDuration?: number;
  /** Telegraph warning duration in seconds before firing beam (defaults to 0.6) */
  warningDuration?: number;
  /** Beam cycle timing phase offset normalized from 0.0 to 1.0 (defaults to 0) */
  initialPhase?: number;
  /** Custom neon color hex override for turret body, bolts, and beam (defaults to '#00e5ff') */
  themeColor?: string;
}

/**
 * Declarative configuration for quantum teleportation portals.
 * Enables instant player traversal between locations within a sector or across sectors.
 */
export interface PortalConfig {
  /** Unique portal identifier (e.g. 'portal_alpha_in') */
  id: string;
  /** Top-left horizontal position in room pixels [0, ROOM_SIZE] */
  x: number;
  /** Top-left vertical position in room pixels [0, ROOM_SIZE] */
  y: number;
  /** Visual portal aperture width in pixels (defaults to 44) */
  width?: number;
  /** Visual portal aperture height in pixels (defaults to 68) */
  height?: number;
  /** ID of target destination portal (if undefined, functions as destination-only arrival gate) */
  targetPortalId?: string;
  /** Custom neon aura glow color hex override (defaults to '#b026ff') */
  themeColor?: string;
  /** Optional narrative or functional label displayed in editor and HUD */
  label?: string;
  /** If true, inverts the outbound player velocity vector (-vx, -vy) upon exit */
  reverseVelocity?: boolean;
}

/**
 * Collectible category types:
 * - 'core': Primary energy power core required for sector clearance / progression.
 * - 'prism': Bonus quantum resonance shard for completionists and high scores.
 * - 'key': Sector security key that unlocks matching ExitGateConfig barriers.
 */
export type CollectibleType = 'core' | 'prism' | 'key';

/**
 * Declarative data definition for placed collectibles in a sector.
 */
export interface CollectibleData {
  /** Unique collectible identifier (e.g. 'key_red_1' or 'core_alpha') */
  id: string;
  /** Category of collectible */
  type: CollectibleType;
  /** Center X position in room pixels */
  x: number;
  /** Center Y position in room pixels */
  y: number;
  /** Runtime collection status flag */
  collected?: boolean;
  /** Custom neon glow color hex override (defaults to palette or type preset) */
  color?: string;
  /** Friendly narrative label shown on collection HUD notifications */
  label?: string;
}

/**
 * Custom spring impulse configuration for bounce pad tiles ('B').
 */
export interface BouncePadConfig {
  /** Custom vertical launch velocity impulse in pixels/second (negative is upward, defaults to -1400) */
  vy?: number;
  /** Optional horizontal launch velocity impulse in pixels/second for angled vaults */
  vx?: number;
}

/**
 * Cardinal orientation for hazard spike tiles ('^', 'v', '<', '>').
 */
export type SpikeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Custom orientation configuration for spike tiles, keyed by grid location.
 */
export interface SpikeConfig {
  /** Explicit directional orientation; if omitted, automatically deduced from adjacent solid surfaces */
  direction?: SpikeDirection;
}
