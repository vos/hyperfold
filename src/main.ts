import { buildDemoLevel } from './world/DemoLevel';
import { LevelMap } from './world/LevelMap';
import { ScreenData } from './world/ScreenData';
import { Player } from './entities/Player';
import { InputManager } from './engine/InputManager';
import { AudioManager } from './engine/AudioManager';
import { ParticleSystem } from './engine/ParticleSystem';
import { PhysicsEngine } from './engine/PhysicsEngine';
import { CubeRenderer, RotationDirection } from './graphics/CubeRenderer';

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
  private sidesTraversed: number = 1;
  private camera3DMode: boolean = true;

  // DOM Elements
  private hudSectorEl: HTMLElement;
  private hudTurnEl: HTMLElement;
  private hudPrismsEl: HTMLElement;
  private bannerEl: HTMLElement;
  private winModalEl: HTMLElement;
  private winStatsEl: HTMLElement;
  private btnMuteEl: HTMLElement;
  private btnCameraEl: HTMLElement;

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

    this.levelMap = buildDemoLevel();
    const initialRoom = this.levelMap.getRoom(0, 0);
    if (!initialRoom) throw new Error('Genesis room not found');
    this.currentRoom = initialRoom;
    this.levelMap.markVisited(0, 0);

    const spawn = initialRoom.spawnPoint || { x: 120, y: 660 };
    this.player = new Player(spawn.x, spawn.y);

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.physics = new PhysicsEngine(this.audio, this.particles);
    this.cubeRenderer = new CubeRenderer(container);

    // Initial binding of active and adjacent rooms
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

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      this.respawnPlayer();
    });

    document.getElementById('btn-play-again')?.addEventListener('click', () => {
      this.winModalEl.style.display = 'none';
      this.gameState = 'PLAYING';
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        const muted = this.audio.toggleMute();
        this.btnMuteEl.textContent = muted ? 'Sound: MUTED' : 'Sound: ON';
      }
      if (e.code === 'KeyC') {
        this.btnCameraEl.click();
      }
    });
  }

  private gameLoop = (time: number) => {
    if (this.lastTime === 0) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    const inputState = this.input.update();

    if (inputState.restartJustPressed) {
      this.respawnPlayer();
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
        () => this.onPlayerDeath()
      );

      // 3. Trigger 3D Infinite Cube Rotation if player crossed an edge
      if (transition) {
        this.handleEdgeTransition(transition.direction, transition.entryX, transition.entryY, transition.preserveVy);
      }
    }

    // 4. Update particles
    this.particles.update(dt);

    // 5. Render active front face (Canvas 2D -> WebGL CanvasTexture)
    this.cubeRenderer.updateFaceCanvas(
      4,
      this.currentRoom,
      this.levelMap,
      this.player,
      this.particles,
      dt
    );

    // 6. Update 3D scene & render
    this.cubeRenderer.update(dt);

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

    // Show dynamic banner emphasizing non-Euclidean infinite sides
    this.bannerEl.textContent = `3D CUBE TUMBLE: SECTOR [${this.currentCoords.x},${this.currentCoords.y}] ➔ [${targetX},${targetY}] (SIDE #${this.sidesTraversed})`;
    this.bannerEl.style.opacity = '1';

    // Target face index on BoxGeometry:
    // Right: 0, Left: 1, Top: 2, Bottom: 3
    let targetFaceIndex = 0;
    if (direction === 'right') targetFaceIndex = 0;
    if (direction === 'left') targetFaceIndex = 1;
    if (direction === 'up') targetFaceIndex = 2;
    if (direction === 'down') targetFaceIndex = 3;

    // Render destination room on the adjacent face so it turns smoothly into view
    this.cubeRenderer.updateFaceCanvas(targetFaceIndex, nextRoom, this.levelMap);

    // Place player at destination seam
    this.player.setPosition(entryX, entryY);
    this.player.vy = preserveVy;

    this.cubeRenderer.rotateTo(direction, () => {
      // Rotation complete:
      // 1. Advance coordinate state
      this.currentCoords = { x: targetX, y: targetY };
      this.currentRoom = nextRoom;
      this.levelMap.markVisited(targetX, targetY);

      // 2. Re-anchor 3D cube: snap rotation back to 0
      this.cubeRenderer.resetRotationToZero();

      // 3. Re-bind all faces to new neighbors
      this.physics.resetCrumblingTiles();
      this.cubeRenderer.bindCurrentAndNeighborRooms(this.currentRoom, this.levelMap);

      // 4. Return to active gameplay
      this.gameState = 'PLAYING';
      this.bannerEl.style.opacity = '0';
      this.updateHUD();
    });
  }

  private onPlayerDeath(): void {
    this.gameState = 'RESPAWNING';
    setTimeout(() => {
      this.respawnPlayer();
      this.gameState = 'PLAYING';
    }, 450);
  }

  private respawnPlayer(): void {
    this.physics.resetCrumblingTiles();
    const spawn = this.currentRoom.spawnPoint || { x: 80, y: 660 };
    this.player.setPosition(spawn.x, spawn.y);
    this.player.vx = 0;
    this.player.vy = 0;
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
