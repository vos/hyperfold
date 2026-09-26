import {
  ROOM_SIZE,
  ScreenData,
  TILE_SIZE,
  TileType,
  getSpikeDirection,
  LaserTurretConfig,
  CollectibleData,
  ExitDirection,
  ExitGateConfig,
  getGateColor,
  getExitGate,
} from '../world/ScreenData';
import { Player } from '../entities/Player';
import { ParticleSystem } from '../engine/ParticleSystem';
import { LevelMap } from '../world/LevelMap';
import { MovingPlatform } from '../entities/MovingPlatform';
import { LaserBarrier } from '../entities/LaserBarrier';
import { LaserTurret, LaserProjectile } from '../entities/LaserTurret';
import { DevManager } from '../engine/DevManager';

export class FaceRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private time: number = 0;
  private turretCache: Map<string, LaserTurret> = new Map();

  private getTurret(config: LaserTurretConfig): LaserTurret {
    let turret = this.turretCache.get(config.id);
    if (!turret || turret.config !== config) {
      turret = new LaserTurret(config);
      this.turretCache.set(config.id, turret);
    }
    return turret;
  }

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ROOM_SIZE;
    this.canvas.height = ROOM_SIZE;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2D canvas context');
    this.ctx = ctx;
  }

  public renderRoom(
    room: ScreenData,
    levelMap: LevelMap,
    player?: Player,
    particles?: ParticleSystem,
    dt: number = 0.016,
    projectiles?: LaserProjectile[]
  ): HTMLCanvasElement {
    this.time += dt;
    this.renderRoomToContext(this.ctx, room, levelMap, player, particles, this.time, projectiles);
    return this.canvas;
  }

  private staticCache: Map<string, HTMLCanvasElement> = new Map();

  public invalidateCache(roomId?: string): void {
    if (roomId) {
      for (const key of this.staticCache.keys()) {
        if (key.startsWith(roomId)) {
          this.staticCache.delete(key);
        }
      }
    } else {
      this.staticCache.clear();
    }
  }

  public getStaticCanvas(room: ScreenData): HTMLCanvasElement {
    const cacheKey = `${room.id}_${room.themeColor}_${room.accentColor}`;
    let cached = this.staticCache.get(cacheKey);
    if (cached) return cached;

    cached = document.createElement('canvas');
    cached.width = ROOM_SIZE;
    cached.height = ROOM_SIZE;
    const sCtx = cached.getContext('2d');
    if (!sCtx) return cached;

    // 1. Dark Cybernetic Background
    sCtx.fillStyle = '#080c14';
    sCtx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE);

    // Subtle background grid (batched)
    sCtx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
    sCtx.lineWidth = 1;
    sCtx.beginPath();
    for (let x = 0; x <= ROOM_SIZE; x += TILE_SIZE) {
      sCtx.moveTo(x, 0);
      sCtx.lineTo(x, ROOM_SIZE);
    }
    for (let y = 0; y <= ROOM_SIZE; y += TILE_SIZE) {
      sCtx.moveTo(0, y);
      sCtx.lineTo(ROOM_SIZE, y);
    }
    sCtx.stroke();

    // 2. Pre-render Static Solid and One-Way Tiles
    const primary = room.themeColor;
    const accent = room.accentColor;

    for (let r = 0; r < room.tiles.length; r++) {
      for (let c = 0; c < room.tiles[r].length; c++) {
        const tile = room.tiles[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === TileType.SOLID) {
          this.drawSolidTile(sCtx, x, y, primary, accent);
        } else if (tile === TileType.ONE_WAY) {
          this.drawOneWayTile(sCtx, x, y, primary);
        }
      }
    }

    // 3. Outer Face Border Glow (static)
    sCtx.strokeStyle = primary;
    sCtx.lineWidth = 3;
    sCtx.shadowColor = primary;
    sCtx.shadowBlur = 12;
    sCtx.strokeRect(1.5, 1.5, ROOM_SIZE - 3, ROOM_SIZE - 3);
    sCtx.shadowBlur = 0;

    this.staticCache.set(cacheKey, cached);
    return cached;
  }

  public renderRoomToContext(
    ctx: CanvasRenderingContext2D,
    room: ScreenData,
    levelMap: LevelMap,
    player?: Player,
    particles?: ParticleSystem,
    animTime?: number,
    projectiles?: LaserProjectile[],
    turrets?: LaserTurret[]
  ): void {
    if (animTime !== undefined) {
      this.time = animTime;
    }

    // 1. Blit Pre-Rendered Static Layer (Zero-cost background, grid, solid tiles, header, border glow)
    const staticCanvas = this.getStaticCanvas(room);
    ctx.drawImage(staticCanvas, 0, 0);

    // 2. Render Animated / Dynamic Tiles Only
    const primary = room.themeColor;

    for (let r = 0; r < room.tiles.length; r++) {
      for (let c = 0; c < room.tiles[r].length; c++) {
        const tile = room.tiles[r][c];
        if (tile === TileType.EMPTY || tile === TileType.SOLID || tile === TileType.ONE_WAY) continue;

        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        switch (tile) {
          case TileType.SPIKE: {
            const spikeDir = getSpikeDirection(room, r, c);
            this.drawSpikeTile(ctx, x, y, spikeDir);
            break;
          }
          case TileType.BOUNCE:
            this.drawBounceTile(ctx, x, y);
            break;
          case TileType.CRUMBLE:
            this.drawCrumbleTile(ctx, x, y, primary);
            break;
          case TileType.GOAL:
            this.drawGoalTile(ctx, x, y);
            break;
        }
      }
    }

    // 3. Render Collectibles
    for (const item of room.collectibles) {
      if (levelMap.isItemCollected(item.id)) continue;
      this.drawCollectible(ctx, item, primary);
    }

    // 3.5 Render Moving Platforms (Holographic guide rails, hover chassis, thrusters)
    if (room.movingPlatforms && room.movingPlatforms.length > 0) {
      this.drawMovingPlatforms(ctx, room, particles);
    }

    // 3.6 Render Laser Barriers (Pylons, warning telegraph, high-voltage active beam)
    if (room.laserBarriers && room.laserBarriers.length > 0) {
      this.drawLaserBarriers(ctx, room, particles);
    }

    // 3.7 Render Laser Turrets & Shooting Lasers (Raycast beams, wall mounts, projectile bolts)
    if ((room.laserTurrets && room.laserTurrets.length > 0) || (projectiles && projectiles.length > 0)) {
      this.drawLaserTurrets(ctx, room, projectiles, particles, player, turrets);
    }

    // 3.8 Render Quantum Teleportation Portals (Vibrating outer border, destination color reflection)
    if (room.portals && room.portals.length > 0) {
      this.drawPortals(ctx, room, levelMap);
    }

    // 4. Render Exit Boundary Portals / Indicators (pulsing animated arrows)
    this.drawExitIndicators(ctx, room, levelMap);

    // 5. Render Room Header / Subtitle (overlay on top of obstacles)
    this.drawRoomHeader(ctx, room);

    // 6. Render Particles
    if (particles) {
      particles.render(ctx);
    }

    // 6. Render Player (if present on this face)
    if (player) {
      player.primaryColor = primary;
      player.render(ctx, particles);
    }

    // 7. Developer Debug Overlay (Hitboxes, Grid, Dev Status)
    this.drawDebugOverlay(ctx, room, player, projectiles, turrets);
  }

  private drawDebugOverlay(
    ctx: CanvasRenderingContext2D,
    room: ScreenData,
    player?: Player,
    projectiles?: LaserProjectile[],
    turrets?: LaserTurret[]
  ): void {
    const dev = DevManager.getInstance();
    if (!dev.enabled) return;

    ctx.save();

    // 1. Tile Grid & Tile Type Badges
    if (dev.showTileGrid) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      for (let r = 0; r < room.tiles.length; r++) {
        for (let c = 0; c < room.tiles[r].length; c++) {
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

          const tile = room.tiles[r][c];
          if (tile !== TileType.EMPTY) {
            let label = '';
            let color = '#ffffff';
            switch (tile) {
              case TileType.SOLID: label = 'SOL'; color = '#00f0ff'; break;
              case TileType.ONE_WAY: label = 'ONE'; color = '#ffe600'; break;
              case TileType.SPIKE: label = 'SPK'; color = '#ff0055'; break;
              case TileType.BOUNCE: label = 'BNC'; color = '#39ff14'; break;
              case TileType.CRUMBLE: label = 'CRM'; color = '#ff8800'; break;
              case TileType.GOAL: label = 'GOL'; color = '#ffff00'; break;
            }
            ctx.fillStyle = color;
            ctx.fillText(label, x + 2, y + 2);
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillText(`${c},${r}`, x + 2, y + 2);
          }
        }
      }
    }

    // 2. Hitbox Visualizer
    if (dev.showHitboxes) {
      // 2a. Spikes forgiving hitboxes
      for (let r = 0; r < room.tiles.length; r++) {
        for (let c = 0; c < room.tiles[r].length; c++) {
          if (room.tiles[r][c] === TileType.SPIKE) {
            const dir = getSpikeDirection(room, r, c);
            const tLeft = c * TILE_SIZE;
            const tTop = r * TILE_SIZE;
            let hLeft = tLeft;
            let hRight = tLeft + TILE_SIZE;
            let hTop = tTop;
            let hBottom = tTop + TILE_SIZE;

            if (dir === 'up') {
              hLeft += 4; hRight -= 4; hTop += 10;
            } else if (dir === 'down') {
              hLeft += 4; hRight -= 4; hBottom -= 10;
            } else if (dir === 'right') {
              hTop += 4; hBottom -= 4; hRight -= 10;
            } else if (dir === 'left') {
              hTop += 4; hBottom -= 4; hLeft += 10;
            }
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hLeft, hTop, hRight - hLeft, hBottom - hTop);
          }
        }
      }

      // 2b. Moving Platforms hitboxes
      if (room.movingPlatforms) {
        for (const plat of room.movingPlatforms) {
          ctx.strokeStyle = '#ffe600';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(plat.startX, plat.startY, plat.width, plat.height ?? 16);
          // Destination ghost
          ctx.strokeStyle = 'rgba(255, 230, 0, 0.35)';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(plat.endX, plat.endY, plat.width, plat.height ?? 16);
          ctx.setLineDash([]);
        }
      }

      // 2c. Laser Barriers hitboxes
      if (room.laserBarriers) {
        for (const b of room.laserBarriers) {
          ctx.strokeStyle = '#ff00aa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(b.startX1, b.startY1);
          ctx.lineTo(b.startX2, b.startY2);
          ctx.stroke();
        }
      }

      // 2d. Projectiles hitboxes
      if (projectiles) {
        for (const p of projectiles) {
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(p.x - p.width * 0.5, p.y - p.height * 0.5, p.width, p.height);
        }
      }

      // 2e. Portals hitboxes
      if (room.portals) {
        for (const port of room.portals) {
          ctx.strokeStyle = '#b026ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(port.x, port.y, port.width ?? 44, port.height ?? 68);
        }
      }

      // 2f. Player Hitbox
      if (player) {
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, player.width, player.height);

        // Velocity vector
        ctx.beginPath();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        const centerX = player.x + player.width * 0.5;
        const centerY = player.y + player.height * 0.5;
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + player.vx * 0.1, centerY + player.vy * 0.1);
        ctx.stroke();

        // Coordinates badge above player
        ctx.fillStyle = '#39ff14';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `(${Math.round(player.x)}, ${Math.round(player.y)})`,
          centerX,
          player.y - 8
        );
      }

      // 2g. Turret Raycast Collision & Targeting Visualizer
      if (room.laserTurrets && room.laserTurrets.length > 0) {
        const platforms: MovingPlatform[] = [];
        if (room.movingPlatforms) {
          for (const cfg of room.movingPlatforms) {
            platforms.push(new MovingPlatform(cfg, this.time));
          }
        }

        const playerTarget = player ? { x: player.x + player.width * 0.5, y: player.y + player.height * 0.5 } : null;

        for (const config of room.laserTurrets) {
          const activeTurret = turrets?.find((t) => t.config.id === config.id);
          const turret = activeTurret || this.getTurret(config);
          const nozzle = turret.getNozzlePosition(playerTarget);
          const ray = LaserTurret.castRay(nozzle.x, nozzle.y, nozzle.angle, room.tiles, platforms);
          const intersectsPlayer = player
            ? LaserTurret.rayIntersectsPlayer(nozzle.x, nozzle.y, ray.hitX, ray.hitY, player)
            : false;

          // Turret chassis mount bounding box (20x20)
          ctx.save();
          ctx.strokeStyle = '#ff9900';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.strokeRect(config.x - 10, config.y - 10, 20, 20);

          // Turret ID badge
          ctx.fillStyle = '#ff9900';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`TURRET [${config.id}]`, config.x, config.y - 12);

          // Auto-target detection range circle
          if (config.autoTarget && config.targetRange) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 153, 0, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.arc(config.x, config.y, config.targetRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // Raycast trajectory line from nozzle to obstacle hit point
          ctx.strokeStyle = intersectsPlayer ? '#ff0055' : 'rgba(0, 240, 255, 0.85)';
          ctx.lineWidth = intersectsPlayer ? 2.5 : 1.5;
          ctx.setLineDash(intersectsPlayer ? [6, 3] : [4, 4]);
          ctx.beginPath();
          ctx.moveTo(nozzle.x, nozzle.y);
          ctx.lineTo(ray.hitX, ray.hitY);
          ctx.stroke();

          // Nozzle emission point
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(nozzle.x, nozzle.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Collision hit point crosshair indicator
          ctx.strokeStyle = intersectsPlayer ? '#ff0055' : '#00f0ff';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(ray.hitX, ray.hitY, 4, 0, Math.PI * 2);
          ctx.stroke();

          // Collision surface normal vector (arrow)
          if (ray.normalX !== 0 || ray.normalY !== 0) {
            const arrowLen = 14;
            const normEndX = ray.hitX + ray.normalX * arrowLen;
            const normEndY = ray.hitY + ray.normalY * arrowLen;
            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ray.hitX, ray.hitY);
            ctx.lineTo(normEndX, normEndY);
            ctx.stroke();

            // Arrowhead
            const headAngle = Math.atan2(ray.normalY, ray.normalX);
            ctx.fillStyle = '#ffe600';
            ctx.beginPath();
            ctx.moveTo(normEndX, normEndY);
            ctx.lineTo(
              normEndX - 5 * Math.cos(headAngle - Math.PI / 6),
              normEndY - 5 * Math.sin(headAngle - Math.PI / 6)
            );
            ctx.lineTo(
              normEndX - 5 * Math.cos(headAngle + Math.PI / 6),
              normEndY - 5 * Math.sin(headAngle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }

          // Hit info badge
          ctx.fillStyle = intersectsPlayer ? '#ff0055' : '#00f0ff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          const hitLabel = intersectsPlayer
            ? 'HIT: PLAYER ⚠'
            : `${ray.hitType.toUpperCase()} (${Math.round(ray.distance)}px)`;
          ctx.fillText(hitLabel, ray.hitX + 6, ray.hitY - 4);

          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  private drawSolidTile(ctx: CanvasRenderingContext2D, x: number, y: number, primary: string, _accent: string): void {
    ctx.save();
    // Inner fill
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Neon edge highlight
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.shadowColor = primary;
    ctx.shadowBlur = 6;
    ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    // Subtle corner circuit accent
    ctx.fillStyle = primary;
    ctx.fillRect(x + 3, y + 3, 3, 3);
    ctx.restore();
  }

  private drawOneWayTile(ctx: CanvasRenderingContext2D, x: number, y: number, primary: string): void {
    ctx.save();
    // Thin horizontal luminous bar
    ctx.fillStyle = primary;
    ctx.shadowColor = primary;
    ctx.shadowBlur = 8;
    ctx.fillRect(x, y, TILE_SIZE, 8);

    // Downward translucent chevrons
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 10);
    ctx.lineTo(x + 20, y + 18);
    ctx.lineTo(x + 30, y + 10);
    ctx.stroke();
    ctx.restore();
  }

  private drawSpikeTile(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right' = 'up'
  ): void {
    ctx.save();
    const pulse = 0.8 + Math.sin(this.time * 8) * 0.2;
    ctx.fillStyle = '#ff0055';
    ctx.strokeStyle = '#ff3377';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 2;

    switch (direction) {
      case 'up':
        // Two spikes on floor/platform pointing up
        for (let s = 0; s < 2; s++) {
          const sx = x + s * 20;
          ctx.beginPath();
          ctx.moveTo(sx, y + TILE_SIZE);
          ctx.lineTo(sx + 10, y + 8);
          ctx.lineTo(sx + 20, y + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Metallic apex highlight
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(sx + 8, y + TILE_SIZE);
          ctx.lineTo(sx + 10, y + 14);
          ctx.lineTo(sx + 12, y + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ff0055';
        }
        break;

      case 'down':
        // Two spikes hanging from roof/ceiling pointing down
        for (let s = 0; s < 2; s++) {
          const sx = x + s * 20;
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.lineTo(sx + 10, y + TILE_SIZE - 8);
          ctx.lineTo(sx + 20, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Metallic apex highlight
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(sx + 8, y);
          ctx.lineTo(sx + 10, y + TILE_SIZE - 14);
          ctx.lineTo(sx + 12, y);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ff0055';
        }
        break;

      case 'right':
        // Two spikes projecting from left wall pointing right into room
        for (let s = 0; s < 2; s++) {
          const sy = y + s * 20;
          ctx.beginPath();
          ctx.moveTo(x, sy);
          ctx.lineTo(x + TILE_SIZE - 8, sy + 10);
          ctx.lineTo(x, sy + 20);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Metallic apex highlight
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(x, sy + 8);
          ctx.lineTo(x + TILE_SIZE - 14, sy + 10);
          ctx.lineTo(x, sy + 12);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ff0055';
        }
        break;

      case 'left':
        // Two spikes projecting from right wall pointing left into room
        for (let s = 0; s < 2; s++) {
          const sy = y + s * 20;
          ctx.beginPath();
          ctx.moveTo(x + TILE_SIZE, sy);
          ctx.lineTo(x + 8, sy + 10);
          ctx.lineTo(x + TILE_SIZE, sy + 20);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Metallic apex highlight
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(x + TILE_SIZE, sy + 8);
          ctx.lineTo(x + 14, sy + 10);
          ctx.lineTo(x + TILE_SIZE, sy + 12);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ff0055';
        }
        break;
    }
    ctx.restore();
  }

  private drawBounceTile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    const springPulse = Math.sin(this.time * 6) * 3;
    ctx.fillStyle = '#113322';
    ctx.fillRect(x, y + 25, TILE_SIZE, 15);

    // Green glowing spring pad
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 12;
    ctx.fillRect(x + 4, y + 18 + springPulse, TILE_SIZE - 8, 8);
    ctx.restore();
  }

  private drawCrumbleTile(ctx: CanvasRenderingContext2D, x: number, y: number, primary: string): void {
    ctx.save();
    ctx.fillStyle = '#1a1824';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = primary;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.restore();
  }

  private drawGoalTile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    const cx = x + TILE_SIZE * 0.5;
    const cy = y + TILE_SIZE * 0.5;
    const rot = this.time * 2;

    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // Glowing rotating portal ring
    ctx.strokeStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.strokeRect(-18, -18, 36, 36);

    ctx.rotate(-rot * 2);
    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.strokeRect(-12, -12, 24, 24);

    ctx.restore();
  }

  private drawCollectible(
    ctx: CanvasRenderingContext2D,
    item: CollectibleData,
    _primary: string
  ): void {
    const { x, y, type } = item;
    const floatY = Math.sin(this.time * 4 + x) * 6;
    const cx = x;
    const cy = y + floatY;

    if (type === 'key') {
      const color = item.color || getGateColor(item.id);
      ctx.save();
      ctx.translate(cx, cy);

      // Rotating cyber key
      const rot = Math.sin(this.time * 2.5 + x * 0.04) * 0.3 - 0.15;
      ctx.rotate(rot);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2.5;

      // Outer head ring (hexagonal or rounded cyber head)
      ctx.beginPath();
      ctx.arc(0, -12, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Inner head cutout
      ctx.beginPath();
      ctx.arc(0, -12, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#080c14';
      ctx.fill();
      ctx.stroke();

      // Cyber core node inside head
      ctx.beginPath();
      ctx.arc(0, -12, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Stem / Shaft
      ctx.fillStyle = color;
      ctx.fillRect(-2.5, -3, 5, 22);

      // Teeth / Bits (two stepped digital cuts)
      ctx.fillRect(2.5, 7, 7, 3.5);
      ctx.fillRect(2.5, 14, 9, 4);

      // Specular highlight line along shaft
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -2, 2, 20);

      ctx.restore();

      // Floating holographic ID badge above key
      ctx.save();
      ctx.translate(cx, cy - 28);
      ctx.font = 'bold 9px "Courier New", monospace';
      const displayKeyText = item.label || item.id;
      const labelText = `KEY: ${displayKeyText}`;
      const textWidth = ctx.measureText(labelText).width;
      const pad = 6;
      ctx.fillStyle = 'rgba(8, 12, 22, 0.88)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.rect(-textWidth * 0.5 - pad, -9, textWidth + pad * 2, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 0, 0);
      ctx.restore();
      return;
    }

    ctx.save();
    const rot = this.time * 3;
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const color = type === 'prism' ? '#ff00aa' : '#ffe600';
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    // Draw rotating diamond / octahedron
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawExitIndicators(ctx: CanvasRenderingContext2D, room: ScreenData, levelMap?: LevelMap): void {
    ctx.save();
    const arrowPulse = (Math.sin(this.time * 5) + 1) * 0.5; // 0 to 1

    const dirs: ExitDirection[] = ['right', 'left', 'up', 'down'];

    for (const dir of dirs) {
      const gate = getExitGate(room, dir);
      const isGated = !!gate;
      const isUnlocked = isGated ? (levelMap ? levelMap.hasKey(gate.id) : false) : false;
      const isOpen = isGated ? isUnlocked : room.exits[dir] === true;

      if (isGated) {
        const gateColor = getGateColor(gate.id, gate.color);
        const displayLabel = levelMap ? levelMap.getRequiredKeyLabel(gate) : (gate.label || gate.id);
        if (!isUnlocked) {
          this.drawLockedGateBarrier(ctx, dir, gate, gateColor, displayLabel);
        } else {
          this.drawUnlockedGateway(ctx, dir, gate, gateColor, arrowPulse, displayLabel);
        }
      } else if (isOpen) {
        const color = room.themeColor;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3;

        if (dir === 'right') {
          const ax = ROOM_SIZE - 25 + arrowPulse * 6;
          const ay = ROOM_SIZE * 0.75;
          this.drawArrow(ctx, ax, ay, 0);
        } else if (dir === 'left') {
          const ax = 25 - arrowPulse * 6;
          const ay = ROOM_SIZE * 0.75;
          this.drawArrow(ctx, ax, ay, Math.PI);
        } else if (dir === 'up') {
          const ax = ROOM_SIZE * 0.5;
          const ay = 25 - arrowPulse * 6;
          this.drawArrow(ctx, ax, ay, -Math.PI / 2);
        } else if (dir === 'down') {
          const ax = ROOM_SIZE * 0.5;
          const ay = ROOM_SIZE - 25 + arrowPulse * 6;
          this.drawArrow(ctx, ax, ay, Math.PI / 2);
        }
      }
    }

    ctx.restore();
  }

  private drawLockedGateBarrier(
    ctx: CanvasRenderingContext2D,
    dir: ExitDirection,
    gate: ExitGateConfig,
    gateColor: string,
    displayLabel?: string
  ): void {
    ctx.save();
    const pulse = 0.7 + 0.3 * Math.sin(this.time * 8);

    ctx.strokeStyle = gateColor;
    ctx.fillStyle = gateColor;
    ctx.shadowColor = gateColor;
    ctx.shadowBlur = 14 * pulse;

    const nodeLabel = displayLabel || gate.label || gate.id;

    if (dir === 'right' || dir === 'left') {
      const isRight = dir === 'right';
      const bx = isRight ? ROOM_SIZE - 8 : 8;
      const y1 = 480;
      const y2 = 720;
      const ay = ROOM_SIZE * 0.75;

      // Emitter pylons
      ctx.fillRect(isRight ? ROOM_SIZE - 14 : 2, y1 - 10, 12, 14);
      ctx.fillRect(isRight ? ROOM_SIZE - 14 : 2, y2 - 4, 12, 14);

      // Shimmering Laser Forcefield lines
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(bx, y1);
      ctx.lineTo(bx, y2);
      ctx.moveTo(isRight ? bx - 6 : bx + 6, y1);
      ctx.lineTo(isRight ? bx - 6 : bx + 6, y2);
      ctx.stroke();

      // Energy mesh crossbars
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4 * pulse;
      ctx.beginPath();
      for (let y = y1 + 15; y < y2; y += 20) {
        ctx.moveTo(isRight ? bx - 10 : bx, y);
        ctx.lineTo(isRight ? bx : bx + 10, y + 10);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Holographic Lock Node
      const nodeX = isRight ? ROOM_SIZE - 68 : 68;
      this.drawLockBadge(ctx, nodeX, ay, nodeLabel, gateColor);
    } else {
      // 'up' or 'down'
      const isUp = dir === 'up';
      const by = isUp ? 8 : ROOM_SIZE - 8;
      const x1 = 300;
      const x2 = 500;
      const ax = ROOM_SIZE * 0.5;

      // Emitter pylons
      ctx.fillRect(x1 - 10, isUp ? 2 : ROOM_SIZE - 14, 14, 12);
      ctx.fillRect(x2 - 4, isUp ? 2 : ROOM_SIZE - 14, 14, 12);

      // Shimmering Laser Forcefield lines
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, by);
      ctx.lineTo(x2, by);
      ctx.moveTo(x1, isUp ? by + 6 : by - 6);
      ctx.lineTo(x2, isUp ? by + 6 : by - 6);
      ctx.stroke();

      // Energy mesh crossbars
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4 * pulse;
      ctx.beginPath();
      for (let x = x1 + 15; x < x2; x += 20) {
        ctx.moveTo(x, isUp ? by : by - 10);
        ctx.lineTo(x + 10, isUp ? by + 10 : by);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Holographic Lock Node
      const nodeY = isUp ? 68 : ROOM_SIZE - 68;
      this.drawLockBadge(ctx, ax, nodeY, nodeLabel, gateColor);
    }

    ctx.restore();
  }

  private drawUnlockedGateway(
    ctx: CanvasRenderingContext2D,
    dir: ExitDirection,
    gate: ExitGateConfig,
    gateColor: string,
    arrowPulse: number,
    displayLabel?: string
  ): void {
    ctx.save();
    ctx.strokeStyle = gateColor;
    ctx.fillStyle = gateColor;
    ctx.shadowColor = gateColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;

    const nodeLabel = displayLabel || gate.label || gate.id;

    // Draw animated exit arrows in the gate's color
    if (dir === 'right') {
      const ax = ROOM_SIZE - 25 + arrowPulse * 6;
      const ay = ROOM_SIZE * 0.75;
      this.drawArrow(ctx, ax, ay, 0);
      this.drawUnlockedBadge(ctx, ROOM_SIZE - 68, ay, nodeLabel, gateColor);
    } else if (dir === 'left') {
      const ax = 25 - arrowPulse * 6;
      const ay = ROOM_SIZE * 0.75;
      this.drawArrow(ctx, ax, ay, Math.PI);
      this.drawUnlockedBadge(ctx, 68, ay, nodeLabel, gateColor);
    } else if (dir === 'up') {
      const ax = ROOM_SIZE * 0.5;
      const ay = 25 - arrowPulse * 6;
      this.drawArrow(ctx, ax, ay, -Math.PI / 2);
      this.drawUnlockedBadge(ctx, ax, 68, nodeLabel, gateColor);
    } else if (dir === 'down') {
      const ax = ROOM_SIZE * 0.5;
      const ay = ROOM_SIZE - 25 + arrowPulse * 6;
      this.drawArrow(ctx, ax, ay, Math.PI / 2);
      this.drawUnlockedBadge(ctx, ax, ROOM_SIZE - 68, nodeLabel, gateColor);
    }

    ctx.restore();
  }

  private drawLockBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    displayName: string,
    color: string
  ): void {
    const label = `LOCKED: ${displayName}`;
    ctx.font = 'bold 9px "Courier New", monospace';
    const textWidth = ctx.measureText(label).width;
    const badgeW = textWidth + 34;
    const badgeH = 22;

    const halfW = badgeW * 0.5;
    const drawX = Math.max(halfW + 8, Math.min(ROOM_SIZE - halfW - 8, x));

    ctx.save();
    ctx.translate(drawX, y);

    // Badge frame
    ctx.fillStyle = 'rgba(6, 10, 20, 0.92)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.rect(-badgeW * 0.5, -badgeH * 0.5, badgeW, badgeH);
    ctx.fill();
    ctx.stroke();

    // Padlock icon on the left
    const iconX = -badgeW * 0.5 + 11;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(iconX, -2.5, 3.5, Math.PI, 0); // shackle
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(iconX - 4.5, -0.5, 9, 7); // padlock body

    ctx.fillStyle = '#060a14';
    ctx.beginPath();
    ctx.arc(iconX, 2.5, 1.2, 0, Math.PI * 2); // keyhole
    ctx.fill();

    // Label text
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, iconX + 8, 0.5);

    ctx.restore();
  }

  private drawUnlockedBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    displayName: string,
    color: string
  ): void {
    const label = `OPEN: ${displayName}`;
    ctx.font = 'bold 9px "Courier New", monospace';
    const textWidth = ctx.measureText(label).width;
    const badgeW = textWidth + 18;
    const badgeH = 18;

    const halfW = badgeW * 0.5;
    const drawX = Math.max(halfW + 8, Math.min(ROOM_SIZE - halfW - 8, x));

    ctx.save();
    ctx.translate(drawX, y);

    ctx.fillStyle = 'rgba(6, 10, 20, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.rect(-badgeW * 0.5, -badgeH * 0.5, badgeW, badgeH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0.5);

    ctx.restore();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(8, 0);
    ctx.lineTo(-10, 8);
    ctx.stroke();
    ctx.restore();
  }

  private drawRoomHeader(ctx: CanvasRenderingContext2D, room: ScreenData): void {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 28, 0.85)';
    ctx.fillRect(20, 16, 380, 48);
    ctx.strokeStyle = room.themeColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 16, 380, 48);

    // Title text: check if coordinates are already embedded in the title to avoid duplication
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    const coordsA = `[${room.coords.x},${room.coords.y}]`;
    const coordsB = `[${room.coords.x}, ${room.coords.y}]`;
    const coordsC = `(${room.coords.x},${room.coords.y})`;
    const coordsD = `(${room.coords.x}, ${room.coords.y})`;
    const hasCoords =
      room.title.includes(coordsA) ||
      room.title.includes(coordsB) ||
      room.title.includes(coordsC) ||
      room.title.includes(coordsD);
    const titleText = hasCoords ? room.title : `${room.title} [${room.coords.x}, ${room.coords.y}]`;
    ctx.fillText(titleText, 32, 38);

    // Subtitle text
    if (room.subtitle) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = room.themeColor;
      ctx.fillText(room.subtitle, 32, 54);
    }
    ctx.restore();
  }

  private drawMovingPlatforms(
    ctx: CanvasRenderingContext2D,
    room: ScreenData,
    particles?: ParticleSystem
  ): void {
    if (!room.movingPlatforms) return;

    for (const config of room.movingPlatforms) {
      const state = MovingPlatform.computePlatformState(config, this.time);
      const color = config.themeColor || room.accentColor || room.themeColor;
      const w = config.width;
      const h = config.height ?? 16;
      const px = Math.round(state.x);
      const py = Math.round(state.y);

      // A. Holographic Magnetic Guide Rails
      ctx.save();
      const sx = config.startX + w * 0.5;
      const sy = config.startY + h * 0.5;
      const ex = config.endX + w * 0.5;
      const ey = config.endY + h * 0.5;

      // Draw guide path dashed line
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(this.time * 3);
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Draw endpoint magnetic docking nodes
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = color;
      for (const [nx, ny] of [[sx, sy], [ex, ey]]) {
        ctx.beginPath();
        ctx.arc(nx, ny, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // B. Underside Plasma Thrusters
      ctx.save();
      const numThrusters = w >= 90 ? 3 : 2;
      for (let i = 0; i < numThrusters; i++) {
        const tx = px + (w / (numThrusters + 1)) * (i + 1);
        const ty = py + h;

        // Nozzle mount
        ctx.fillStyle = '#080c14';
        ctx.fillRect(tx - 4, ty - 2, 8, 3);

        // Animated plasma exhaust flame
        const flamePulse = Math.sin(this.time * 28 + tx) * 3;
        const flameLen = Math.max(4, 7 + flamePulse);

        const flameGrad = ctx.createLinearGradient(tx, ty, tx, ty + flameLen);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.35, color);
        flameGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(tx - 3.5, ty + 1);
        ctx.lineTo(tx + 3.5, ty + 1);
        ctx.lineTo(tx, ty + 1 + flameLen);
        ctx.closePath();
        ctx.fillStyle = flameGrad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();

        // Emit occasional thruster micro-spark into particle system
        if (particles && !particles.isPaused && Math.random() < 0.08) {
          particles.emitDust(tx, ty + 2, 1, color);
        }
      }
      ctx.restore();

      // C. Hover Sled Body (Dark Obsidian Chassis with Chamfered Tech Trim)
      ctx.save();
      ctx.fillStyle = '#0a101d';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.roundRect(px, py, w, h, 4);
      ctx.fill();
      ctx.stroke();

      // D. Top Traction Surface (Bright luminous guide line)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.fillRect(px + 4, py + 1.5, w - 8, 2);

      // Micro LED dash lights along top edge
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      const numLeds = Math.floor((w - 16) / 14);
      for (let i = 0; i < numLeds; i++) {
        const lx = px + 10 + i * 14;
        ctx.fillRect(lx, py + 4.5, 6, 2);
      }

      // E. Center Power Reactor Core
      const cx = px + w * 0.5;
      const cy = py + h * 0.5 + 1;
      const corePulse = 0.6 + 0.4 * Math.sin(this.time * 6 + px * 0.1);

      // Outer reactor glow ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 * corePulse;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Inner fusion core
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();

      // F. Side Hazard Bumpers / Corner Accents
      ctx.fillStyle = color;
      ctx.fillRect(px + 2, py + 3, 2, h - 6);
      ctx.fillRect(px + w - 4, py + 3, 2, h - 6);

      ctx.restore();
    }
  }

  private drawLaserBarriers(
    ctx: CanvasRenderingContext2D,
    room: ScreenData,
    _particles?: ParticleSystem
  ): void {
    if (!room.laserBarriers || room.laserBarriers.length === 0) return;

    const dev = DevManager.getInstance();
    const isFrozen = dev.enabled && dev.hazardMode === 'frozen';

    for (const config of room.laserBarriers) {
      // When frozen, lock position to start (frozen in place) and state to inactive
      const state = isFrozen
        ? {
            x1: config.startX1,
            y1: config.startY1,
            x2: config.startX2,
            y2: config.startY2,
            state: 'INACTIVE' as const,
            isActive: false,
            chargeProgress: 0,
          }
        : LaserBarrier.computeBarrierState(config, this.time);
      const color = config.themeColor || '#ff0055';
      const width = config.width ?? 4;

      // 1. If moving, draw holographic guide track
      if (config.speed && config.speed > 0 && (config.endX1 !== undefined || config.endY1 !== undefined)) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.globalAlpha = isFrozen ? 0.08 : 0.22;
        ctx.beginPath();
        ctx.moveTo(config.startX1, config.startY1);
        ctx.lineTo(config.endX1 ?? config.startX1, config.endY1 ?? config.startY1);
        ctx.moveTo(config.startX2, config.startY2);
        ctx.lineTo(config.endX2 ?? config.startX2, config.endY2 ?? config.startY2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Render Beam (only when NOT frozen)
      if (!isFrozen) {
        if (state.state === 'WARNING') {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          const pulse = 0.3 + 0.5 * Math.sin(this.time * 24);
          ctx.globalAlpha = Math.max(0.1, pulse * state.chargeProgress);
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 * state.chargeProgress;

          ctx.beginPath();
          ctx.moveTo(state.x1, state.y1);
          ctx.lineTo(state.x2, state.y2);
          ctx.stroke();
          ctx.restore();
        } else if (state.state === 'ACTIVE') {
          ctx.save();
          const jitter = Math.sin(this.time * 50 + state.x1) * 0.6;

          // Outer glow
          ctx.strokeStyle = color;
          ctx.lineWidth = width + 8 + Math.abs(jitter);
          ctx.globalAlpha = 0.3;
          ctx.shadowColor = color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(state.x1, state.y1);
          ctx.lineTo(state.x2, state.y2);
          ctx.stroke();

          // Mid core beam
          ctx.lineWidth = width + 2;
          ctx.globalAlpha = 0.85;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(state.x1, state.y1);
          ctx.lineTo(state.x2, state.y2);
          ctx.stroke();

          // Inner white-hot plasma filament
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1.5, width * 0.4);
          ctx.globalAlpha = 0.95;
          ctx.shadowBlur = 2;
          ctx.beginPath();
          ctx.moveTo(state.x1, state.y1);
          ctx.lineTo(state.x2, state.y2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Render Emitter Pylons at both ends
      this.drawPylon(ctx, state.x1, state.y1, color, state.state, state.chargeProgress, isFrozen);
      this.drawPylon(ctx, state.x2, state.y2, color, state.state, state.chargeProgress, isFrozen);
    }
  }

  private drawPylon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    state: 'INACTIVE' | 'WARNING' | 'ACTIVE',
    chargeProgress: number,
    isFrozen: boolean = false
  ): void {
    ctx.save();
    // Pylon metallic base
    ctx.fillStyle = isFrozen ? '#050810' : '#080e1a';
    ctx.strokeStyle = isFrozen ? '#1e293b' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center emitter diode
    if (!isFrozen && state === 'ACTIVE') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (!isFrozen && state === 'WARNING') {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 20);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4 + 0.6 * pulse * chargeProgress;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 * chargeProgress;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = isFrozen ? '#0f172a' : '#1e293b';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLaserTurrets(
    ctx: CanvasRenderingContext2D,
    room: ScreenData,
    projectiles?: LaserProjectile[],
    _particles?: ParticleSystem,
    player?: Player,
    turrets?: LaserTurret[]
  ): void {
    const dev = DevManager.getInstance();
    const isFrozen = dev.enabled && dev.hazardMode === 'frozen';

    // 1. Render Turrets
    if (room.laserTurrets && room.laserTurrets.length > 0) {
      // Pre-compute moving platforms for raycast collision
      const platforms: MovingPlatform[] = [];
      if (room.movingPlatforms) {
        for (const cfg of room.movingPlatforms) {
          platforms.push(new MovingPlatform(cfg, this.time));
        }
      }

      const playerTarget = (!isFrozen && player && player.isAlive)
        ? { x: player.x + player.width * 0.5, y: player.y + player.height * 0.5 }
        : null;

      for (const config of room.laserTurrets) {
        const color = config.themeColor || '#ff0055';
        const mode = config.mode ?? 'projectile';
        const { x, y } = config;
        const activeTurret = turrets?.find((t) => t.config.id === config.id);
        const turret = activeTurret || this.getTurret(config);
        if (!activeTurret && mode === 'beam' && !isFrozen) {
          turret.updateBeam(this.time, playerTarget);
        }
        const nozzle = isFrozen
          ? turret.getNozzlePosition(null)
          : turret.getNozzlePosition(playerTarget);

        // A. If beam mode, render dynamic beam ONLY when NOT frozen
        if (mode === 'beam' && !isFrozen) {
          const beam = turret.getBeamState(this.time);
          const ray = LaserTurret.castRay(nozzle.x, nozzle.y, nozzle.angle, room.tiles, platforms);

          if (beam.state === 'WARNING') {
            // Telegraph warning guide line
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            const pulse = 0.3 + 0.5 * Math.sin(this.time * 24);
            ctx.globalAlpha = Math.max(0.1, pulse * beam.chargeProgress);
            ctx.shadowColor = color;
            ctx.shadowBlur = 8 * beam.chargeProgress;
            ctx.beginPath();
            ctx.moveTo(nozzle.x, nozzle.y);
            ctx.lineTo(ray.hitX, ray.hitY);
            ctx.stroke();
            ctx.restore();
          } else if (beam.isActive) {
            // High-voltage continuous beam
            ctx.save();
            const jitter = Math.sin(this.time * 45 + nozzle.x) * 0.5;

            // Outer glow
            ctx.strokeStyle = color;
            ctx.lineWidth = 10 + Math.abs(jitter);
            ctx.globalAlpha = 0.3;
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(nozzle.x, nozzle.y);
            ctx.lineTo(ray.hitX, ray.hitY);
            ctx.stroke();

            // Core beam
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.85;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(nozzle.x, nozzle.y);
            ctx.lineTo(ray.hitX, ray.hitY);
            ctx.stroke();

            // Inner filament
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.globalAlpha = 0.95;
            ctx.shadowBlur = 2;
            ctx.beginPath();
            ctx.moveTo(nozzle.x, nozzle.y);
            ctx.lineTo(ray.hitX, ray.hitY);
            ctx.stroke();

            // Impact scorch flare at collision point
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(ray.hitX, ray.hitY, 4 + Math.abs(jitter) * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }
        }

        // B. Render Wall-Mount Turret Body (Oriented to Firing Angle)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(nozzle.angle);

        ctx.fillStyle = isFrozen ? '#060a12' : '#0a101d';
        ctx.strokeStyle = isFrozen ? '#1e293b' : '#334155';
        ctx.lineWidth = 2;

        // Base chassis
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 4);
        ctx.fill();
        ctx.stroke();

        // Cannon barrel nozzle along local +X
        ctx.strokeStyle = isFrozen ? '#334155' : color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(13, 0);
        ctx.stroke();

        // Status lens / LED
        if (isFrozen) {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const lensColor = mode === 'beam'
            ? (turret.isBeamActive ? color : '#39ff14')
            : (config.autoTarget ? '#39ff14' : color);
          ctx.fillStyle = lensColor;
          ctx.shadowColor = lensColor;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Optional targeting reticle ring for auto-targeting turrets
          if (config.autoTarget) {
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    // 2. Render In-Flight Projectiles (Oriented to Flight Angle) - Suppressed when frozen
    if (!isFrozen && projectiles && projectiles.length > 0) {
      ctx.save();
      for (const p of projectiles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle ?? 0);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        const pLen = p.width || 20;
        const pHalfL = pLen * 0.5;

        // Plasma capsule body
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(-pHalfL, -3, pLen, 6, 3);
        ctx.fill();

        // White-hot plasma core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-pHalfL + 2, -2, pLen - 4, 4, 2);
        ctx.fill();

        ctx.restore();
      }
      ctx.restore();
    }
  }

  /**
   * Renders quantum teleportation portals with cyber glow, vibrating outer borders,
   * swirling dimensional vortex, and interior reflecting the destination sector's color.
   */
  public drawPortals(
    ctx: CanvasRenderingContext2D,
    room: ScreenData,
    levelMap: LevelMap
  ): void {
    if (!room.portals || room.portals.length === 0) return;

    for (const portal of room.portals) {
      const x = portal.x;
      const y = portal.y;
      const w = portal.width ?? 44;
      const h = portal.height ?? 68;
      const cx = x + w * 0.5;
      const cy = y + h * 0.5;

      const portalColor = portal.themeColor || room.themeColor;
      const destColor = levelMap.getDestinationColor(portal, room);
      const isSource = !!portal.targetPortalId;

      ctx.save();

      // 1. High-Frequency Parametric Border Vibration
      const vibX = Math.sin(this.time * 34 + cy * 0.2) * 2.2;
      const vibY = Math.cos(this.time * 28 + cx * 0.2) * 2.2;
      const pulseGlow = 12 + Math.sin(this.time * 6) * 4;

      // 2. Base Ground Plate & Emitter Runner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(x - 4, y + h - 6, w + 8, 8, 3);
      ctx.fill();
      ctx.stroke();

      // Top Emitter Cap
      ctx.beginPath();
      ctx.roundRect(x + 4, y - 4, w - 8, 6, 2);
      ctx.fill();
      ctx.stroke();

      // 3. Inner Dimensional Aperture (Reflecting destination sector color)
      const apertureMargin = 6;
      const aptX = x + apertureMargin;
      const aptY = y + apertureMargin;
      const aptW = w - apertureMargin * 2;
      const aptH = h - apertureMargin * 2 - 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(aptX, aptY, aptW, aptH, Math.min(aptW * 0.5, 16));
      ctx.clip();

      // Dimensional Abyss Gradient with Destination Sector Color
      const radGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, aptH * 0.55);
      radGrad.addColorStop(0, '#ffffff');
      radGrad.addColorStop(0.25, destColor);
      radGrad.addColorStop(0.65, `${destColor}44`);
      radGrad.addColorStop(1, '#060a12');

      ctx.fillStyle = radGrad;
      ctx.fillRect(aptX, aptY, aptW, aptH);

      // Swirling Dimensional Vortex Rings (Rotating with time)
      const ringAngle1 = this.time * 3.2;
      const ringAngle2 = -this.time * 2.8;

      ctx.lineWidth = 1.5;
      ctx.shadowColor = destColor;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = destColor;

      // Orbit Ring 1
      ctx.beginPath();
      ctx.ellipse(cx, cy, aptW * 0.38, aptH * 0.18, ringAngle1, 0, Math.PI * 2);
      ctx.stroke();

      // Orbit Ring 2
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx, cy, aptW * 0.28, aptH * 0.12, ringAngle2, 0, Math.PI * 2);
      ctx.stroke();

      // Flow Chevrons / Quantum Motes
      const numMotes = 5;
      for (let i = 0; i < numMotes; i++) {
        // Source flows inward (0 to 1), destination flows outward
        const progress = isSource
          ? (1 - ((this.time * 1.8 + (i / numMotes)) % 1))
          : ((this.time * 1.8 + (i / numMotes)) % 1);

        const moteDist = progress * (aptH * 0.45);
        const moteAngle = (i / numMotes) * Math.PI * 2 + this.time * 2.5;
        const mx = cx + Math.cos(moteAngle) * (moteDist * (aptW / aptH));
        const my = cy + Math.sin(moteAngle) * moteDist;
        const moteAlpha = Math.sin(progress * Math.PI);

        ctx.fillStyle = i % 2 === 0 ? destColor : '#ffffff';
        ctx.globalAlpha = Math.max(0, Math.min(1, moteAlpha));
        ctx.beginPath();
        ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Central Singularity Core
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = destColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, 3 + Math.sin(this.time * 10) * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Kinetic Inversion Chevrons for reverseVelocity portals
      if (portal.reverseVelocity) {
        const revPhase = (this.time * 3) % 1;
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 8;
        const arrowY1 = cy - aptH * 0.25 + revPhase * 6;
        const arrowY2 = cy + aptH * 0.25 - revPhase * 6;
        ctx.beginPath();
        ctx.moveTo(cx - 5, arrowY1 + 3);
        ctx.lineTo(cx, arrowY1);
        ctx.lineTo(cx + 5, arrowY1 + 3);
        ctx.moveTo(cx - 5, arrowY2 - 3);
        ctx.lineTo(cx, arrowY2);
        ctx.lineTo(cx + 5, arrowY2 - 3);
        ctx.stroke();
      }

      ctx.restore(); // Restore clip

      // 4. Vibrating Outer Neon Frame & Containment Brackets
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = pulseGlow;
      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      // Draw vibrating outer border
      ctx.roundRect(
        x + vibX * 0.6,
        y + vibY * 0.6,
        w - vibX * 0.6,
        h - 2 - vibY * 0.6,
        Math.min(w * 0.5, 18)
      );
      ctx.stroke();

      // Secondary Vibrating Inner Pylon Contour
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(
        x + 2 + vibX,
        y + 2 + vibY,
        w - 4 - vibX,
        h - 6 - vibY,
        Math.min((w - 4) * 0.5, 16)
      );
      ctx.stroke();

      // Corner Containment Brackets & Energy Nodes
      const cornerSize = 7;
      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;

      // Top-Left bracket
      ctx.beginPath();
      ctx.moveTo(x - 2 + vibX, y + cornerSize);
      ctx.lineTo(x - 2 + vibX, y - 2 + vibY);
      ctx.lineTo(x + cornerSize, y - 2 + vibY);
      ctx.stroke();

      // Top-Right bracket
      ctx.beginPath();
      ctx.moveTo(x + w + 2 - vibX, y + cornerSize);
      ctx.lineTo(x + w + 2 - vibX, y - 2 + vibY);
      ctx.lineTo(x + w - cornerSize, y - 2 + vibY);
      ctx.stroke();

      // Bottom-Left bracket
      ctx.beginPath();
      ctx.moveTo(x - 2 + vibX, y + h - cornerSize);
      ctx.lineTo(x - 2 + vibX, y + h + 2 - vibY);
      ctx.lineTo(x + cornerSize, y + h + 2 - vibY);
      ctx.stroke();

      // Bottom-Right bracket
      ctx.beginPath();
      ctx.moveTo(x + w + 2 - vibX, y + h - cornerSize);
      ctx.lineTo(x + w + 2 - vibX, y + h + 2 - vibY);
      ctx.lineTo(x + w - cornerSize, y + h + 2 - vibY);
      ctx.stroke();

      // 5. Monospace Holographic Label / Target Tag
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const revTag = portal.reverseVelocity ? '↺ ' : '';
      const tagText = revTag + (portal.label || (isSource ? `${portal.id} ➔ ${portal.targetPortalId}` : portal.id));
      const tagW = ctx.measureText(tagText).width + 8;
      const tagH = 13;
      const tagX = cx - tagW * 0.5;
      const tagY = y - 8;

      ctx.fillStyle = 'rgba(8, 12, 20, 0.85)';
      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 1;
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSource ? '#ffffff' : portalColor;
      ctx.shadowBlur = 0;
      ctx.fillText(tagText, cx, tagY + tagH - 2);

      ctx.restore();
    }
  }
}
