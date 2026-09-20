import { FACE_SIZE, ScreenData, TILE_SIZE, TileType } from '../world/ScreenData';
import { Player } from '../entities/Player';
import { ParticleSystem } from '../engine/ParticleSystem';
import { LevelMap } from '../world/LevelMap';

export class FaceRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private time: number = 0;

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
    dt: number = 0.016
  ): HTMLCanvasElement {
    this.time += dt;
    const ctx = this.ctx;

    // 1. Dark Cybernetic Background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= FACE_SIZE; x += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FACE_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= FACE_SIZE; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FACE_SIZE, y);
      ctx.stroke();
    }

    // 2. Render Tiles
    const primary = room.themeColor;
    const accent = room.accentColor;

    for (let r = 0; r < room.tiles.length; r++) {
      for (let c = 0; c < room.tiles[r].length; c++) {
        const tile = room.tiles[r][c];
        if (tile === TileType.EMPTY) continue;

        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        switch (tile) {
          case TileType.SOLID:
            this.drawSolidTile(ctx, x, y, primary, accent);
            break;
          case TileType.ONE_WAY:
            this.drawOneWayTile(ctx, x, y, primary);
            break;
          case TileType.SPIKE:
            this.drawSpikeTile(ctx, x, y);
            break;
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

    // 4. Render Exit Boundary Portals / Indicators
    this.drawExitIndicators(ctx, room);

    // 5. Render Room Header / Subtitle
    this.drawRoomHeader(ctx, room);

    // 6. Render Particles
    if (particles) {
      particles.render(ctx);
    }

    // 7. Render Player (if present on this face)
    if (player) {
      player.primaryColor = primary;
      player.render(ctx, particles);
    }

    // 8. Outer Face Border Glow
    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    ctx.shadowColor = primary;
    ctx.shadowBlur = 12;
    ctx.strokeRect(1.5, 1.5, FACE_SIZE - 3, FACE_SIZE - 3);
    ctx.shadowBlur = 0;

    return this.canvas;
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

  private drawSpikeTile(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    const pulse = 0.8 + Math.sin(this.time * 8) * 0.2;
    ctx.fillStyle = '#ff0055';
    ctx.strokeStyle = '#ff3377';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 2;

    // Two spikes per 40px tile
    for (let s = 0; s < 2; s++) {
      const sx = x + s * 20;
      ctx.beginPath();
      ctx.moveTo(sx, y + TILE_SIZE);
      ctx.lineTo(sx + 10, y + 8);
      ctx.lineTo(sx + 20, y + TILE_SIZE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
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
}
