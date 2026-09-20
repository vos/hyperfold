import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
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
  private gameTime: number = 0;
  private roomPlatforms: Map<string, MovingPlatform[]> = new Map();

  constructor(audio: AudioManager, particles: ParticleSystem) {
    this.audio = audio;
    this.particles = particles;
  }

  public getPlatformsForRoom(room: ScreenData, time?: number): MovingPlatform[] {
    const t = time ?? this.gameTime;
    if (!room.movingPlatforms || room.movingPlatforms.length === 0) {
      return [];
    }
    let platforms = this.roomPlatforms.get(room.id);
    if (!platforms || platforms.length !== room.movingPlatforms.length) {
      platforms = room.movingPlatforms.map((cfg) => new MovingPlatform(cfg, t));
      this.roomPlatforms.set(room.id, platforms);
    }
    for (const plat of platforms) {
      plat.update(t);
    }
    return platforms;
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
    onPlayerDeath?: () => void,
    currentTime?: number
  ): TransitionEvent | null {
    this.updateCrumble(dt);
    player.wasGrounded = player.isGrounded;
    player.updateTimers(dt);
    this.gameTime = currentTime !== undefined ? currentTime : this.gameTime + dt;

    const platforms = this.getPlatformsForRoom(room, this.gameTime);

    // 0. Passenger carriage: carry player with platform movement
    if (player.standingPlatform) {
      const plat = player.standingPlatform;
      const isPlatInRoom = platforms.includes(plat);
      const isOverlappingX =
        player.x + player.width > plat.x && player.x < plat.x + plat.width;

      if (isPlatInRoom && isOverlappingX) {
        const deltaX = plat.x - plat.prevX;
        player.x += deltaX;
        player.y = plat.y - player.height;
        player.isGrounded = true;
        player.vy = 0;

        // Resolve collisions in case the platform moved the player into a solid block
        this.resolveHorizontalCollisions(player, room);

        // If pushing out of wall caused player to leave the platform, dismount
        if (player.x + player.width <= plat.x || player.x >= plat.x + plat.width) {
          player.standingPlatform = null;
        }
      } else {
        // Player stepped off or platform unmounted
        if (isPlatInRoom) {
          player.vx += plat.vx;
        }
        player.standingPlatform = null;
      }
    }

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

    if (player.isGrounded) {
      // Ground physics: snappy acceleration & crisp ground deceleration
      player.isBouncePropelled = false;
      if (player.standingPlatform && targetVx === 0) {
        // Standing still on a moving platform: firmly zero out relative horizontal velocity
        // Eliminates unwanted sliding/inertia!
        player.vx = 0;
      } else if (targetVx !== 0) {
        if (Math.sign(player.vx) !== Math.sign(targetVx)) {
          player.vx += targetVx > 0 ? player.DECELERATION * dt : -player.DECELERATION * dt;
        }
        player.vx = this.approach(player.vx, targetVx, player.ACCELERATION * dt);
      } else {
        player.vx = this.approach(player.vx, 0, player.DECELERATION * dt);
      }
    } else {
      // Airborne physics
      if (player.isBouncePropelled) {
        // Player is riding a bounce launch: preserve horizontal momentum along the parabolic arc
        if (targetVx === 0) {
          // Coast on launch momentum without ground friction
        } else if (Math.sign(targetVx) === Math.sign(player.vx)) {
          // Holding the launch direction: maintain boosted speed (do not forcibly brake to MOVE_SPEED)
          if (Math.abs(player.vx) < player.MOVE_SPEED) {
            player.vx = this.approach(player.vx, targetVx, player.ACCELERATION * dt);
          }
        } else {
          // Counter-steering against the launch direction: allow responsive air control redirection
          player.vx = this.approach(player.vx, targetVx, 1000 * dt);
        }
      } else {
        // Regular aerial movement: steer with acceleration, use gentle air drag when neutral
        if (targetVx !== 0) {
          player.vx = this.approach(player.vx, targetVx, player.ACCELERATION * dt);
        } else {
          player.vx = this.approach(player.vx, 0, 600 * dt);
        }
      }
    }

    // 2. Jump input & Coyote Time & Jump Buffering & Platform Momentum Inheritance & Drop-Through
    if (input.jumpJustPressed) {
      player.jumpBufferTime = player.JUMP_BUFFER_DURATION;
    }

    const canDropThrough =
      input.down &&
      player.jumpBufferTime > 0 &&
      (player.isGrounded || player.standingPlatform !== null) &&
      this.isStandingOnOneWay(player, room);

    if (canDropThrough) {
      player.dropThroughTimer = 0.20;
      player.isGrounded = false;
      player.coyoteTime = 0;
      player.jumpBufferTime = 0;
      if (player.standingPlatform) {
        player.vy = Math.max(120, player.standingPlatform.vy + 60);
        player.standingPlatform = null;
      } else {
        player.vy = 120;
      }
      player.y += 3;
      this.audio.playDropThrough();
      this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 6, room.themeColor);
    } else if (player.jumpBufferTime > 0 && player.coyoteTime > 0) {
      let jumpVy = player.JUMP_VELOCITY;
      if (player.standingPlatform) {
        const plat = player.standingPlatform;
        if (plat.vy < 0) {
          // Boost upward jump when launching off an ascending platform
          jumpVy = Math.min(jumpVy, player.JUMP_VELOCITY + plat.vy * 0.75);
        }
        // Inherit horizontal momentum
        player.vx += plat.vx * 0.8;
        player.standingPlatform = null;
      }
      player.vy = jumpVy;
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

    // 3. Gravity (only apply when not firmly planted on a moving platform)
    if (!player.standingPlatform) {
      player.vy = Math.min(player.MAX_FALL_SPEED, player.vy + player.GRAVITY * dt);
    } else {
      player.vy = 0;
    }

    // 4. Horizontal Movement & Collision
    player.x += player.vx * dt;
    this.resolveHorizontalCollisions(player, room);

    // 5. Vertical Movement & Collision
    const prevY = player.y;
    player.y += player.vy * dt;
    player.isGrounded = false;
    this.resolveVerticalCollisions(player, room, prevY, onGoalReached, onPlayerDeath);

    // Moving Platform Collisions
    this.resolvePlatformCollisions(player, platforms, prevY, dt);

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

  private isStandingOnOneWay(player: Player, room: ScreenData): boolean {
    if (player.standingPlatform) {
      return player.standingPlatform.oneWay !== false;
    }

    if (!player.isGrounded) {
      return false;
    }

    const feetY = player.y + player.height;
    const r = Math.floor((feetY + 1) / TILE_SIZE);
    if (r < 0 || r >= room.tiles.length) return false;

    const minCol = Math.floor((player.x + 2) / TILE_SIZE);
    const maxCol = Math.floor((player.x + player.width - 2) / TILE_SIZE);

    let hasOneWay = false;
    for (let c = minCol; c <= maxCol; c++) {
      if (c < 0 || c >= room.tiles[0].length) continue;
      const tile = room.tiles[r][c];
      if (tile === TileType.SOLID) {
        return false;
      }
      if (tile === TileType.ONE_WAY || tile === TileType.CRUMBLE) {
        hasOneWay = true;
      }
    }
    return hasOneWay;
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
            player.standingPlatform = null;
          } else if (player.vy < 0) {
            player.y = tileBottom;
            player.vy = 0;
          }
        } else if (tile === TileType.ONE_WAY) {
          if (player.dropThroughTimer > 0) {
            continue;
          }
          // One-way platform: only collide if falling and previously above
          if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
            player.y = tileTop - player.height;
            player.vy = 0;
            player.isGrounded = true;
            player.standingPlatform = null;
          }
        } else if (tile === TileType.CRUMBLE) {
          if (player.dropThroughTimer > 0) {
            continue;
          }
          // Crumble platform: acts as a jump-through platform from below that shakes and collapses
          if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
            player.y = tileTop - player.height;
            player.vy = 0;
            player.isGrounded = true;
            player.standingPlatform = null;
            this.triggerCrumble(room, r, c);
          }
        } else if (tile === TileType.BOUNCE) {
          if (player.y + player.height >= tileTop && prevY + player.height <= tileBottom + 12) {
            player.y = tileTop - player.height;
            // Retrieve propulsion properties directly from the bounce tile configuration on the map
            const bounceConfig = room.bounceProps?.[`${r},${c}`];
            player.vy = bounceConfig?.vy ?? -1400;
            if (bounceConfig?.vx !== undefined) {
              player.vx = bounceConfig.vx;
            }
            player.isGrounded = false;
            player.isBouncePropelled = true;
            player.standingPlatform = null;
            this.audio.playBounce();
            this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 16, '#39ff14');
            this.particles.emitSparks(player.x + player.width * 0.5, player.y + player.height, 12, '#00ffff');
          }
        } else if (tile === TileType.SPIKE) {
          // Spike hazard hit
          if (onPlayerDeath) {
            player.standingPlatform = null;
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

  private resolvePlatformCollisions(
    player: Player,
    platforms: MovingPlatform[],
    prevY: number,
    dt: number
  ): void {
    if (platforms.length === 0) return;

    for (const plat of platforms) {
      if (player.dropThroughTimer > 0 && plat.oneWay) {
        continue;
      }

      const platTop = plat.y;
      const platPrevTop = plat.prevY;

      // Horizontal overlap check: player must horizontally overlap the platform
      const overlapX = player.x + player.width > plat.x && player.x < plat.x + plat.width;
      if (!overlapX) continue;

      if (player.standingPlatform === plat) {
        player.y = platTop - player.height;
        player.vy = 0;
        player.isGrounded = true;
        return;
      }

      // Check landing: falling or moving onto the platform from above
      if (player.vy >= 0) {
        const prevFeet = prevY + player.height;
        const curFeet = player.y + player.height;

        // Condition A: Feet crossed the surface between frames
        const crossedSurface = prevFeet <= platPrevTop + 8 && curFeet >= platTop;

        // Condition B: Feet are near or on the surface within landing tolerance
        const maxDrop = Math.max(20, player.vy * dt + 12);
        const nearSurface = prevFeet <= platTop + 6 && curFeet >= platTop && curFeet <= platTop + maxDrop;

        if (crossedSurface || nearSurface) {
          player.y = platTop - player.height;
          player.vy = 0;
          player.isGrounded = true;
          player.standingPlatform = plat;
          player.vx = 0; // stop horizontal slide on landing
          return;
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
