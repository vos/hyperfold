import {
  MovingPlatformConfig,
  PlatformState,
  computePlatformState,
  DEFAULT_MOVING_PLATFORM,
} from '../../shared/index.ts';

export type { PlatformState };

export class MovingPlatform {
  public config: MovingPlatformConfig;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public prevX: number;
  public prevY: number;
  public width: number;
  public height: number;
  public oneWay: boolean;
  public themeColor?: string;
  public progress: number = 0;

  constructor(config: MovingPlatformConfig, initialTime: number = 0) {
    this.config = config;
    this.width = config.width;
    this.height = config.height ?? DEFAULT_MOVING_PLATFORM.height ?? 16;
    this.oneWay = config.oneWay !== false;
    this.themeColor = config.themeColor;

    const initialState = computePlatformState(config, initialTime);
    this.x = initialState.x;
    this.y = initialState.y;
    this.vx = initialState.vx;
    this.vy = initialState.vy;
    this.prevX = this.x;
    this.prevY = this.y;
    this.progress = initialState.progress;
  }

  public update(time: number): void {
    this.prevX = this.x;
    this.prevY = this.y;

    const state = computePlatformState(this.config, time);
    this.x = state.x;
    this.y = state.y;
    this.vx = state.vx;
    this.vy = state.vy;
    this.progress = state.progress;
  }

  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Deterministically calculates platform position, velocity, and progress at any given game time.
   * Delegates to shared kinematic solver.
   */
  public static computePlatformState(config: MovingPlatformConfig, time: number): PlatformState {
    return computePlatformState(config, time);
  }
}
