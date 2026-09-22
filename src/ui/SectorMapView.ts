import { LevelMap } from '../world/LevelMap';
import { ScreenData, TileType, getSpikeDirection, ROWS, COLS } from '../world/ScreenData';
import { Player } from '../entities/Player';

export interface SectorMapViewOptions {
  levelMap: LevelMap;
  currentCoords: { x: number; y: number };
  player: Player;
  onClose?: () => void;
}

export class SectorMapView {
  private containerEl: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private tooltipEl: HTMLElement | null = null;

  // Stats & Help DOM elements
  private currentSectorBadgeEl: HTMLElement | null = null;
  private statDiscoveredEl: HTMLElement | null = null;
  private statPrismsEl: HTMLElement | null = null;
  private mapHelpOverlayEl: HTMLElement | null = null;

  // Game state references
  private levelMap: LevelMap;
  private currentCoords: { x: number; y: number };
  private player: Player;
  private onCloseCallback?: () => void;

  // Transform state (Pan & Zoom)
  private scale: number = 1.0;
  private panX: number = 0;
  private panY: number = 0;
  private readonly MIN_SCALE = 0.15;
  private readonly MAX_SCALE = 2.8;

  // Spacing & Layout
  private readonly SECTOR_SPACING = 200;
  private readonly ROOM_WIDTH = 136;
  private readonly ROOM_HEIGHT = 136;

  // Pointer dragging state
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Animation & Caching
  private isVisible: boolean = false;
  private animFrameId: number | null = null;
  private animTime: number = 0;
  private thumbnailCache: Map<string, HTMLCanvasElement> = new Map();

  // Hover detection
  private hoveredSector: {
    x: number;
    y: number;
    isDiscovered: boolean;
    room?: ScreenData;
  } | null = null;

  constructor(options: SectorMapViewOptions) {
    this.levelMap = options.levelMap;
    this.currentCoords = { ...options.currentCoords };
    this.player = options.player;
    this.onCloseCallback = options.onClose;

    this.bindDOM();
    this.setupListeners();
  }

  public get visible(): boolean {
    return this.isVisible;
  }

  public setLevelMap(levelMap: LevelMap, currentCoords: { x: number; y: number }): void {
    this.levelMap = levelMap;
    this.currentCoords = { ...currentCoords };
    this.thumbnailCache.clear();
    this.updateStats();
  }

  public setCurrentCoords(coords: { x: number; y: number }): void {
    this.currentCoords = { ...coords };
    this.updateStats();
  }

  private bindDOM(): void {
    this.containerEl = document.getElementById('sector-map-modal');
    this.canvas = document.getElementById('sector-map-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.tooltipEl = document.getElementById('sector-map-tooltip');
    this.currentSectorBadgeEl = document.getElementById('map-current-sector-badge');
    this.statDiscoveredEl = document.getElementById('map-stat-discovered');
    this.statPrismsEl = document.getElementById('map-stat-prisms');
    this.mapHelpOverlayEl = document.getElementById('map-help-overlay');
  }

  private setupListeners(): void {
    const btnClose = document.getElementById('btn-close-sector-map');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    const btnZoomIn = document.getElementById('map-btn-zoom-in');
    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => this.zoomStep(1.25));
    }

    const btnZoomOut = document.getElementById('map-btn-zoom-out');
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => this.zoomStep(0.8));
    }

    const btnFit = document.getElementById('map-btn-fit');
    if (btnFit) {
      btnFit.addEventListener('click', () => this.fitToScreen());
    }

    const btnCenter = document.getElementById('map-btn-center-player');
    if (btnCenter) {
      btnCenter.addEventListener('click', () => this.centerOnPlayer());
    }

    const btnHelp = document.getElementById('map-btn-help');
    if (btnHelp) {
      btnHelp.addEventListener('click', () => this.toggleHelp());
    }

    const helpBackdrop = document.getElementById('map-help-backdrop');
    if (helpBackdrop) {
      helpBackdrop.addEventListener('click', () => this.toggleHelp(false));
    }

    if (this.canvas) {
      this.canvas.addEventListener('pointerdown', this.handlePointerDown);
      window.addEventListener('pointermove', this.handlePointerMove);
      window.addEventListener('pointerup', this.handlePointerUp);
      this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (this.isVisible && this.canvas) {
      this.resizeCanvas();
    }
  };

  private resizeCanvas(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth || 800;
    const height = parent.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  public open(): void {
    if (this.isVisible) return;
    this.isVisible = true;

    if (this.containerEl) {
      this.containerEl.style.display = 'block';
    }

    this.resizeCanvas();
    this.updateStats();

    // Default framing: Center on player or fit if many rooms are discovered
    const discoveredCount = this.levelMap.getDiscoveredRoomsCount();
    if (discoveredCount > 4) {
      this.fitToScreen();
    } else {
      this.centerOnPlayer();
    }

    this.startLoop();
  }

  public close(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    if (this.containerEl) {
      this.containerEl.style.display = 'none';
    }

    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }

    this.toggleHelp(false);
    this.stopLoop();

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public toggleHelp(force?: boolean): void {
    if (!this.mapHelpOverlayEl) return;
    const isOpen = this.mapHelpOverlayEl.classList.contains('open');
    const newState = force !== undefined ? force : !isOpen;
    if (newState) {
      this.mapHelpOverlayEl.classList.add('open');
      this.mapHelpOverlayEl.style.display = 'flex';
      const btnHelp = document.getElementById('map-btn-help');
      if (btnHelp) btnHelp.classList.add('active');
    } else {
      this.mapHelpOverlayEl.classList.remove('open');
      this.mapHelpOverlayEl.style.display = 'none';
      const btnHelp = document.getElementById('map-btn-help');
      if (btnHelp) btnHelp.classList.remove('active');
    }
  }

  public toggle(): void {
    if (this.isVisible) {
      this.close();
    } else {
      this.open();
    }
  }

  private updateStats(): void {
    const curRoom = this.levelMap.getRoom(this.currentCoords.x, this.currentCoords.y);
    const roomTitle = curRoom ? curRoom.title : 'Deep Manifold';

    if (this.currentSectorBadgeEl) {
      this.currentSectorBadgeEl.textContent = `SECTOR [${this.currentCoords.x}, ${this.currentCoords.y}] // ${roomTitle.toUpperCase()}`;
    }

    const discovered = this.levelMap.getDiscoveredRoomsCount();
    const total = this.levelMap.getTotalRoomsCount();

    if (this.statDiscoveredEl) {
      if (total > 0 && total >= discovered) {
        const pct = Math.round((discovered / total) * 100);
        this.statDiscoveredEl.textContent = `DISCOVERED: ${discovered} / ${total} (${pct}%)`;
      } else {
        this.statDiscoveredEl.textContent = `DISCOVERED: ${discovered} SECTORS`;
      }
    }

    const collected = this.levelMap.getCollectedCount();
    const totalCollectibles = this.levelMap.getTotalCollectiblesCount();
    if (this.statPrismsEl) {
      this.statPrismsEl.textContent = `PRISMS: ${collected} / ${totalCollectibles}`;
    }
  }

  public centerOnPlayer(): void {
    if (!this.canvas) return;
    const wx = this.currentCoords.x * this.SECTOR_SPACING;
    const wy = -this.currentCoords.y * this.SECTOR_SPACING;

    this.scale = 1.0;
    this.panX = -wx * this.scale;
    this.panY = -wy * this.scale;
  }

  public fitToScreen(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const viewW = parent?.clientWidth || 800;
    const viewH = parent?.clientHeight || 600;

    // Collect all coordinates: explored and adjacent unexplored
    const coords: { x: number; y: number }[] = [];
    const discovered = this.levelMap.getDiscoveredRooms();
    for (const r of discovered) {
      coords.push({ x: r.coords.x, y: r.coords.y });
    }

    const unexplored = this.levelMap.getAdjacentUnexploredCoords();
    for (const u of unexplored) {
      coords.push({ x: u.x, y: u.y });
    }

    if (coords.length === 0) {
      coords.push({ x: this.currentCoords.x, y: this.currentCoords.y });
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const c of coords) {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    }

    // World bounding box (+Y is upwards in Hyperfold)
    const worldMinX = minX * this.SECTOR_SPACING - this.ROOM_WIDTH * 0.5;
    const worldMaxX = maxX * this.SECTOR_SPACING + this.ROOM_WIDTH * 0.5;
    const worldMinY = -maxY * this.SECTOR_SPACING - this.ROOM_HEIGHT * 0.5;
    const worldMaxY = -minY * this.SECTOR_SPACING + this.ROOM_HEIGHT * 0.5;

    const bboxW = Math.max(worldMaxX - worldMinX, this.ROOM_WIDTH);
    const bboxH = Math.max(worldMaxY - worldMinY, this.ROOM_HEIGHT);
    const centerX = (worldMinX + worldMaxX) * 0.5;
    const centerY = (worldMinY + worldMaxY) * 0.5;

    const padding = 120;
    const availW = Math.max(viewW - padding, 200);
    const availH = Math.max(viewH - padding, 200);

    const fitScale = Math.min(availW / bboxW, availH / bboxH);
    this.scale = Math.min(Math.max(fitScale, this.MIN_SCALE), 1.15);

    this.panX = -centerX * this.scale;
    this.panY = -centerY * this.scale;
  }

  private zoomStep(factor: number): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const cx = (parent?.clientWidth || 800) * 0.5;
    const cy = (parent?.clientHeight || 600) * 0.5;
    this.zoomAt(cx, cy, factor);
  }

  private zoomAt(screenX: number, screenY: number, factor: number): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const viewW = parent?.clientWidth || 800;
    const viewH = parent?.clientHeight || 600;

    const oldScale = this.scale;
    const newScale = Math.min(Math.max(oldScale * factor, this.MIN_SCALE), this.MAX_SCALE);
    if (newScale === oldScale) return;

    // World coordinates under screen point
    const wx = (screenX - viewW * 0.5 - this.panX) / oldScale;
    const wy = (screenY - viewH * 0.5 - this.panY) / oldScale;

    this.scale = newScale;
    this.panX = screenX - viewW * 0.5 - wx * newScale;
    this.panY = screenY - viewH * 0.5 - wy * newScale;
  }

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    this.zoomAt(mouseX, mouseY, zoomFactor);
    this.updateHover(mouseX, mouseY);
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.dragStartX = e.clientX - this.panX;
    this.dragStartY = e.clientY - this.panY;
    this.canvas?.setPointerCapture(e.pointerId);
    if (this.canvas) {
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    const rect = this.canvas?.getBoundingClientRect();
    if (rect) {
      this.lastMouseX = e.clientX - rect.left;
      this.lastMouseY = e.clientY - rect.top;
    }

    if (this.isDragging) {
      this.panX = e.clientX - this.dragStartX;
      this.panY = e.clientY - this.dragStartY;
      if (this.tooltipEl) {
        this.tooltipEl.style.display = 'none';
      }
    } else if (this.isVisible && rect) {
      this.updateHover(this.lastMouseX, this.lastMouseY);
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.isDragging) {
      this.isDragging = false;
      try {
        this.canvas?.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer was not captured
      }
      if (this.canvas) {
        this.canvas.style.cursor = this.hoveredSector ? 'pointer' : 'grab';
      }
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isVisible) return;

    if (e.code === 'Escape') {
      e.preventDefault();
      if (this.mapHelpOverlayEl?.classList.contains('open')) {
        this.toggleHelp(false);
        return;
      }
      this.close();
      return;
    }

    if (e.code === 'KeyH' || e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
      e.preventDefault();
      this.toggleHelp();
      return;
    }

    if (e.code === 'KeyF' || e.code === 'Digit0') {
      e.preventDefault();
      this.fitToScreen();
      return;
    }

    if (e.code === 'KeyC' || e.code === 'Home') {
      e.preventDefault();
      this.centerOnPlayer();
      return;
    }

    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      this.zoomStep(1.2);
      return;
    }

    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      this.zoomStep(0.83);
      return;
    }

    // Keyboard panning
    const panSpeed = 30;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.panX += panSpeed;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.panX -= panSpeed;
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.panY += panSpeed;
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.panY -= panSpeed;
    }
  };

  private startLoop(): void {
    if (this.animFrameId !== null) return;
    let lastT = performance.now();

    const loop = (t: number) => {
      const dt = Math.min((t - lastT) * 0.001, 0.1);
      lastT = t;
      this.animTime += dt;

      this.render();

      if (this.isVisible) {
        this.animFrameId = requestAnimationFrame(loop);
      } else {
        this.animFrameId = null;
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updateHover(mouseX: number, mouseY: number): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const viewW = parent?.clientWidth || 800;
    const viewH = parent?.clientHeight || 600;

    // Convert mouse to world
    const wx = (mouseX - viewW * 0.5 - this.panX) / this.scale;
    const wy = (mouseY - viewH * 0.5 - this.panY) / this.scale;

    let hit: { x: number; y: number; isDiscovered: boolean; room?: ScreenData } | null = null;

    // Check discovered rooms
    const discovered = this.levelMap.getDiscoveredRooms();
    for (const r of discovered) {
      const rx = r.coords.x * this.SECTOR_SPACING;
      const ry = -r.coords.y * this.SECTOR_SPACING;
      const hw = this.ROOM_WIDTH * 0.5;
      const hh = this.ROOM_HEIGHT * 0.5;

      if (wx >= rx - hw && wx <= rx + hw && wy >= ry - hh && wy <= ry + hh) {
        hit = { x: r.coords.x, y: r.coords.y, isDiscovered: true, room: r };
        break;
      }
    }

    // Check unexplored adjacent sectors
    if (!hit) {
      const unexplored = this.levelMap.getAdjacentUnexploredCoords();
      for (const u of unexplored) {
        const rx = u.x * this.SECTOR_SPACING;
        const ry = -u.y * this.SECTOR_SPACING;
        const hw = this.ROOM_WIDTH * 0.5;
        const hh = this.ROOM_HEIGHT * 0.5;

        if (wx >= rx - hw && wx <= rx + hw && wy >= ry - hh && wy <= ry + hh) {
          hit = { x: u.x, y: u.y, isDiscovered: false };
          break;
        }
      }
    }

    this.hoveredSector = hit;
    if (this.canvas) {
      this.canvas.style.cursor = hit ? 'pointer' : 'grab';
    }

    if (this.tooltipEl) {
      if (hit) {
        this.renderTooltip(hit, mouseX, mouseY);
      } else {
        this.tooltipEl.style.display = 'none';
      }
    }
  }

  private renderTooltip(
    hit: { x: number; y: number; isDiscovered: boolean; room?: ScreenData },
    mouseX: number,
    mouseY: number
  ): void {
    if (!this.tooltipEl || !this.canvas) return;

    if (hit.isDiscovered && hit.room) {
      const r = hit.room;
      const isCurrent = hit.x === this.currentCoords.x && hit.y === this.currentCoords.y;
      const collectedInRoom = r.collectibles.filter((c) => this.levelMap.isItemCollected(c.id)).length;
      const totalInRoom = r.collectibles.length;

      const hazards: string[] = [];
      if (r.laserBarriers && r.laserBarriers.length > 0) hazards.push(`${r.laserBarriers.length} Laser Barrier(s)`);
      if (r.laserTurrets && r.laserTurrets.length > 0) hazards.push(`${r.laserTurrets.length} Laser Turret(s)`);
      if (r.movingPlatforms && r.movingPlatforms.length > 0) hazards.push(`${r.movingPlatforms.length} Hover Platform(s)`);

      this.tooltipEl.innerHTML = `
        <div class="tip-header" style="color: ${r.themeColor};">
          <span class="tip-dot" style="background: ${r.themeColor}; box-shadow: 0 0 6px ${r.themeColor};"></span>
          <span>SECTOR [${r.coords.x}, ${r.coords.y}]</span>
          ${isCurrent ? '<span class="tip-badge-cur">YOU ARE HERE</span>' : ''}
        </div>
        <div class="tip-title">${r.title}</div>
        ${r.subtitle ? `<div class="tip-sub">${r.subtitle}</div>` : ''}
        <div class="tip-meta">
          <div class="tip-row">
            <span>Energy Prisms:</span>
            <span class="accent-gold">${collectedInRoom} / ${totalInRoom}</span>
          </div>
          ${hazards.length > 0 ? `<div class="tip-row"><span>Sensors:</span><span class="tip-hazards">${hazards.join(', ')}</span></div>` : ''}
        </div>
      `;
    } else {
      this.tooltipEl.innerHTML = `
        <div class="tip-header tip-encrypted">
          <span class="tip-dot tip-dot-enc"></span>
          <span>SECTOR [${hit.x}, ${hit.y}] // UNEXPLORED</span>
        </div>
        <div class="tip-title" style="color: #ffaa00;">ENCRYPTED MANIFOLD</div>
        <div class="tip-sub">Topological distortion detected. Cross sector portal to synchronize coordinate matrix and decrypt local room layout.</div>
      `;
    }

    this.tooltipEl.style.display = 'block';

    // Position tooltip near cursor relative to the canvas wrapper
    const parentW = this.canvas.parentElement?.clientWidth || this.canvas.width;
    const parentH = this.canvas.parentElement?.clientHeight || this.canvas.height;
    const tipW = this.tooltipEl.offsetWidth || 300;
    const tipH = this.tooltipEl.offsetHeight || 120;

    let left = mouseX + 16;
    let top = mouseY + 16;

    if (left + tipW > parentW - 12) {
      left = mouseX - tipW - 16;
    }
    if (top + tipH > parentH - 12) {
      top = mouseY - tipH - 16;
    }

    left = Math.max(10, Math.min(left, parentW - tipW - 10));
    top = Math.max(10, Math.min(top, parentH - tipH - 10));

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  // ==========================================
  // RENDERING PIPELINE
  // ==========================================

  public render(): void {
    if (!this.ctx || !this.canvas) return;
    const parent = this.canvas.parentElement;
    const viewW = parent?.clientWidth || 800;
    const viewH = parent?.clientHeight || 600;

    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, viewW, viewH);

    // 1. Dark Void Background
    ctx.fillStyle = '#03060d';
    ctx.fillRect(0, 0, viewW, viewH);

    // Apply 2D Camera Transform
    ctx.save();
    ctx.translate(viewW * 0.5 + this.panX, viewH * 0.5 + this.panY);
    ctx.scale(this.scale, this.scale);

    // 2. Cosmic Background Coordinate Grid
    this.drawBackgroundGrid(ctx, viewW, viewH);

    // 3. Corridors / Doorway Connections
    this.drawCorridors(ctx);

    // 4. Unexplored Adjacent Sectors (Distinct Crypted Design)
    this.drawUnexploredSectors(ctx);

    // 5. Discovered Rooms (Key color + Small room tile representation)
    this.drawDiscoveredRooms(ctx);

    // 6. Current Player Beacon / Pulse
    this.drawPlayerMarker(ctx);

    ctx.restore();

    // 7. Render Map HUD Elements (Scale indicator, compass)
    this.drawMapOverlayStats(ctx, viewW, viewH);

    ctx.restore();
  }

  private drawBackgroundGrid(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    // Determine visible world bounds
    const leftWorld = (-viewW * 0.5 - this.panX) / this.scale;
    const rightWorld = (viewW * 0.5 - this.panX) / this.scale;
    const topWorld = (-viewH * 0.5 - this.panY) / this.scale;
    const bottomWorld = (viewH * 0.5 - this.panY) / this.scale;

    const step = 40;
    const startX = Math.floor(leftWorld / step) * step;
    const endX = Math.ceil(rightWorld / step) * step;
    const startY = Math.floor(topWorld / step) * step;
    const endY = Math.ceil(bottomWorld / step) * step;

    // Grid dots or subtle lines
    ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
    const dotSize = Math.max(1 / this.scale, 1.2);
    for (let x = startX; x <= endX; x += step) {
      for (let y = startY; y <= endY; y += step) {
        ctx.fillRect(x - dotSize * 0.5, y - dotSize * 0.5, dotSize, dotSize);
      }
    }

    // Coordinate Axes (X=0 and Y=0)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.18)';
    ctx.lineWidth = 1 / this.scale;
    ctx.beginPath();
    // X Axis
    ctx.moveTo(leftWorld, 0);
    ctx.lineTo(rightWorld, 0);
    // Y Axis
    ctx.moveTo(0, topWorld);
    ctx.lineTo(0, bottomWorld);
    ctx.stroke();
  }

  private drawCorridors(ctx: CanvasRenderingContext2D): void {
    const discovered = this.levelMap.getDiscoveredRooms();
    const discoveredSet = this.levelMap.getVisitedCoordinates();
    const unexplored = this.levelMap.getAdjacentUnexploredCoords();
    const unexploredSet = new Set(unexplored.map((u) => LevelMap.coordKey(u.x, u.y)));

    const hw = this.ROOM_WIDTH * 0.5;
    const hh = this.ROOM_HEIGHT * 0.5;

    for (const room of discovered) {
      const rx = room.coords.x * this.SECTOR_SPACING;
      const ry = -room.coords.y * this.SECTOR_SPACING;

      // 1. Right corridor
      if (room.exits?.right) {
        const rightKey = LevelMap.coordKey(room.coords.x + 1, room.coords.y);
        const targetX = (room.coords.x + 1) * this.SECTOR_SPACING;
        const targetY = ry;

        if (discoveredSet.has(rightKey)) {
          // Connected between two explored rooms
          this.drawConnectedCorridor(ctx, rx + hw, ry, targetX - hw, targetY, true, room.themeColor);
        } else if (unexploredSet.has(rightKey)) {
          // Connected into an unexplored encrypted room
          this.drawCryptedCorridor(ctx, rx + hw, ry, targetX - hw, targetY, true);
        } else {
          // Open doorway stub
          this.drawOpenDoorwayStub(ctx, rx + hw, ry, 'right', room.themeColor);
        }
      }

      // 2. Up corridor (remember +Y is upwards, so targetY is ry - SECTOR_SPACING)
      if (room.exits?.up) {
        const upKey = LevelMap.coordKey(room.coords.x, room.coords.y + 1);
        const targetX = rx;
        const targetY = -(room.coords.y + 1) * this.SECTOR_SPACING;

        if (discoveredSet.has(upKey)) {
          this.drawConnectedCorridor(ctx, rx, ry - hh, targetX, targetY + hh, false, room.themeColor);
        } else if (unexploredSet.has(upKey)) {
          this.drawCryptedCorridor(ctx, rx, ry - hh, targetX, targetY + hh, false);
        } else {
          this.drawOpenDoorwayStub(ctx, rx, ry - hh, 'up', room.themeColor);
        }
      }

      // 3. Left exit to unexplored or boundary stub
      if (room.exits?.left) {
        const leftKey = LevelMap.coordKey(room.coords.x - 1, room.coords.y);
        const targetX = (room.coords.x - 1) * this.SECTOR_SPACING;
        const targetY = ry;

        if (!discoveredSet.has(leftKey)) {
          if (unexploredSet.has(leftKey)) {
            this.drawCryptedCorridor(ctx, rx - hw, ry, targetX + hw, targetY, true);
          } else {
            this.drawOpenDoorwayStub(ctx, rx - hw, ry, 'left', room.themeColor);
          }
        }
      }

      // 4. Down exit to unexplored or boundary stub
      if (room.exits?.down) {
        const downKey = LevelMap.coordKey(room.coords.x, room.coords.y - 1);
        const targetX = rx;
        const targetY = -(room.coords.y - 1) * this.SECTOR_SPACING;

        if (!discoveredSet.has(downKey)) {
          if (unexploredSet.has(downKey)) {
            this.drawCryptedCorridor(ctx, rx, ry + hh, targetX, targetY - hh, false);
          } else {
            this.drawOpenDoorwayStub(ctx, rx, ry + hh, 'down', room.themeColor);
          }
        }
      }
    }
  }

  private drawConnectedCorridor(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    horizontal: boolean,
    color: string
  ): void {
    const corridorWidth = 14;
    const half = corridorWidth * 0.5;

    ctx.save();
    // Dark corridor passage fill
    ctx.fillStyle = '#060d1a';
    if (horizontal) {
      ctx.fillRect(Math.min(x1, x2), y1 - half, Math.abs(x2 - x1), corridorWidth);
    } else {
      ctx.fillRect(x1 - half, Math.min(y1, y2), corridorWidth, Math.abs(y2 - y1));
    }

    // Corridor glowing borders
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x1, y1 - half);
      ctx.lineTo(x2, y2 - half);
      ctx.moveTo(x1, y1 + half);
      ctx.lineTo(x2, y2 + half);
    } else {
      ctx.moveTo(x1 - half, y1);
      ctx.lineTo(x2 - half, y2);
      ctx.moveTo(x1 + half, y1);
      ctx.lineTo(x2 + half, y2);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Animated signal pulse along the corridor
    const pulseOffset = (this.animTime * 30) % (Math.abs(horizontal ? x2 - x1 : y2 - y1) || 1);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 6;
    if (horizontal) {
      const px = Math.min(x1, x2) + pulseOffset;
      ctx.fillRect(px - 3, y1 - 2, 6, 4);
    } else {
      const py = Math.min(y1, y2) + pulseOffset;
      ctx.fillRect(x1 - 2, py - 3, 4, 6);
    }

    ctx.restore();
  }

  private drawCryptedCorridor(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    horizontal: boolean
  ): void {
    const corridorWidth = 12;
    const half = corridorWidth * 0.5;

    ctx.save();
    // Dim cyber corridor fill
    ctx.fillStyle = 'rgba(20, 10, 32, 0.7)';
    if (horizontal) {
      ctx.fillRect(Math.min(x1, x2), y1 - half, Math.abs(x2 - x1), corridorWidth);
    } else {
      ctx.fillRect(x1 - half, Math.min(y1, y2), corridorWidth, Math.abs(y2 - y1));
    }

    // Glitched dashed amber/violet border
    ctx.strokeStyle = '#aa55ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x1, y1 - half);
      ctx.lineTo(x2, y2 - half);
      ctx.moveTo(x1, y1 + half);
      ctx.lineTo(x2, y2 + half);
    } else {
      ctx.moveTo(x1 - half, y1);
      ctx.lineTo(x2 - half, y2);
      ctx.moveTo(x1 + half, y1);
      ctx.lineTo(x2 + half, y2);
    }
    ctx.stroke();

    // Signal arrow entering encrypted sector
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffaa00';
    const midX = (x1 + x2) * 0.5;
    const midY = (y1 + y2) * 0.5;
    ctx.beginPath();
    ctx.arc(midX, midY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawOpenDoorwayStub(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: 'left' | 'right' | 'up' | 'down',
    color: string
  ): void {
    const stubLen = 10;
    const doorW = 12;
    const half = doorW * 0.5;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);

    ctx.beginPath();
    if (dir === 'right') {
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + stubLen, y - half);
      ctx.moveTo(x, y + half);
      ctx.lineTo(x + stubLen, y + half);
    } else if (dir === 'left') {
      ctx.moveTo(x, y - half);
      ctx.lineTo(x - stubLen, y - half);
      ctx.moveTo(x, y + half);
      ctx.lineTo(x - stubLen, y + half);
    } else if (dir === 'up') {
      ctx.moveTo(x - half, y);
      ctx.lineTo(x - half, y - stubLen);
      ctx.moveTo(x + half, y);
      ctx.lineTo(x + half, y - stubLen);
    } else if (dir === 'down') {
      ctx.moveTo(x - half, y);
      ctx.lineTo(x - half, y + stubLen);
      ctx.moveTo(x + half, y);
      ctx.lineTo(x + half, y + stubLen);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawUnexploredSectors(ctx: CanvasRenderingContext2D): void {
    const unexplored = this.levelMap.getAdjacentUnexploredCoords();
    const w = this.ROOM_WIDTH;
    const h = this.ROOM_HEIGHT;
    const hw = w * 0.5;
    const hh = h * 0.5;

    for (const u of unexplored) {
      const rx = u.x * this.SECTOR_SPACING;
      const ry = -u.y * this.SECTOR_SPACING;
      const isHovered = this.hoveredSector && this.hoveredSector.x === u.x && this.hoveredSector.y === u.y;

      ctx.save();
      ctx.translate(rx, ry);

      // 1. Dark glitched card background
      ctx.fillStyle = isHovered ? 'rgba(30, 15, 45, 0.95)' : 'rgba(16, 8, 28, 0.88)';
      ctx.fillRect(-hw, -hh, w, h);

      // 2. Animated Cyber Scanlines
      ctx.fillStyle = 'rgba(170, 85, 255, 0.04)';
      const scanOffset = Math.floor((this.animTime * 20) % 8);
      for (let y = -hh + scanOffset; y < hh; y += 8) {
        ctx.fillRect(-hw, y, w, 2);
      }

      // 3. Hex cipher data background static
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = 'rgba(170, 85, 255, 0.22)';
      ctx.textAlign = 'left';
      ctx.fillText('0x7F // ??', -hw + 8, -hh + 24);
      ctx.fillText('SIG_LOCK', -hw + 8, -hh + 36);
      ctx.fillText('0x4A 0x88', -hw + 8, hh - 18);

      // 4. Glitched / Dashed Cybernetic Border
      ctx.strokeStyle = isHovered ? '#ffaa00' : '#8844cc';
      ctx.lineWidth = isHovered ? 2 : 1.5;
      ctx.setLineDash([6, 4]);
      if (isHovered) {
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 8;
      }
      ctx.strokeRect(-hw, -hh, w, h);
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // 5. Corner Bracket Accents
      ctx.strokeStyle = isHovered ? '#ffaa00' : '#bb66ff';
      ctx.lineWidth = 2;
      const cLen = 8;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(-hw, -hh + cLen);
      ctx.lineTo(-hw, -hh);
      ctx.lineTo(-hw + cLen, -hh);
      // Top-Right
      ctx.moveTo(hw - cLen, -hh);
      ctx.lineTo(hw, -hh);
      ctx.lineTo(hw, -hh + cLen);
      // Bottom-Left
      ctx.moveTo(-hw, hh - cLen);
      ctx.lineTo(-hw, hh);
      ctx.lineTo(-hw + cLen, hh);
      // Bottom-Right
      ctx.moveTo(hw - cLen, hh);
      ctx.lineTo(hw, hh);
      ctx.lineTo(hw, hh - cLen);
      ctx.stroke();

      // 6. Header Badge
      ctx.fillStyle = isHovered ? '#ffaa00' : '#aa55ff';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[${u.x}, ${u.y}]`, 0, -hh + 14);

      // 7. Central Encrypted Icon: Rotating Holographic Cipher Lock
      const lockPulse = 0.8 + 0.2 * Math.sin(this.animTime * 3);
      ctx.strokeStyle = isHovered ? '#ffaa00' : `rgba(255, 170, 0, ${lockPulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 4, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Inner question glyph / lock
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillStyle = isHovered ? '#ffaa00' : `rgba(255, 170, 0, ${lockPulse})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 5);
      ctx.textBaseline = 'alphabetic';

      // 8. Footer Label
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = isHovered ? '#ffffff' : '#8866aa';
      ctx.fillText('[ENCRYPTED]', 0, hh - 8);

      ctx.restore();
    }
  }

  private drawDiscoveredRooms(ctx: CanvasRenderingContext2D): void {
    const discovered = this.levelMap.getDiscoveredRooms();
    const w = this.ROOM_WIDTH;
    const h = this.ROOM_HEIGHT;
    const hw = w * 0.5;
    const hh = h * 0.5;

    for (const room of discovered) {
      const rx = room.coords.x * this.SECTOR_SPACING;
      const ry = -room.coords.y * this.SECTOR_SPACING;
      const isCurrent = room.coords.x === this.currentCoords.x && room.coords.y === this.currentCoords.y;
      const isHovered = this.hoveredSector && this.hoveredSector.x === room.coords.x && this.hoveredSector.y === room.coords.y;

      ctx.save();
      ctx.translate(rx, ry);

      // 1. Room Card Background
      ctx.fillStyle = isCurrent ? '#091322' : isHovered ? '#0b1626' : '#070c16';
      ctx.fillRect(-hw, -hh, w, h);

      // 2. Room Thumbnail Representation
      const thumbnail = this.getRoomThumbnail(room);
      if (thumbnail) {
        // Draw thumbnail in the center area
        const thumbSize = 104;
        const halfThumb = thumbSize * 0.5;
        ctx.drawImage(thumbnail, -halfThumb, -halfThumb + 6, thumbSize, thumbSize);
      }

      // 3. Room Outer Border (Key Color)
      ctx.strokeStyle = isCurrent ? '#00ffff' : room.themeColor;
      ctx.lineWidth = isCurrent || isHovered ? 2.5 : 1.5;
      if (isCurrent || isHovered) {
        ctx.shadowColor = isCurrent ? '#00ffff' : room.themeColor;
        ctx.shadowBlur = 10;
      }
      ctx.strokeRect(-hw, -hh, w, h);
      ctx.shadowBlur = 0;

      // 4. Header Bar with Coordinates & Title
      ctx.fillStyle = 'rgba(6, 11, 20, 0.9)';
      ctx.fillRect(-hw, -hh, w, 18);
      ctx.strokeStyle = room.themeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-hw, -hh + 18);
      ctx.lineTo(hw, -hh + 18);
      ctx.stroke();

      // Coordinates text
      ctx.fillStyle = room.themeColor;
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`[${room.coords.x},${room.coords.y}]`, -hw + 5, -hh + 13);

      // Room Title (truncated if long)
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'right';
      const maxTitleChars = 11;
      const shortTitle =
        room.title.length > maxTitleChars ? `${room.title.slice(0, maxTitleChars - 1)}…` : room.title;
      ctx.fillText(shortTitle, hw - 5, -hh + 13);

      // 5. Goal indicator on room if room contains goal tile
      if (room.tiles.some((row) => row.includes(TileType.GOAL))) {
        this.drawGoalMarker(ctx, hw - 14, hh - 14);
      }

      ctx.restore();
    }
  }

  private drawGoalMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawPlayerMarker(ctx: CanvasRenderingContext2D): void {
    const rx = this.currentCoords.x * this.SECTOR_SPACING;
    const ry = -this.currentCoords.y * this.SECTOR_SPACING;

    ctx.save();
    ctx.translate(rx, ry);

    const hh = this.ROOM_HEIGHT * 0.5;

    // 1. Pulsing Radar Wave around active room
    const pulseRad = 80 + 35 * ((this.animTime * 1.2) % 1);
    const pulseAlpha = Math.max(0, 1 - (this.animTime * 1.2) % 1);
    ctx.strokeStyle = `rgba(0, 255, 255, ${pulseAlpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRad, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Glowing "YOU ARE HERE" Banner above room
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▲ YOU ARE HERE ▲', 0, -hh - 6);
    ctx.shadowBlur = 0;

    // 3. Exact Player Position Dot inside Mini-Room
    const thumbSize = 104;
    const thumbLeft = -thumbSize * 0.5;
    const thumbTop = -thumbSize * 0.5 + 6;

    // Map player's (x, y) [0 to 800] into thumb dimensions
    const pxRatio = Math.min(Math.max(this.player.x / 800, 0), 1);
    const pyRatio = Math.min(Math.max(this.player.y / 800, 0), 1);

    const playerMapX = thumbLeft + pxRatio * thumbSize;
    const playerMapY = thumbTop + pyRatio * thumbSize;

    // Outer beacon pulse
    const beaconPulse = 4 + 3 * Math.sin(this.animTime * 6);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(playerMapX, playerMapY, beaconPulse + 2, 0, Math.PI * 2);
    ctx.fill();

    // Player Avatar Core Dot
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawMapOverlayStats(ctx: CanvasRenderingContext2D, _viewW: number, viewH: number): void {
    ctx.save();
    // Bottom-Left Compass / Orientation indicator
    const cx = 40;
    const cy = viewH - 40;

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    // Y-Axis (+Y UP)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 24);
    ctx.stroke();
    // Arrowhead Y
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 20);
    ctx.lineTo(cx, cy - 26);
    ctx.lineTo(cx + 3, cy - 20);
    ctx.stroke();

    // X-Axis (+X RIGHT)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 24, cy);
    ctx.stroke();
    // Arrowhead X
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy - 3);
    ctx.lineTo(cx + 26, cy);
    ctx.lineTo(cx + 20, cy + 3);
    ctx.stroke();

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+Y', cx, cy - 29);
    ctx.fillText('+X', cx + 33, cy + 3);

    // Zoom percentage indicator
    const zoomPct = Math.round(this.scale * 100);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#88a0c0';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(`ZOOM: ${zoomPct}%`, 72, cy - 6);

    ctx.restore();
  }

  // ==========================================
  // ROOM THUMBNAIL CACHE & GENERATION
  // ==========================================

  private getRoomThumbnail(room: ScreenData): HTMLCanvasElement {
    const collectedCount = room.collectibles.filter((c) => this.levelMap.isItemCollected(c.id)).length;
    const cacheKey = `${room.id}_${room.themeColor}_${room.accentColor}_col${collectedCount}`;

    let cached = this.thumbnailCache.get(cacheKey);
    if (cached) return cached;

    // Create 104x104 thumbnail canvas for crisp mini representation
    const thumbCanvas = document.createElement('canvas');
    const thumbSize = 104;
    thumbCanvas.width = thumbSize;
    thumbCanvas.height = thumbSize;
    const tCtx = thumbCanvas.getContext('2d');
    if (!tCtx) return thumbCanvas;

    // Dark canvas background
    tCtx.fillStyle = '#050a14';
    tCtx.fillRect(0, 0, thumbSize, thumbSize);

    // Render 20x20 tiles
    const miniTileW = thumbSize / COLS; // 5.2px
    const miniTileH = thumbSize / ROWS; // 5.2px

    const keyColor = room.themeColor;
    const accentColor = room.accentColor || '#0088ff';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = room.tiles[r]?.[c] ?? TileType.EMPTY;
        if (tile === TileType.EMPTY) continue;

        const x = c * miniTileW;
        const y = r * miniTileH;

        switch (tile) {
          case TileType.SOLID:
            tCtx.fillStyle = keyColor;
            tCtx.fillRect(x, y, miniTileW, miniTileH);
            break;

          case TileType.ONE_WAY:
            tCtx.fillStyle = accentColor;
            tCtx.fillRect(x, y, miniTileW, Math.max(1.5, miniTileH * 0.4));
            break;

          case TileType.SPIKE: {
            tCtx.fillStyle = '#ff2255';
            const dir = getSpikeDirection(room, r, c);
            tCtx.beginPath();
            if (dir === 'up') {
              tCtx.moveTo(x + miniTileW * 0.5, y);
              tCtx.lineTo(x + miniTileW, y + miniTileH);
              tCtx.lineTo(x, y + miniTileH);
            } else if (dir === 'down') {
              tCtx.moveTo(x, y);
              tCtx.lineTo(x + miniTileW, y);
              tCtx.lineTo(x + miniTileW * 0.5, y + miniTileH);
            } else if (dir === 'left') {
              tCtx.moveTo(x, y + miniTileH * 0.5);
              tCtx.lineTo(x + miniTileW, y);
              tCtx.lineTo(x + miniTileW, y + miniTileH);
            } else {
              tCtx.moveTo(x, y);
              tCtx.lineTo(x + miniTileW, y + miniTileH * 0.5);
              tCtx.lineTo(x, y + miniTileH);
            }
            tCtx.closePath();
            tCtx.fill();
            break;
          }

          case TileType.BOUNCE:
            tCtx.fillStyle = '#ff00aa';
            tCtx.fillRect(x, y + miniTileH * 0.5, miniTileW, miniTileH * 0.5);
            break;

          case TileType.CRUMBLE:
            tCtx.fillStyle = '#ffaa00';
            tCtx.fillRect(x + 0.5, y + 0.5, miniTileW - 1, miniTileH - 1);
            break;

          case TileType.GOAL:
            tCtx.fillStyle = '#ffe600';
            tCtx.beginPath();
            tCtx.arc(x + miniTileW * 0.5, y + miniTileH * 0.5, miniTileW * 0.45, 0, Math.PI * 2);
            tCtx.fill();
            break;
        }
      }
    }

    // Moving Platforms representation
    if (room.movingPlatforms) {
      tCtx.fillStyle = '#00ffcc';
      for (const plat of room.movingPlatforms) {
        const px = (plat.startX / 800) * thumbSize;
        const py = (plat.startY / 800) * thumbSize;
        const pw = (plat.width / 800) * thumbSize;
        tCtx.fillRect(px, py, Math.max(pw, 6), 2);
      }
    }

    // Laser Turrets
    if (room.laserTurrets) {
      tCtx.fillStyle = '#ff0055';
      for (const turret of room.laserTurrets) {
        const tx = (turret.x / 800) * thumbSize;
        const ty = (turret.y / 800) * thumbSize;
        tCtx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
      }
    }

    // Energy Prisms / Collectibles
    if (room.collectibles) {
      for (const col of room.collectibles) {
        const isCollected = this.levelMap.isItemCollected(col.id);
        const cx = (col.x / 800) * thumbSize;
        const cy = (col.y / 800) * thumbSize;

        if (isCollected) {
          tCtx.strokeStyle = 'rgba(255, 230, 0, 0.35)';
          tCtx.lineWidth = 1;
          tCtx.beginPath();
          tCtx.arc(cx, cy, 1.8, 0, Math.PI * 2);
          tCtx.stroke();
        } else {
          tCtx.fillStyle = col.type === 'prism' ? '#ff00aa' : '#ffe600';
          tCtx.beginPath();
          tCtx.arc(cx, cy, 2.2, 0, Math.PI * 2);
          tCtx.fill();
        }
      }
    }

    this.thumbnailCache.set(cacheKey, thumbCanvas);
    return thumbCanvas;
  }

  public destroy(): void {
    this.stopLoop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.thumbnailCache.clear();
  }
}
