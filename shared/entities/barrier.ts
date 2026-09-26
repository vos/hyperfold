import type { LaserBarrierConfig, LaserBarrierState, LaserState } from '../types/entities.ts';
import { DEFAULT_LASER_BARRIER } from './defaults.ts';

/**
 * Deterministically calculates a laser barrier's endpoints, activation state, and progress at any game time.
 */
export function computeBarrierState(config: LaserBarrierConfig, time: number): LaserBarrierState {
  const { startX1, startY1, startX2, startY2 } = config;
  const endX1 = config.endX1 ?? startX1;
  const endY1 = config.endY1 ?? startY1;
  const endX2 = config.endX2 ?? startX2;
  const endY2 = config.endY2 ?? startY2;

  // 1. Movement Kinematics
  let p = 0;
  const dist1 = Math.hypot(endX1 - startX1, endY1 - startY1);
  const dist2 = Math.hypot(endX2 - startX2, endY2 - startY2);
  const maxDist = Math.max(dist1, dist2);

  if (config.speed && config.speed > 0 && maxDist > 0.001) {
    const moveDuration = maxDist / config.speed;
    const pauseDuration = Math.max(0, config.pauseTime ?? DEFAULT_LASER_BARRIER.pauseTime ?? 0.4);
    const halfCycle = moveDuration + pauseDuration;
    const fullCycle = halfCycle * 2;

    const phase = ((config.initialProgress ?? 0) * fullCycle) % fullCycle;
    let t = (time + phase) % fullCycle;
    if (t < 0) t += fullCycle;

    if (t < moveDuration) {
      // Forward transit
      const s = t / moveDuration;
      p = 0.5 * (1 - Math.cos(Math.PI * s));
    } else if (t < halfCycle) {
      // Paused at destination
      p = 1;
    } else if (t < halfCycle + moveDuration) {
      // Return transit
      const s = (t - halfCycle) / moveDuration;
      p = 1 - 0.5 * (1 - Math.cos(Math.PI * s));
    } else {
      // Paused at start
      p = 0;
    }
  }

  const curX1 = startX1 + (endX1 - startX1) * p;
  const curY1 = startY1 + (endY1 - startY1) * p;
  const curX2 = startX2 + (endX2 - startX2) * p;
  const curY2 = startY2 + (endY2 - startY2) * p;

  // 2. Timing Cycle
  const isAlwaysActive = Boolean(
    config.alwaysActive ||
    (config.inactiveDuration !== undefined && config.inactiveDuration <= 0)
  );

  if (isAlwaysActive) {
    return {
      x1: curX1,
      y1: curY1,
      x2: curX2,
      y2: curY2,
      state: 'ACTIVE',
      isActive: true,
      progress: p,
      chargeProgress: 1,
    };
  }

  const activeDur = Math.max(0.1, config.activeDuration ?? DEFAULT_LASER_BARRIER.activeDuration ?? 2.0);
  const inactiveDur = Math.max(0.01, config.inactiveDuration ?? DEFAULT_LASER_BARRIER.inactiveDuration ?? 2.0);
  const warnDur = Math.min(inactiveDur, Math.max(0, config.warningDuration ?? DEFAULT_LASER_BARRIER.warningDuration ?? 0.6));
  const cycleDur = activeDur + inactiveDur;

  const cyclePhase = ((config.initialPhase ?? 0) * cycleDur) % cycleDur;
  let cycleT = (time + cyclePhase) % cycleDur;
  if (cycleT < 0) cycleT += cycleDur;

  let state: LaserState = 'INACTIVE';
  let isActive = false;
  let chargeProgress = 0;

  if (cycleT < activeDur) {
    state = 'ACTIVE';
    isActive = true;
    chargeProgress = 1;
  } else if (cycleT < cycleDur - warnDur) {
    state = 'INACTIVE';
    isActive = false;
    chargeProgress = 0;
  } else {
    state = 'WARNING';
    isActive = false;
    chargeProgress = warnDur > 0 ? (cycleT - (cycleDur - warnDur)) / warnDur : 1;
  }

  return {
    x1: curX1,
    y1: curY1,
    x2: curX2,
    y2: curY2,
    state,
    isActive,
    progress: p,
    chargeProgress,
  };
}
