import {
  LaserBarrierConfig,
  LaserBarrierState,
  LaserState,
  computeBarrierState,
  DEFAULT_LASER_BARRIER,
} from '../../shared/index.ts';
import { Player } from './Player';

export type { LaserState, LaserBarrierState };

export class LaserBarrier {
  public config: LaserBarrierConfig;
  public state: LaserBarrierState;
  public prevState: LaserState = 'INACTIVE';
  public wasActive: boolean = false;
  public themeColor: string;
  public width: number;

  constructor(config: LaserBarrierConfig, initialTime: number = 0) {
    this.config = config;
    this.themeColor = config.themeColor ?? DEFAULT_LASER_BARRIER.themeColor ?? '#ff0055';
    this.width = config.width ?? DEFAULT_LASER_BARRIER.width ?? 4;
    this.state = computeBarrierState(config, initialTime);
    this.prevState = this.state.state;
    this.wasActive = this.state.isActive;
  }

  public update(time: number): void {
    this.prevState = this.state.state;
    this.wasActive = this.state.isActive;
    this.state = computeBarrierState(this.config, time);
  }

  /**
   * Returns true if the barrier just entered the WARNING state on this update.
   */
  public justEnteredWarning(): boolean {
    return this.state.state === 'WARNING' && this.prevState !== 'WARNING';
  }

  /**
   * Returns true if the barrier just activated (became lethal) on this update.
   */
  public justActivated(): boolean {
    return this.state.isActive && !this.wasActive;
  }

  /**
   * Deterministically calculates the barrier's endpoints, state, and progress at any time.
   * Delegates to shared kinematic solver.
   */
  public static computeBarrierState(config: LaserBarrierConfig, time: number): LaserBarrierState {
    return computeBarrierState(config, time);
  }

  /**
   * Tests if the laser beam intersects the player's bounding box.
   */
  public intersectsPlayer(player: Player): boolean {
    if (!this.state.isActive) return false;
    return LaserBarrier.lineIntersectsBox(
      this.state.x1,
      this.state.y1,
      this.state.x2,
      this.state.y2,
      player.x,
      player.y,
      player.width,
      player.height,
      (this.width || 4) * 0.5
    );
  }

  /**
   * Helper to check if a 2D line segment (with optional thickness) intersects an AABB.
   */
  public static lineIntersectsBox(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number,
    radius: number = 0
  ): boolean {
    // Expand box by radius
    const minX = boxX - radius;
    const maxX = boxX + boxW + radius;
    const minY = boxY - radius;
    const maxY = boxY + boxH + radius;

    // Check if either endpoint is inside the expanded box
    if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
    if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;

    // Check bounding box overlap of the line segment with the target box
    const segMinX = Math.min(x1, x2);
    const segMaxX = Math.max(x1, x2);
    const segMinY = Math.min(y1, y2);
    const segMaxY = Math.max(y1, y2);

    if (segMaxX < minX || segMinX > maxX || segMaxY < minY || segMinY > maxY) {
      return false;
    }

    // Check intersection with all 4 rectangle edges
    return (
      LaserBarrier.segmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY) || // Top
      LaserBarrier.segmentsIntersect(x1, y1, x2, y2, minX, maxY, maxX, maxY) || // Bottom
      LaserBarrier.segmentsIntersect(x1, y1, x2, y2, minX, minY, minX, maxY) || // Left
      LaserBarrier.segmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY)    // Right
    );
  }

  private static segmentsIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): boolean {
    const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
      return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
    };
    return (
      ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
      ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
    );
  }
}
