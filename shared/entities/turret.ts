import type { LaserTurretConfig } from '../types/entities.ts';

/**
 * Returns the base firing angle in radians based on explicit angle or cardinal direction.
 */
export function getBaseFiringAngle(config: Pick<LaserTurretConfig, 'angle' | 'direction'>): number {
  if (config.angle !== undefined) {
    return (config.angle * Math.PI) / 180;
  }
  switch (config.direction) {
    case 'right':
      return 0;
    case 'down':
      return Math.PI * 0.5;
    case 'left':
      return Math.PI;
    case 'up':
      return -Math.PI * 0.5;
    default:
      return 0;
  }
}

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
