import { FACE_SIZE, ScreenData, TILE_SIZE, TileType, getSpikeDirection, LaserTurretConfig } from '../world/ScreenData';
import { Player } from '../entities/Player';
import { ParticleSystem } from '../engine/ParticleSystem';
import { LevelMap } from '../world/LevelMap';
import { MovingPlatform } from '../entities/MovingPlatform';
import { LaserBarrier } from '../entities/LaserBarrier';
import { LaserTurret, LaserProjectile } from '../entities/LaserTurret';

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
    this.canvas.width = FACE_SIZE;
    this.canvas.height = FACE_SIZE;
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
    cached.width = FACE_SIZE;
    cached.height = FACE_SIZE;
    const sCtx = cached.getContext('2d');
    if (!sCtx) return cached;

    // 1. Dark Cybernetic Background
    sCtx.fillStyle = '#080c14';
    sCtx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

    // Subtle background grid (batched)
    sCtx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
    sCtx.lineWidth = 1;
    sCtx.beginPath();
    for (let x = 0; x <= FACE_SIZE; x += TILE_SIZE) {
      sCtx.moveTo(x, 0);
      sCtx.lineTo(x, FACE_SIZE);
    }
    for (let y = 0; y <= FACE_SIZE; y += TILE_SIZE) {
      sCtx.moveTo(0, y);
      sCtx.lineTo(FACE_SIZE, y);
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
    sCtx.strokeRect(1.5, 1.5, FACE_SIZE - 3, FACE_SIZE - 3);
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
      this.drawCollectible(ctx, item.x, item.y, item.type, primary);
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

    // 4. Render Exit Boundary Portals / Indicators (pulsing animated arrows)
    this.drawExitIndicators(ctx, room);

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
    x: number,
    y: number,
    type: 'core' | 'prism' | 'key',
    _primary: string
  ): void {
    ctx.save();
    const floatY = Math.sin(this.time * 4 + x) * 6;
    const rot = this.time * 3;
    const cx = x;
    const cy = y + floatY;

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

  private drawExitIndicators(ctx: CanvasRenderingContext2D, room: ScreenData): void {
    ctx.save();
    const arrowPulse = (Math.sin(this.time * 5) + 1) * 0.5; // 0 to 1
    const color = room.themeColor;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;

    // Right Exit Arrow
    if (room.exits.right) {
      const ax = FACE_SIZE - 25 + arrowPulse * 6;
      const ay = FACE_SIZE * 0.75;
      this.drawArrow(ctx, ax, ay, 0);
    }

    // Left Exit Arrow
    if (room.exits.left) {
      const ax = 25 - arrowPulse * 6;
      const ay = FACE_SIZE * 0.75;
      this.drawArrow(ctx, ax, ay, Math.PI);
    }

    // Up Exit Arrow
    if (room.exits.up) {
      const ax = FACE_SIZE * 0.5;
      const ay = 25 - arrowPulse * 6;
      this.drawArrow(ctx, ax, ay, -Math.PI / 2);
    }

    // Down Exit Arrow
    if (room.exits.down) {
      const ax = FACE_SIZE * 0.5;
      const ay = FACE_SIZE - 25 + arrowPulse * 6;
      this.drawArrow(ctx, ax, ay, Math.PI / 2);
    }

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

    // Title text
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${room.title} [${room.coords.x},${room.coords.y}]`, 32, 38);

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
        if (particles && Math.random() < 0.08) {
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

    for (const config of room.laserBarriers) {
      const state = LaserBarrier.computeBarrierState(config, this.time);
      const color = config.themeColor || '#ff0055';
      const width = config.width ?? 4;

      // 1. If moving, draw holographic guide track
      if (config.speed && config.speed > 0 && (config.endX1 !== undefined || config.endY1 !== undefined)) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.moveTo(config.startX1, config.startY1);
        ctx.lineTo(config.endX1 ?? config.startX1, config.endY1 ?? config.startY1);
        ctx.moveTo(config.startX2, config.startY2);
        ctx.lineTo(config.endX2 ?? config.startX2, config.endY2 ?? config.startY2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Render Beam (if warning or active)
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

      // 3. Render Emitter Pylons at both ends
      this.drawPylon(ctx, state.x1, state.y1, color, state.state, state.chargeProgress);
      this.drawPylon(ctx, state.x2, state.y2, color, state.state, state.chargeProgress);
    }
  }

  private drawPylon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    state: 'INACTIVE' | 'WARNING' | 'ACTIVE',
    chargeProgress: number
  ): void {
    ctx.save();
    // Pylon metallic base
    ctx.fillStyle = '#080e1a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center emitter diode
    if (state === 'ACTIVE') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (state === 'WARNING') {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 20);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4 + 0.6 * pulse * chargeProgress;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8 * chargeProgress;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e293b';
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
    // 1. Render Turrets
    if (room.laserTurrets && room.laserTurrets.length > 0) {
      // Pre-compute moving platforms for raycast collision
      const platforms: MovingPlatform[] = [];
      if (room.movingPlatforms) {
        for (const cfg of room.movingPlatforms) {
          platforms.push(new MovingPlatform(cfg, this.time));
        }
      }

      const playerTarget = (player && player.isAlive)
        ? { x: player.x + player.width * 0.5, y: player.y + player.height * 0.5 }
        : null;

      for (const config of room.laserTurrets) {
        const color = config.themeColor || '#ff0055';
        const mode = config.mode ?? 'projectile';
        const { x, y } = config;
        const activeTurret = turrets?.find((t) => t.config.id === config.id);
        const turret = activeTurret || this.getTurret(config);
        if (!activeTurret && mode === 'beam') {
          turret.updateBeam(this.time, playerTarget);
        }
        const nozzle = turret.getNozzlePosition(playerTarget);

        // A. If beam mode, render dynamic beam
        if (mode === 'beam') {
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

        ctx.fillStyle = '#0a101d';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;

        // Base chassis
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 4);
        ctx.fill();
        ctx.stroke();

        // Cannon barrel nozzle along local +X
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(13, 0);
        ctx.stroke();

        // Status lens / LED
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
        ctx.restore();
      }
    }

    // 2. Render In-Flight Projectiles (Oriented to Flight Angle)
    if (projectiles && projectiles.length > 0) {
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
}
