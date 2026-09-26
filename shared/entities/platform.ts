import type { MovingPlatformConfig, PlatformState } from '../types/entities.ts';
import { DEFAULT_MOVING_PLATFORM } from './defaults.ts';

/**
 * Deterministically calculates moving platform position, velocity, and progress at any given game time.
 * Uses harmonic sinusoidal easing for smooth acceleration and deceleration at endpoints.
 */
export function computePlatformState(config: MovingPlatformConfig, time: number): PlatformState {
  const { startX, startY, endX, endY } = config;
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy);

  if (dist <= 0.001) {
    return { x: startX, y: startY, vx: 0, vy: 0, progress: 0 };
  }

  const speed = Math.max(1, config.speed);
  const moveDuration = dist / speed;
  const pauseDuration = Math.max(0, config.pauseTime ?? DEFAULT_MOVING_PLATFORM.pauseTime ?? 0.4);
  const halfCycle = moveDuration + pauseDuration;
  const fullCycle = halfCycle * 2;

  const phase = ((config.initialProgress ?? 0) * fullCycle) % fullCycle;
  let t = (time + phase) % fullCycle;
  if (t < 0) t += fullCycle;

  if (t < moveDuration) {
    // Transit from start -> end
    const s = t / moveDuration;
    const p = 0.5 * (1 - Math.cos(Math.PI * s)); // 0 -> 1
    const dpDt = (0.5 * Math.PI * Math.sin(Math.PI * s)) / moveDuration;

    return {
      x: startX + dx * p,
      y: startY + dy * p,
      vx: dx * dpDt,
      vy: dy * dpDt,
      progress: p,
    };
  } else if (t < halfCycle) {
    // Paused at end
    return {
      x: endX,
      y: endY,
      vx: 0,
      vy: 0,
      progress: 1,
    };
  } else if (t < halfCycle + moveDuration) {
    // Transit from end -> start
    const s = (t - halfCycle) / moveDuration;
    const p = 0.5 * (1 - Math.cos(Math.PI * s)); // 0 -> 1
    const dpDt = (0.5 * Math.PI * Math.sin(Math.PI * s)) / moveDuration;

    return {
      x: endX - dx * p,
      y: endY - dy * p,
      vx: -dx * dpDt,
      vy: -dy * dpDt,
      progress: 1 - p,
    };
  } else {
    // Paused at start
    return {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      progress: 0,
    };
  }
}
