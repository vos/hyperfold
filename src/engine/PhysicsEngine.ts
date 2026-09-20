import { Player } from '../entities/Player';
import { FACE_SIZE, ScreenData, TILE_SIZE, TileType } from '../world/ScreenData';
import { AudioManager } from './AudioManager';
import { ParticleSystem } from './ParticleSystem';
import { InputState } from './InputManager';

export interface TransitionEvent {
  direction: 'right' | 'left' | 'up' | 'down';
  entryX: number;
  entryY: number;
  preserveVy: number;
}

export class PhysicsEngine {
  private audio: AudioManager;
  private particles: ParticleSystem;
  private crumblingTiles: Map<string, { room: ScreenData; r: number; c: number; state: 'shaking' | 'broken'; timer: number }> = new Map();

  constructor(audio: AudioManager, particles: ParticleSystem) {
    this.audio = audio;
    this.particles = particles;
  }

  public resetCrumblingTiles(): void {
    for (const [, item] of this.crumblingTiles) {
      item.room.tiles[item.r][item.c] = TileType.CRUMBLE;
    }
    this.crumblingTiles.clear();
  }

  private updateCrumble(dt: number): void {
    for (const [key, item] of this.crumblingTiles) {
      item.timer -= dt;
      if (item.state === 'shaking') {
        if (Math.random() < 0.25) {
          this.particles.emitDust(
            (item.c + 0.5) * TILE_SIZE,
            (item.r + 0.5) * TILE_SIZE,
            2,
            item.room.themeColor
          );
        }
        if (item.timer <= 0) {
          item.room.tiles[item.r][item.c] = TileType.EMPTY;
          item.state = 'broken';
          item.timer = 2.5;
          this.audio.playLand();
          this.particles.emitSparks(
            (item.c + 0.5) * TILE_SIZE,
            (item.r + 0.5) * TILE_SIZE,
            12,
            item.room.themeColor
          );
        }
      } else if (item.state === 'broken') {
        if (item.timer <= 0) {
          item.room.tiles[item.r][item.c] = TileType.CRUMBLE;
          this.particles.emitDust(
            (item.c + 0.5) * TILE_SIZE,
            (item.r + 0.5) * TILE_SIZE,
            6,
            item.room.themeColor
          );
          this.crumblingTiles.delete(key);
        }
      }
    }
  }

  private triggerCrumble(room: ScreenData, r: number, c: number): void {
    const key = `${room.id}_${r}_${c}`;
    if (!this.crumblingTiles.has(key)) {
      this.crumblingTiles.set(key, {
        room,
        r,
        c,
        state: 'shaking',
        timer: 0.5,
      });
      this.particles.emitDust((c + 0.5) * TILE_SIZE, r * TILE_SIZE, 5, room.themeColor);
    }
  }

  public update(
    player: Player,
    room: ScreenData,
    input: InputState,
    dt: number,
    onGoalReached?: () => void,
    onPlayerDeath?: () => void
  ): TransitionEvent | null {
    this.updateCrumble(dt);
    player.wasGrounded = player.isGrounded;
    player.updateTimers(dt);

    // 1. Horizontal Target Velocity
    let targetVx = 0;
    if (input.left) {
      targetVx -= player.MOVE_SPEED;
      player.facing = -1;
    }
    if (input.right) {
      targetVx += player.MOVE_SPEED;
      player.facing = 1;
    }

    // Accelerate or decelerate smoothly
    if (targetVx !== 0) {
      if (Math.sign(player.vx) !== Math.sign(targetVx)) {
        player.vx += targetVx > 0 ? player.DECELERATION * dt : -player.DECELERATION * dt;
      }
      player.vx = this.approach(player.vx, targetVx, player.ACCELERATION * dt);
    } else {
      player.vx = this.approach(player.vx, 0, player.DECELERATION * dt);
    }

    // 2. Jump input & Coyote Time & Jump Buffering
    if (input.jumpJustPressed) {
      player.jumpBufferTime = player.JUMP_BUFFER_DURATION;
    }

    if (player.jumpBufferTime > 0 && player.coyoteTime > 0) {
      player.vy = player.JUMP_VELOCITY;
      player.coyoteTime = 0;
      player.jumpBufferTime = 0;
      player.isGrounded = false;
      this.audio.playJump();
      this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 8, room.themeColor);
    }

    // Variable Jump Cut (release jump early - only affects regular jumps, not bounce pads)
    if (!input.jump && player.vy < player.MIN_JUMP_VELOCITY && !player.isBouncePropelled) {
      player.vy = player.MIN_JUMP_VELOCITY;
    }

    // Reset bounce propulsion once downward velocity begins or grounded
    if (player.vy >= 0 || player.isGrounded) {
      player.isBouncePropelled = false;
    }

    // 3. Gravity
    player.vy = Math.min(player.MAX_FALL_SPEED, player.vy + player.GRAVITY * dt);

    // 4. Horizontal Movement & Collision
    player.x += player.vx * dt;
    this.resolveHorizontalCollisions(player, room);

    // 5. Vertical Movement & Collision
    const prevY = player.y;
    player.y += player.vy * dt;
    player.isGrounded = false;
    this.resolveVerticalCollisions(player, room, prevY, onGoalReached, onPlayerDeath);

    // Just landed particle effect
    if (!player.wasGrounded && player.isGrounded) {
      this.audio.playLand();
      this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 6, room.themeColor);
    }

    // 6. Check Edge Boundaries for 3D Cube Rotation
    return this.checkBoundaryTransitions(player, room);
  }

  private approach(current: number, target: number, maxDelta: number): number {
    if (current < target) {
      return Math.min(current + maxDelta, target);
    }
    return Math.max(current - maxDelta, target);
  }

  private resolveHorizontalCollisions(player: Player, room: ScreenData): void {
    const minCol = Math.floor(player.x / TILE_SIZE);
    const maxCol = Math.floor((player.x + player.width) / TILE_SIZE);
    const minRow = Math.floor(player.y / TILE_SIZE);
    const maxRow = Math.floor((player.y + player.height - 1) / TILE_SIZE);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r < 0 || r >= room.tiles.length || c < 0 || c >= room.tiles[0].length) continue;
        const tile = room.tiles[r][c];

        if (tile === TileType.SOLID) {
          if (player.vx > 0) {
            player.x = c * TILE_SIZE - player.width;
            player.vx = 0;
          } else if (player.vx < 0) {
            player.x = (c + 1) * TILE_SIZE;
            player.vx = 0;
          }
        }
      }
    }
  }

  private resolveVerticalCollisions(
    player: Player,
    room: ScreenData,
    prevY: number,
    onGoalReached?: () => void,
    onPlayerDeath?: () => void
  ): void {
    const minCol = Math.floor((player.x + 2) / TILE_SIZE);
    const maxCol = Math.floor((player.x + player.width - 2) / TILE_SIZE);
    const minRow = Math.floor(player.y / TILE_SIZE);
    const maxRow = Math.floor((player.y + player.height) / TILE_SIZE);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r < 0 || r >= room.tiles.length || c < 0 || c >= room.tiles[0].length) continue;
        const tile = room.tiles[r][c];
        const tileTop = r * TILE_SIZE;
        const tileBottom = (r + 1) * TILE_SIZE;

        if (tile === TileType.SOLID) {
          if (player.vy > 0) {
            player.y = tileTop - player.height;
            player.vy = 0;
            player.isGrounded = true;
          } else if (player.vy < 0) {
            player.y = tileBottom;
            player.vy = 0;
          }
        } else if (tile === TileType.ONE_WAY) {
          // One-way platform: only collide if falling and previously above
          if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
            player.y = tileTop - player.height;
            player.vy = 0;
            player.isGrounded = true;
          }
        } else if (tile === TileType.CRUMBLE) {
          // Crumble platform: acts as a jump-through platform from below that shakes and collapses
          if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
            player.y = tileTop - player.height;
            player.vy = 0;
            player.isGrounded = true;
            this.triggerCrumble(room, r, c);
          }
        } else if (tile === TileType.BOUNCE) {
          if (player.y + player.height >= tileTop && prevY + player.height <= tileBottom + 12) {
            player.y = tileTop - player.height;
            player.vy = -1400; // Powerful vertical launch to reach sector above!
            player.isGrounded = false;
            player.isBouncePropelled = true;
            this.audio.playBounce();
            this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 16, '#39ff14');
            this.particles.emitSparks(player.x + player.width * 0.5, player.y + player.height, 12, '#00ffff');
          }
        } else if (tile === TileType.SPIKE) {
          // Spike hazard hit
          if (onPlayerDeath) {
            this.audio.playDeath();
            this.particles.emitSparks(player.x + player.width * 0.5, player.y + player.height * 0.5, 24, '#ff0055');
            onPlayerDeath();
            return;
          }
        } else if (tile === TileType.GOAL) {
          if (onGoalReached) {
            onGoalReached();
          }
        }
      }
    }
  }

  private checkBoundaryTransitions(player: Player, room: ScreenData): TransitionEvent | null {
    // Right Exit
    if (player.x + player.width * 0.5 >= FACE_SIZE) {
      if (room.exits.right) {
        return {
          direction: 'right',
          entryX: 4,
          entryY: player.y,
          preserveVy: player.vy,
        };
      } else {
        player.x = FACE_SIZE - player.width;
        player.vx = 0;
      }
    }

    // Left Exit
    if (player.x + player.width * 0.5 <= 0) {
      if (room.exits.left) {
        return {
          direction: 'left',
          entryX: FACE_SIZE - player.width - 4,
          entryY: player.y,
          preserveVy: player.vy,
        };
      } else {
        player.x = 0;
        player.vx = 0;
      }
    }

    // Top Exit
    if (player.y + player.height * 0.5 <= 0) {
      if (room.exits.up) {
        return {
          direction: 'up',
          entryX: player.x,
          entryY: FACE_SIZE - player.height - 4,
          preserveVy: Math.min(-200, player.vy), // keep upward thrust
        };
      } else {
        player.y = 0;
        player.vy = 0;
      }
    }

    // Bottom Exit
    if (player.y >= FACE_SIZE) {
      if (room.exits.down) {
        return {
          direction: 'down',
          entryX: player.x,
          entryY: 4,
          preserveVy: player.vy,
        };
      } else {
        // Fell into bottom void without exit -> respawn
        this.audio.playDeath();
        this.particles.emitSparks(player.x + player.width * 0.5, FACE_SIZE - 20, 20, '#ff0055');
        return {
          direction: 'down', // will be treated as fall death if no room
          entryX: 120,
          entryY: 660,
          preserveVy: 0,
        };
      }
    }

    return null;
  }
}
