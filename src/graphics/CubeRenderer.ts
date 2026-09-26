import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOM_SIZE, ScreenData } from '../world/ScreenData';
import { FaceRenderer } from './FaceRenderer';
import { LevelMap } from '../world/LevelMap';
import { Player } from '../entities/Player';
import { ParticleSystem } from '../engine/ParticleSystem';
import { LaserTurret, LaserProjectile } from '../entities/LaserTurret';
import { VoidBackground } from './VoidBackground';

export type RotationDirection = 'right' | 'left' | 'up' | 'down';

export interface FaceBinding {
  type: 'room' | 'void';
  room?: ScreenData;
  voidLabel?: string;
  rotationAngle?: number;
}

export class CubeRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cubeMesh: THREE.Mesh;
  public cubeEdges: THREE.Group;
  public voidBg: VoidBackground;
  public transitionTargetFace: number = 4;
  public transitionDirection: RotationDirection | null = null;

  // Face textures & canvases
  // Three.js BoxGeometry face order:
  // 0: +X (Right)
  // 1: -X (Left)
  // 2: +Y (Top)
  // 3: -Y (Bottom)
  // 4: +Z (Front - Active playfield)
  // 5: -Z (Back)
  private faceCanvases: HTMLCanvasElement[] = [];
  private faceContexts: CanvasRenderingContext2D[] = [];
  private faceTextures: THREE.CanvasTexture[] = [];
  private faceMaterials: THREE.MeshBasicMaterial[] = [];

  // Renderer for room drawing
  public faceRenderer: FaceRenderer;

  // Real-time face bindings (Faces 0 to 5)
  private faceBindings: (FaceBinding | null)[] = [
    null, // 0: +X
    null, // 1: -X
    null, // 2: +Y
    null, // 3: -Y
    null, // 4: +Z
    { type: 'void', voidLabel: 'Rear Processing Core' }, // 5: -Z
  ];
  private activeLevelMap: LevelMap | null = null;

  // 6 Face Normals (BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z)
  private static readonly FACE_NORMALS: THREE.Vector3[] = [
    new THREE.Vector3( 1,  0,  0), // 0: +X (Right)
    new THREE.Vector3(-1,  0,  0), // 1: -X (Left)
    new THREE.Vector3( 0,  1,  0), // 2: +Y (Top)
    new THREE.Vector3( 0, -1,  0), // 3: -Y (Bottom)
    new THREE.Vector3( 0,  0,  1), // 4: +Z (Front)
    new THREE.Vector3( 0,  0, -1), // 5: -Z (Back)
  ];

  // Scratch vectors for zero-allocation visibility culling
  private readonly tempFaceNormal = new THREE.Vector3();
  private readonly tempFaceCenter = new THREE.Vector3();
  private readonly tempViewDir = new THREE.Vector3();

  // Side Faces Update Throttling (20 FPS round-robin)
  private sideFacesAccumulator: number = 0;
  private sideFacesRoundRobinIdx: number = 0;
  private readonly SIDE_FACES_INTERVAL: number = 1 / 20; // ~0.05s (20 FPS)

  // Rotation Animation State
  public isRotating: boolean = false;
  private rotProgress: number = 0;
  private rotDuration: number = 0.42; // seconds
  private rotStartQuat: THREE.Quaternion = new THREE.Quaternion();
  private rotTargetQuat: THREE.Quaternion = new THREE.Quaternion();
  private onRotationCompleteCallback: (() => void) | null = null;

  // Cube physical dimensions
  public readonly CUBE_SIZE = 16;
  public is3DMode: boolean = true;

  // Intro 3D Camera Orbit Animation
  public isIntroOrbiting: boolean = true;
  private introOrbitTime: number = 0;
  private readonly INTRO_ORBIT_SPEED: number = 0.45; // Smooth, gentle rotation speed

  // Interactive 3D Orbit Camera System
  // Default 3D perspective angles:
  private readonly DEFAULT_YAW = 0.285;       // ~16.3 degrees
  private readonly DEFAULT_PITCH = 0.145;     // ~8.3 degrees
  private readonly DEFAULT_DISTANCE = 38.0;

  public orbitYaw: number = 0.285;
  public orbitPitch: number = 0.145;
  public orbitDistance: number = 38.0;

  // Target lookAt vector
  private lookTarget: THREE.Vector3 = new THREE.Vector3(-1.5, -0.7, 0);
  private currentLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Mouse drag tracking
  private isPointerDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  // Player interaction callback (for exiting intro orbit)
  public onPlayerInteraction?: () => void;

  // Shift+Click Teleport callback for dev mode
  public onShiftClickTeleportCallback?: (roomX: number, roomY: number) => void;

  private time: number = 0;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    container.appendChild(this.renderer.domElement);

    // Initial camera layout with cool 3D orbit around front face
    this.startIntroOrbit();

    // Cosmic void background
    this.voidBg = new VoidBackground();
    this.scene.add(this.voidBg.group);

    this.faceRenderer = new FaceRenderer();

    // Create textures & unlit MeshBasicMaterials for all 6 cube faces
    // Slightly softened tint (0xd0d0d0) to match the original deeper lighting contrast
    for (let i = 0; i < 6; i++) {
      const cvs = document.createElement('canvas');
      cvs.width = ROOM_SIZE;
      cvs.height = ROOM_SIZE;
      const ctx = cvs.getContext('2d');
      if (!ctx) throw new Error('Cannot init canvas context');
      this.faceCanvases.push(cvs);
      this.faceContexts.push(ctx);

      const tex = new THREE.CanvasTexture(cvs);
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.faceTextures.push(tex);

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color(0xd0d0d0),
      });
      this.faceMaterials.push(mat);
    }

    // Initialize Back Face (Face 5: -Z) with high-tech cybernetic circuitry
    this.drawVoidFace(5, 'Rear Processing Core');

    // Create 3D Cube Mesh
    const boxGeo = new THREE.BoxGeometry(this.CUBE_SIZE, this.CUBE_SIZE, this.CUBE_SIZE);
    this.cubeMesh = new THREE.Mesh(boxGeo, this.faceMaterials);
    this.scene.add(this.cubeMesh);

    // Build Sleek Glowing Neon Edges (merged geometry for minimal draw calls)
    this.cubeEdges = this.buildSleekChassis(boxGeo);
    this.cubeMesh.add(this.cubeEdges);

    // Setup interactive mouse orbit & wheel listeners
    this.setupPointerControls();

    window.addEventListener('resize', this.onWindowResize);
  }

  /**
   * Renders a cybernetic synthwave diagnostic terminal with real-time animations.
   */
  private renderVoidGraphics(ctx: CanvasRenderingContext2D, text: string, time: number = 0): void {
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE);

    // 1. Cyber background grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= ROOM_SIZE; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, ROOM_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(ROOM_SIZE, i);
      ctx.stroke();
    }

    // 2. Animated scanning laser beam
    const scanY = ((time * 110) % (ROOM_SIZE + 100)) - 50;
    if (scanY >= 0 && scanY <= ROOM_SIZE) {
      const grad = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 18);
      grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
      grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.12)');
      grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 18, ROOM_SIZE, 36);
    }

    // 3. Cybernetic circuit telemetry lines with breathing luminescence
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.5);
    ctx.strokeStyle = `rgba(255, 0, 170, ${0.28 + pulse * 0.22})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(40, 200);
    ctx.lineTo(180, 200);
    ctx.lineTo(240, 280);
    ctx.lineTo(600, 280);
    ctx.lineTo(680, 200);
    ctx.lineTo(760, 200);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, 600);
    ctx.lineTo(200, 600);
    ctx.lineTo(260, 520);
    ctx.lineTo(540, 520);
    ctx.lineTo(600, 600);
    ctx.lineTo(760, 600);
    ctx.stroke();

    // 4. Pulsing circuit nodes
    ctx.fillStyle = '#00ffff';
    for (const [nx, ny] of [
      [180, 200], [240, 280], [600, 280], [680, 200],
      [200, 600], [260, 520], [540, 520], [600, 600]
    ]) {
      ctx.beginPath();
      const nodePulse = 3.5 + Math.sin(time * 5 + nx * 0.1) * 1.5;
      ctx.arc(nx, ny, nodePulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Border frame
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.35 + pulse * 0.2})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, ROOM_SIZE - 32, ROOM_SIZE - 32);

    // 6. Central console display
    ctx.fillStyle = 'rgba(8, 14, 28, 0.9)';
    ctx.fillRect(100, 310, 600, 180);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 310, 600, 180);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#ff00aa';
    ctx.textAlign = 'center';
    ctx.fillText(`[${text.toUpperCase()}]`, ROOM_SIZE * 0.5, 355);

    if (text === 'Rear Processing Core') {
      const freq = (8.4 + Math.sin(time * 1.8) * 0.15).toFixed(2);
      const flux = Math.floor(95 + Math.sin(time * 2.7) * 4);
      const cyc = Math.floor((time * 120) % 9999).toString().padStart(4, '0');
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#88c8ff';
      ctx.fillText('STATUS: QUANTUM HYPER-CORE ONLINE', ROOM_SIZE * 0.5, 390);
      ctx.fillText('MANIFOLD PROCESSOR: 4D NON-EUCLIDEAN KERNEL', ROOM_SIZE * 0.5, 415);
      ctx.fillText(`CORE FREQUENCY: ${freq} THz | FLUX: ${flux}% | CYC: #${cyc}`, ROOM_SIZE * 0.5, 440);
      ctx.fillStyle = '#ffe600';
      ctx.fillText('ACTIVE MANIFOLD BUS: SYNCHRONIZED', ROOM_SIZE * 0.5, 465);
    } else {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#88c8ff';
      ctx.fillText('STATUS: UNMAPPED DIMENSIONAL SECTOR', ROOM_SIZE * 0.5, 395);
      ctx.fillText('MANIFOLD TOPOLOGY: NON-EUCLIDEAN 4D MATRIX', ROOM_SIZE * 0.5, 420);
      ctx.fillText('WARP METRIC: ACTIVE TESSERACT', ROOM_SIZE * 0.5, 445);
    }

    // 7. Dynamic Traveling Waveform
    ctx.strokeStyle = text === 'Rear Processing Core' ? '#ff00aa' : '#00ffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 120; x <= 680; x += 8) {
      const waveY = 530 + Math.sin(x * 0.045 + time * 6) * 14 + Math.cos(x * 0.02 - time * 3.5) * 8;
      if (x === 120) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
    ctx.textAlign = 'left';
  }

  /**
   * Sets up mouse drag orbit controls and scroll-wheel zoom on the WebGL canvas.
   */
  private setupPointerControls(): void {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', (e: PointerEvent) => {
      this.onPlayerInteraction?.();

      // Shift + Left Click for Dev Mode Click-to-Teleport
      if (e.button === 0 && e.shiftKey) {
        if (this.handleShiftClickTeleport(e.clientX, e.clientY)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Left button (0) or right button (2)
      if (e.button === 0 || e.button === 2) {
        this.isPointerDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        el.setPointerCapture(e.pointerId);
      }
    });

    el.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isPointerDragging && this.is3DMode) {
        const deltaX = e.clientX - this.lastPointerX;
        const deltaY = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        // Smooth orbit sensitivity
        this.addOrbit(-deltaX * 0.007, deltaY * 0.007);
      }
    });

    const stopDrag = (e: PointerEvent) => {
      if (this.isPointerDragging) {
        this.isPointerDragging = false;
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    };

    el.addEventListener('pointerup', stopDrag);
    el.addEventListener('pointercancel', stopDrag);

    el.addEventListener('wheel', (e: WheelEvent) => {
      this.onPlayerInteraction?.();
      if (this.is3DMode) {
        e.preventDefault();
        this.addZoom(e.deltaY * 0.025);
      }
    }, { passive: false });

    el.addEventListener('dblclick', () => {
      if (this.is3DMode) {
        this.resetCameraToDefault();
      }
    });

    // Prevent context menu on right click drag
    el.addEventListener('contextmenu', (e: Event) => e.preventDefault());
  }

  /**
   * Raycasts from screen coordinates to the front face of the 3D cube,
   * returning exact pixel coordinates [0, ROOM_SIZE] inside the room.
   */
  public getRoomCoordsFromScreen(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);
    const intersects = raycaster.intersectObject(this.cubeMesh);
    if (intersects.length > 0) {
      const hit = intersects[0];
      // Front face (+Z) corresponds to materialIndex 4
      if (hit.uv && (hit.face?.materialIndex === 4 || !hit.face)) {
        const roomX = Math.round(hit.uv.x * ROOM_SIZE);
        const roomY = Math.round((1 - hit.uv.y) * ROOM_SIZE);
        const clampedX = Math.max(0, Math.min(ROOM_SIZE, roomX));
        const clampedY = Math.max(0, Math.min(ROOM_SIZE, roomY));
        return { x: clampedX, y: clampedY };
      }
    }
    return null;
  }

  private handleShiftClickTeleport(clientX: number, clientY: number): boolean {
    if (!this.onShiftClickTeleportCallback) return false;
    const coords = this.getRoomCoordsFromScreen(clientX, clientY);
    if (coords) {
      this.onShiftClickTeleportCallback(coords.x, coords.y);
      return true;
    }
    return false;
  }

  /**
   * Adjusts the 3D orbit angles: yaw (horizontal 360°) and pitch (vertical elevation).
   */
  public addOrbit(deltaYaw: number, deltaPitch: number): void {
    this.orbitYaw = (this.orbitYaw + deltaYaw) % (Math.PI * 2);
    // Clamp pitch to prevent flipping upside down
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch + deltaPitch,
      -Math.PI * 0.45,
      Math.PI * 0.45
    );
  }

  /**
   * Adjusts the camera zoom distance.
   */
  public addZoom(deltaDist: number): void {
    this.orbitDistance = THREE.MathUtils.clamp(
      this.orbitDistance + deltaDist,
      20.0,
      58.0
    );
  }

  /**
   * Smoothly resets the camera orbit to the default 3D gameplay view.
   */
  public resetCameraToDefault(): void {
    this.orbitYaw = this.DEFAULT_YAW;
    this.orbitPitch = this.DEFAULT_PITCH;
    this.orbitDistance = this.DEFAULT_DISTANCE;
    this.lookTarget.set(-1.5, -0.7, 0);
  }

  /**
   * Starts a continuous cinematic 3D camera orbit circling the front face of the cube.
   */
  public startIntroOrbit(): void {
    this.isIntroOrbiting = true;
    this.introOrbitTime = 0;
    this.is3DMode = true;

    // Immediately evaluate initial orbit angles (angle = 0) so the camera begins smoothly
    const angle = 0;
    const radiusYaw = 0.36;
    const radiusPitch = 0.20;
    this.orbitYaw = Math.sin(angle) * radiusYaw + Math.sin(angle * 2.3) * 0.04;
    this.orbitPitch = Math.cos(angle) * radiusPitch + Math.cos(angle * 1.7) * 0.03;
    this.orbitDistance = 37.5;
    this.lookTarget.set(0, -0.6, 0);

    this.updateCameraLayout(true);
  }

  /**
   * Stops the intro orbit, restoring standard 3D viewing angles for subsequent manual 3D mode.
   */
  public stopIntroOrbit(): void {
    if (!this.isIntroOrbiting) return;
    this.isIntroOrbiting = false;
    this.orbitYaw = this.DEFAULT_YAW;
    this.orbitPitch = this.DEFAULT_PITCH;
    this.orbitDistance = this.DEFAULT_DISTANCE;
    this.lookTarget.set(-1.5, -0.7, 0);
  }

  /**
   * Predictively prepares and binds all adjacent rooms of nextRoom in real-time
   * BEFORE the tumble animation begins, ensuring 0ms latency and zero visual pop-in.
   */
  public prepareTransition(
    direction: RotationDirection,
    nextRoom: ScreenData,
    levelMap: LevelMap,
    currentRoom?: ScreenData,
    player?: Player,
    particles?: ParticleSystem
  ): void {
    this.activeLevelMap = levelMap;
    this.transitionDirection = direction;

    let targetFaceIndex = 0;
    if (direction === 'right') targetFaceIndex = 0;
    if (direction === 'left') targetFaceIndex = 1;
    if (direction === 'up') targetFaceIndex = 2;
    if (direction === 'down') targetFaceIndex = 3;
    this.transitionTargetFace = targetFaceIndex;

    // 1. Immediately bind nextRoom onto target face with player and particles at entry seam
    this.faceBindings[targetFaceIndex] = { type: 'room', room: nextRoom };
    const targetCtx = this.faceContexts[targetFaceIndex];
    this.faceRenderer.renderRoomToContext(targetCtx, nextRoom, levelMap, player, particles, this.time);
    this.faceTextures[targetFaceIndex].needsUpdate = true;

    // 2. Bind currentRoom onto Face 4 without player (player has crossed into nextRoom)
    if (currentRoom) {
      this.bindFaceRoom(4, currentRoom, levelMap);
    }

    // 3. Pre-render incoming trailing face (Face 5: -Z) with nextRoom's neighbor in direction of motion
    // and pre-render all adjacent side faces for nextRoom before rotation begins!
    if (direction === 'right') {
      // Rotating Right:
      // Face 5 rotates into Right (+X) position -> pre-render nextRoom's right neighbor (X+1, Y)
      const nextRight = levelMap.getRoom(nextRoom.coords.x + 1, nextRoom.coords.y);
      if (nextRight) this.bindFaceRoom(5, nextRight, levelMap);
      else this.bindFaceVoid(5, '+X Sector Void Barrier');

      // Top face (+Y: 2) and Bottom face (-Y: 3) stay in view while rotating horizontally
      const topRoom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y + 1);
      if (topRoom) this.bindFaceRoom(2, topRoom, levelMap);
      else this.bindFaceVoid(2, '+Y Zenith Void Boundary');

      const bottomRoom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y - 1);
      if (bottomRoom) this.bindFaceRoom(3, bottomRoom, levelMap);
      else this.bindFaceVoid(3, '-Y Abyss Gravitational Void');

    } else if (direction === 'left') {
      // Rotating Left:
      // Face 5 rotates into Left (-X) position -> pre-render nextRoom's left neighbor (X-1, Y)
      const nextLeft = levelMap.getRoom(nextRoom.coords.x - 1, nextRoom.coords.y);
      if (nextLeft) this.bindFaceRoom(5, nextLeft, levelMap);
      else this.bindFaceVoid(5, '-X Sector Void Barrier');

      // Top face (+Y: 2) and Bottom face (-Y: 3)
      const topRoom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y + 1);
      if (topRoom) this.bindFaceRoom(2, topRoom, levelMap);
      else this.bindFaceVoid(2, '+Y Zenith Void Boundary');

      const bottomRoom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y - 1);
      if (bottomRoom) this.bindFaceRoom(3, bottomRoom, levelMap);
      else this.bindFaceVoid(3, '-Y Abyss Gravitational Void');

    } else if (direction === 'up') {
      // Rotating Up:
      // Face 5 rotates into Top (+Y) position -> pre-render nextRoom's top neighbor (X, Y+1) with 180° rotation
      const nextTop = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y + 1);
      if (nextTop) this.bindFaceRoom(5, nextTop, levelMap, Math.PI);
      else this.bindFaceVoid(5, '+Y Zenith Void Boundary', Math.PI);

      // Right face (+X: 0) and Left face (-X: 1)
      const rightRoom = levelMap.getRoom(nextRoom.coords.x + 1, nextRoom.coords.y);
      if (rightRoom) this.bindFaceRoom(0, rightRoom, levelMap);
      else this.bindFaceVoid(0, '+X Sector Void Barrier');

      const leftRoom = levelMap.getRoom(nextRoom.coords.x - 1, nextRoom.coords.y);
      if (leftRoom) this.bindFaceRoom(1, leftRoom, levelMap);
      else this.bindFaceVoid(1, '-X Sector Void Barrier');

    } else if (direction === 'down') {
      // Rotating Down:
      // Face 5 rotates into Bottom (-Y) position -> pre-render nextRoom's bottom neighbor (X, Y-1) with 180° rotation
      const nextBottom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y - 1);
      if (nextBottom) this.bindFaceRoom(5, nextBottom, levelMap, Math.PI);
      else this.bindFaceVoid(5, '-Y Abyss Gravitational Void', Math.PI);

      // Right face (+X: 0) and Left face (-X: 1)
      const rightRoom = levelMap.getRoom(nextRoom.coords.x + 1, nextRoom.coords.y);
      if (rightRoom) this.bindFaceRoom(0, rightRoom, levelMap);
      else this.bindFaceVoid(0, '+X Sector Void Barrier');

      const leftRoom = levelMap.getRoom(nextRoom.coords.x - 1, nextRoom.coords.y);
      if (leftRoom) this.bindFaceRoom(1, leftRoom, levelMap);
      else this.bindFaceVoid(1, '-X Sector Void Barrier');
    }
  }

  /**
   * Constructs sleek, seamless neon edge beams and corner joints:
   * - Ultra-crisp neon line core (EdgesGeometry)
   * - 12 seamless cylindrical beams with matched spherical corner caps
   * - ZERO screen obstruction (all tiles 100% visible)
   * - No clunky blocks or corner diamonds
   */
  private buildSleekChassis(boxGeo: THREE.BoxGeometry): THREE.Group {
    const chassis = new THREE.Group();
    const H = this.CUBE_SIZE * 0.5; // 8.0
    const tubeRadius = 0.05;
    const tubeLen = this.CUBE_SIZE - tubeRadius * 2; // 15.90

    // Self-luminous Neon Materials (unaffected by scene shadows)
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const magentaMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });

    // 1. Inner Laser Core Lines
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
    });
    const laserCore = new THREE.LineSegments(edgeGeo, edgeMat);
    chassis.add(laserCore);

    // 2. Seamless Cylindrical Neon Edge Beams & Spherical Corner Joints (Merged Geometries)
    const cyanGeos: THREE.BufferGeometry[] = [];
    const magentaGeos: THREE.BufferGeometry[] = [];

    const xTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    xTubeGeo.rotateZ(Math.PI * 0.5); // align along X axis

    const yTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    const zTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    zTubeGeo.rotateX(Math.PI * 0.5); // align along Z axis

    // X-parallel edges
    const xEdges: [number, number, number, boolean][] = [
      [0, H, H, true],       // Top-Front (cyan)
      [0, H, -H, true],      // Top-Back (cyan)
      [0, -H, H, false],     // Bottom-Front (magenta)
      [0, -H, -H, false],    // Bottom-Back (magenta)
    ];
    for (const [x, y, z, isCyan] of xEdges) {
      const g = xTubeGeo.clone().translate(x, y, z);
      (isCyan ? cyanGeos : magentaGeos).push(g);
    }

    // Y-parallel edges
    const yEdges: [number, number, number, boolean][] = [
      [-H, 0, H, true],      // Left-Front (cyan)
      [-H, 0, -H, true],     // Left-Back (cyan)
      [H, 0, H, false],      // Right-Front (magenta)
      [H, 0, -H, false],     // Right-Back (magenta)
    ];
    for (const [x, y, z, isCyan] of yEdges) {
      const g = yTubeGeo.clone().translate(x, y, z);
      (isCyan ? cyanGeos : magentaGeos).push(g);
    }

    // Z-parallel edges
    const zEdges: [number, number, number, boolean][] = [
      [-H, H, 0, true],      // Top-Left (cyan)
      [H, H, 0, true],       // Top-Right (cyan)
      [-H, -H, 0, false],    // Bottom-Left (magenta)
      [H, -H, 0, false],     // Bottom-Right (magenta)
    ];
    for (const [x, y, z, isCyan] of zEdges) {
      const g = zTubeGeo.clone().translate(x, y, z);
      (isCyan ? cyanGeos : magentaGeos).push(g);
    }

    // 3. Smooth Spherical Corner Joints
    const sphereGeo = new THREE.SphereGeometry(tubeRadius, 8, 8);
    for (const cx of [-H, H]) {
      for (const cy of [-H, H]) {
        for (const cz of [-H, H]) {
          const isCyan = cy > 0;
          const g = sphereGeo.clone().translate(cx, cy, cz);
          (isCyan ? cyanGeos : magentaGeos).push(g);
        }
      }
    }

    // Merge into single cyan and single magenta draw calls
    if (cyanGeos.length > 0) {
      const mergedCyan = BufferGeometryUtils.mergeGeometries(cyanGeos);
      if (mergedCyan) {
        chassis.add(new THREE.Mesh(mergedCyan, cyanMat));
      }
      cyanGeos.forEach((g) => g.dispose());
    }

    if (magentaGeos.length > 0) {
      const mergedMagenta = BufferGeometryUtils.mergeGeometries(magentaGeos);
      if (mergedMagenta) {
        chassis.add(new THREE.Mesh(mergedMagenta, magentaMat));
      }
      magentaGeos.forEach((g) => g.dispose());
    }

    xTubeGeo.dispose();
    yTubeGeo.dispose();
    zTubeGeo.dispose();
    sphereGeo.dispose();

    return chassis;
  }

  public updatePlayerLight(_pixelX: number, _pixelY: number, _colorHex: string): void {
    // Dynamic lights removed for peak performance with unlit MeshBasicMaterial
  }

  /**
   * Directly binds a room to a specific face and immediately renders it.
   */
  public bindFaceRoom(faceIndex: number, room: ScreenData, levelMap: LevelMap, rotationAngle: number = 0): void {
    this.faceBindings[faceIndex] = { type: 'room', room, rotationAngle };
    this.activeLevelMap = levelMap;
    const destCtx = this.faceContexts[faceIndex];
    if (rotationAngle !== 0) {
      destCtx.save();
      destCtx.translate(ROOM_SIZE * 0.5, ROOM_SIZE * 0.5);
      destCtx.rotate(rotationAngle);
      destCtx.translate(-ROOM_SIZE * 0.5, -ROOM_SIZE * 0.5);
      this.faceRenderer.renderRoomToContext(destCtx, room, levelMap, undefined, undefined, this.time);
      destCtx.restore();
    } else {
      this.faceRenderer.renderRoomToContext(destCtx, room, levelMap, undefined, undefined, this.time);
    }
    this.faceTextures[faceIndex].needsUpdate = true;
  }

  /**
   * Directly binds a void/diagnostic terminal to a specific face and immediately renders it.
   */
  public bindFaceVoid(faceIndex: number, text: string, rotationAngle: number = 0): void {
    this.faceBindings[faceIndex] = { type: 'void', voidLabel: text, rotationAngle };
    this.drawVoidFace(faceIndex, text);
  }

  /**
   * Renders a cybernetic synthwave diagnostic terminal onto the specified face canvas.
   */
  public drawVoidFace(faceIndex: number, text: string): void {
    const destCtx = this.faceContexts[faceIndex];
    const binding = this.faceBindings[faceIndex];
    if (binding?.rotationAngle) {
      destCtx.save();
      destCtx.translate(ROOM_SIZE * 0.5, ROOM_SIZE * 0.5);
      destCtx.rotate(binding.rotationAngle);
      destCtx.translate(-ROOM_SIZE * 0.5, -ROOM_SIZE * 0.5);
      this.renderVoidGraphics(destCtx, text, this.time);
      destCtx.restore();
    } else {
      this.renderVoidGraphics(destCtx, text, this.time);
    }
    this.faceTextures[faceIndex].needsUpdate = true;
  }

  /**
   * Updates an active face (such as Face 4) with live player and particle systems.
   */
  public updateFaceCanvas(
    faceIndex: number,
    room: ScreenData,
    levelMap: LevelMap,
    player?: Player,
    particles?: ParticleSystem,
    _dt: number = 0.016,
    projectiles?: LaserProjectile[],
    turrets?: LaserTurret[]
  ): void {
    this.faceBindings[faceIndex] = { type: 'room', room };
    this.activeLevelMap = levelMap;
    const destCtx = this.faceContexts[faceIndex];
    this.faceRenderer.renderRoomToContext(destCtx, room, levelMap, player, particles, this.time, projectiles, turrets);
    this.faceTextures[faceIndex].needsUpdate = true;
  }

  /**
   * Pre-binds current room to Front (+Z = index 4) and neighbors to their respective faces
   * using real-time direct context rendering.
   */
  public bindCurrentAndNeighborRooms(currentRoom: ScreenData, levelMap: LevelMap): void {
    this.activeLevelMap = levelMap;

    // 4: Front face = Current room
    this.bindFaceRoom(4, currentRoom, levelMap);

    // 0: Right face (+X) = (X+1, Y)
    const rightRoom = levelMap.getRoom(currentRoom.coords.x + 1, currentRoom.coords.y);
    if (rightRoom) {
      this.bindFaceRoom(0, rightRoom, levelMap);
    } else {
      this.bindFaceVoid(0, '+X Sector Void Barrier');
    }

    // 1: Left face (-X) = (X-1, Y)
    const leftRoom = levelMap.getRoom(currentRoom.coords.x - 1, currentRoom.coords.y);
    if (leftRoom) {
      this.bindFaceRoom(1, leftRoom, levelMap);
    } else {
      this.bindFaceVoid(1, '-X Sector Void Barrier');
    }

    // 2: Top face (+Y) = (X, Y+1)
    const topRoom = levelMap.getRoom(currentRoom.coords.x, currentRoom.coords.y + 1);
    if (topRoom) {
      this.bindFaceRoom(2, topRoom, levelMap);
    } else {
      this.bindFaceVoid(2, '+Y Zenith Void Boundary');
    }

    // 3: Bottom face (-Y) = (X, Y-1)
    const bottomRoom = levelMap.getRoom(currentRoom.coords.x, currentRoom.coords.y - 1);
    if (bottomRoom) {
      this.bindFaceRoom(3, bottomRoom, levelMap);
    } else {
      this.bindFaceVoid(3, '-Y Abyss Gravitational Void');
    }

    // 5: Rear face (-Z) = ALWAYS Rear Processing Core
    this.bindFaceVoid(5, 'Rear Processing Core');
  }

  /**
   * Determines if a cube face is front-facing (visible) to the camera using back-face culling math.
   * On a 3D convex cube, at most 3 total faces can ever be visible at once (at most 2 non-front side faces).
   */
  public isFaceVisible(faceIndex: number): boolean {
    const localNormal = CubeRenderer.FACE_NORMALS[faceIndex];
    // Transform normal by cube's current world rotation, supporting 3D tumble animations
    this.tempFaceNormal.copy(localNormal).applyQuaternion(this.cubeMesh.quaternion);

    // World position of face center: cubeMesh.position + normal * (CUBE_SIZE * 0.5)
    this.tempFaceCenter.copy(this.cubeMesh.position)
      .addScaledVector(this.tempFaceNormal, this.CUBE_SIZE * 0.5);

    // Vector from face center to camera position
    this.tempViewDir.subVectors(this.camera.position, this.tempFaceCenter);

    // Positive dot product means face normal points toward the camera (front-facing)
    return this.tempFaceNormal.dot(this.tempViewDir) > 0.001;
  }

  /**
   * Helper to check if a room has dynamic elements that require continuous side updates.
   */
  public static hasDynamicEntities(room: ScreenData): boolean {
    return (
      (room.movingPlatforms !== undefined && room.movingPlatforms.length > 0) ||
      (room.laserBarriers !== undefined && room.laserBarriers.length > 0) ||
      (room.laserTurrets !== undefined && room.laserTurrets.length > 0) ||
      (room.portals !== undefined && room.portals.length > 0)
    );
  }

  /**
   * Throttled 20 FPS round-robin animation update for visible side faces only.
   * Culls back-facing faces and skips static rooms (which were already pre-rendered once).
   * Distributes texture uploads so at most 1 side texture is updated per tick.
   */
  public updateSideFaces(): void {
    if (!this.activeLevelMap) return;

    // Side and rear faces: 0 (+X), 1 (-X), 2 (+Y), 3 (-Y), 5 (-Z), and 4 (+Z) when rotating
    const sideIndices = this.isRotating ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 5];
    const candidateFaces: number[] = [];

    for (const idx of sideIndices) {
      // During rotation, transitionTargetFace is active front face updated directly with player
      if (this.isRotating && idx === this.transitionTargetFace) continue;

      const binding = this.faceBindings[idx];
      if (!binding) continue;

      // Visibility culling: Skip faces that are facing away from the camera
      if (!this.isFaceVisible(idx)) continue;

      if (binding.type === 'room' && binding.room) {
        // Only rooms with active dynamic entities (moving platforms, lasers) need continuous updates
        if (CubeRenderer.hasDynamicEntities(binding.room)) {
          candidateFaces.push(idx);
        }
      } else if (binding.type === 'void' && binding.voidLabel) {
        candidateFaces.push(idx);
      }
    }

    if (candidateFaces.length === 0) return;

    // Round-robin: update at most 1 side face per interval to eliminate multi-texture upload spikes
    this.sideFacesRoundRobinIdx = (this.sideFacesRoundRobinIdx + 1) % candidateFaces.length;
    const targetIdx = candidateFaces[this.sideFacesRoundRobinIdx];
    const binding = this.faceBindings[targetIdx];
    if (!binding) return;

    if (binding.type === 'room' && binding.room) {
      const destCtx = this.faceContexts[targetIdx];
      if (binding.rotationAngle) {
        destCtx.save();
        destCtx.translate(ROOM_SIZE * 0.5, ROOM_SIZE * 0.5);
        destCtx.rotate(binding.rotationAngle);
        destCtx.translate(-ROOM_SIZE * 0.5, -ROOM_SIZE * 0.5);
        this.faceRenderer.renderRoomToContext(
          destCtx,
          binding.room,
          this.activeLevelMap,
          undefined,
          undefined,
          this.time
        );
        destCtx.restore();
      } else {
        this.faceRenderer.renderRoomToContext(
          destCtx,
          binding.room,
          this.activeLevelMap,
          undefined,
          undefined,
          this.time
        );
      }
      this.faceTextures[targetIdx].needsUpdate = true;
    } else if (binding.type === 'void' && binding.voidLabel) {
      this.drawVoidFace(targetIdx, binding.voidLabel);
    }
  }

  /**
   * Start a 90-degree 3D rotation animation
   */
  public rotateTo(direction: RotationDirection, onComplete: () => void): void {
    if (this.isRotating) return;

    this.isRotating = true;
    this.rotProgress = 0;
    this.onRotationCompleteCallback = onComplete;

    this.rotStartQuat.copy(this.cubeMesh.quaternion);

    const deltaQuat = new THREE.Quaternion();
    const halfPi = Math.PI * 0.5;

    switch (direction) {
      case 'right':
        deltaQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -halfPi);
        break;
      case 'left':
        deltaQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), halfPi);
        break;
      case 'up':
        deltaQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), halfPi);
        break;
      case 'down':
        deltaQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -halfPi);
        break;
    }

    this.rotTargetQuat.copy(deltaQuat).multiply(this.rotStartQuat);
  }

  public setGameTime(time: number): void {
    this.time = time;
  }

  public update(dt: number): void {
    this.voidBg.update(dt);

    // Throttled Side-Face Animation:
    // Round-robin 20 FPS to conserve GPU bandwidth while keeping moving platforms and lasers alive
    if (this.is3DMode || this.isRotating || Math.abs(this.camera.position.x) > 0.02 || Math.abs(this.camera.position.y) > 0.02) {
      this.sideFacesAccumulator += dt;
      if (this.sideFacesAccumulator >= this.SIDE_FACES_INTERVAL) {
        this.sideFacesAccumulator %= this.SIDE_FACES_INTERVAL;
        this.updateSideFaces();
      }
    }

    // Smooth camera glide & 3D orbit
    this.updateCameraSwoop(dt);

    if (this.isRotating) {
      this.rotProgress += dt / this.rotDuration;
      if (this.rotProgress >= 1.0) {
        this.rotProgress = 1.0;
        this.cubeMesh.quaternion.copy(this.rotTargetQuat);
        this.isRotating = false;

        if (this.onRotationCompleteCallback) {
          const cb = this.onRotationCompleteCallback;
          this.onRotationCompleteCallback = null;
          cb();
        }
      } else {
        const t = this.easeInOutCubic(this.rotProgress);
        this.cubeMesh.quaternion.slerpQuaternions(this.rotStartQuat, this.rotTargetQuat, t);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Smooth continuous camera interpolation (lerp) between Flat Face and 3D Orbit mode.
   * In 3D Orbit mode: spherical coordinates allow full 360° rotation around all 6 cube faces.
   * In Flat Face mode: locks strictly to (0, 0, baseZ) looking at (0, 0, 0) for 100% crisp pixel rendering.
   */
  private updateCameraSwoop(dt: number): void {
    const aspect = this.camera.aspect;

    if (this.isIntroOrbiting) {
      this.introOrbitTime += dt;
      const angle = this.introOrbitTime * this.INTRO_ORBIT_SPEED;

      const radiusYaw = 0.36;
      const radiusPitch = 0.20;

      // Dynamic continuous 3D orbit circling around the front face (+Z normal)
      this.orbitYaw = Math.sin(angle) * radiusYaw + Math.sin(angle * 2.3) * 0.04;
      this.orbitPitch = Math.cos(angle) * radiusPitch + Math.cos(angle * 1.7) * 0.03;
      this.orbitDistance = 37.5 + Math.sin(angle * 2.0) * 1.8;

      this.lookTarget.set(
        -1.2 * Math.sin(angle),
        -0.6 * Math.cos(angle),
        0
      );
    }

    if (this.is3DMode) {
      // Scale distance for narrow viewport aspect ratios (< 1.2)
      const baseDist = aspect < 1.2 ? this.orbitDistance * (1.2 / aspect) : this.orbitDistance;
      const effectiveDist = baseDist + (this.isRotating ? 2.0 : 0);

      // Spherical coordinate math for full 360° orbital camera control
      const cosP = Math.cos(this.orbitPitch);
      const sinP = Math.sin(this.orbitPitch);
      const sinY = Math.sin(this.orbitYaw);
      const cosY = Math.cos(this.orbitYaw);

      const targetX = sinY * cosP * effectiveDist;
      const targetY = sinP * effectiveDist;
      const targetZ = cosY * cosP * effectiveDist;

      const targetLookX = this.lookTarget.x;
      const targetLookY = this.lookTarget.y;

      const lerpSpeed = Math.min(1.0, dt * 7.0);
      this.camera.position.x += (targetX - this.camera.position.x) * lerpSpeed;
      this.camera.position.y += (targetY - this.camera.position.y) * lerpSpeed;
      this.camera.position.z += (targetZ - this.camera.position.z) * lerpSpeed;

      this.currentLookAt.x += (targetLookX - this.currentLookAt.x) * lerpSpeed;
      this.currentLookAt.y += (targetLookY - this.currentLookAt.y) * lerpSpeed;
      this.currentLookAt.z += (0 - this.currentLookAt.z) * lerpSpeed;

      this.camera.lookAt(this.currentLookAt);
    } else {
      // Flat Face: direct orthogonal 2D alignment with smooth glide
      const targetZ = aspect < 1.2 ? 36 * (1.2 / aspect) : 36;
      const lerpSpeed = Math.min(1.0, dt * 5.0);

      // If already very close to 0,0, snap strictly to prevent fractional subpixel blur
      if (Math.abs(this.camera.position.x) < 0.02 && Math.abs(this.camera.position.y) < 0.02) {
        this.camera.position.set(0, 0, targetZ);
        this.currentLookAt.set(0, 0, 0);
      } else {
        this.camera.position.x += (0 - this.camera.position.x) * lerpSpeed;
        this.camera.position.y += (0 - this.camera.position.y) * lerpSpeed;
        this.camera.position.z += (targetZ - this.camera.position.z) * lerpSpeed;

        this.currentLookAt.x += (0 - this.currentLookAt.x) * lerpSpeed;
        this.currentLookAt.y += (0 - this.currentLookAt.y) * lerpSpeed;
        this.currentLookAt.z += (0 - this.currentLookAt.z) * lerpSpeed;
      }

      this.camera.lookAt(this.currentLookAt);
    }
  }

  /**
   * Instantly snaps cube rotation back to identity (0, 0, 0).
   * Called once textures are rebound to the new active room.
   */
  public resetRotationToZero(): void {
    this.cubeMesh.quaternion.set(0, 0, 0, 1);
    this.cubeMesh.rotation.set(0, 0, 0);
    this.transitionDirection = null;
    this.transitionTargetFace = 4;
  }

  private easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  public setCameraMode(is3D: boolean): void {
    if (!is3D && this.isIntroOrbiting) {
      this.stopIntroOrbit();
    }
    this.is3DMode = is3D;
  }

  public updateCameraLayout(immediate: boolean = false): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    if (immediate) {
      if (this.is3DMode) {
        const baseDist = aspect < 1.2 ? this.orbitDistance * (1.2 / aspect) : this.orbitDistance;
        const cosP = Math.cos(this.orbitPitch);
        const sinP = Math.sin(this.orbitPitch);
        const sinY = Math.sin(this.orbitYaw);
        const cosY = Math.cos(this.orbitYaw);

        this.camera.position.set(
          sinY * cosP * baseDist,
          sinP * baseDist,
          cosY * cosP * baseDist
        );
        this.currentLookAt.copy(this.lookTarget);
        this.camera.lookAt(this.currentLookAt);
      } else {
        const baseZ = aspect < 1.2 ? 36 * (1.2 / aspect) : 36;
        this.camera.position.set(0, 0, baseZ);
        this.currentLookAt.set(0, 0, 0);
        this.camera.lookAt(this.currentLookAt);
      }
    }
  }

  private onWindowResize = () => {
    this.updateCameraLayout(false);
  };

  public getRenderStats() {
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  public destroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
