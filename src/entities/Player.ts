import { ParticleSystem } from '../engine/ParticleSystem';
import { MovingPlatform } from './MovingPlatform';

export interface PlayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Player {
  public x: number = 120;
  public y: number = 660;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = 24;
  public height: number = 36;

  public isGrounded: boolean = false;
  public wasGrounded: boolean = false;
  public isBouncePropelled: boolean = false;
  public standingPlatform: MovingPlatform | null = null;
  public facing: number = 1; // 1 = right, -1 = left

  // Kinematics tuning constants
  public readonly MOVE_SPEED = 280;
  public readonly ACCELERATION = 1800;
  public readonly DECELERATION = 2000;
  public readonly GRAVITY = 1150;
  public readonly JUMP_VELOCITY = -520;
  public readonly MIN_JUMP_VELOCITY = -200;
  public readonly MAX_FALL_SPEED = 650;

  // Forgiving platformer timers (seconds)
  public coyoteTime: number = 0;
  public readonly COYOTE_DURATION = 0.1;
  public jumpBufferTime: number = 0;
  public readonly JUMP_BUFFER_DURATION = 0.12;
  public dropThroughTimer: number = 0;

  // Visuals & animation
  public animTimer: number = 0;
  public trailTimer: number = 0;
  public primaryColor: string = '#00ffff';
  public accentColor: string = '#ff007f';

  constructor(startX: number = 120, startY: number = 660) {
    this.x = startX;
    this.y = startY;
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public getBounds(): PlayerBounds {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  public updateTimers(dt: number): void {
    if (this.isGrounded) {
      this.coyoteTime = this.COYOTE_DURATION;
    } else {
      this.coyoteTime = Math.max(0, this.coyoteTime - dt);
    }

    if (this.jumpBufferTime > 0) {
      this.jumpBufferTime = Math.max(0, this.jumpBufferTime - dt);
    }

    if (this.dropThroughTimer > 0) {
      this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
    }

    this.animTimer += dt * 10;
  }

  public render(ctx: CanvasRenderingContext2D, particles?: ParticleSystem): void {
    ctx.save();

    // Subtle breathing/bounce scaling
    const bounce = this.isGrounded && Math.abs(this.vx) > 10 ? Math.sin(this.animTimer * 1.5) * 2 : 0;

    const px = Math.floor(this.x);
    const py = Math.floor(this.y) + bounce;
    const w = this.width;
    const h = this.height - bounce;

    // Motion trail when moving fast
    if (particles && Math.abs(this.vx) > 150) {
      this.trailTimer += 0.016;
      if (this.trailTimer > 0.06) {
        this.trailTimer = 0;
        particles.emitTrail(px, py, w, h, 'rgba(0, 255, 255, 0.25)');
      }
    }

    // Outer Neon Glow
    ctx.shadowColor = this.primaryColor;
    ctx.shadowBlur = 10;

    // Body chassis (rounded futuristic rectangle)
    ctx.fillStyle = '#0a101d';
    ctx.strokeStyle = this.primaryColor;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(px, py, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Glowing Neon Visor / Eye
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    const visorW = 10;
    const visorH = 4;
    const visorX = this.facing === 1 ? px + w - 12 : px + 2;
    const visorY = py + 7;
    ctx.fillRect(visorX, visorY, visorW, visorH);

    // Glowing Core Reactor (Chest)
    ctx.fillStyle = this.accentColor;
    ctx.shadowColor = this.accentColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px + w * 0.5, py + h * 0.55, 4, 0, Math.PI * 2);
    ctx.fill();

    // Animated Runner Legs
    ctx.shadowBlur = 4;
    ctx.strokeStyle = this.primaryColor;
    ctx.lineWidth = 3;
    const legY = py + h - 2;

    if (this.isGrounded && Math.abs(this.vx) > 20) {
      const stride = Math.sin(this.animTimer * 1.5) * 5;
      // Front leg
      ctx.beginPath();
      ctx.moveTo(px + w * 0.3, legY);
      ctx.lineTo(px + w * 0.3 + stride, legY + 4);
      ctx.stroke();

      // Back leg
      ctx.beginPath();
      ctx.moveTo(px + w * 0.7, legY);
      ctx.lineTo(px + w * 0.7 - stride, legY + 4);
      ctx.stroke();
    } else if (!this.isGrounded) {
      // In-air tucked legs
      ctx.beginPath();
      ctx.moveTo(px + w * 0.3, legY);
      ctx.lineTo(px + w * 0.2, legY + 2);
      ctx.moveTo(px + w * 0.7, legY);
      ctx.lineTo(px + w * 0.8, legY + 2);
      ctx.stroke();
    } else {
      // Idle legs
      ctx.beginPath();
      ctx.moveTo(px + w * 0.3, legY);
      ctx.lineTo(px + w * 0.3, legY + 3);
      ctx.moveTo(px + w * 0.7, legY);
      ctx.lineTo(px + w * 0.7, legY + 3);
      ctx.stroke();
    }

    ctx.restore();
  }
}
