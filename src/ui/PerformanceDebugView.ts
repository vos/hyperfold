import { PerformanceTracker, PerfSnapshot } from '../engine/PerformanceTracker';

export interface PerformanceMetricsData {
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  particleCount: number;
  sectorName: string;
  coords: { x: number; y: number };
  cameraMode: string;
}

export class PerformanceDebugView {
  private tracker: PerformanceTracker;
  private containerEl: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;

  // Cached DOM elements for fast updates
  private fpsValEl: HTMLElement | null = null;
  private frameTimeValEl: HTMLElement | null = null;
  private minMaxValEl: HTMLElement | null = null;
  private drawCallsEl: HTMLElement | null = null;
  private trianglesEl: HTMLElement | null = null;
  private geoTexEl: HTMLElement | null = null;
  private particlesEl: HTMLElement | null = null;
  private cameraEl: HTMLElement | null = null;
  private sectorEl: HTMLElement | null = null;
  private resolutionEl: HTMLElement | null = null;
  private memoryRowEl: HTMLElement | null = null;
  private memoryEl: HTMLElement | null = null;

  private isVisible: boolean = false;
  private lastDomUpdateTime: number = 0;
  private onToggleCallback?: (visible: boolean) => void;

  constructor(options?: { initialVisible?: boolean; onToggle?: (visible: boolean) => void }) {
    this.tracker = new PerformanceTracker(60);
    this.isVisible = options?.initialVisible ?? false;
    this.onToggleCallback = options?.onToggle;

    this.createDOM();
    this.setupListeners();
    this.updateVisibility();
  }

  public get visible(): boolean {
    return this.isVisible;
  }

  private createDOM(): void {
    const overlay = document.createElement('div');
    overlay.id = 'perf-overlay';
    overlay.className = 'hud-card perf-overlay-card';
    overlay.innerHTML = `
      <div class="perf-header">
        <div class="perf-title-group">
          <span class="perf-status-dot"></span>
          <span class="perf-title">PERF // TELEMETRY</span>
        </div>
        <button class="perf-close-btn" id="perf-close" title="Close [P] / [F3]">&times;</button>
      </div>

      <div class="perf-primary-stats">
        <div class="perf-fps-container">
          <span class="perf-fps-value" id="perf-fps">--</span>
          <span class="perf-fps-unit">FPS</span>
        </div>
        <div class="perf-frametime-container">
          <div class="perf-frametime-main" id="perf-frametime">-- ms</div>
          <div class="perf-frametime-minmax" id="perf-minmax">min: -- max: --</div>
        </div>
      </div>

      <div class="perf-graph-wrapper">
        <canvas id="perf-canvas" width="230" height="42" class="perf-canvas"></canvas>
        <div class="perf-graph-label">16.6ms target</div>
      </div>

      <div class="perf-grid">
        <div class="perf-row">
          <span class="perf-label">DRAW CALLS</span>
          <span class="perf-val accent-cyan" id="perf-drawcalls">0</span>
        </div>
        <div class="perf-row">
          <span class="perf-label">TRIANGLES</span>
          <span class="perf-val accent-cyan" id="perf-triangles">0</span>
        </div>
        <div class="perf-row">
          <span class="perf-label">GEO / TEX</span>
          <span class="perf-val" id="perf-geotex">0 / 0</span>
        </div>
        <div class="perf-row">
          <span class="perf-label">PARTICLES</span>
          <span class="perf-val accent-gold" id="perf-particles">0</span>
        </div>
        <div class="perf-row">
          <span class="perf-label">CAMERA</span>
          <span class="perf-val accent-pink" id="perf-camera">3D Depth</span>
        </div>
        <div class="perf-row">
          <span class="perf-label">SECTOR</span>
          <span class="perf-val" id="perf-sector">[0, 0]</span>
        </div>
        <div class="perf-row">
          <span class="perf-label">VIEWPORT</span>
          <span class="perf-val" id="perf-resolution">0x0</span>
        </div>
        <div class="perf-row" id="perf-mem-row">
          <span class="perf-label">JS HEAP</span>
          <span class="perf-val" id="perf-memory">--</span>
        </div>
      </div>

      <div class="perf-footer">
        Shortcut: <span class="key-badge">P</span> or <span class="key-badge">F3</span>
      </div>
    `;

    document.body.appendChild(overlay);
    this.containerEl = overlay;

    this.fpsValEl = overlay.querySelector('#perf-fps');
    this.frameTimeValEl = overlay.querySelector('#perf-frametime');
    this.minMaxValEl = overlay.querySelector('#perf-minmax');
    this.drawCallsEl = overlay.querySelector('#perf-drawcalls');
    this.trianglesEl = overlay.querySelector('#perf-triangles');
    this.geoTexEl = overlay.querySelector('#perf-geotex');
    this.particlesEl = overlay.querySelector('#perf-particles');
    this.cameraEl = overlay.querySelector('#perf-camera');
    this.sectorEl = overlay.querySelector('#perf-sector');
    this.resolutionEl = overlay.querySelector('#perf-resolution');
    this.memoryRowEl = overlay.querySelector('#perf-mem-row');
    this.memoryEl = overlay.querySelector('#perf-memory');

    this.canvasEl = overlay.querySelector('#perf-canvas');
    if (this.canvasEl) {
      this.canvasCtx = this.canvasEl.getContext('2d');
    }

    const closeBtn = overlay.querySelector('#perf-close');
    closeBtn?.addEventListener('click', () => {
      this.toggle(false);
    });
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore when typing in editable elements if any
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'KeyP' || e.code === 'F3' || e.code === 'Backquote') {
        if (e.code === 'F3') {
          e.preventDefault(); // Prevent native browser search
        }
        this.toggle();
      }
    });
  }

  public toggle(force?: boolean): boolean {
    this.isVisible = force !== undefined ? force : !this.isVisible;
    this.updateVisibility();
    if (this.onToggleCallback) {
      this.onToggleCallback(this.isVisible);
    }
    return this.isVisible;
  }

  private updateVisibility(): void {
    if (this.containerEl) {
      this.containerEl.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  /**
   * Called on every game frame.
   * Timestamp in milliseconds (from requestAnimationFrame).
   */
  public recordFrame(timestampMs: number): void {
    this.tracker.recordFrame(timestampMs);
  }

  /**
   * Updates rendering and DOM metrics if visible.
   */
  public update(nowMs: number, metrics: PerformanceMetricsData): void {
    if (!this.isVisible) return;

    const snapshot = this.tracker.getSnapshot();

    // Render 60-frame sparkline graph
    this.renderGraph(snapshot);

    // Throttle DOM textual updates to ~10Hz (every 100ms) to avoid flicker and layout thrash
    if (nowMs - this.lastDomUpdateTime > 100) {
      this.lastDomUpdateTime = nowMs;
      this.updateDomStats(snapshot, metrics);
    }
  }

  private updateDomStats(snapshot: PerfSnapshot, metrics: PerformanceMetricsData): void {
    if (this.fpsValEl) {
      this.fpsValEl.textContent = snapshot.fps.toFixed(1);

      // Dynamic color styling for FPS
      if (snapshot.fps >= 55) {
        this.fpsValEl.style.color = '#00ffaa';
        this.fpsValEl.style.textShadow = '0 0 10px rgba(0, 255, 170, 0.7)';
      } else if (snapshot.fps >= 30) {
        this.fpsValEl.style.color = '#ffe600';
        this.fpsValEl.style.textShadow = '0 0 10px rgba(255, 230, 0, 0.7)';
      } else {
        this.fpsValEl.style.color = '#ff3366';
        this.fpsValEl.style.textShadow = '0 0 10px rgba(255, 51, 102, 0.7)';
      }
    }

    if (this.frameTimeValEl) {
      this.frameTimeValEl.textContent = `${snapshot.frameTimeMs.toFixed(1)} ms`;
    }

    if (this.minMaxValEl) {
      this.minMaxValEl.textContent = `min: ${snapshot.minFrameTimeMs.toFixed(1)}  max: ${snapshot.maxFrameTimeMs.toFixed(1)}`;
    }

    if (this.drawCallsEl) {
      this.drawCallsEl.textContent = String(metrics.drawCalls);
    }

    if (this.trianglesEl) {
      this.trianglesEl.textContent = metrics.triangles.toLocaleString();
    }

    if (this.geoTexEl) {
      this.geoTexEl.textContent = `${metrics.geometries} / ${metrics.textures}`;
    }

    if (this.particlesEl) {
      this.particlesEl.textContent = String(metrics.particleCount);
    }

    if (this.cameraEl) {
      this.cameraEl.textContent = metrics.cameraMode;
    }

    if (this.sectorEl) {
      this.sectorEl.textContent = `[${metrics.coords.x}, ${metrics.coords.y}]`;
    }

    if (this.resolutionEl) {
      const dpr = window.devicePixelRatio ? window.devicePixelRatio.toFixed(1) : '1.0';
      this.resolutionEl.textContent = `${window.innerWidth}x${window.innerHeight} @${dpr}x`;
    }

    // Memory info if available in Chromium
    const perfWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
    if (perfWithMemory?.memory && this.memoryEl) {
      const usedMB = (perfWithMemory.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      const totalMB = (perfWithMemory.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(0);
      this.memoryEl.textContent = `${usedMB} / ${totalMB} MB`;
    } else if (this.memoryRowEl) {
      this.memoryRowEl.style.display = 'none';
    }
  }

  private renderGraph(snapshot: PerfSnapshot): void {
    if (!this.canvasCtx || !this.canvasEl) return;

    const ctx = this.canvasCtx;
    const w = this.canvasEl.width;
    const h = this.canvasEl.height;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    ctx.fillStyle = 'rgba(2, 6, 14, 0.75)';
    ctx.fillRect(0, 0, w, h);

    // 16.67ms (60 FPS) guideline
    const maxScaleMs = 33.33; // 30 FPS boundary
    const targetY = h - (16.67 / maxScaleMs) * (h - 6) - 3;

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    const history = snapshot.history;
    if (history.length < 2) return;

    const count = history.length;
    const stepX = w / 60;
    const startX = w - count * stepX;

    // Draw sparkline fill area
    ctx.beginPath();
    ctx.moveTo(startX, h);

    for (let i = 0; i < count; i++) {
      const ms = Math.min(history[i], maxScaleMs * 1.5);
      const y = Math.max(2, h - (ms / maxScaleMs) * (h - 6) - 3);
      const x = startX + i * stepX;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(startX + (count - 1) * stepX, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0, 255, 255, 0.35)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw sparkline stroke line
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const ms = Math.min(history[i], maxScaleMs * 1.5);
      const y = Math.max(2, h - (ms / maxScaleMs) * (h - 6) - 3);
      const x = startX + i * stepX;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#00ffff';
    ctx.stroke();
  }

  public destroy(): void {
    if (this.containerEl && this.containerEl.parentNode) {
      this.containerEl.parentNode.removeChild(this.containerEl);
    }
  }
}

