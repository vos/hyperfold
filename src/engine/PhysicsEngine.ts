import { Player } from '../entities/Player';
import { MovingPlatform } from '../entities/MovingPlatform';
import { LaserBarrier } from '../entities/LaserBarrier';
import { LaserTurret, LaserProjectile } from '../entities/LaserTurret';
import { FACE_SIZE, ScreenData, TILE_SIZE, TileType, getSpikeDirection, ExitDirection, ExitGateConfig, getGateColor, getExitGate, PortalConfig } from '../world/ScreenData';
import { LevelMap } from '../world/LevelMap';
import { AudioManager } from './AudioManager';
import { ParticleSystem } from './ParticleSystem';
import { InputState } from './InputManager';

export interface TransitionEvent {
  direction: 'right' | 'left' | 'up' | 'down';
  entryX: number;
  entryY: number;
  preserveVy: number;
  preserveVx?: number;
  isPortal?: boolean;
  sourcePortal?: PortalConfig;
  destPortal?: PortalConfig;
  destRoom?: ScreenData;
  targetCoords?: { x: number; y: number };
}

export class PhysicsEngine {
  private audio: AudioManager;
  private particles: ParticleSystem;
  private crumblingTiles: Map<string, { room: ScreenData; r: number; c: number; state: 'shaking' | 'broken'; timer: number }> = new Map();
  private gameTime: number = 0;
  private roomPlatforms: Map<string, MovingPlatform[]> = new Map();
  private roomBarriers: Map<string, LaserBarrier[]> = new Map();
  private roomTurrets: Map<string, LaserTurret[]> = new Map();
  private roomProjectiles: Map<string, LaserProjectile[]> = new Map();
  private levelMap?: LevelMap;
  private lastLockedSoundTime: number = 0;

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
    const matches = platforms && platforms.length === room.movingPlatforms.length &&
      platforms.every((plat, idx) => plat.config === room.movingPlatforms![idx]);
    if (!matches) {
      platforms = room.movingPlatforms.map((cfg) => new MovingPlatform(cfg, t));
      this.roomPlatforms.set(room.id, platforms);
    }
    for (const plat of platforms!) {
      plat.update(t);
    }
    return platforms!;
  }

  public getBarriersForRoom(room: ScreenData, time?: number): LaserBarrier[] {
    const t = time ?? this.gameTime;
    if (!room.laserBarriers || room.laserBarriers.length === 0) {
      return [];
    }
    let barriers = this.roomBarriers.get(room.id);
    const matches = barriers && barriers.length === room.laserBarriers.length &&
      barriers.every((bar, idx) => bar.config === room.laserBarriers![idx]);
    if (!matches) {
      barriers = room.laserBarriers.map((cfg) => new LaserBarrier(cfg, t));
      this.roomBarriers.set(room.id, barriers);
    }
    for (const barrier of barriers!) {
      barrier.update(t);
    }
    return barriers!;
  }

  public getTurretsForRoom(room: ScreenData): LaserTurret[] {
    if (!room.laserTurrets || room.laserTurrets.length === 0) {
      return [];
    }
    let turrets = this.roomTurrets.get(room.id);
    const matches = turrets && turrets.length === room.laserTurrets.length &&
      turrets.every((tur, idx) => tur.config === room.laserTurrets![idx]);
    if (!matches) {
      turrets = room.laserTurrets.map((cfg) => new LaserTurret(cfg));
      this.roomTurrets.set(room.id, turrets);
    }
    return turrets!;
  }

  public getProjectilesForRoom(roomId: string): LaserProjectile[] {
    return this.roomProjectiles.get(roomId) ?? [];
  }

  public clearProjectiles(): void {
    this.roomProjectiles.clear();
  }

  public clearAllRoomsCache(): void {
    this.roomPlatforms.clear();
    this.roomBarriers.clear();
    this.roomTurrets.clear();
    this.roomProjectiles.clear();
    this.resetCrumblingTiles();
  }

  public resetCrumblingTiles(): void {
    for (const [, item] of this.crumblingTiles) {
      item.room.tiles[item.r][item.c] = TileType.CRUMBLE;
    }
    this.crumblingTiles.clear();
    this.clearProjectiles();
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

  public setLevelMap(levelMap: LevelMap): void {
    this.levelMap = levelMap;
  }

  public isExitOpen(room: ScreenData, dir: ExitDirection, levelMap?: LevelMap): boolean {
    const map = levelMap || this.levelMap;
    const gate = getExitGate(room, dir);
    if (gate) {
      return !!map && map.hasKey(gate.id);
    }
    return room.exits?.[dir] === true;
  }

  public update(
    player: Player,
    room: ScreenData,
    input: InputState,
    dt: number,
    onGoalReached?: () => void,
    onPlayerDeath?: () => void,
    currentTime?: number,
    levelMap?: LevelMap,
    onGateLocked?: (gate: ExitGateConfig, dir: ExitDirection) => void
  ): TransitionEvent | null {
    this.updateCrumble(dt);
    player.wasGrounded = player.isGrounded;
    player.updateTimers(dt);
    this.gameTime = currentTime !== undefined ? currentTime : this.gameTime + dt;

    const platforms = this.getPlatformsForRoom(room, this.gameTime);

    // Handle ducking / crouching input & ceiling constraints
    if (input.down) {
      player.setDucking(true);
    } else if (player.isDucking) {
      if (this.canStandUp(player, room, platforms)) {
        player.setDucking(false);
      }
    }

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
    const currentSpeed = player.isDucking ? player.CRAWL_SPEED : player.MOVE_SPEED;
    if (input.left) {
      targetVx -= currentSpeed;
      player.facing = -1;
    }
    if (input.right) {
      targetVx += currentSpeed;
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
          if (Math.abs(player.vx) < currentSpeed) {
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
    if (this.checkSpikeCollisions(player, room, onPlayerDeath)) return null;

    // 5. Vertical Movement & Collision
    const prevY = player.y;
    player.y += player.vy * dt;
    player.isGrounded = false;
    this.resolveVerticalCollisions(player, room, prevY, onGoalReached, onPlayerDeath);
    if (this.checkSpikeCollisions(player, room, onPlayerDeath)) return null;

    // Moving Platform Collisions
    this.resolvePlatformCollisions(player, platforms, prevY, dt);

    // Just landed particle effect
    if (!player.wasGrounded && player.isGrounded) {
      this.audio.playLand();
      this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 6, room.themeColor);
    }

    // 6. Laser Hazards Collision & Projectile Simulation
    const barrierKilled = this.checkLaserBarriers(player, room, onPlayerDeath);
    if (barrierKilled) return null;

    const turretKilled = this.updateLaserTurrets(player, room, platforms, dt, onPlayerDeath);
    if (turretKilled) return null;

    // 6.5 Check Quantum Portals Teleportation
    const portalTransition = this.checkPortals(player, room, levelMap);
    if (portalTransition) return portalTransition;

    // 7. Check Edge Boundaries for 3D Cube Rotation
    return this.checkBoundaryTransitions(player, room, levelMap, onGateLocked);
  }

  public canStandUp(player: Player, room: ScreenData, platforms?: MovingPlatform[], levelMap?: LevelMap): boolean {
    if (!player.isDucking) return true;

    const diff = player.STANDING_HEIGHT - player.height;
    if (diff <= 0) return true;

    const headY = player.y - diff;
    const minCol = Math.floor((player.x + 2) / TILE_SIZE);
    const maxCol = Math.floor((player.x + player.width - 2) / TILE_SIZE);
    const minRow = Math.floor(headY / TILE_SIZE);
    const maxRow = Math.floor((player.y - 1) / TILE_SIZE);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r < 0) {
          // Solid ceiling if room doesn't have an open upward exit
          if (!this.isExitOpen(room, 'up', levelMap)) return false;
          continue;
        }
        if (r >= room.tiles.length || c < 0 || c >= room.tiles[0].length) continue;
        const tile = room.tiles[r][c];
        if (tile === TileType.SOLID) {
          return false;
        }
      }
    }

    if (platforms) {
      for (const plat of platforms) {
        if (plat.oneWay) continue;
        const overlapX = player.x + player.width - 2 > plat.x && player.x + 2 < plat.x + plat.width;
        const overlapY = player.y > plat.y && headY < plat.y + plat.height;
        if (overlapX && overlapY) {
          return false;
        }
      }
    }

    return true;
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

        if (tile === TileType.SOLID || tile === TileType.BOUNCE) {
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
          // Only trigger bounce when landing from above (like ONE_WAY), not from the side
          if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
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
          if (this.checkSpikeCollisions(player, room, onPlayerDeath)) {
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

  public checkSpikeCollisions(player: Player, room: ScreenData, onPlayerDeath?: () => void): boolean {
    const minCol = Math.floor((player.x - 2) / TILE_SIZE);
    const maxCol = Math.floor((player.x + player.width + 2) / TILE_SIZE);
    const minRow = Math.floor((player.y - 2) / TILE_SIZE);
    const maxRow = Math.floor((player.y + player.height + 2) / TILE_SIZE);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r < 0 || r >= room.tiles.length || c < 0 || c >= room.tiles[0].length) continue;
        if (room.tiles[r][c] === TileType.SPIKE) {
          const dir = getSpikeDirection(room, r, c);
          const tLeft = c * TILE_SIZE;
          const tRight = tLeft + TILE_SIZE;
          const tTop = r * TILE_SIZE;
          const tBottom = tTop + TILE_SIZE;

          let hLeft = tLeft;
          let hRight = tRight;
          let hTop = tTop;
          let hBottom = tBottom;

          // Forgiving hitbox matching spike tip geometry
          if (dir === 'up') {
            hLeft += 4; hRight -= 4; hTop += 10;
          } else if (dir === 'down') {
            hLeft += 4; hRight -= 4; hBottom -= 10;
          } else if (dir === 'right') {
            hTop += 4; hBottom -= 4; hRight -= 10;
          } else if (dir === 'left') {
            hTop += 4; hBottom -= 4; hLeft += 10;
          }

          if (
            player.x + player.width > hLeft &&
            player.x < hRight &&
            player.y + player.height > hTop &&
            player.y < hBottom
          ) {
            player.standingPlatform = null;
            this.audio.playDeath();
            this.particles.emitPlayerExplosion(
              player.x + player.width * 0.5,
              player.y + player.height * 0.5,
              player.primaryColor,
              player.accentColor
            );
            if (onPlayerDeath) onPlayerDeath();
            return true;
          }
        }
      }
    }
    return false;
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

  private handleLockedGateHit(
    player: Player,
    gate: ExitGateConfig,
    dir: ExitDirection,
    onGateLocked?: (gate: ExitGateConfig, dir: ExitDirection) => void
  ): void {
    if (this.gameTime - this.lastLockedSoundTime > 0.6) {
      this.lastLockedSoundTime = this.gameTime;
      this.audio.playGateLocked();
    }
    const color = getGateColor(gate.id, gate.color);
    this.particles.emitSparks(player.x + player.width * 0.5, player.y + player.height * 0.5, 6, color);
    if (onGateLocked) {
      onGateLocked(gate, dir);
    }
  }

  private checkBoundaryTransitions(
    player: Player,
    room: ScreenData,
    levelMap?: LevelMap,
    onGateLocked?: (gate: ExitGateConfig, dir: ExitDirection) => void
  ): TransitionEvent | null {
    // Right Exit
    if (player.x + player.width * 0.5 >= FACE_SIZE) {
      if (this.isExitOpen(room, 'right', levelMap)) {
        return {
          direction: 'right',
          entryX: 4,
          entryY: player.y,
          preserveVy: player.vy,
        };
      } else {
        player.x = FACE_SIZE - player.width;
        player.vx = 0;
        const gate = getExitGate(room, 'right');
        if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
          this.handleLockedGateHit(player, gate, 'right', onGateLocked);
        }
      }
    }

    // Left Exit
    if (player.x + player.width * 0.5 <= 0) {
      if (this.isExitOpen(room, 'left', levelMap)) {
        return {
          direction: 'left',
          entryX: FACE_SIZE - player.width - 4,
          entryY: player.y,
          preserveVy: player.vy,
        };
      } else {
        player.x = 0;
        player.vx = 0;
        const gate = getExitGate(room, 'left');
        if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
          this.handleLockedGateHit(player, gate, 'left', onGateLocked);
        }
      }
    }

    // Top Exit
    if (player.y + player.height * 0.5 <= 0) {
      if (this.isExitOpen(room, 'up', levelMap)) {
        return {
          direction: 'up',
          entryX: player.x,
          entryY: FACE_SIZE - player.height - 4,
          preserveVy: Math.min(-200, player.vy), // keep upward thrust
        };
      } else {
        player.y = 0;
        player.vy = 0;
        const gate = getExitGate(room, 'up');
        if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
          this.handleLockedGateHit(player, gate, 'up', onGateLocked);
        }
      }
    }

    // Bottom Exit
    if (player.y >= FACE_SIZE) {
      if (this.isExitOpen(room, 'down', levelMap)) {
        return {
          direction: 'down',
          entryX: player.x,
          entryY: 4,
          preserveVy: player.vy,
        };
      } else {
        const gate = getExitGate(room, 'down');
        if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
          player.y = FACE_SIZE - player.height;
          player.vy = 0;
          this.handleLockedGateHit(player, gate, 'down', onGateLocked);
        } else {
          // Fell into bottom void without exit -> respawn
          this.audio.playDeath();
          this.particles.emitPlayerExplosion(
            player.x + player.width * 0.5,
            FACE_SIZE - 20,
            player.primaryColor,
            player.accentColor
          );
          return {
            direction: 'down', // will be treated as fall death if no room
            entryX: 120,
            entryY: 660,
            preserveVy: 0,
          };
        }
      }
    }

    return null;
  }

  private checkPortals(
    player: Player,
    room: ScreenData,
    levelMap?: LevelMap
  ): TransitionEvent | null {
    if (!room.portals || room.portals.length === 0) {
      player.disabledPortalId = null;
      return null;
    }
    const map = levelMap || this.levelMap;
    if (!map) return null;

    // Check if player has moved away from the collision box of the portal they emerged from
    if (player.disabledPortalId) {
      const disabledPortal = room.portals.find((p) => p.id === player.disabledPortalId);
      if (disabledPortal) {
        const dpW = disabledPortal.width ?? 44;
        const dpH = disabledPortal.height ?? 68;
        const stillOverlapping =
          player.x + player.width > disabledPortal.x &&
          player.x < disabledPortal.x + dpW &&
          player.y + player.height > disabledPortal.y &&
          player.y < disabledPortal.y + dpH;

        if (!stillOverlapping) {
          player.disabledPortalId = null;
        }
      } else {
        player.disabledPortalId = null;
      }
    }

    for (const portal of room.portals) {
      if (!portal.targetPortalId) continue; // destination-only portal
      if (portal.id === player.disabledPortalId) continue; // disable portal until player moves away from its collision box

      const portalW = portal.width ?? 44;
      const portalH = portal.height ?? 68;

      const overlap =
        player.x + player.width > portal.x &&
        player.x < portal.x + portalW &&
        player.y + player.height > portal.y &&
        player.y < portal.y + portalH;

      if (!overlap) continue;

      const dest = map.findPortal(portal.targetPortalId);
      if (!dest) continue;

      const destPortal = dest.portal;
      const destRoom = dest.room;
      const destW = destPortal.width ?? 44;
      const destH = destPortal.height ?? 68;

      const targetEntryX = Math.max(4, Math.min(FACE_SIZE - player.width - 4, destPortal.x + destW * 0.5 - player.width * 0.5));
      const targetEntryY = Math.max(4, Math.min(FACE_SIZE - player.height - 4, destPortal.y + destH - player.height));

      // Disable the destination portal until the player moves away from its collision box (if it has a target set)
      if (destPortal.targetPortalId) {
        player.disabledPortalId = destPortal.id;
      } else {
        player.disabledPortalId = null;
      }

      // Invert outbound velocity vector if destination portal has reverseVelocity enabled
      const outboundVx = destPortal.reverseVelocity ? -player.vx : player.vx;
      const outboundVy = destPortal.reverseVelocity ? -player.vy : player.vy;

      // Intra-room teleportation (same room)
      if (destRoom.id === room.id) {
        this.particles.emitPlayerExplosion(
          portal.x + portalW * 0.5,
          portal.y + portalH * 0.5,
          portal.themeColor || room.themeColor,
          map.getDestinationColor(portal, room)
        );

        player.setPosition(targetEntryX, targetEntryY);
        player.vx = outboundVx;
        player.vy = outboundVy;
        if (outboundVy < -50) {
          player.isBouncePropelled = true;
          player.isGrounded = false;
        }
        player.standingPlatform = null;

        this.particles.emitSparks(
          destPortal.x + destW * 0.5,
          destPortal.y + destH * 0.5,
          32,
          destPortal.themeColor || destRoom.themeColor
        );

        this.audio.playPortalTeleport();
        return null;
      }

      // Inter-sector teleportation (different room)
      const dx = destRoom.coords.x - room.coords.x;
      const dy = destRoom.coords.y - room.coords.y;
      let rotDir: 'right' | 'left' | 'up' | 'down' = 'right';
      if (Math.abs(dx) >= Math.abs(dy)) {
        rotDir = dx >= 0 ? 'right' : 'left';
      } else {
        rotDir = dy >= 0 ? 'up' : 'down';
      }

      this.particles.emitPlayerExplosion(
        portal.x + portalW * 0.5,
        portal.y + portalH * 0.5,
        portal.themeColor || room.themeColor,
        map.getDestinationColor(portal, room)
      );

      return {
        direction: rotDir,
        entryX: targetEntryX,
        entryY: targetEntryY,
        preserveVy: outboundVy,
        preserveVx: outboundVx,
        isPortal: true,
        sourcePortal: portal,
        destPortal: destPortal,
        destRoom: destRoom,
        targetCoords: { x: destRoom.coords.x, y: destRoom.coords.y },
      };
    }

    return null;
  }

  private checkLaserBarriers(
    player: Player,
    room: ScreenData,
    onPlayerDeath?: () => void
  ): boolean {
    const barriers = this.getBarriersForRoom(room, this.gameTime);
    for (const barrier of barriers) {
      if (barrier.justEnteredWarning()) {
        this.audio.playLaserWarning();
      }
      if (barrier.justActivated()) {
        this.audio.playLaserHum();
      }

      if (barrier.state.state === 'WARNING') {
        if (Math.random() < 0.25) {
          this.particles.emitLaserCharge(barrier.state.x1, barrier.state.y1, barrier.themeColor);
          this.particles.emitLaserCharge(barrier.state.x2, barrier.state.y2, barrier.themeColor);
        }
      } else if (barrier.state.isActive) {
        if (Math.random() < 0.15) {
          this.particles.emitLaserSparks(barrier.state.x1, barrier.state.y1, 2, barrier.themeColor);
          this.particles.emitLaserSparks(barrier.state.x2, barrier.state.y2, 2, barrier.themeColor);
        }
      }

      if (barrier.intersectsPlayer(player)) {
        player.standingPlatform = null;
        this.audio.playDeath();
        this.particles.emitPlayerExplosion(
          player.x + player.width * 0.5,
          player.y + player.height * 0.5,
          player.primaryColor,
          barrier.themeColor
        );
        if (onPlayerDeath) onPlayerDeath();
        return true;
      }
    }
    return false;
  }

  private updateLaserTurrets(
    player: Player,
    room: ScreenData,
    platforms: MovingPlatform[],
    dt: number,
    onPlayerDeath?: () => void
  ): boolean {
    const turrets = this.getTurretsForRoom(room);
    let projectiles = this.roomProjectiles.get(room.id);
    if (!projectiles) {
      projectiles = [];
      this.roomProjectiles.set(room.id, projectiles);
    }

    const playerTarget = player.isAlive
      ? { x: player.x + player.width * 0.5, y: player.y + player.height * 0.5 }
      : null;

    for (const turret of turrets) {
      if (turret.mode === 'beam') {
        turret.updateBeam(this.gameTime, playerTarget);
        const nozzle = turret.getNozzlePosition(playerTarget);
        if (turret.justEnteredWarning()) {
          this.audio.playLaserWarning();
        }
        if (turret.justActivated()) {
          this.audio.playLaserHum();
        }

        if (turret.isBeamActive) {
          const ray = LaserTurret.castRay(nozzle.x, nozzle.y, nozzle.angle, room.tiles, platforms);
          if (turret.justActivated()) {
            this.particles.emitLaserSparks(ray.hitX, ray.hitY, 8, turret.themeColor, ray.normalX, ray.normalY);
          } else if (Math.random() < 0.35) {
            this.particles.emitLaserSparks(ray.hitX, ray.hitY, 2, turret.themeColor, ray.normalX, ray.normalY);
          }
          if (LaserTurret.rayIntersectsPlayer(nozzle.x, nozzle.y, ray.hitX, ray.hitY, player)) {
            player.standingPlatform = null;
            this.audio.playDeath();
            this.particles.emitPlayerExplosion(
              player.x + player.width * 0.5,
              player.y + player.height * 0.5,
              player.primaryColor,
              turret.themeColor
            );
            if (onPlayerDeath) onPlayerDeath();
            return true;
          }
        } else if (turret.beamState === 'WARNING') {
          if (Math.random() < 0.25) {
            this.particles.emitLaserCharge(nozzle.x, nozzle.y, turret.themeColor);
          }
        }
      } else {
        // Projectile mode
        const nozzle = turret.getNozzlePosition(playerTarget);
        const fireInterval = turret.config.fireInterval ?? 2.0;
        const fireOffset = turret.config.fireOffset ?? 0;
        const effectiveTime = this.gameTime - fireOffset;

        if (effectiveTime >= 0) {
          if (turret.lastShotTime < 0 || effectiveTime - turret.lastShotTime >= fireInterval) {
            turret.lastShotTime = effectiveTime - (effectiveTime % fireInterval);
            const speed = turret.config.projectileSpeed ?? 320;
            const len = turret.config.projectileLength ?? 20;

            projectiles.push({
              id: `${turret.config.id}_${Date.now()}_${Math.random()}`,
              x: nozzle.x,
              y: nozzle.y,
              vx: nozzle.dirX * speed,
              vy: nozzle.dirY * speed,
              width: len,
              height: 6,
              color: turret.themeColor,
              turretId: turret.config.id,
              life: 0,
              maxLife: 4.0,
              direction: turret.config.direction,
              angle: nozzle.angle,
            });

            this.audio.playLaserShoot();
            this.particles.emitLaserMuzzle(nozzle.x, nozzle.y, nozzle.dirX, nozzle.dirY, turret.themeColor);
          }
        }
      }
    }

    // Integrate and collide in-flight projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;

      if (p.life >= p.maxLife || p.x < -20 || p.x > FACE_SIZE + 20 || p.y < -20 || p.y > FACE_SIZE + 20) {
        projectiles.splice(i, 1);
        continue;
      }

      // Check collision with solid tiles
      const checkX = p.x + Math.cos(p.angle) * p.width * 0.5;
      const checkY = p.y + Math.sin(p.angle) * p.width * 0.5;
      const tileR = Math.floor(checkY / TILE_SIZE);
      const tileC = Math.floor(checkX / TILE_SIZE);

      let hit = false;
      if (tileR >= 0 && tileR < room.tiles.length && tileC >= 0 && tileC < room.tiles[0].length) {
        const tile = room.tiles[tileR][tileC];
        if (tile === TileType.SOLID || tile === TileType.CRUMBLE) {
          hit = true;
          this.audio.playLaserImpact();
          this.particles.emitLaserSparks(
            checkX,
            checkY,
            8,
            p.color,
            -Math.sign(p.vx),
            -Math.sign(p.vy)
          );
          projectiles.splice(i, 1);
          continue;
        }
      }

      // Check collision with moving platforms
      for (const plat of platforms) {
        if (
          (plat.x <= checkX && checkX <= plat.x + plat.width && plat.y <= checkY && checkY <= plat.y + plat.height) ||
          (plat.x <= p.x && p.x <= plat.x + plat.width && plat.y <= p.y && p.y <= plat.y + plat.height)
        ) {
          hit = true;
          this.audio.playLaserImpact();
          this.particles.emitLaserSparks(
            checkX,
            checkY,
            8,
            p.color,
            -Math.sign(p.vx),
            -Math.sign(p.vy)
          );
          projectiles.splice(i, 1);
          break;
        }
      }
      if (hit) continue;

      // Check collision with player
      const tailX = p.x - Math.cos(p.angle) * p.width * 0.5;
      const tailY = p.y - Math.sin(p.angle) * p.width * 0.5;
      if (
        LaserBarrier.lineIntersectsBox(
          tailX,
          tailY,
          checkX,
          checkY,
          player.x,
          player.y,
          player.width,
          player.height,
          4
        )
      ) {
        projectiles.splice(i, 1);
        player.standingPlatform = null;
        this.audio.playDeath();
        this.particles.emitPlayerExplosion(
          player.x + player.width * 0.5,
          player.y + player.height * 0.5,
          player.primaryColor,
          p.color
        );
        if (onPlayerDeath) onPlayerDeath();
        return true;
      }
    }

    return false;
  }
}
