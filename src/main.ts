import { LevelMap } from './world/LevelMap';
import { ScreenData } from './world/ScreenData';
import { WorldRegistry } from './world/WorldRegistry';
import { Player } from './entities/Player';
import { InputManager } from './engine/InputManager';
import { AudioManager } from './engine/AudioManager';
import { ParticleSystem } from './engine/ParticleSystem';
import { PhysicsEngine } from './engine/PhysicsEngine';
import { CubeRenderer, RotationDirection } from './graphics/CubeRenderer';
import { PerformanceDebugView } from './ui/PerformanceDebugView';

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
  private worldSelectEl: HTMLSelectElement;
  private worldFileInputEl: HTMLInputElement;
  private perfDebug: PerformanceDebugView;

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
    this.worldSelectEl = document.getElementById('world-select') as HTMLSelectElement;
    this.worldFileInputEl = document.getElementById('world-file-input') as HTMLInputElement;

    this.perfDebug = new PerformanceDebugView({
      initialVisible: false,
      onToggle: (visible) => {
        if (this.btnPerfEl) {
          this.btnPerfEl.textContent = visible ? 'Perf: ON [P]' : 'Perf: OFF [P]';
          this.btnPerfEl.classList.toggle('active', visible);
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
    this.cubeRenderer = new CubeRenderer(container);

    // Initial binding of active and adjacent rooms (rendered directly in real-time)
    this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);
    this.updateHUD();
    this.setupUIEvents();

    requestAnimationFrame(this.gameLoop);
  }

  private setupUIEvents(): void {
    this.btnMuteEl.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.btnMuteEl.textContent = muted ? 'Sound: MUTED' : 'Sound: ON';
    });

    this.btnCameraEl.addEventListener('click', () => {
      this.camera3DMode = !this.camera3DMode;
      this.cubeRenderer.setCameraMode(this.camera3DMode);
      this.btnCameraEl.textContent = this.camera3DMode ? 'View: 3D Depth' : 'View: Flat Face';
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

    // World Selection Dropdown
    this.worldSelectEl?.addEventListener('change', () => {
      const selected = this.worldSelectEl.value;
      if (selected === '__load_custom__') {
        this.worldSelectEl.value = this.currentWorldId;
        this.worldFileInputEl?.click();
        return;
      }
      const entry = WorldRegistry.getWorld(selected);
      if (entry) {
        this.currentWorldId = selected;
        this.loadWorld(entry.load(), entry.name, entry.startingCoords);
      }
    });

    // Local JSON File Upload
    this.worldFileInputEl?.addEventListener('change', () => {
      const file = this.worldFileInputEl.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const loaded = WorldRegistry.loadWorldFromJsonString(content);
          const customId = `custom_${Date.now()}`;
          WorldRegistry.registerWorld({
            id: customId,
            name: loaded.title,
            source: 'custom',
            load: () => WorldRegistry.loadWorldFromJsonString(content).map,
            startingCoords: loaded.startingCoords,
          });

          // Add to select dropdown before the custom option
          const option = document.createElement('option');
          option.value = customId;
          option.textContent = `Custom: ${loaded.title}`;
          this.worldSelectEl.insertBefore(option, this.worldSelectEl.lastElementChild);
          this.worldSelectEl.value = customId;
          this.currentWorldId = customId;

          this.loadWorld(loaded.map, loaded.title, loaded.startingCoords);
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
            const loaded = WorldRegistry.loadWorldFromJsonString(content);
            const customId = `custom_${Date.now()}`;
            WorldRegistry.registerWorld({
              id: customId,
              name: loaded.title,
              source: 'custom',
              load: () => WorldRegistry.loadWorldFromJsonString(content).map,
              startingCoords: loaded.startingCoords,
            });

            const option = document.createElement('option');
            option.value = customId;
            option.textContent = `Custom: ${loaded.title}`;
            this.worldSelectEl.insertBefore(option, this.worldSelectEl.lastElementChild);
            this.worldSelectEl.value = customId;
            this.currentWorldId = customId;

            this.loadWorld(loaded.map, loaded.title, loaded.startingCoords);
          } catch (err: any) {
            alert(`Failed to load dropped JSON: ${err?.message || err}`);
          }
        };
        reader.readAsText(file);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        const muted = this.audio.toggleMute();
        this.btnMuteEl.textContent = muted ? 'Sound: MUTED' : 'Sound: ON';
      }
      if (e.code === 'KeyC') {
        this.btnCameraEl.click();
      }
      if (e.code === 'KeyV') {
        this.cubeRenderer.resetCameraToDefault();
      }
    });
  }

  private gameLoop = (time: number) => {
    this.perfDebug.recordFrame(time);

    if (this.lastTime === 0) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.gameTime += dt;

    // Keep all rendering faces and physics 100% in lockstep
    this.cubeRenderer.setGameTime(this.gameTime);

    const inputState = this.input.update();

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
        this.gameTime
      );

      // 3. Trigger 3D Infinite Cube Rotation if player crossed an edge
      if (transition) {
        this.handleEdgeTransition(transition.direction, transition.entryX, transition.entryY, transition.preserveVy);
      }
    }

    // 4. Update particles
    this.particles.update(dt);

    // 5. Render active front face (Canvas 2D -> WebGL CanvasTexture)
    const activeProjectiles = this.physics.getProjectilesForRoom(
      this.gameState === 'ROTATING' && this.pendingNextRoom
        ? this.pendingNextRoom.id
        : this.currentRoom.id
    );

    if (this.gameState === 'ROTATING' && this.pendingNextRoom) {
      this.cubeRenderer.updateFaceCanvas(
        this.cubeRenderer.transitionTargetFace,
        this.pendingNextRoom,
        this.levelMap,
        this.player,
        this.particles,
        dt,
        activeProjectiles
      );
    } else {
      this.cubeRenderer.updateFaceCanvas(
        4,
        this.currentRoom,
        this.levelMap,
        this.player,
        this.particles,
        dt,
        activeProjectiles
      );
    }

    // 6. Update dynamic 3D player point light
    const activeThemeColor = this.gameState === 'ROTATING' && this.pendingNextRoom
      ? this.pendingNextRoom.themeColor
      : this.currentRoom.themeColor;
    this.cubeRenderer.updatePlayerLight(this.player.x, this.player.y, activeThemeColor);

    // 7. Update 3D scene & render
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
      cameraMode: this.camera3DMode ? '3D Orbit' : '2D Flat',
    });

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
        this.audio.playCollect();
        this.particles.emitSparks(item.x, item.y, 18, item.type === 'prism' ? '#ff00aa' : '#ffe600');
        this.updateHUD();
      }
    }
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

      // 2. Re-anchor 3D cube: snap rotation back to 0
      this.cubeRenderer.resetRotationToZero();

      // 3. Re-bind all faces to new neighbors
      this.physics.resetCrumblingTiles();
      this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);

      // 4. Return to active gameplay
      this.gameState = 'PLAYING';
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

    // Reset rotation & face binding
    this.cubeRenderer.resetRotationToZero();
    this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);

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
    this.player.isAlive = true;
    this.player.resetHoldProgress = 0;

    // Visual & audio reset feedback
    this.particles.emitPlayerExplosion(spawn.x, spawn.y, '#00ffff', '#ffe600');
    this.particles.emitSparks(spawn.x, spawn.y, 30, '#ff00aa');
    this.audio.playLevelReset();

    this.winModalEl.style.display = 'none';
    this.gameState = 'PLAYING';
    this.updateHUD();

    if (this.bannerTimeout !== null) {
      window.clearTimeout(this.bannerTimeout);
    }
    this.bannerEl.textContent = `WORLD LOADED: ${title.toUpperCase()}`;
    this.bannerEl.style.opacity = '1';
    this.bannerTimeout = window.setTimeout(() => {
      this.bannerEl.style.opacity = '0';
      this.bannerTimeout = null;
    }, 3000);
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
    this.physics.resetCrumblingTiles();
    const spawn = this.currentRoom.spawnPoint || { x: 80, y: 660 };
    this.player.setPosition(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.standingPlatform = null;
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
    this.hudSectorEl.textContent = `${this.currentRoom.title} [${this.currentCoords.x}, ${this.currentCoords.y}]`;
    this.hudTurnEl.textContent = `Side #${this.sidesTraversed} (Infinite Non-Euclidean)`;
    this.hudPrismsEl.textContent = `${this.levelMap.getCollectedCount()} / ${this.levelMap.getTotalCollectiblesCount()}`;
  }
}

// Start game once DOM loads
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
