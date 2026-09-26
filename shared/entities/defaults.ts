/**
 * Canonical Entity Configuration Defaults for Hyperfold
 * Single source of truth shared between the Game Engine and the Visual Editor.
 */

import type {
  BouncePadConfig,
  LaserBarrierConfig,
  LaserTurretConfig,
  MovingPlatformConfig,
  PortalConfig,
} from '../types/entities.ts';

/**
 * Standard default configuration for a dynamic harmonic moving platform.
 * Width: 80px, Height: 16px, Speed: 120 px/s, Pause: 0.4s, One-way jump-through.
 */
export const DEFAULT_MOVING_PLATFORM: Readonly<Omit<MovingPlatformConfig, 'id' | 'startX' | 'startY' | 'endX' | 'endY'>> = {
  width: 80,
  height: 16,
  speed: 120,
  pauseTime: 0.4,
  initialProgress: 0,
  oneWay: true,
  themeColor: '#00e5ff',
};

/**
 * Standard default configuration for a laser barrier hazard.
 * Width: 4px, Active: 2.0s, Inactive: 2.0s, Warning: 0.6s, Theme: '#ff0055'.
 */
export const DEFAULT_LASER_BARRIER: Readonly<Omit<LaserBarrierConfig, 'id' | 'startX1' | 'startY1' | 'startX2' | 'startY2'>> = {
  width: 4,
  speed: 0,
  pauseTime: 0.4,
  initialProgress: 0,
  alwaysActive: false,
  activeDuration: 2.0,
  inactiveDuration: 2.0,
  warningDuration: 0.6,
  initialPhase: 0,
  themeColor: '#ff0055',
};

/**
 * Standard default configuration for a laser turret hazard.
 * Mode: projectile, Direction: down, Fire interval: 2.0s, Projectile speed: 320 px/s, Length: 20px.
 */
export const DEFAULT_LASER_TURRET: Readonly<Omit<LaserTurretConfig, 'id' | 'x' | 'y'>> = {
  mode: 'projectile',
  direction: 'down',
  fireInterval: 2.0,
  fireOffset: 0,
  projectileSpeed: 320,
  projectileLength: 20,
  activeDuration: 2.0,
  inactiveDuration: 2.0,
  warningDuration: 0.6,
  initialPhase: 0,
  themeColor: '#00e5ff',
};

/**
 * Standard default configuration for a quantum teleportation portal.
 * Width: 44px, Height: 68px, Theme: '#b026ff'.
 */
export const DEFAULT_PORTAL: Readonly<Omit<PortalConfig, 'id' | 'x' | 'y'>> = {
  width: 44,
  height: 68,
  themeColor: '#b026ff',
  reverseVelocity: false,
};

/**
 * Standard default velocity impulses for bounce pads.
 * Vertical impulse vy: -1400 px/s, Horizontal vx: 0.
 */
export const DEFAULT_BOUNCE_PAD: Readonly<BouncePadConfig> = {
  vy: -1400,
  vx: 0,
};
