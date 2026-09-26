import { LevelMap } from './world/LevelMap';
import { FACE_SIZE, ScreenData, ExitDirection, ExitGateConfig, getGateColor } from './world/ScreenData';
import { WorldRegistry } from './world/WorldRegistry';
import { ProceduralLevelMap } from './world/ProceduralLevelMap';
import { DifficultyLevel } from './world/ProceduralWorldGen';
import { Player } from './entities/Player';
import { InputManager, InputState } from './engine/InputManager';
import { AudioManager } from './engine/AudioManager';
import { ParticleSystem } from './engine/ParticleSystem';
import { PhysicsEngine, TransitionEvent } from './engine/PhysicsEngine';
import { CubeRenderer, RotationDirection } from './graphics/CubeRenderer';
import { PerformanceDebugView } from './ui/PerformanceDebugView';
import { SectorMapView } from './ui/SectorMapView';
import { DevManager } from './engine/DevManager';
import { DevDebugOverlay } from './ui/DevDebugOverlay';

type GameState = 'PLAYING' | 'ROTATING' | 'GOAL_REACHED' | 'RESPAWNING';

class Game {
  private levelMap: LevelMap;
  private currentCoords: { x: number; y: number } = { x: 0, y: 0 };
  private currentRoom: ScreenData;
  private player: Player;
  private input: InputManager;
  private audio: AudioManager;
  private particles: ParticleSystem;
  private physics: PhysicsEngine;
  private cubeRenderer: CubeRenderer;

  private gameState: GameState = 'PLAYING';
  private lastTime: number = 0;
  private gameTime: number = 0;
  private sidesTraversed: number = 1;
  private camera3DMode: boolean = true;
  private isIntroOrbiting: boolean = true;
  private pendingNextRoom: ScreenData | null = null;
  private bannerTimeout: number | null = null;
  private rHoldTime: number = 0;
  private readonly R_HOLD_THRESHOLD: number = 0.8;
  private rLongPressTriggered: boolean = false;
  private isButtonResetHeld: boolean = false;
  private currentWorldId: string = 'demo';

  // DOM Elements
  private hudSectorEl: HTMLElement;
  private hudTurnEl: HTMLElement;
  private hudPrismsEl: HTMLElement;
  private bannerEl: HTMLElement;
  private winModalEl: HTMLElement;
  private winStatsEl: HTMLElement;
  private btnMuteEl: HTMLElement;
  private btnCameraEl: HTMLElement;
  private btnPerfEl: HTMLElement | null;
  private btnMapEl: HTMLElement | null;
  private worldSelectEl: HTMLSelectElement;
  private worldFileInputEl: HTMLInputElement;
  private perfDebug: PerformanceDebugView;
  private sectorMap: SectorMapView;
  private devManager: DevManager;
  private devOverlay: DevDebugOverlay;
  private btnDevEl: HTMLElement | null = null;

  // New UI Elements
  private helpOverlayEl: HTMLElement;
  private gearMenuEl: HTMLElement;
  private btnGearEl: HTMLElement;
  private btnHelpEl: HTMLElement;
  private proceduralDividerEl: HTMLElement | null;

  // Procedural Infinite Mode Elements
  private proceduralModalEl: HTMLElement;
  private proceduralCardEl: HTMLElement;
  private proceduralDepthEl: HTMLElement;
  private proceduralThreatBadgeEl: HTMLElement;
  private proceduralSeedInputEl: HTMLInputElement;
  private btnSeedRandomEl: HTMLElement;
  private btnLaunchProceduralEl: HTMLElement;
  private btnProceduralSetupEl: HTMLElement | null;
  private btnHudProceduralRestartEl: HTMLElement | null;
  private btnCloseProceduralModalEl: HTMLElement | null;
  private btnCancelProceduralEl: HTMLElement | null;
  private selectedDifficulty: DifficultyLevel = 'normal';
  private keyInventorySlotsEl: HTMLElement | null = null;
  private lastGateAlertTime: number = 0;

  constructor() {
    const container = document.getElementById('game-container')!;
    this.hudSectorEl = document.getElementById('hud-sector')!;
    this.hudTurnEl = document.getElementById('hud-turn')!;
    this.hudPrismsEl = document.getElementById('hud-prisms')!;
    this.bannerEl = document.getElementById('rotation-banner')!;
    this.winModalEl = document.getElementById('win-modal')!;
    this.winStatsEl = document.getElementById('win-stats')!;
    this.btnMuteEl = document.getElementById('btn-mute')!;
    this.btnCameraEl = document.getElementById('btn-camera')!;
    this.btnPerfEl = document.getElementById('btn-perf');
    this.btnMapEl = document.getElementById('btn-map');
    this.worldSelectEl = document.getElementById('world-select') as HTMLSelectElement;
    this.worldFileInputEl = document.getElementById('world-file-input') as HTMLInputElement;
    this.proceduralModalEl = document.getElementById('procedural-modal')!;
    this.proceduralCardEl = document.getElementById('hud-procedural-card')!;
    this.proceduralDepthEl = document.getElementById('hud-depth')!;
    this.proceduralThreatBadgeEl = document.getElementById('hud-threat-badge')!;
    this.proceduralSeedInputEl = document.getElementById('procedural-seed') as HTMLInputElement;
    this.btnSeedRandomEl = document.getElementById('btn-seed-random')!;
    this.btnLaunchProceduralEl = document.getElementById('btn-launch-procedural')!;
    this.btnProceduralSetupEl = document.getElementById('btn-procedural-setup');
    this.btnHudProceduralRestartEl = document.getElementById('btn-hud-procedural-restart');
    this.btnCloseProceduralModalEl = document.getElementById('btn-close-procedural-modal');
    this.btnCancelProceduralEl = document.getElementById('btn-cancel-procedural');

    // New compact UI elements
    this.helpOverlayEl = document.getElementById('help-overlay')!;
    this.gearMenuEl = document.getElementById('gear-menu')!;
    this.btnGearEl = document.getElementById('btn-gear')!;
    this.btnHelpEl = document.getElementById('btn-help')!;
    this.proceduralDividerEl = document.getElementById('hud-procedural-divider');
    this.keyInventorySlotsEl = document.getElementById('key-inventory-slots');

    this.perfDebug = new PerformanceDebugView({
      initialVisible: false,
      onToggle: (visible) => {
        if (this.btnPerfEl) {
          // Update gear menu item text
          const textNodes = Array.from(this.btnPerfEl.childNodes);
          for (const node of textNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('Perf:')) {
              node.textContent = visible ? ' Perf: ON ' : ' Perf: OFF ';
            }
          }
        }
      },
    });

    // Dynamically populate world select options from discovered worlds
    if (this.worldSelectEl) {
      this.worldSelectEl.innerHTML = '';
      for (const w of WorldRegistry.getAvailableWorlds()) {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = `World: ${w.name}`;
        this.worldSelectEl.appendChild(opt);
      }
      const customOpt = document.createElement('option');
      customOpt.value = '__load_custom__';
      customOpt.textContent = '+ Load Custom World (.json)...';
      this.worldSelectEl.appendChild(customOpt);

      const editorOpt = document.createElement('option');
      editorOpt.value = '__open_editor__';
      editorOpt.textContent = '⚡ Open World Editor...';
      this.worldSelectEl.appendChild(editorOpt);
    }

    // Check for ?world= URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const paramWorld = urlParams.get('world');
    if (paramWorld && WorldRegistry.getWorld(paramWorld)) {
      this.currentWorldId = paramWorld;
    }
    if (this.worldSelectEl) {
      this.worldSelectEl.value = this.currentWorldId;
    }

    const worldEntry = WorldRegistry.getWorld(this.currentWorldId) || WorldRegistry.getWorld('demo')!;
    this.levelMap = worldEntry.load();
    const sx = worldEntry.startingCoords?.x ?? 0;
    const sy = worldEntry.startingCoords?.y ?? 0;
    const initialRoom = this.levelMap.getRoom(sx, sy) || this.levelMap.getAllRooms()[0];
    if (!initialRoom) throw new Error('Initial room not found');
    this.currentCoords = { x: initialRoom.coords.x, y: initialRoom.coords.y };
    this.currentRoom = initialRoom;
    this.levelMap.markVisited(this.currentCoords.x, this.currentCoords.y);

    const spawn = initialRoom.spawnPoint || { x: 120, y: 660 };
    this.player = new Player(spawn.x, spawn.y);

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.physics = new PhysicsEngine(this.audio, this.particles);
    this.devManager = DevManager.getInstance();
    this.physics.setDevManager(this.devManager);
    this.cubeRenderer = new CubeRenderer(container);

    this.sectorMap = new SectorMapView({
      levelMap: this.levelMap,
      currentCoords: this.currentCoords,
      player: this.player,
      onWarpToSector: (coords) => {
        this.goToRoom(coords.x, coords.y);
      },
    });

    this.devOverlay = new DevDebugOverlay({
      goToRoom: (x, y, spawnTarget) => this.goToRoom(x, y, spawnTarget),
      teleportPlayer: (x, y) => this.teleportPlayer(x, y),
      giveAllKeys: () => this.giveAllKeys(),
      collectAllPrisms: (roomOnly) => this.collectAllPrisms(roomOnly),
      resetRoomState: () => this.resetRoomState(),
      triggerWin: () => this.onGoalReached(),
      clearProjectiles: () => this.physics.clearProjectiles(),
      getCurrentRoom: () => this.currentRoom,
      getLevelMap: () => this.levelMap,
      getPlayer: () => this.player,
      getCurrentCoords: () => this.currentCoords,
    });

    this.cubeRenderer.onShiftClickTeleportCallback = (x, y) => {
      if (this.devManager.enabled) {
        this.teleportPlayer(x, y);
      }
    };

    this.cubeRenderer.onPlayerInteraction = () => {
      this.stopIntroOrbitAndTransitionTo2D();
    };

    this.btnDevEl = document.getElementById('btn-dev');

    this.physics.setLevelMap(this.levelMap);

    // Initial binding of active and adjacent rooms (rendered directly in real-time)
    this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);
    this.updateHUD();
    this.updateKeyInventory();
    this.setupUIEvents();
    this.startIntroOrbit();

    requestAnimationFrame(this.gameLoop);
  }

  private setupUIEvents(): void {
    if (this.btnMapEl) {
      this.btnMapEl.addEventListener('click', () => {
        this.sectorMap.toggle();
      });
    }

    this.btnMuteEl.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.btnMuteEl.textContent = muted ? '🔇' : '♫';
      this.btnMuteEl.title = muted ? 'Sound: MUTED [U]' : 'Sound: ON [U]';
    });

    this.btnCameraEl.addEventListener('click', () => {
      if (this.isIntroOrbiting) {
        this.stopIntroOrbitAndTransitionTo2D();
        return;
      }
      this.camera3DMode = !this.camera3DMode;
      this.cubeRenderer.setCameraMode(this.camera3DMode);
      this.updateCameraModeUI();
    });

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.isButtonResetHeld = true;
      });
      window.addEventListener('pointerup', () => {
        this.isButtonResetHeld = false;
      });
      window.addEventListener('pointercancel', () => {
        this.isButtonResetHeld = false;
      });
    }

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      this.winModalEl.style.display = 'none';
      this.gameState = 'PLAYING';
    });

    document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
      this.cubeRenderer.resetCameraToDefault();
    });

    this.btnPerfEl?.addEventListener('click', () => {
      this.perfDebug.toggle();
    });

    const btnDevToggleEl = document.getElementById('btn-dev-toggle');
    const gearDevStatusEl = document.getElementById('gear-dev-status');
    const updateGearDevStatus = () => {
      if (gearDevStatusEl) {
        gearDevStatusEl.textContent = this.devManager.enabled ? 'ON' : 'OFF';
        gearDevStatusEl.style.color = this.devManager.enabled ? '#00ffaa' : '#ff5577';
      }
    };
    this.devManager.onToggle(() => updateGearDevStatus());
    this.devManager.subscribe(() => updateGearDevStatus());
    updateGearDevStatus();

    btnDevToggleEl?.addEventListener('click', () => {
      this.devManager.toggleEnabled();
      this.devOverlay.updateUIState();
      this.devOverlay.updateBadges();
    });

    this.btnDevEl?.addEventListener('click', () => {
      this.devOverlay.toggle();
      this.toggleGearMenu(false);
    });

    // World Editor link in gear menu
    const btnEditor = document.getElementById('btn-editor') as HTMLAnchorElement | null;
    if (btnEditor) {
      btnEditor.href = this.getEditorUrl();
      btnEditor.addEventListener('click', () => {
        this.toggleGearMenu(false);
      });
    }

    // World Selection Dropdown
    this.worldSelectEl?.addEventListener('change', () => {
      const selected = this.worldSelectEl.value;
      if (selected === '__load_custom__') {
        this.worldSelectEl.value = this.currentWorldId;
        this.worldFileInputEl?.click();
        return;
      }
      if (selected === '__open_editor__') {
        this.worldSelectEl.value = this.currentWorldId;
        window.open(this.getEditorUrl(), '_blank');
        return;
      }
      if (selected === 'procedural') {
        this.openProceduralModal();
        return;
      }
      const entry = WorldRegistry.getWorld(selected);
      if (entry) {
        this.currentWorldId = selected;
        this.loadWorld(entry.load(), entry.name, entry.startingCoords);
      }
    });

    // Procedural Setup / Restart Void Buttons
    const handleOpenVoidModal = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.openProceduralModal();
    };

    this.btnProceduralSetupEl?.addEventListener('click', handleOpenVoidModal);
    this.btnProceduralSetupEl?.addEventListener('pointerdown', (e) => e.stopPropagation());

    this.btnHudProceduralRestartEl?.addEventListener('click', handleOpenVoidModal);
    this.btnHudProceduralRestartEl?.addEventListener('pointerdown', (e) => e.stopPropagation());

    const handleCloseVoidModal = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeProceduralModal();
    };

    this.btnCloseProceduralModalEl?.addEventListener('click', handleCloseVoidModal);
    this.btnCloseProceduralModalEl?.addEventListener('pointerdown', (e) => e.stopPropagation());

    this.btnCancelProceduralEl?.addEventListener('click', handleCloseVoidModal);
    this.btnCancelProceduralEl?.addEventListener('pointerdown', (e) => e.stopPropagation());

    // Procedural Difficulty Modal Interactions
    document.querySelectorAll('.diff-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedDifficulty = (btn.getAttribute('data-diff') as DifficultyLevel) || 'normal';
      });
    });

    this.btnSeedRandomEl?.addEventListener('click', () => {
      const prefixes = ['HYPER', 'NEON', 'CYBER', 'TESSERACT', 'QUANTUM', 'VOID', 'STELLAR', 'SOLAR', 'CRYO', 'SYNTH'];
      const randSeed = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${Math.floor(100 + Math.random() * 900)}`;
      if (this.proceduralSeedInputEl) {
        this.proceduralSeedInputEl.value = randSeed;
      }
    });

    this.btnLaunchProceduralEl?.addEventListener('click', () => {
      const seed = this.proceduralSeedInputEl?.value.trim() || 'HYPERFOLD';
      this.launchProceduralWorld(this.selectedDifficulty, seed);
    });

    // Check URL params for custom world or storage load (e.g. from editor Test in Game)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('load_custom')) {
      try {
        const stored = localStorage.getItem('hyperfold_custom_world');
        if (stored) {
          this.loadWorldFromJson(stored);
        }
      } catch (err) {
        console.warn('Could not load custom world from localStorage:', err);
      }
    }

    // Cross-window communication from World Editor ("Test in Game")
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'HYPERFOLD_LOAD_WORLD' && typeof event.data?.json === 'string') {
        try {
          this.loadWorldFromJson(event.data.json);
          if (event.source && 'postMessage' in event.source) {
            (event.source as Window).postMessage({ type: 'HYPERFOLD_WORLD_LOADED' }, '*');
          }
        } catch (err: any) {
          console.error('Failed to load custom world from message:', err);
        }
      }
    });

    // Notify opener that game instance is ready to receive custom world
    if (window.opener && 'postMessage' in window.opener) {
      const sendReady = () => {
        try {
          window.opener.postMessage({ type: 'HYPERFOLD_GAME_READY' }, '*');
        } catch {
          // ignore cross-origin error
        }
      };
      sendReady();
      setTimeout(sendReady, 100);
      setTimeout(sendReady, 350);
    }

    // Local JSON File Upload
    this.worldFileInputEl?.addEventListener('change', () => {
      const file = this.worldFileInputEl.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          this.loadWorldFromJson(content);
        } catch (err: any) {
          alert(`Failed to load world JSON: ${err?.message || err}`);
        }
      };
      reader.readAsText(file);
      this.worldFileInputEl.value = '';
    });

    // Drag-and-Drop JSON Maps
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const content = ev.target?.result as string;
            this.loadWorldFromJson(content);
          } catch (err: any) {
            alert(`Failed to load dropped JSON: ${err?.message || err}`);
          }
        };
        reader.readAsText(file);
      }
    });

    window.addEventListener('pointerdown', (e) => {
      if (e.target && (e.target as HTMLElement).closest('#btn-camera')) {
        return;
      }
      if (this.isIntroOrbiting) {
        this.stopIntroOrbitAndTransitionTo2D();
      }
    });

    window.addEventListener('wheel', () => {
      if (this.isIntroOrbiting) {
        this.stopIntroOrbitAndTransitionTo2D();
      }
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (this.isIntroOrbiting && e.code !== 'KeyC') {
        this.stopIntroOrbitAndTransitionTo2D();
      }
      if (e.code === 'KeyM') {
        this.sectorMap.toggle();
      }
      if (e.code === 'KeyU') {
        const muted = this.audio.toggleMute();
        this.btnMuteEl.textContent = muted ? '🔇' : '♫';
        this.btnMuteEl.title = muted ? 'Sound: MUTED [U]' : 'Sound: ON [U]';
      }
      if (e.code === 'KeyC') {
        if (!this.sectorMap.visible) {
          this.btnCameraEl.click();
        }
      }
      if (e.code === 'KeyV') {
        if (!this.sectorMap.visible) {
          this.cubeRenderer.resetCameraToDefault();
        }
      }
      if (e.code === 'KeyN' && this.levelMap instanceof ProceduralLevelMap) {
        if (!this.sectorMap.visible) {
          this.openProceduralModal();
        }
      }
      if (e.code === 'F2') {
        e.preventDefault();
        this.devOverlay.toggle();
      }
      if (e.code === 'Escape') {
        if (this.devOverlay.visible) {
          this.devOverlay.toggle(false);
        } else if (this.helpOverlayEl.classList.contains('open')) {
          this.toggleHelp(false);
        } else if (this.gearMenuEl.classList.contains('open')) {
          this.toggleGearMenu(false);
        } else if (this.sectorMap.visible) {
          this.sectorMap.close();
        } else if (this.proceduralModalEl.style.display === 'block') {
          this.closeProceduralModal();
        }
      }
      if (e.code === 'KeyH' || (e.key === '?' || (e.shiftKey && e.code === 'Slash'))) {
        // Don't trigger help if typing in an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
        this.toggleHelp();
      }
    });

    // Gear menu toggle
    this.btnGearEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGearMenu();
    });

    // Close gear menu when clicking outside
    window.addEventListener('click', () => {
      if (this.gearMenuEl.classList.contains('open')) {
        this.toggleGearMenu(false);
      }
    });

    // Prevent gear menu from closing when clicking inside it
    this.gearMenuEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Help overlay toggle
    this.btnHelpEl.addEventListener('click', () => {
      this.toggleHelp();
    });

    // Close help by clicking backdrop
    document.getElementById('help-backdrop')?.addEventListener('click', () => {
      this.toggleHelp(false);
    });
  }

  private toggleHelp(forceState?: boolean): void {
    const isOpen = this.helpOverlayEl.classList.contains('open');
    const newState = forceState !== undefined ? forceState : !isOpen;
    if (newState) {
      this.helpOverlayEl.classList.add('open');
      // Close gear menu if open
      this.toggleGearMenu(false);
    } else {
      this.helpOverlayEl.classList.remove('open');
    }
  }

  private toggleGearMenu(forceState?: boolean): void {
    const isOpen = this.gearMenuEl.classList.contains('open');
    const newState = forceState !== undefined ? forceState : !isOpen;
    if (newState) {
      this.gearMenuEl.classList.add('open');
      this.btnGearEl.classList.add('active');
    } else {
      this.gearMenuEl.classList.remove('open');
      this.btnGearEl.classList.remove('active');
    }
  }

  public getEditorUrl(): string {
    // In local development with Vite dev server (game on :3000)
    if (window.location.hostname === 'localhost' && window.location.port === '3000') {
      return 'http://localhost:5174/';
    }
    // In production / web server, assume "editor" subfolder relative to game:
    // e.g. /hyperfold/ -> /hyperfold/editor/
    //      /hyperfold -> /hyperfold/editor/
    //      / -> /editor/
    const cleanPath = window.location.pathname.replace(/\/[^/]*\.[^/]+$/, '').replace(/\/+$/, '');
    return `${cleanPath}/editor/`;
  }

  public openProceduralModal(): void {
    if (this.levelMap instanceof ProceduralLevelMap) {
      const currentDiff = this.levelMap.getDifficulty();
      const currentSeed = String(this.levelMap.getSeed());
      this.selectedDifficulty = currentDiff;

      document.querySelectorAll('.diff-btn').forEach((btn) => {
        if (btn.getAttribute('data-diff') === currentDiff) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });

      if (this.proceduralSeedInputEl) {
        this.proceduralSeedInputEl.value = currentSeed;
      }
      if (this.btnLaunchProceduralEl) {
        this.btnLaunchProceduralEl.textContent = '▶ RESTART WITH NEW SEED / DIFFICULTY';
      }
    } else {
      if (this.btnLaunchProceduralEl) {
        this.btnLaunchProceduralEl.textContent = '▶ ENGAGE INFINITE MANIFOLD';
      }
    }

    if (this.proceduralModalEl) {
      this.proceduralModalEl.style.display = 'block';
    }
  }

  public closeProceduralModal(): void {
    if (this.proceduralModalEl) {
      this.proceduralModalEl.style.display = 'none';
    }
    if (this.worldSelectEl) {
      this.worldSelectEl.value = this.currentWorldId;
    }
  }

  private launchProceduralWorld(difficulty: DifficultyLevel, seed: string): void {
    const entry = WorldRegistry.createProceduralWorld(difficulty, seed);
    this.currentWorldId = 'procedural';
    if (this.worldSelectEl) {
      this.worldSelectEl.value = 'procedural';
    }
    this.loadWorld(entry.load(), entry.name, entry.startingCoords);
    this.closeProceduralModal();

    if (this.bannerEl) {
      this.bannerEl.textContent = `VOID INITIALIZED: ${difficulty.toUpperCase()} [SEED: ${seed}]`;
      this.bannerEl.style.opacity = '1';
    }
  }

  private gameLoop = (time: number) => {
    if (this.sectorMap.visible) {
      this.lastTime = time;
      requestAnimationFrame(this.gameLoop);
      return;
    }

    this.perfDebug.recordFrame(time);

    if (this.lastTime === 0) this.lastTime = time;
    let dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    // Developer Time Scale and Freeze
    if (this.devManager.enabled) {
      if (this.devManager.isPaused) {
        if (this.devManager.stepFrameRequested) {
          this.devManager.stepFrameRequested = false;
          dt = 0.016;
        } else {
          dt = 0;
        }
      } else {
        dt *= this.devManager.timeScale;
      }
    }

    this.gameTime += dt;

    // Keep all rendering faces and physics 100% in lockstep
    this.cubeRenderer.setGameTime(this.gameTime);

    const inputState = this.input.update();

    // First player interaction stops intro orbit and smoothly transitions to 2D
    if (this.isIntroOrbiting && this.hasPlayerMovementOrAction(inputState)) {
      this.stopIntroOrbitAndTransitionTo2D();
    }

    // Handle R reset input (tap to die & respawn, long-press 0.8s to reset whole level to start)
    const isRestarting = inputState.restart || this.isButtonResetHeld;

    // Handle ultra-fast sub-frame tap (pressed and released within a single frame interval)
    if (inputState.restartJustPressed && !isRestarting) {
      this.triggerPlayerDeath();
    } else if (isRestarting) {
      this.rHoldTime += dt;
      this.player.resetHoldProgress = Math.min(1, this.rHoldTime / this.R_HOLD_THRESHOLD);

      // Subtle charging particles & banner feedback while holding
      if (this.rHoldTime > 0.15 && !this.rLongPressTriggered) {
        if (Math.random() < 0.35) {
          this.particles.emitLaserCharge(
            this.player.x + this.player.width * 0.5,
            this.player.y + this.player.height * 0.5,
            '#ffe600'
          );
        }
        const pct = Math.round(this.player.resetHoldProgress * 100);
        this.bannerEl.textContent = `RESTARTING WHOLE LEVEL... HOLD [R] (${pct}%)`;
        this.bannerEl.style.opacity = '1';
      }

      if (this.rHoldTime >= this.R_HOLD_THRESHOLD && !this.rLongPressTriggered) {
        this.rLongPressTriggered = true;
        this.player.resetHoldProgress = 0;
        this.resetWholeLevel();
      }
    } else {
      // Key / button released
      if (this.rHoldTime > 0) {
        // If released before threshold and not already triggered long-press, trigger player death
        if (!this.rLongPressTriggered && this.rHoldTime < this.R_HOLD_THRESHOLD) {
          this.triggerPlayerDeath();
          if (this.bannerEl.textContent?.startsWith('RESTARTING WHOLE LEVEL')) {
            this.bannerEl.style.opacity = '0';
          }
        }
        this.rHoldTime = 0;
        this.rLongPressTriggered = false;
        this.player.resetHoldProgress = 0;
      }
    }

    // Gamepad right stick & keyboard camera orbit control
    if (this.camera3DMode) {
      if (inputState.cameraOrbitX !== 0 || inputState.cameraOrbitY !== 0) {
        this.cubeRenderer.addOrbit(-inputState.cameraOrbitX * dt * 2.8, inputState.cameraOrbitY * dt * 2.2);
      }
      if (inputState.cameraResetJustPressed) {
        this.cubeRenderer.resetCameraToDefault();
      }
    }

    if (this.gameState === 'PLAYING') {
      // 1. Check collectible pick-up
      this.checkCollectibles();

      // 2. Run physics and boundary collision
      const transition = this.physics.update(
        this.player,
        this.currentRoom,
        inputState,
        dt,
        () => this.onGoalReached(),
        () => this.onPlayerDeath(),
        this.gameTime,
        this.levelMap,
        (gate, dir) => this.onGateLockedEncounter(gate, dir)
      );

      // 3. Trigger 3D Infinite Cube Rotation if player crossed an edge or entered a portal
      if (transition) {
        if (transition.isPortal) {
          this.handlePortalTransition(transition);
        } else {
          this.handleEdgeTransition(transition.direction, transition.entryX, transition.entryY, transition.preserveVy);
        }
      }
    }

    // 4. Update particles
    this.particles.update(dt);

    // 5. Render active front face (Canvas 2D -> WebGL CanvasTexture)
    const currentFrontRoom = this.gameState === 'ROTATING' && this.pendingNextRoom
      ? this.pendingNextRoom
      : this.currentRoom;
    const activeProjectiles = this.physics.getProjectilesForRoom(currentFrontRoom.id);
    const activeTurrets = this.physics.getTurretsForRoom(currentFrontRoom);

    if (this.gameState === 'ROTATING' && this.pendingNextRoom) {
      this.cubeRenderer.updateFaceCanvas(
        this.cubeRenderer.transitionTargetFace,
        this.pendingNextRoom,
        this.levelMap,
        this.player,
        this.particles,
        dt,
        activeProjectiles,
        activeTurrets
      );
    } else {
      this.cubeRenderer.updateFaceCanvas(
        4,
        this.currentRoom,
        this.levelMap,
        this.player,
        this.particles,
        dt,
        activeProjectiles,
        activeTurrets
      );
    }

    // 6. Update 3D scene & render
    this.cubeRenderer.update(dt);

    // 8. Update performance debug telemetry
    const renderStats = this.cubeRenderer.getRenderStats();
    this.perfDebug.update(time, {
      drawCalls: renderStats.drawCalls,
      triangles: renderStats.triangles,
      geometries: renderStats.geometries,
      textures: renderStats.textures,
      particleCount: this.particles.count,
      sectorName: this.currentRoom.title,
      coords: this.currentCoords,
      cameraMode: this.isIntroOrbiting ? '3D Intro Orbit' : (this.camera3DMode ? '3D Orbit' : '2D Flat'),
    });

    this.devOverlay.updateTelemetry();

    requestAnimationFrame(this.gameLoop);
  };

  private checkCollectibles(): void {
    const px = this.player.x + this.player.width * 0.5;
    const py = this.player.y + this.player.height * 0.5;

    for (const item of this.currentRoom.collectibles) {
      if (this.levelMap.isItemCollected(item.id)) continue;

      const dx = px - item.x;
      const dy = py - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 28) {
        this.levelMap.collectItem(item.id);
        if (item.type === 'key') {
          this.audio.playKeyCollect();
          const color = item.color || getGateColor(item.id);
          this.particles.emitSparks(item.x, item.y, 35, color);
          const keyLabel = item.label || this.levelMap.getKeyLabel(item.id) || item.id;
          this.showTemporaryBanner(`GATE KEY ACQUIRED: "${keyLabel}" 🔑`, color, 3500);
          // When a gate key is acquired, any closed exit matching this key opens immediately
          this.audio.playGateOpen();
          this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);
        } else {
          this.audio.playCollect();
          this.particles.emitSparks(item.x, item.y, 18, item.type === 'prism' ? '#ff00aa' : '#ffe600');
        }
        this.updateHUD();
        this.updateKeyInventory();
        this.sectorMap.setCurrentCoords(this.currentCoords);
      }
    }
  }

  private handlePortalTransition(transition: TransitionEvent): void {
    const destRoom = transition.destRoom || (transition.targetCoords ? this.levelMap.getRoom(transition.targetCoords.x, transition.targetCoords.y) : null);
    if (!destRoom) return;

    const targetX = destRoom.coords.x;
    const targetY = destRoom.coords.y;
    const direction = transition.direction;

    // Begin 3D Cube Rotation for portal transition
    this.gameState = 'ROTATING';
    this.sidesTraversed++;
    this.audio.playPortalTeleport();

    if (this.bannerTimeout !== null) {
      window.clearTimeout(this.bannerTimeout);
      this.bannerTimeout = null;
    }

    const sourceTag = transition.sourcePortal?.label || transition.sourcePortal?.id || 'PORTAL';
    const destTag = transition.destPortal?.label || transition.destPortal?.id || 'PORTAL';
    this.bannerEl.textContent = `QUANTUM WARP: [${sourceTag}] ➔ [${destTag}] (SECTOR [${targetX},${targetY}])`;
    this.bannerEl.style.opacity = '1';

    // Place player at destination portal position
    this.player.setPosition(transition.entryX, transition.entryY);
    if (transition.preserveVy !== undefined) {
      this.player.vy = transition.preserveVy;
      if (transition.preserveVy < -50) {
        this.player.isBouncePropelled = true;
        this.player.isGrounded = false;
      }
    }
    if (transition.preserveVx !== undefined) {
      this.player.vx = transition.preserveVx;
    }
    this.player.standingPlatform = null;
    this.pendingNextRoom = destRoom;

    // Emit arrival sparks at destination
    this.particles.emitSparks(
      transition.entryX + this.player.width * 0.5,
      transition.entryY + this.player.height * 0.5,
      36,
      destRoom.themeColor
    );

    // Prepare transition on CubeRenderer
    this.cubeRenderer.prepareTransition(
      direction,
      destRoom,
      this.levelMap,
      this.currentRoom,
      this.player,
      this.particles
    );

    this.cubeRenderer.rotateTo(direction, () => {
      this.currentCoords = { x: targetX, y: targetY };
      this.currentRoom = destRoom;
      this.pendingNextRoom = null;
      this.levelMap.markVisited(targetX, targetY);
      this.sectorMap.setCurrentCoords(this.currentCoords);

      this.cubeRenderer.resetRotationToZero();
      this.physics.resetCrumblingTiles();
      this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);

      this.gameState = 'PLAYING';
      if (this.levelMap instanceof ProceduralLevelMap) {
        const depth = Math.abs(targetX) + Math.abs(targetY);
        const threat = this.levelMap.getThreatLevel(targetX, targetY);
        this.audio.updateDepthAtmosphere(depth, threat);
      }
      this.updateHUD();

      if (this.bannerTimeout !== null) {
        window.clearTimeout(this.bannerTimeout);
      }
      this.bannerTimeout = window.setTimeout(() => {
        this.bannerEl.style.opacity = '0';
        this.bannerTimeout = null;
      }, 3000);
    });
  }

  private handleEdgeTransition(
    direction: RotationDirection,
    entryX: number,
    entryY: number,
    preserveVy: number
  ): void {
    let targetX = this.currentCoords.x;
    let targetY = this.currentCoords.y;

    if (direction === 'right') targetX++;
    if (direction === 'left') targetX--;
    if (direction === 'up') targetY++;
    if (direction === 'down') targetY--;

    const nextRoom = this.levelMap.getRoom(targetX, targetY);

    if (!nextRoom) {
      // Bottom void hazard without an underground room -> respawn
      if (direction === 'down') {
        if (this.devManager.enabled && this.devManager.godMode) {
          const spawn = this.currentRoom.spawnPoint || { x: 80, y: 660 };
          this.player.setPosition(spawn.x, spawn.y);
          this.player.vy = 0;
          this.gameState = 'PLAYING';
          return;
        }
        this.onPlayerDeath();
      }
      return;
    }

    // Begin 3D Cube Rotation
    this.gameState = 'ROTATING';
    this.sidesTraversed++;
    this.audio.playRotate();

    // Clear any active banner dismiss timer
    if (this.bannerTimeout !== null) {
      window.clearTimeout(this.bannerTimeout);
      this.bannerTimeout = null;
    }

    // Show dynamic banner emphasizing non-Euclidean infinite sides
    this.bannerEl.textContent = `3D CUBE TUMBLE: SECTOR [${this.currentCoords.x},${this.currentCoords.y}] ➔ [${targetX},${targetY}] (SIDE #${this.sidesTraversed})`;
    this.bannerEl.style.opacity = '1';

    // Place player at destination seam
    this.player.setPosition(entryX, entryY);
    this.player.vy = preserveVy;
    this.player.standingPlatform = null;
    this.pendingNextRoom = nextRoom;

    // Prepare and predictively bind nextRoom and all visible adjacent faces before rotation begins
    this.cubeRenderer.prepareTransition(
      direction,
      nextRoom,
      this.levelMap,
      this.currentRoom,
      this.player,
      this.particles
    );

    this.cubeRenderer.rotateTo(direction, () => {
      // Rotation complete:
      // 1. Advance coordinate state
      this.currentCoords = { x: targetX, y: targetY };
      this.currentRoom = nextRoom;
      this.pendingNextRoom = null;
      this.levelMap.markVisited(targetX, targetY);
      this.sectorMap.setCurrentCoords(this.currentCoords);

      // 2. Re-anchor 3D cube: snap rotation back to 0
      this.cubeRenderer.resetRotationToZero();

      // 3. Re-bind all faces to new neighbors
      this.physics.resetCrumblingTiles();
      this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);

      // 4. Return to active gameplay
      this.gameState = 'PLAYING';
      if (this.levelMap instanceof ProceduralLevelMap) {
        const depth = Math.abs(targetX) + Math.abs(targetY);
        const threat = this.levelMap.getThreatLevel(targetX, targetY);
        this.audio.updateDepthAtmosphere(depth, threat);
      }
      this.updateHUD();

      // Keep transition notification banner visible for 3.0s after rotation completes
      if (this.bannerTimeout !== null) {
        window.clearTimeout(this.bannerTimeout);
      }
      this.bannerTimeout = window.setTimeout(() => {
        this.bannerEl.style.opacity = '0';
        this.bannerTimeout = null;
      }, 3000);
    });
  }

  private triggerPlayerDeath(): void {
    if (this.gameState === 'RESPAWNING') return;
    this.audio.playDeath();
    this.particles.emitPlayerExplosion(
      this.player.x + this.player.width * 0.5,
      this.player.y + this.player.height * 0.5,
      this.player.primaryColor,
      this.player.accentColor
    );
    this.onPlayerDeath();
  }

  public loadWorldFromJson(content: string): void {
    const loaded = WorldRegistry.loadWorldFromJsonString(content);
    const customId = `custom_${Date.now()}`;
    WorldRegistry.registerWorld({
      id: customId,
      name: loaded.title,
      source: 'custom',
      load: () => WorldRegistry.loadWorldFromJsonString(content).map,
      startingCoords: loaded.startingCoords,
    });

    if (this.worldSelectEl) {
      const option = document.createElement('option');
      option.value = customId;
      option.textContent = `Custom: ${loaded.title}`;
      this.worldSelectEl.insertBefore(option, this.worldSelectEl.lastElementChild);
      this.worldSelectEl.value = customId;
    }
    this.currentWorldId = customId;

    this.loadWorld(loaded.map, loaded.title, loaded.startingCoords);

    if (this.bannerEl) {
      this.bannerEl.textContent = `WORLD LOADED: ${loaded.title.toUpperCase()}`;
      this.bannerEl.style.opacity = '1';
      if (this.bannerTimeout !== null) {
        window.clearTimeout(this.bannerTimeout);
      }
      this.bannerTimeout = window.setTimeout(() => {
        this.bannerEl.style.opacity = '0';
        this.bannerTimeout = null;
      }, 4000);
    }
  }

  public loadWorld(map: LevelMap, title: string, startCoords?: { x: number; y: number }): void {
    this.levelMap = map;
    const sx = startCoords?.x ?? 0;
    const sy = startCoords?.y ?? 0;
    const initialRoom = this.levelMap.getRoom(sx, sy) || this.levelMap.getAllRooms()[0];
    if (!initialRoom) throw new Error('No valid rooms found in world');

    this.currentCoords = { x: initialRoom.coords.x, y: initialRoom.coords.y };
    this.currentRoom = initialRoom;
    this.pendingNextRoom = null;
    this.levelMap.markVisited(this.currentCoords.x, this.currentCoords.y);
    this.sidesTraversed = 1;
    this.sectorMap.setLevelMap(this.levelMap, this.currentCoords);

    // Reset rotation & face binding
    this.cubeRenderer.resetRotationToZero();
    this.cubeRenderer.faceRenderer.invalidateCache();
    this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);

    // Start intro 3D orbit around front face on game load / reset
    this.startIntroOrbit();

    // Reset physics & particles
    this.physics.clearAllRoomsCache();
    this.particles.clear();

    // Reset player position & state
    const spawn = initialRoom.spawnPoint || { x: 120, y: 660 };
    this.player.setPosition(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.standingPlatform = null;
    this.player.isGrounded = true;
    this.player.wasGrounded = true;
    this.player.isBouncePropelled = false;
    this.player.setDucking(false);
    this.player.isAlive = true;
    this.player.resetHoldProgress = 0;
    this.player.disabledPortalId = null;

    // Visual & audio reset feedback
    this.particles.emitPlayerExplosion(spawn.x, spawn.y, '#00ffff', '#ffe600');
    this.particles.emitSparks(spawn.x, spawn.y, 30, '#ff00aa');
    this.audio.playLevelReset();

    this.winModalEl.style.display = 'none';
    this.gameState = 'PLAYING';
    if (this.levelMap instanceof ProceduralLevelMap) {
      const depth = Math.abs(this.currentCoords.x) + Math.abs(this.currentCoords.y);
      const threat = this.levelMap.getThreatLevel(this.currentCoords.x, this.currentCoords.y);
      this.audio.updateDepthAtmosphere(depth, threat);
    }
    this.physics.setLevelMap(this.levelMap);
    this.updateHUD();
    this.updateKeyInventory();

    if (this.bannerTimeout !== null) {
      window.clearTimeout(this.bannerTimeout);
    }
    this.bannerEl.textContent = `WORLD LOADED: ${title.toUpperCase()}`;
    this.bannerEl.style.opacity = '1';
    this.bannerTimeout = window.setTimeout(() => {
      this.bannerEl.style.opacity = '0';
      this.bannerTimeout = null;
    }, 3000);
    this.devOverlay?.onSectorChanged();
  }

  public goToRoom(targetX: number, targetY: number, spawnTarget?: { x: number; y: number }): boolean {
    const nextRoom = (this.levelMap instanceof ProceduralLevelMap)
      ? this.levelMap.getRoom(targetX, targetY, true)
      : this.levelMap.getRoom(targetX, targetY);
    if (!nextRoom) return false;

    this.currentCoords = { x: targetX, y: targetY };
    this.currentRoom = nextRoom;
    this.pendingNextRoom = null;
    this.levelMap.markVisited(targetX, targetY);
    this.sectorMap.setCurrentCoords(this.currentCoords);

    this.cubeRenderer.resetRotationToZero();
    this.physics.resetCrumblingTiles();
    this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);

    const spawn = spawnTarget || nextRoom.spawnPoint || { x: 80, y: 660 };
    this.player.setPosition(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.standingPlatform = null;
    this.player.disabledPortalId = null;

    this.gameState = 'PLAYING';
    if (this.levelMap instanceof ProceduralLevelMap) {
      const depth = Math.abs(targetX) + Math.abs(targetY);
      const threat = this.levelMap.getThreatLevel(targetX, targetY);
      this.audio.updateDepthAtmosphere(depth, threat);
    }
    this.updateHUD();
    this.updateKeyInventory();
    this.audio.playLand();
    this.particles.emitSparks(spawn.x, spawn.y, 20, '#00ffff');
    this.devOverlay?.onSectorChanged();
    return true;
  }

  public teleportPlayer(x: number, y: number): void {
    const clampedX = Math.max(0, Math.min(FACE_SIZE - this.player.width, x));
    const clampedY = Math.max(0, Math.min(FACE_SIZE - this.player.height, y));
    this.player.setPosition(clampedX, clampedY);
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.standingPlatform = null;
    this.player.disabledPortalId = null;
    this.audio.playLand();
    this.particles.emitSparks(clampedX + this.player.width * 0.5, clampedY + this.player.height * 0.5, 20, '#00ffcc');
  }

  public giveAllKeys(): void {
    this.levelMap.collectAllKeys();
    this.updateKeyInventory();
    this.audio.playKeyCollect();
    this.particles.emitSparks(this.player.x + this.player.width * 0.5, this.player.y + this.player.height * 0.5, 24, '#ffe600');
  }

  public collectAllPrisms(roomOnly: boolean = false): void {
    if (roomOnly) {
      this.levelMap.collectAllInRoom(this.currentRoom);
    } else {
      this.levelMap.collectAllPrisms();
    }
    this.updateHUD();
    this.audio.playCollect();
    this.particles.emitSparks(this.player.x + this.player.width * 0.5, this.player.y + this.player.height * 0.5, 24, '#ffe600');
  }

  public resetRoomState(): void {
    this.levelMap.resetRoomCollectibles(this.currentRoom);
    this.physics.resetCrumblingTiles();
    this.physics.clearProjectiles();
    this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);
    this.updateHUD();
    this.updateKeyInventory();
    this.audio.playLand();
  }

  private resetWholeLevel(): void {
    const worldEntry = WorldRegistry.getWorld(this.currentWorldId);
    if (worldEntry) {
      this.loadWorld(worldEntry.load(), worldEntry.name, worldEntry.startingCoords);
    } else {
      const fallback = WorldRegistry.getWorld('demo')!;
      this.loadWorld(fallback.load(), fallback.name, fallback.startingCoords);
    }
  }

  private onPlayerDeath(): void {
    this.gameState = 'RESPAWNING';
    this.player.isAlive = false;
    setTimeout(() => {
      this.respawnPlayer();
      this.gameState = 'PLAYING';
    }, 450);
  }

  private respawnPlayer(): void {
    this.player.isAlive = true;
    this.player.setDucking(false);
    this.physics.resetCrumblingTiles();
    const spawn = this.currentRoom.spawnPoint || { x: 80, y: 660 };
    this.player.setPosition(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.standingPlatform = null;
    this.player.disabledPortalId = null;
    this.particles.emitSparks(spawn.x, spawn.y, 16, this.currentRoom.themeColor);
  }

  private onGoalReached(): void {
    if (this.gameState === 'GOAL_REACHED') return;
    this.gameState = 'GOAL_REACHED';
    this.audio.playWin();
    this.particles.emitSparks(this.player.x, this.player.y, 40, '#ffe600');

    const totalCores = this.levelMap.getTotalCollectiblesCount();
    const collected = this.levelMap.getCollectedCount();
    const discovered = this.levelMap.getDiscoveredRoomsCount();
    const totalRooms = this.levelMap.getTotalRoomsCount();

    this.winStatsEl.innerHTML = `
      <strong>Infinite Sides Traversed:</strong> ${this.sidesTraversed} turns<br>
      <strong>Sectors Discovered:</strong> ${discovered} / ${totalRooms}<br>
      <strong>Energy Prisms Gathered:</strong> ${collected} / ${totalCores}
    `;
    this.winModalEl.style.display = 'block';
  }

  private updateHUD(): void {
    const coordsA = `[${this.currentCoords.x}, ${this.currentCoords.y}]`;
    const coordsB = `[${this.currentCoords.x},${this.currentCoords.y}]`;
    const coordsC = `(${this.currentCoords.x}, ${this.currentCoords.y})`;
    const coordsD = `(${this.currentCoords.x},${this.currentCoords.y})`;
    const hasCoords =
      this.currentRoom.title.includes(coordsA) ||
      this.currentRoom.title.includes(coordsB) ||
      this.currentRoom.title.includes(coordsC) ||
      this.currentRoom.title.includes(coordsD);
    this.hudSectorEl.textContent = hasCoords
      ? this.currentRoom.title
      : `${this.currentRoom.title} [${this.currentCoords.x}, ${this.currentCoords.y}]`;
    this.hudTurnEl.textContent = `Side #${this.sidesTraversed}`;
    this.hudPrismsEl.textContent = `${this.levelMap.getCollectedCount()} / ${this.levelMap.getTotalCollectiblesCount()}`;

    if (this.levelMap instanceof ProceduralLevelMap) {
      this.proceduralCardEl.style.display = '';
      if (this.proceduralDividerEl) {
        this.proceduralDividerEl.style.display = '';
      }
      if (this.btnProceduralSetupEl) {
        this.btnProceduralSetupEl.style.display = '';
      }
      const depth = Math.abs(this.currentCoords.x) + Math.abs(this.currentCoords.y);
      const streak = this.levelMap.getClearedStreak();
      const threat = this.levelMap.getThreatLevel(this.currentCoords.x, this.currentCoords.y);
      const diff = this.levelMap.getDifficulty().toUpperCase();
      const pct = Math.round(threat * 100);

      this.proceduralDepthEl.textContent = `D:${depth} S:${streak}`;
      this.proceduralThreatBadgeEl.textContent = `${pct}% ${diff}`;

      if (threat >= 0.65) {
        this.proceduralThreatBadgeEl.style.color = '#ff0055';
        this.proceduralThreatBadgeEl.style.textShadow = '0 0 8px #ff0055';
      } else if (threat >= 0.3) {
        this.proceduralThreatBadgeEl.style.color = '#ffe600';
        this.proceduralThreatBadgeEl.style.textShadow = '0 0 8px #ffe600';
      } else {
        this.proceduralThreatBadgeEl.style.color = '#39ff14';
        this.proceduralThreatBadgeEl.style.textShadow = '0 0 8px #39ff14';
      }
    } else {
      this.proceduralCardEl.style.display = 'none';
      if (this.proceduralDividerEl) {
        this.proceduralDividerEl.style.display = 'none';
      }
      if (this.btnProceduralSetupEl) {
        this.btnProceduralSetupEl.style.display = 'none';
      }
    }

    this.devOverlay?.onSectorChanged();
  }

  private showTemporaryBanner(text: string, color?: string, durationMs: number = 3000): void {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.style.opacity = '1';
    if (color) {
      this.bannerEl.style.borderColor = color;
      this.bannerEl.style.textShadow = `0 0 8px ${color}`;
      this.bannerEl.style.background = `${color}26`;
    } else {
      this.bannerEl.style.borderColor = '#ff0080';
      this.bannerEl.style.textShadow = '0 0 8px #ff0080';
      this.bannerEl.style.background = 'rgba(255, 0, 128, 0.2)';
    }

    if (this.bannerTimeout !== null) {
      window.clearTimeout(this.bannerTimeout);
    }
    this.bannerTimeout = window.setTimeout(() => {
      this.bannerEl.style.opacity = '0';
      this.bannerTimeout = null;
    }, durationMs);
  }

  private onGateLockedEncounter(gate: ExitGateConfig, _dir: ExitDirection): void {
    if (this.gameTime - this.lastGateAlertTime > 1.2) {
      this.lastGateAlertTime = this.gameTime;
      const gateColor = getGateColor(gate.id, gate.color);
      const keyLabel = this.levelMap.getRequiredKeyLabel(gate);
      this.showTemporaryBanner(`GATE LOCKED: Requires Key "${keyLabel}" 🔒`, gateColor, 2200);
    }
  }

  private updateKeyInventory(): void {
    if (!this.keyInventorySlotsEl) return;
    const keys = this.levelMap.getCollectedKeys();

    if (keys.length === 0) {
      this.keyInventorySlotsEl.innerHTML = `<span class="key-inventory-empty">NONE</span>`;
      return;
    }

    this.keyInventorySlotsEl.innerHTML = '';
    for (const key of keys) {
      const color = key.color || getGateColor(key.id);
      const displayLabel = key.label || key.id;
      const chip = document.createElement('div');
      chip.className = 'key-item-chip';
      chip.style.borderColor = color;
      chip.style.color = color;
      chip.style.boxShadow = `0 0 10px ${color}44`;
      chip.title = key.label
        ? `Gate Key: "${key.label}" (ID: ${key.id})`
        : `Gate Key "${key.id}" (Unlocks matching closed exits)`;

      chip.innerHTML = `
        <span class="key-chip-glyph" style="color: ${color}; filter: drop-shadow(0 0 4px ${color});">🔑</span>
        <span class="key-chip-id">${displayLabel}</span>
      `;
      this.keyInventorySlotsEl.appendChild(chip);
    }
  }

  private hasPlayerMovementOrAction(input: InputState): boolean {
    return (
      input.left ||
      input.right ||
      input.up ||
      input.down ||
      input.jump ||
      input.jumpJustPressed ||
      input.dashJustPressed ||
      input.restart ||
      input.restartJustPressed ||
      Math.abs(input.cameraOrbitX) > 0.05 ||
      Math.abs(input.cameraOrbitY) > 0.05 ||
      input.cameraResetJustPressed
    );
  }

  private startIntroOrbit(): void {
    this.isIntroOrbiting = true;
    this.camera3DMode = true;
    this.cubeRenderer.startIntroOrbit();
    this.updateCameraModeUI();
  }

  private stopIntroOrbitAndTransitionTo2D(): void {
    if (!this.isIntroOrbiting) return;
    this.isIntroOrbiting = false;
    this.cubeRenderer.stopIntroOrbit();
    this.camera3DMode = false;
    this.cubeRenderer.setCameraMode(false);
    this.updateCameraModeUI();
  }

  private updateCameraModeUI(): void {
    if (this.btnCameraEl) {
      const textNodes = Array.from(this.btnCameraEl.childNodes);
      for (const node of textNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('View:')) {
          node.textContent = this.camera3DMode ? ' View: 3D Depth ' : ' View: Flat Face ';
        }
      }
    }
  }
}

// Start game once DOM loads
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
