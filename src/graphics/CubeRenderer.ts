import * as THREE from 'three';
import { FACE_SIZE, ScreenData } from '../world/ScreenData';
import { FaceRenderer } from './FaceRenderer';
import { LevelMap } from '../world/LevelMap';
import { Player } from '../entities/Player';
import { ParticleSystem } from '../engine/ParticleSystem';
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
  private faceMaterials: THREE.MeshStandardMaterial[] = [];

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

  // 30 FPS Side Faces Animation Clock
  private sideFacesAccumulator: number = 0;
  private readonly SIDE_FACES_INTERVAL: number = 1 / 30; // ~0.0333s (30 FPS)

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

  // Dynamic 3D Lighting
  private playerLight: THREE.PointLight;
  private cyanCornerLight: THREE.PointLight;
  private magentaCornerLight: THREE.PointLight;

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

  private time: number = 0;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // Initial camera layout with full cube framing
    this.updateCameraLayout(true);

    // Cosmic void background
    this.voidBg = new VoidBackground();
    this.scene.add(this.voidBg.group);

    // Clean, crisp lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00ffff, 0.8);
    keyLight.position.set(16, 20, 26);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff00aa, 0.8);
    rimLight.position.set(-18, -14, 18);
    this.scene.add(rimLight);

    // Subtle corner colored point lights to accentuate 3D cube edges
    this.cyanCornerLight = new THREE.PointLight(0x00ffff, 1.0, 45);
    this.cyanCornerLight.position.set(-10, 12, 14);
    this.scene.add(this.cyanCornerLight);

    this.magentaCornerLight = new THREE.PointLight(0xff00aa, 1.0, 45);
    this.magentaCornerLight.position.set(14, -12, 12);
    this.scene.add(this.magentaCornerLight);

    // Dynamic Player Point Light (for 3D mode)
    this.playerLight = new THREE.PointLight(0x00ffff, 1.4, 20, 1.2);
    this.playerLight.position.set(0, 0, 8.6);

    this.faceRenderer = new FaceRenderer();

    // Create textures for all 6 cube faces
    for (let i = 0; i < 6; i++) {
      const cvs = document.createElement('canvas');
      cvs.width = FACE_SIZE;
      cvs.height = FACE_SIZE;
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

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.8,
        metalness: 0.0,
        emissive: new THREE.Color(0x020408),
        emissiveIntensity: 0.15,
      });
      this.faceMaterials.push(mat);
    }

    // Initialize Back Face (Face 5: -Z) with high-tech cybernetic circuitry
    this.drawVoidFace(5, 'Rear Processing Core');

    // Create 3D Cube Mesh
    const boxGeo = new THREE.BoxGeometry(this.CUBE_SIZE, this.CUBE_SIZE, this.CUBE_SIZE);
    this.cubeMesh = new THREE.Mesh(boxGeo, this.faceMaterials);
    this.cubeMesh.add(this.playerLight);
    this.scene.add(this.cubeMesh);

    // Build Sleek Glowing Neon Edges (seamless cylinders & rounded corner joints)
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
    ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

    // 1. Cyber background grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= FACE_SIZE; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, FACE_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(FACE_SIZE, i);
      ctx.stroke();
    }

    // 2. Animated scanning laser beam
    const scanY = ((time * 110) % (FACE_SIZE + 100)) - 50;
    if (scanY >= 0 && scanY <= FACE_SIZE) {
      const grad = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 18);
      grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
      grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.12)');
      grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 18, FACE_SIZE, 36);
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
    ctx.strokeRect(16, 16, FACE_SIZE - 32, FACE_SIZE - 32);

    // 6. Central console display
    ctx.fillStyle = 'rgba(8, 14, 28, 0.9)';
    ctx.fillRect(100, 310, 600, 180);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 310, 600, 180);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#ff00aa';
    ctx.textAlign = 'center';
    ctx.fillText(`[${text.toUpperCase()}]`, FACE_SIZE * 0.5, 355);

    if (text === 'Rear Processing Core') {
      const freq = (8.4 + Math.sin(time * 1.8) * 0.15).toFixed(2);
      const flux = Math.floor(95 + Math.sin(time * 2.7) * 4);
      const cyc = Math.floor((time * 120) % 9999).toString().padStart(4, '0');
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#88c8ff';
      ctx.fillText('STATUS: QUANTUM HYPER-CORE ONLINE', FACE_SIZE * 0.5, 390);
      ctx.fillText('MANIFOLD PROCESSOR: 4D NON-EUCLIDEAN KERNEL', FACE_SIZE * 0.5, 415);
      ctx.fillText(`CORE FREQUENCY: ${freq} THz | FLUX: ${flux}% | CYC: #${cyc}`, FACE_SIZE * 0.5, 440);
      ctx.fillStyle = '#ffe600';
      ctx.fillText('ACTIVE MANIFOLD BUS: SYNCHRONIZED', FACE_SIZE * 0.5, 465);
    } else {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#88c8ff';
      ctx.fillText('STATUS: UNMAPPED DIMENSIONAL SECTOR', FACE_SIZE * 0.5, 395);
      ctx.fillText('MANIFOLD TOPOLOGY: NON-EUCLIDEAN 4D MATRIX', FACE_SIZE * 0.5, 420);
      ctx.fillText('WARP METRIC: ACTIVE TESSERACT', FACE_SIZE * 0.5, 445);
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

    // 2. Seamless Cylindrical Neon Edge Beams
    const xTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    xTubeGeo.rotateZ(Math.PI * 0.5); // align along X axis

    const yTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    const zTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    zTubeGeo.rotateX(Math.PI * 0.5); // align along Z axis

    // X-parallel edges
    const xEdges: [number, number, number, THREE.Material][] = [
      [0, H, H, cyanMat],      // Top-Front
      [0, H, -H, cyanMat],     // Top-Back
      [0, -H, H, magentaMat],  // Bottom-Front
      [0, -H, -H, magentaMat], // Bottom-Back
    ];
    for (const [x, y, z, mat] of xEdges) {
      const mesh = new THREE.Mesh(xTubeGeo, mat);
      mesh.position.set(x, y, z);
      chassis.add(mesh);
    }

    // Y-parallel edges
    const yEdges: [number, number, number, THREE.Material][] = [
      [-H, 0, H, cyanMat],      // Left-Front
      [-H, 0, -H, cyanMat],     // Left-Back
      [H, 0, H, magentaMat],    // Right-Front
      [H, 0, -H, magentaMat],   // Right-Back
    ];
    for (const [x, y, z, mat] of yEdges) {
      const mesh = new THREE.Mesh(yTubeGeo, mat);
      mesh.position.set(x, y, z);
      chassis.add(mesh);
    }

    // Z-parallel edges
    const zEdges: [number, number, number, THREE.Material][] = [
      [-H, H, 0, cyanMat],      // Top-Left
      [H, H, 0, cyanMat],       // Top-Right
      [-H, -H, 0, magentaMat],  // Bottom-Left
      [H, -H, 0, magentaMat],   // Bottom-Right
    ];
    for (const [x, y, z, mat] of zEdges) {
      const mesh = new THREE.Mesh(zTubeGeo, mat);
      mesh.position.set(x, y, z);
      chassis.add(mesh);
    }

    // 3. Smooth Spherical Corner Joints (radius perfectly matches tubes)
    const sphereGeo = new THREE.SphereGeometry(tubeRadius, 8, 8);
    for (const cx of [-H, H]) {
      for (const cy of [-H, H]) {
        for (const cz of [-H, H]) {
          const mat = cy > 0 ? cyanMat : magentaMat;
          const corner = new THREE.Mesh(sphereGeo, mat);
          corner.position.set(cx, cy, cz);
          chassis.add(corner);
        }
      }
    }

    return chassis;
  }

  public updatePlayerLight(pixelX: number, pixelY: number, colorHex: string): void {
    if (!this.is3DMode) {
      this.playerLight.intensity = 0;
      return;
    }
    this.playerLight.intensity = 1.4;
    // Map 2D pixel coordinates on 800x800 face to 3D cube coordinates [-8, 8]
    const x3D = ((pixelX + 12) / FACE_SIZE - 0.5) * this.CUBE_SIZE;
    const y3D = -((pixelY + 18) / FACE_SIZE - 0.5) * this.CUBE_SIZE; // Invert Y
    this.playerLight.position.set(x3D, y3D, this.CUBE_SIZE * 0.5 + 0.6);
    this.playerLight.color.set(colorHex);
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
      destCtx.translate(FACE_SIZE * 0.5, FACE_SIZE * 0.5);
      destCtx.rotate(rotationAngle);
      destCtx.translate(-FACE_SIZE * 0.5, -FACE_SIZE * 0.5);
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
      destCtx.translate(FACE_SIZE * 0.5, FACE_SIZE * 0.5);
      destCtx.rotate(binding.rotationAngle);
      destCtx.translate(-FACE_SIZE * 0.5, -FACE_SIZE * 0.5);
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
    _dt: number = 0.016
  ): void {
    this.faceBindings[faceIndex] = { type: 'room', room };
    this.activeLevelMap = levelMap;
    const destCtx = this.faceContexts[faceIndex];
    this.faceRenderer.renderRoomToContext(destCtx, room, levelMap, player, particles, this.time);
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
   * Real-time 30 FPS animation update for visible side faces only.
   * Culls back-facing faces: at most 2 side faces are visible at once to the user.
   */
  public updateSideFaces(): void {
    if (!this.activeLevelMap) return;

    // Side and rear faces: 0 (+X), 1 (-X), 2 (+Y), 3 (-Y), 5 (-Z), and 4 (+Z) when rotating
    const sideIndices = this.isRotating ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 5];
    for (const idx of sideIndices) {
      // During rotation, transitionTargetFace is active front face updated directly with player
      if (this.isRotating && idx === this.transitionTargetFace) continue;

      const binding = this.faceBindings[idx];
      if (!binding) continue;

      // Visibility culling: Skip faces that are facing away from the camera
      if (!this.isFaceVisible(idx)) continue;

      if (binding.type === 'room' && binding.room) {
        const destCtx = this.faceContexts[idx];
        if (binding.rotationAngle) {
          destCtx.save();
          destCtx.translate(FACE_SIZE * 0.5, FACE_SIZE * 0.5);
          destCtx.rotate(binding.rotationAngle);
          destCtx.translate(-FACE_SIZE * 0.5, -FACE_SIZE * 0.5);
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
        this.faceTextures[idx].needsUpdate = true;
      } else if (binding.type === 'void' && binding.voidLabel) {
        this.drawVoidFace(idx, binding.voidLabel);
      }
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

    // Update lighting based on mode
    if (this.is3DMode) {
      const pulse = Math.sin(this.time * 2.5);
      this.cyanCornerLight.intensity = 1.0 + pulse * 0.2;
      this.magentaCornerLight.intensity = 1.0 - pulse * 0.2;
    } else {
      this.cyanCornerLight.intensity = 0.2;
      this.magentaCornerLight.intensity = 0.2;
    }

    // Real-time 30 FPS Side-Face Animation:
    // Throttled at 30 FPS to conserve GPU bandwidth while keeping side rooms alive
    if (this.is3DMode || this.isRotating) {
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
      // Flat Face: direct orthogonal 2D alignment
      const targetZ = aspect < 1.2 ? 36 * (1.2 / aspect) : 36;
      const lerpSpeed = Math.min(1.0, dt * 6.0);

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
