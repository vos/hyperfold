import * as THREE from 'three';
import { FACE_SIZE, ScreenData } from '../world/ScreenData';
import { FaceRenderer } from './FaceRenderer';
import { LevelMap } from '../world/LevelMap';
import { Player } from '../entities/Player';
import { ParticleSystem } from '../engine/ParticleSystem';
import { VoidBackground } from './VoidBackground';

export type RotationDirection = 'right' | 'left' | 'up' | 'down';

export class CubeRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cubeMesh: THREE.Mesh;
  public cubeEdges: THREE.Group;
  public voidBg: VoidBackground;

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

  // Dedicated offscreen renderer for room drawing
  private offscreenFaceRenderer: FaceRenderer;

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

  // Dynamic 3D Lighting & Parallax
  private playerLight: THREE.PointLight;
  private cyanCornerLight: THREE.PointLight;
  private magentaCornerLight: THREE.PointLight;
  private mouseNormX: number = 0;
  private mouseNormY: number = 0;
  private currentLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
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

    this.offscreenFaceRenderer = new FaceRenderer();

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
      // Disable mipmaps to ensure 100% crisp pixel clarity in 2D and 3D
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.faceTextures.push(tex);

      // Non-metallic, pure diffuse material to keep 2D canvas colors vivid and crisp
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.8,
        metalness: 0.0,
        emissive: new THREE.Color(0x020408),
        emissiveIntensity: 0.15,
      });
      this.faceMaterials.push(mat);
    }

    // Initialize the Back Face (Face 5: -Z) with high-tech cybernetic circuitry
    this.drawVoidFace(5, 'Rear Processing Core');

    // Create 3D Cube Mesh
    const boxGeo = new THREE.BoxGeometry(this.CUBE_SIZE, this.CUBE_SIZE, this.CUBE_SIZE);
    this.cubeMesh = new THREE.Mesh(boxGeo, this.faceMaterials);
    this.cubeMesh.add(this.playerLight);
    this.scene.add(this.cubeMesh);

    // Build Sleek Glowing Neon Edges (seamless cylinders & rounded corner joints, NO blocky chunks)
    this.cubeEdges = this.buildSleekChassis(boxGeo);
    this.cubeMesh.add(this.cubeEdges);

    window.addEventListener('resize', this.onWindowResize);
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
    // already aligned along Y axis

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

  public setMousePosition(normX: number, normY: number): void {
    this.mouseNormX = normX;
    this.mouseNormY = normY;
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

  public updateFaceCanvas(
    faceIndex: number,
    room: ScreenData,
    levelMap: LevelMap,
    player?: Player,
    particles?: ParticleSystem,
    dt: number = 0.016
  ): void {
    const renderedCanvas = this.offscreenFaceRenderer.renderRoom(room, levelMap, player, particles, dt);
    const destCtx = this.faceContexts[faceIndex];
    destCtx.clearRect(0, 0, FACE_SIZE, FACE_SIZE);
    destCtx.drawImage(renderedCanvas, 0, 0);
    this.faceTextures[faceIndex].needsUpdate = true;
  }

  /**
   * Pre-binds current room to Front (+Z = index 4) and neighbors to their respective faces
   */
  public bindCurrentAndNeighborRooms(currentRoom: ScreenData, levelMap: LevelMap): void {
    // 4: Front face = Current room
    this.updateFaceCanvas(4, currentRoom, levelMap);

    // 0: Right face (+X) = (X+1, Y)
    const rightRoom = levelMap.getRoom(currentRoom.coords.x + 1, currentRoom.coords.y);
    if (rightRoom) {
      this.updateFaceCanvas(0, rightRoom, levelMap);
    } else {
      this.drawVoidFace(0, '+X Sector Void Barrier');
    }

    // 1: Left face (-X) = (X-1, Y)
    const leftRoom = levelMap.getRoom(currentRoom.coords.x - 1, currentRoom.coords.y);
    if (leftRoom) {
      this.updateFaceCanvas(1, leftRoom, levelMap);
    } else {
      this.drawVoidFace(1, '-X Sector Void Barrier');
    }

    // 2: Top face (+Y) = (X, Y+1)
    const topRoom = levelMap.getRoom(currentRoom.coords.x, currentRoom.coords.y + 1);
    if (topRoom) {
      this.updateFaceCanvas(2, topRoom, levelMap);
    } else {
      this.drawVoidFace(2, '+Y Zenith Void Boundary');
    }

    // 3: Bottom face (-Y) = (X, Y-1)
    const bottomRoom = levelMap.getRoom(currentRoom.coords.x, currentRoom.coords.y - 1);
    if (bottomRoom) {
      this.updateFaceCanvas(3, bottomRoom, levelMap);
    } else {
      this.drawVoidFace(3, '-Y Abyss Gravitational Void');
    }
  }

  /**
   * Renders a cybernetic synthwave diagnostic terminal when an adjacent sector is empty.
   */
  private drawVoidFace(faceIndex: number, text: string): void {
    const ctx = this.faceContexts[faceIndex];
    const isHorizontal = faceIndex === 0 || faceIndex === 1;

    // Deep cybernetic background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);

    // Synthwave perspective grid pattern
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

    // Neon circuit traces with logic node dots
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.35)';
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

    // Circuit logic node dots
    ctx.fillStyle = '#00ffff';
    for (const [nx, ny] of [[180, 200], [240, 280], [600, 280], [680, 200], [200, 600], [260, 520], [540, 520], [600, 600]]) {
      ctx.beginPath();
      ctx.arc(nx, ny, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer neon accent border
    ctx.strokeStyle = isHorizontal ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 0, 170, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, FACE_SIZE - 32, FACE_SIZE - 32);

    // Central Diagnostic Readout Panel
    ctx.fillStyle = 'rgba(8, 14, 28, 0.88)';
    ctx.fillRect(100, 320, 600, 160);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 320, 600, 160);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#ff00aa';
    ctx.textAlign = 'center';
    ctx.fillText(`[${text.toUpperCase()}]`, FACE_SIZE * 0.5, 365);

    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#88c8ff';
    ctx.fillText('STATUS: UNMAPPED DIMENSIONAL SECTOR', FACE_SIZE * 0.5, 400);
    ctx.fillText('MANIFOLD TOPOLOGY: NON-EUCLIDEAN 4D MATRIX', FACE_SIZE * 0.5, 425);
    ctx.fillText('WARP METRIC: ACTIVE TESSERACT', FACE_SIZE * 0.5, 450);

    // Oscilloscope / telemetry wave graphic
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 120; x <= 680; x += 10) {
      const waveY = 500 + Math.sin(x * 0.05) * 12 + Math.cos(x * 0.02) * 8;
      if (x === 120) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();

    ctx.textAlign = 'left';
    this.faceTextures[faceIndex].needsUpdate = true;
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

  public update(dt: number): void {
    this.time += dt;
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

    // Smooth camera glide & 3D parallax
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
   * Smooth continuous camera interpolation (lerp) between Flat Face and 3D Depth mode.
   * In 3D Depth mode: angled perspective reveals Front, Top, and Right faces with mouse parallax.
   * In Flat Face mode: locks strictly to (0, 0, baseZ) looking at (0, 0, 0) for 100% crisp pixel rendering.
   */
  private updateCameraSwoop(dt: number): void {
    const aspect = this.camera.aspect;

    if (this.is3DMode) {
      // Striking 3D angled perspective:
      // baseX = 11.5 positions the camera clearly to the right of the cube (H = 8.0)
      // baseY = 5.8 positions the camera above the cube (H = 8.0)
      // This ensures both Top and Right faces are distinctly visible with real perspective depth!
      const baseZ = aspect < 1.2 ? 38 * (1.2 / aspect) : 38;
      const baseX = 11.5;
      const baseY = 5.8;

      // Parallax offset from mouse cursor
      const parallaxX = this.mouseNormX * 2.0;
      const parallaxY = -this.mouseNormY * 1.5;

      // Dynamic recoil during tumble rotation
      const tumbleRecoilZ = this.isRotating ? 2.0 : 0;

      const targetX = baseX + parallaxX;
      const targetY = baseY + parallaxY;
      const targetZ = baseZ + tumbleRecoilZ;

      // Target lookAt keeps front face prominently framed and centered
      const targetLookX = -1.5 + this.mouseNormX * 0.3;
      const targetLookY = -0.7 - this.mouseNormY * 0.2;

      const lerpSpeed = Math.min(1.0, dt * 5.0);
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
        const baseZ = aspect < 1.2 ? 38 * (1.2 / aspect) : 38;
        this.camera.position.set(11.5, 5.8, baseZ);
        this.currentLookAt.set(-1.5, -0.7, 0);
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

  public destroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
