import { DevManager, HazardMode } from '../engine/DevManager';
import { ScreenData } from '../world/ScreenData';
import { LevelMap } from '../world/LevelMap';
import { Player } from '../entities/Player';
import { ProceduralLevelMap } from '../world/ProceduralLevelMap';

export interface DevDebugOverlayCallbacks {
  goToRoom: (x: number, y: number, spawnTarget?: { x: number; y: number }) => void;
  teleportPlayer: (x: number, y: number) => void;
  giveAllKeys: () => void;
  collectAllPrisms: (roomOnly?: boolean) => void;
  resetRoomState: () => void;
  triggerWin: () => void;
  clearProjectiles: () => void;
  getCurrentRoom: () => ScreenData;
  getLevelMap: () => LevelMap;
  getPlayer: () => Player;
  getCurrentCoords: () => { x: number; y: number };
}

export class DevDebugOverlay {
  private dev: DevManager;
  private callbacks: DevDebugOverlayCallbacks;
  private containerEl: HTMLElement | null = null;
  private activeTab: 'nav' | 'hazards' | 'items' | 'visuals' | 'time' | 'void' = 'nav';

  // Cached DOM elements
  private playerTelemetryEl: HTMLElement | null = null;
  private roomSelectEl: HTMLSelectElement | null = null;
  private hazardBtnNormal: HTMLButtonElement | null = null;
  private hazardBtnNonLethal: HTMLButtonElement | null = null;
  private hazardBtnFrozen: HTMLButtonElement | null = null;
  private godModeBtn: HTMLButtonElement | null = null;
  private spikesBtn: HTMLButtonElement | null = null;
  private flyBtn: HTMLButtonElement | null = null;
  private airJumpBtn: HTMLButtonElement | null = null;
  private hitboxesBtn: HTMLButtonElement | null = null;
  private gridBtn: HTMLButtonElement | null = null;
  private mapRevealBtn: HTMLButtonElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;
  private headerMasterToggleBtn: HTMLButtonElement | null = null;
  private statusDotEl: HTMLElement | null = null;

  private isVisible: boolean = false;
  private currentSubscribedMap: LevelMap | null = null;
  private mapUnsubscribe: (() => void) | null = null;
  private updatePending: boolean = false;

  constructor(callbacks: DevDebugOverlayCallbacks) {
    this.dev = DevManager.getInstance();
    this.callbacks = callbacks;
    this.isVisible = false;

    this.createDOM();
    this.setupListeners();
    this.syncMapSubscription();
    this.updateVisibility();
    this.populateRoomSelector();
    this.updateUIState();
    this.updateBadges();
  }

  public syncMapSubscription(): void {
    const map = this.callbacks.getLevelMap();
    if (this.currentSubscribedMap === map) return;

    if (this.mapUnsubscribe) {
      this.mapUnsubscribe();
      this.mapUnsubscribe = null;
    }
    this.currentSubscribedMap = map;
    this.mapUnsubscribe = map.onMapChanged(() => {
      this.scheduleUpdate();
    });
  }

  private scheduleUpdate(): void {
    if (this.updatePending) return;
    this.updatePending = true;
    requestAnimationFrame(() => {
      this.updatePending = false;
      this.populateRoomSelector();
      this.updateCardinalButtons();
      this.updateMapRevealButton();
    });
  }

  public get visible(): boolean {
    return this.isVisible;
  }

  public toggle(force?: boolean): boolean {
    this.isVisible = force !== undefined ? force : !this.isVisible;
    if (this.isVisible) {
      if (!this.dev.enabled && !this.dev.hasActiveModifiers()) {
        this.dev.toggleEnabled(true);
      }
      this.syncMapSubscription();
      this.populateRoomSelector();
      this.updateUIState();
    }
    this.updateVisibility();
    this.updateBadges();
    return this.isVisible;
  }

  private updateVisibility(): void {
    if (this.containerEl) {
      this.containerEl.style.display = this.isVisible ? 'flex' : 'none';
    }
  }

  private createDOM(): void {
    const overlay = document.createElement('div');
    overlay.id = 'dev-overlay';
    overlay.className = 'dev-overlay-panel';
    overlay.innerHTML = `
      <div class="dev-header">
        <div class="dev-title-group">
          <span class="dev-status-dot" id="dev-status-dot"></span>
          <span class="dev-title">DEV CONSOLE // [F2]</span>
        </div>
        <div class="dev-header-actions">
          <button class="dev-header-icon-btn dev-header-power-btn active" id="dev-header-master-toggle" title="Dev Mode is ACTIVE. Click to suspend all modifiers without resetting.">⚡</button>
          <button class="dev-header-icon-btn dev-header-reset-btn" id="dev-btn-reset-all" title="Reset All Dev Modifiers to Defaults">↺</button>
          <button class="dev-header-icon-btn dev-close-btn" id="dev-close" title="Close Developer Tools [F2]">&times;</button>
        </div>
      </div>

      <div class="dev-tabs">
        <button class="dev-tab-btn active" data-tab="nav">NAV</button>
        <button class="dev-tab-btn" data-tab="hazards">HAZARDS</button>
        <button class="dev-tab-btn" data-tab="items">ITEMS</button>
        <button class="dev-tab-btn" data-tab="visuals">VISUALS</button>
        <button class="dev-tab-btn" data-tab="time">TIME</button>
        <button class="dev-tab-btn" data-tab="void" id="dev-tab-void-btn">VOID</button>
      </div>

      <div class="dev-body">
        <!-- Tab: NAV -->
        <div class="dev-tab-content active" id="dev-tab-nav">
          <div class="dev-section-title">SECTOR WARP</div>
          <div class="dev-row">
            <select class="dev-select" id="dev-room-select" style="width: 100%; flex: 1;" title="Select sector to warp instantly"></select>
          </div>

          <div class="dev-row" style="margin-top: 6px;">
            <span class="dev-label">COORDS:</span>
            <input type="number" class="dev-input" id="dev-coord-x" placeholder="X" value="0" />
            <input type="number" class="dev-input" id="dev-coord-y" placeholder="Y" value="0" />
            <button class="dev-btn" id="dev-btn-warp-coords">WARP</button>
          </div>

          <div class="dev-section-title" style="margin-top: 10px;">CARDINAL JUMP</div>
          <div class="dev-cardinal-grid">
            <div></div>
            <button class="dev-btn dev-btn-cardinal" id="dev-cardinal-up" title="Jump Up [Y+1]">▲ UP</button>
            <div></div>
            <button class="dev-btn dev-btn-cardinal" id="dev-cardinal-left" title="Jump Left [X-1]">◀ LEFT</button>
            <button class="dev-btn dev-btn-cardinal" id="dev-cardinal-cur" title="Current sector center">● CUR</button>
            <button class="dev-btn dev-btn-cardinal" id="dev-cardinal-right" title="Jump Right [X+1]">RIGHT ▶</button>
            <div></div>
            <button class="dev-btn dev-btn-cardinal" id="dev-cardinal-down" title="Jump Down [Y-1]">▼ DOWN</button>
            <div></div>
          </div>

          <div class="dev-section-title" style="margin-top: 10px;">INSIDE-ROOM TELEPORT</div>
          <div class="dev-btn-row">
            <button class="dev-btn" id="dev-tp-spawn">SPAWN</button>
            <button class="dev-btn" id="dev-tp-center">CENTER</button>
            <button class="dev-btn" id="dev-tp-goal">GOAL / WARP</button>
          </div>

          <div class="dev-row" style="margin-top: 6px;">
            <span class="dev-label">PIXELS:</span>
            <input type="number" class="dev-input" id="dev-tp-px-x" placeholder="X px" value="400" />
            <input type="number" class="dev-input" id="dev-tp-px-y" placeholder="Y px" value="400" />
            <button class="dev-btn" id="dev-btn-tp-pixels">TELEPORT</button>
          </div>

          <div class="dev-tip-box" style="margin-top: 10px;">
            💡 <strong>Shortcut:</strong> Hold <span class="dev-key">Shift</span> + <strong>Left-Click</strong> anywhere in the room to instantly teleport the player!
          </div>

          <div class="dev-row" style="margin-top: 8px;">
            <button class="dev-btn dev-btn-full" id="dev-btn-map-reveal">🗺 REVEAL FULL SECTOR MAP</button>
          </div>
        </div>

        <!-- Tab: HAZARDS -->
        <div class="dev-tab-content" id="dev-tab-hazards">
          <div class="dev-section-title">DYNAMIC HAZARDS (LASERS &amp; TURRETS)</div>
          <div class="dev-segmented-control" id="dev-hazard-mode-group">
            <button class="dev-seg-btn active" id="dev-hazard-normal" data-mode="normal">NORMAL (LETHAL)</button>
            <button class="dev-seg-btn" id="dev-hazard-nonlethal" data-mode="non-lethal">NON-LETHAL</button>
            <button class="dev-seg-btn" id="dev-hazard-frozen" data-mode="frozen">FROZEN (OFF)</button>
          </div>
          <div class="dev-desc" id="dev-hazard-desc">Lasers and turrets operate with full lethality.</div>

          <div class="dev-section-title" style="margin-top: 12px;">PLAYER INVULNERABILITY &amp; KINEMATICS</div>
          <div class="dev-toggle-row">
            <span>🛡 God Mode (Invulnerable to all)</span>
            <button class="dev-toggle-btn" id="dev-toggle-god">OFF</button>
          </div>
          <div class="dev-toggle-row">
            <span>⚔ Disable Spikes</span>
            <button class="dev-toggle-btn" id="dev-toggle-spikes">OFF</button>
          </div>
          <div class="dev-toggle-row">
            <span>🕊 Fly Mode / No-Clip (WASD)</span>
            <button class="dev-toggle-btn" id="dev-toggle-fly">OFF</button>
          </div>
          <div class="dev-toggle-row">
            <span>🦘 Infinite Air-Jump</span>
            <button class="dev-toggle-btn" id="dev-toggle-airjump">OFF</button>
          </div>

          <div class="dev-row" style="margin-top: 12px;">
            <button class="dev-btn dev-btn-full" id="dev-btn-clear-proj">💥 DESPAWN ALL ACTIVE PROJECTILES</button>
          </div>
        </div>

        <!-- Tab: ITEMS -->
        <div class="dev-tab-content" id="dev-tab-items">
          <div class="dev-section-title">INVENTORY &amp; CHEATS</div>
          <button class="dev-btn dev-btn-full accent-gold" id="dev-btn-give-keys" style="margin-bottom: 6px;">🔑 UNLOCK ALL GATES / GIVE ALL KEYS</button>
          <button class="dev-btn dev-btn-full accent-cyan" id="dev-btn-collect-room-prisms" style="margin-bottom: 6px;">⬡ COLLECT ALL PRISMS IN ROOM</button>
          <button class="dev-btn dev-btn-full" id="dev-btn-collect-all-prisms" style="margin-bottom: 6px;">⬡ COLLECT ALL PRISMS IN WORLD</button>
          <button class="dev-btn dev-btn-full" id="dev-btn-reset-room-state" style="margin-bottom: 6px;">↺ RESET ROOM STATE (ITEMS &amp; CRUMBLE)</button>
          <button class="dev-btn dev-btn-full accent-pink" id="dev-btn-trigger-win">🏆 TRIGGER WARP CORE VICTORY</button>
        </div>

        <!-- Tab: VISUALS -->
        <div class="dev-tab-content" id="dev-tab-visuals">
          <div class="dev-section-title">DIAGNOSTIC OVERLAYS</div>
          <div class="dev-toggle-row">
            <span>🟩 Hitbox &amp; Collision Visualizer</span>
            <button class="dev-toggle-btn" id="dev-toggle-hitboxes">OFF</button>
          </div>
          <div class="dev-toggle-row">
            <span>▦ 20x20 Tile Coordinate Grid</span>
            <button class="dev-toggle-btn" id="dev-toggle-grid">OFF</button>
          </div>

          <div class="dev-section-title" style="margin-top: 12px;">PLAYER TELEMETRY</div>
          <div class="dev-telemetry-box" id="dev-player-telemetry">
            <div>POS: <span id="tel-pos">X: 0, Y: 0</span></div>
            <div>VEL: <span id="tel-vel">Vx: 0, Vy: 0</span></div>
            <div>STATE: <span id="tel-state">Grounded: Yes | Ducking: No</span></div>
          </div>
        </div>

        <!-- Tab: TIME -->
        <div class="dev-tab-content" id="dev-tab-time">
          <div class="dev-section-title">TIME SCALE / SPEED</div>
          <div class="dev-btn-row">
            <button class="dev-btn dev-speed-btn" data-speed="0.25">0.25x</button>
            <button class="dev-btn dev-speed-btn" data-speed="0.5">0.5x</button>
            <button class="dev-btn dev-speed-btn active" data-speed="1.0">1.0x</button>
            <button class="dev-btn dev-speed-btn" data-speed="2.0">2.0x</button>
            <button class="dev-btn dev-speed-btn" data-speed="4.0">4.0x</button>
          </div>

          <div class="dev-section-title" style="margin-top: 12px;">SIMULATION FREEZE</div>
          <div class="dev-row">
            <button class="dev-btn dev-btn-full" id="dev-btn-pause">⏸ PAUSE PHYSICS</button>
            <button class="dev-btn" id="dev-btn-step" style="margin-left: 6px;">⏭ STEP</button>
          </div>
        </div>

        <!-- Tab: VOID -->
        <div class="dev-tab-content" id="dev-tab-void">
          <div class="dev-section-title">PROCEDURAL VOID CONTROLS</div>
          <div class="dev-desc">Jump across endless procedural depths or navigate to power sanctuaries.</div>

          <div class="dev-btn-row" style="margin-top: 8px;">
            <button class="dev-btn dev-depth-btn" data-depth="10">DEPTH 10</button>
            <button class="dev-btn dev-depth-btn" data-depth="25">DEPTH 25</button>
            <button class="dev-btn dev-depth-btn" data-depth="50">DEPTH 50</button>
            <button class="dev-btn dev-depth-btn" data-depth="100">DEPTH 100</button>
          </div>

          <div class="dev-row" style="margin-top: 8px;">
            <span class="dev-label">DEPTH:</span>
            <input type="number" class="dev-input" id="dev-void-depth-input" placeholder="Depth" value="15" min="1" max="10000" />
            <button class="dev-btn" id="dev-btn-void-depth-warp">WARP</button>
          </div>

          <div class="dev-row" style="margin-top: 8px;">
            <button class="dev-btn dev-btn-full accent-cyan" id="dev-btn-sanctuary">✨ NEAREST POWER SANCTUARY (D:8)</button>
          </div>
        </div>
      </div>

      <div class="dev-footer">
        <div>Toggle: <span class="dev-key">F2</span> | Shift+Click Room to Teleport</div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.containerEl = overlay;

    // Cache elements
    this.roomSelectEl = overlay.querySelector('#dev-room-select');
    this.hazardBtnNormal = overlay.querySelector('#dev-hazard-normal');
    this.hazardBtnNonLethal = overlay.querySelector('#dev-hazard-nonlethal');
    this.hazardBtnFrozen = overlay.querySelector('#dev-hazard-frozen');
    this.godModeBtn = overlay.querySelector('#dev-toggle-god');
    this.spikesBtn = overlay.querySelector('#dev-toggle-spikes');
    this.flyBtn = overlay.querySelector('#dev-toggle-fly');
    this.airJumpBtn = overlay.querySelector('#dev-toggle-airjump');
    this.hitboxesBtn = overlay.querySelector('#dev-toggle-hitboxes');
    this.gridBtn = overlay.querySelector('#dev-toggle-grid');
    this.mapRevealBtn = overlay.querySelector('#dev-btn-map-reveal');
    this.pauseBtn = overlay.querySelector('#dev-btn-pause');
    this.playerTelemetryEl = overlay.querySelector('#dev-player-telemetry');
    this.headerMasterToggleBtn = overlay.querySelector('#dev-header-master-toggle');
    this.statusDotEl = overlay.querySelector('#dev-status-dot');
  }

  private setupListeners(): void {
    if (!this.containerEl) return;

    // Close button
    const closeBtn = this.containerEl.querySelector('#dev-close');
    closeBtn?.addEventListener('click', () => {
      this.toggle(false);
    });

    // Tab switching
    const tabButtons = this.containerEl.querySelectorAll('.dev-tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as typeof this.activeTab;
        if (!tab) return;
        this.activeTab = tab;
        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const tabContents = this.containerEl!.querySelectorAll('.dev-tab-content');
        tabContents.forEach((c) => c.classList.remove('active'));
        this.containerEl!.querySelector(`#dev-tab-${tab}`)?.classList.add('active');

        if (tab === 'nav') {
          this.populateRoomSelector();
        }
      });
    });

    // Sector warp immediately on selection change
    this.roomSelectEl?.addEventListener('change', () => {
      if (this.roomSelectEl?.value) {
        const [x, y] = this.roomSelectEl.value.split(',').map(Number);
        if (!isNaN(x) && !isNaN(y)) {
          this.callbacks.goToRoom(x, y);
          this.populateRoomSelector();
        }
      }
    });

    // Coords warp
    const btnWarpCoords = this.containerEl.querySelector('#dev-btn-warp-coords');
    btnWarpCoords?.addEventListener('click', () => {
      const inputX = this.containerEl!.querySelector('#dev-coord-x') as HTMLInputElement;
      const inputY = this.containerEl!.querySelector('#dev-coord-y') as HTMLInputElement;
      const x = parseInt(inputX.value, 10);
      const y = parseInt(inputY.value, 10);
      if (!isNaN(x) && !isNaN(y)) {
        this.callbacks.goToRoom(x, y);
        this.populateRoomSelector();
      }
    });

    // Cardinal jumps
    this.containerEl.querySelector('#dev-cardinal-up')?.addEventListener('click', () => {
      const cur = this.callbacks.getCurrentCoords();
      this.callbacks.goToRoom(cur.x, cur.y + 1);
      this.populateRoomSelector();
    });
    this.containerEl.querySelector('#dev-cardinal-down')?.addEventListener('click', () => {
      const cur = this.callbacks.getCurrentCoords();
      this.callbacks.goToRoom(cur.x, cur.y - 1);
      this.populateRoomSelector();
    });
    this.containerEl.querySelector('#dev-cardinal-left')?.addEventListener('click', () => {
      const cur = this.callbacks.getCurrentCoords();
      this.callbacks.goToRoom(cur.x - 1, cur.y);
      this.populateRoomSelector();
    });
    this.containerEl.querySelector('#dev-cardinal-right')?.addEventListener('click', () => {
      const cur = this.callbacks.getCurrentCoords();
      this.callbacks.goToRoom(cur.x + 1, cur.y);
      this.populateRoomSelector();
    });
    this.containerEl.querySelector('#dev-cardinal-cur')?.addEventListener('click', () => {
      this.callbacks.teleportPlayer(400, 400);
    });

    // Inside-room teleports
    this.containerEl.querySelector('#dev-tp-spawn')?.addEventListener('click', () => {
      const room = this.callbacks.getCurrentRoom();
      const spawn = room.spawnPoint || { x: 80, y: 660 };
      this.callbacks.teleportPlayer(spawn.x, spawn.y);
    });
    this.containerEl.querySelector('#dev-tp-center')?.addEventListener('click', () => {
      this.callbacks.teleportPlayer(400, 400);
    });
    this.containerEl.querySelector('#dev-tp-goal')?.addEventListener('click', () => {
      const room = this.callbacks.getCurrentRoom();
      for (let r = 0; r < room.tiles.length; r++) {
        for (let c = 0; c < room.tiles[r].length; c++) {
          if (room.tiles[r][c] === 6) { // Goal
            this.callbacks.teleportPlayer(c * 40, r * 40);
            return;
          }
        }
      }
      // If no goal tile, find first collectible prism
      for (const col of room.collectibles) {
        if (col.type === 'prism' || col.type === 'core') {
          this.callbacks.teleportPlayer(col.x, col.y);
          return;
        }
      }
      this.callbacks.teleportPlayer(400, 400);
    });

    this.containerEl.querySelector('#dev-btn-tp-pixels')?.addEventListener('click', () => {
      const inputX = this.containerEl!.querySelector('#dev-tp-px-x') as HTMLInputElement;
      const inputY = this.containerEl!.querySelector('#dev-tp-px-y') as HTMLInputElement;
      const px = parseFloat(inputX.value);
      const py = parseFloat(inputY.value);
      if (!isNaN(px) && !isNaN(py)) {
        this.callbacks.teleportPlayer(px, py);
      }
    });

    // Reveal Full Map
    this.mapRevealBtn?.addEventListener('click', () => {
      const map = this.callbacks.getLevelMap();
      map.markAllVisited();
      this.populateRoomSelector();
      this.updateCardinalButtons();
      this.updateMapRevealButton();
    });

    // Master Dev Mode Toggle (Header Icon Button)
    const handleMasterToggle = () => {
      this.dev.toggleEnabled();
      this.updateUIState();
      this.updateBadges();
    };
    this.headerMasterToggleBtn?.addEventListener('click', handleMasterToggle);

    // Hazard 2-way mode control buttons
    const ensureDevEnabled = () => {
      if (!this.dev.enabled) {
        this.dev.toggleEnabled(true);
      }
    };

    const setHazardUI = (mode: HazardMode) => {
      if (mode !== 'normal') ensureDevEnabled();
      this.dev.setHazardMode(mode);
      this.updateHazardUI();
      this.updateBadges();
    };

    this.hazardBtnNormal?.addEventListener('click', () => setHazardUI('normal'));
    this.hazardBtnNonLethal?.addEventListener('click', () => setHazardUI('non-lethal'));
    this.hazardBtnFrozen?.addEventListener('click', () => setHazardUI('frozen'));

    // Toggles
    this.godModeBtn?.addEventListener('click', () => {
      ensureDevEnabled();
      this.dev.toggleGodMode();
      this.updateUIState();
    });
    this.spikesBtn?.addEventListener('click', () => {
      ensureDevEnabled();
      this.dev.toggleDisableSpikes();
      this.updateUIState();
    });
    this.flyBtn?.addEventListener('click', () => {
      ensureDevEnabled();
      this.dev.toggleFlyMode();
      this.updateUIState();
    });
    this.airJumpBtn?.addEventListener('click', () => {
      ensureDevEnabled();
      this.dev.toggleInfiniteJump();
      this.updateUIState();
    });
    this.hitboxesBtn?.addEventListener('click', () => {
      ensureDevEnabled();
      this.dev.toggleShowHitboxes();
      this.updateUIState();
    });
    this.gridBtn?.addEventListener('click', () => {
      ensureDevEnabled();
      this.dev.toggleShowTileGrid();
      this.updateUIState();
    });

    // Despawn projectiles
    this.containerEl.querySelector('#dev-btn-clear-proj')?.addEventListener('click', () => {
      this.callbacks.clearProjectiles();
    });

    // Items
    this.containerEl.querySelector('#dev-btn-give-keys')?.addEventListener('click', () => {
      this.callbacks.giveAllKeys();
    });
    this.containerEl.querySelector('#dev-btn-collect-room-prisms')?.addEventListener('click', () => {
      this.callbacks.collectAllPrisms(true);
    });
    this.containerEl.querySelector('#dev-btn-collect-all-prisms')?.addEventListener('click', () => {
      this.callbacks.collectAllPrisms(false);
    });
    this.containerEl.querySelector('#dev-btn-reset-room-state')?.addEventListener('click', () => {
      this.callbacks.resetRoomState();
    });
    this.containerEl.querySelector('#dev-btn-trigger-win')?.addEventListener('click', () => {
      this.callbacks.triggerWin();
    });

    // Time speed
    const speedButtons = this.containerEl.querySelectorAll('.dev-speed-btn');
    speedButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.getAttribute('data-speed') || '1');
        this.dev.setTimeScale(speed);
        speedButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Pause & Step
    this.pauseBtn?.addEventListener('click', () => {
      const paused = this.dev.togglePaused();
      this.pauseBtn!.textContent = paused ? '▶ RESUME PHYSICS' : '⏸ PAUSE PHYSICS';
      this.pauseBtn!.classList.toggle('active', paused);
    });

    this.containerEl.querySelector('#dev-btn-step')?.addEventListener('click', () => {
      this.dev.stepFrame();
    });

    // Procedural Void Depth jumps
    const depthButtons = this.containerEl.querySelectorAll('.dev-depth-btn');
    depthButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const depth = parseInt(btn.getAttribute('data-depth') || '10', 10);
        this.callbacks.goToRoom(depth, 0);
        this.populateRoomSelector();
      });
    });

    this.containerEl.querySelector('#dev-btn-void-depth-warp')?.addEventListener('click', () => {
      const input = this.containerEl!.querySelector('#dev-void-depth-input') as HTMLInputElement | null;
      const depth = parseInt(input?.value || '15', 10);
      if (!isNaN(depth) && depth > 0) {
        this.callbacks.goToRoom(depth, 0);
        this.populateRoomSelector();
      }
    });

    this.containerEl.querySelector('#dev-btn-sanctuary')?.addEventListener('click', () => {
      const cur = this.callbacks.getCurrentCoords();
      const curDepth = Math.abs(cur.x) + Math.abs(cur.y);
      const nextSanctuaryDepth = (Math.floor(curDepth / 8) + 1) * 8;
      this.callbacks.goToRoom(nextSanctuaryDepth, 0);
      this.populateRoomSelector();
    });

    // Reset all dev modifiers
    this.containerEl.querySelector('#dev-btn-reset-all')?.addEventListener('click', () => {
      this.dev.resetToDefaults();
      this.updateHazardUI();
      this.updateUIState();
      this.updateBadges();
    });

    // Keep HUD badges in sync whenever dev settings change
    this.dev.subscribe(() => {
      this.updateBadges();
    });
    this.dev.onToggle(() => {
      this.updateBadges();
    });
  }

  public updateCardinalButtons(): void {
    if (!this.containerEl) return;
    const cur = this.callbacks.getCurrentCoords();
    const map = this.callbacks.getLevelMap();
    const currentRoom = this.callbacks.getCurrentRoom();

    const dirs: Array<{ id: string; dir: 'up' | 'down' | 'left' | 'right'; dx: number; dy: number; label: string }> = [
      { id: 'dev-cardinal-up', dir: 'up', dx: 0, dy: 1, label: 'North' },
      { id: 'dev-cardinal-down', dir: 'down', dx: 0, dy: -1, label: 'South' },
      { id: 'dev-cardinal-left', dir: 'left', dx: -1, dy: 0, label: 'West' },
      { id: 'dev-cardinal-right', dir: 'right', dx: 1, dy: 0, label: 'East' },
    ];

    for (const { id, dir, dx, dy, label } of dirs) {
      const btn = this.containerEl.querySelector(`#${id}`) as HTMLButtonElement | null;
      if (!btn) continue;

      const targetX = cur.x + dx;
      const targetY = cur.y + dy;

      const hasExit = currentRoom.exits ? currentRoom.exits[dir] !== false : true;
      const targetRoom = map.getRoom(targetX, targetY);
      const isPossible = hasExit && targetRoom !== undefined;

      btn.disabled = !isPossible;
      btn.classList.toggle('disabled', !isPossible);
      if (isPossible) {
        btn.title = `Jump ${label} [${targetX}, ${targetY}]: ${targetRoom.title}`;
      } else {
        btn.title = `No accessible sector to the ${label}`;
      }
    }
  }

  public populateRoomSelector(): void {
    if (!this.roomSelectEl) return;
    const map = this.callbacks.getLevelMap();
    const rooms = map.getAllRooms();
    const cur = this.callbacks.getCurrentCoords();
    const currentRoom = this.callbacks.getCurrentRoom();

    // Sort rooms logically by coordinates (X, Y)
    rooms.sort((a, b) => {
      if (a.coords.x !== b.coords.x) return a.coords.x - b.coords.x;
      return a.coords.y - b.coords.y;
    });

    this.roomSelectEl.innerHTML = '';
    for (const r of rooms) {
      const opt = document.createElement('option');
      opt.value = `${r.coords.x},${r.coords.y}`;
      const isCur = r.coords.x === cur.x && r.coords.y === cur.y;
      opt.textContent = `[${r.coords.x}, ${r.coords.y}] ${r.title}${isCur ? ' (HERE)' : ''}`;
      if (isCur) opt.selected = true;
      this.roomSelectEl.appendChild(opt);
    }

    if (this.containerEl) {
      const inputX = this.containerEl.querySelector('#dev-coord-x') as HTMLInputElement | null;
      const inputY = this.containerEl.querySelector('#dev-coord-y') as HTMLInputElement | null;
      if (inputX && inputY && document.activeElement !== inputX && document.activeElement !== inputY) {
        inputX.value = cur.x.toString();
        inputY.value = cur.y.toString();
      }
      const curBtn = this.containerEl.querySelector('#dev-cardinal-cur') as HTMLButtonElement | null;
      if (curBtn && currentRoom) {
        curBtn.title = `Current Sector [${cur.x}, ${cur.y}]: ${currentRoom.title} (Teleport to Center)`;
      }
    }

    this.updateCardinalButtons();
    this.updateMapRevealButton();
  }

  public onSectorChanged(): void {
    this.syncMapSubscription();
    this.populateRoomSelector();
    this.updateUIState();
    this.updateBadges();
  }

  public updateHazardUI(): void {
    const mode = this.dev.hazardMode;
    this.hazardBtnNormal?.classList.toggle('active', mode === 'normal');
    this.hazardBtnNonLethal?.classList.toggle('active', mode === 'non-lethal');
    this.hazardBtnFrozen?.classList.toggle('active', mode === 'frozen');

    const descEl = this.containerEl?.querySelector('#dev-hazard-desc');
    if (descEl) {
      if (mode === 'normal') {
        descEl.textContent = 'Lasers and turrets operate with full lethality.';
      } else if (mode === 'non-lethal') {
        descEl.textContent = 'Lasers & turrets fire and cycle normally, but deal 0 damage.';
      } else {
        descEl.textContent = 'Lasers & turrets are completely deactivated and silent.';
      }
    }
  }

  public updateMapRevealButton(): void {
    if (!this.mapRevealBtn) return;
    const map = this.callbacks.getLevelMap();
    const isProcedural = map instanceof ProceduralLevelMap;
    const total = map.getTotalRoomsCount();
    const discovered = map.getDiscoveredRoomsCount();

    if (isProcedural) {
      if (total > discovered) {
        this.mapRevealBtn.textContent = `🗺 REVEAL NEXT SECTORS (${discovered}/${total})`;
      } else {
        this.mapRevealBtn.textContent = `🗺 REVEAL NEXT SECTORS (${discovered} KNOWN)`;
      }
      this.mapRevealBtn.classList.remove('active');
    } else {
      const allDiscovered = total > 0 && discovered >= total;
      if (allDiscovered) {
        this.mapRevealBtn.textContent = '✓ ALL SECTORS REVEALED';
        this.mapRevealBtn.classList.add('active');
      } else {
        this.mapRevealBtn.textContent = total > 0
          ? `🗺 REVEAL FULL SECTOR MAP (${discovered}/${total})`
          : '🗺 REVEAL FULL SECTOR MAP';
        this.mapRevealBtn.classList.remove('active');
      }
    }
  }

  public updateUIState(): void {
    this.updateHazardUI();
    this.updateCardinalButtons();
    this.updateMapRevealButton();

    const setToggle = (btn: HTMLElement | null, active: boolean) => {
      if (!btn) return;
      btn.textContent = active ? 'ON' : 'OFF';
      btn.classList.toggle('active', active);
    };

    setToggle(this.godModeBtn, this.dev.godMode);
    setToggle(this.spikesBtn, this.dev.disableSpikes);
    setToggle(this.flyBtn, this.dev.flyMode);
    setToggle(this.airJumpBtn, this.dev.infiniteJump);
    setToggle(this.hitboxesBtn, this.dev.showHitboxes);
    setToggle(this.gridBtn, this.dev.showTileGrid);

    // Void tab visibility & sanctuary depth info
    const isProcedural = this.callbacks.getLevelMap() instanceof ProceduralLevelMap;
    const voidTabBtn = this.containerEl?.querySelector('#dev-tab-void-btn') as HTMLElement | null;
    if (voidTabBtn) {
      voidTabBtn.style.display = isProcedural ? 'inline-block' : 'none';
    }

    const sanctuaryBtn = this.containerEl?.querySelector('#dev-btn-sanctuary') as HTMLButtonElement | null;
    if (sanctuaryBtn) {
      const cur = this.callbacks.getCurrentCoords();
      const curDepth = Math.abs(cur.x) + Math.abs(cur.y);
      const nextSanctuaryDepth = (Math.floor(curDepth / 8) + 1) * 8;
      sanctuaryBtn.textContent = `✨ NEAREST POWER SANCTUARY (D:${nextSanctuaryDepth})`;
    }

    // Speed buttons and pause button
    const speedButtons = this.containerEl?.querySelectorAll('.dev-speed-btn');
    speedButtons?.forEach((btn) => {
      const speed = parseFloat(btn.getAttribute('data-speed') || '1');
      btn.classList.toggle('active', Math.abs(speed - this.dev.timeScale) < 0.01);
    });

    // Master toggle button state
    const isEnabled = this.dev.enabled;

    if (this.headerMasterToggleBtn) {
      this.headerMasterToggleBtn.classList.toggle('active', isEnabled);
      this.headerMasterToggleBtn.classList.toggle('off', !isEnabled);
      this.headerMasterToggleBtn.title = isEnabled
        ? 'Dev Mode is ACTIVE. Click to SUSPEND all modifiers without resetting.'
        : 'Dev Mode is SUSPENDED. Click to ACTIVATE all configured modifiers.';
    }

    if (this.statusDotEl) {
      this.statusDotEl.classList.toggle('off', !isEnabled);
    }

    this.updateBadges();
  }

  public updateBadges(): void {
    const badgesContainer = document.getElementById('hud-dev-badges');
    if (!badgesContainer) return;

    const hasModifiers = this.dev.hasActiveModifiers();

    // If dev mode is disabled and no modifiers are configured, show nothing
    if (!this.dev.enabled && !hasModifiers) {
      badgesContainer.innerHTML = '';
      return;
    }

    badgesContainer.innerHTML = '';

    // Master Toggle Badge
    const masterBtn = document.createElement('button');
    masterBtn.type = 'button';
    masterBtn.id = 'hud-badge-master-toggle';
    if (this.dev.enabled) {
      masterBtn.className = 'hud-dev-badge badge-dev-master';
      masterBtn.title = 'Dev Mode is ACTIVE. Click to quickly DISABLE all modifiers without resetting | F2 for Console';
      masterBtn.innerHTML = '<span class="badge-icon">⚡</span><span class="badge-text">DEV: ON</span>';
      masterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dev.toggleEnabled(false);
        this.updateUIState();
        this.updateBadges();
      });
    } else {
      masterBtn.className = 'hud-dev-badge badge-dev-off';
      masterBtn.title = 'Dev Modifiers are SUSPENDED. Click to RE-ENABLE | F2 for Console';
      masterBtn.innerHTML = '<span class="badge-icon">⚡</span><span class="badge-text">DEV: OFF</span>';
      masterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dev.toggleEnabled(true);
        this.updateUIState();
        this.updateBadges();
      });
    }
    badgesContainer.appendChild(masterBtn);

    // If dev mode is disabled, we only show the DEV: OFF toggle badge
    if (!this.dev.enabled) {
      return;
    }

    const badges: { className: string; icon: string; text: string; title: string }[] = [];

    // Hazard mode
    if (this.dev.hazardMode === 'frozen') {
      badges.push({
        className: 'badge-frozen',
        icon: '❄',
        text: 'HAZARDS: FROZEN',
        title: 'Dev Mode: All laser barriers & turrets deactivated',
      });
    } else if (this.dev.hazardMode === 'non-lethal') {
      badges.push({
        className: 'badge-nonlethal',
        icon: '🛡',
        text: 'HAZARDS: NON-LETHAL',
        title: 'Dev Mode: Lasers & turrets deal 0 damage',
      });
    }

    // God Mode
    if (this.dev.godMode) {
      badges.push({
        className: 'badge-god',
        icon: '★',
        text: 'GOD MODE',
        title: 'Dev Mode: Invulnerable to all damage & hazards',
      });
    }

    // Fly Mode / NoClip
    if (this.dev.flyMode) {
      badges.push({
        className: 'badge-fly',
        icon: '✦',
        text: 'FLY / NOCLIP',
        title: 'Dev Mode: Flight & obstacle noclip active',
      });
    }

    // No Spikes (only if not godMode, since godMode already covers spikes)
    if (this.dev.disableSpikes && !this.dev.godMode) {
      badges.push({
        className: 'badge-spikes',
        icon: '▲',
        text: 'NO SPIKES',
        title: 'Dev Mode: Spikes disabled',
      });
    }

    // Air Jump / Infinite Jump
    if (this.dev.infiniteJump) {
      badges.push({
        className: 'badge-jump',
        icon: '⇪',
        text: 'AIR JUMP',
        title: 'Dev Mode: Infinite air jump active',
      });
    }

    // Engine Paused
    if (this.dev.isPaused) {
      badges.push({
        className: 'badge-paused',
        icon: '⏸',
        text: 'PAUSED',
        title: 'Dev Mode: Physics paused',
      });
    }

    // Custom Timescale
    if (this.dev.timeScale !== 1.0) {
      badges.push({
        className: 'badge-speed',
        icon: '⏩',
        text: `${this.dev.timeScale}x SPEED`,
        title: `Dev Mode: Custom time scale ${this.dev.timeScale}x`,
      });
    }

    badgesContainer.innerHTML = '';
    for (const b of badges) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hud-dev-badge ${b.className}`;
      btn.title = `${b.title} [F2 to configure]`;
      btn.innerHTML = `<span class="badge-icon">${b.icon}</span><span class="badge-text">${b.text}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle(true);
      });
      badgesContainer.appendChild(btn);
    }
  }

  public updateTelemetry(): void {
    if (!this.isVisible || this.activeTab !== 'visuals' || !this.playerTelemetryEl) return;
    const player = this.callbacks.getPlayer();
    const posEl = this.playerTelemetryEl.querySelector('#tel-pos');
    const velEl = this.playerTelemetryEl.querySelector('#tel-vel');
    const stateEl = this.playerTelemetryEl.querySelector('#tel-state');

    if (posEl) posEl.textContent = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;
    if (velEl) velEl.textContent = `Vx: ${Math.round(player.vx)}, Vy: ${Math.round(player.vy)}`;
    if (stateEl) {
      stateEl.textContent = `Grounded: ${player.isGrounded ? 'YES' : 'NO'} | Ducking: ${player.isDucking ? 'YES' : 'NO'} | Facing: ${player.facing > 0 ? 'RIGHT' : 'LEFT'}`;
    }
  }
}
