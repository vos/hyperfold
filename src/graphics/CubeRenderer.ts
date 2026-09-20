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
  public cubeEdges: THREE.LineSegments;
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

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // Initial camera layout with full cube framing
    this.updateCameraLayout();

    // Cosmic void background
    this.voidBg = new VoidBackground();
    this.scene.add(this.voidBg.group);

    // Ambient & Directional Lighting for 3D depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x00ffff, 1.2);
    keyLight.position.set(10, 15, 20);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff00aa, 1.0);
    rimLight.position.set(-15, -10, 10);
    this.scene.add(rimLight);

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
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.faceTextures.push(tex);

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.25,
        metalness: 0.1,
        emissive: new THREE.Color(0x050510),
        emissiveIntensity: 0.3,
      });
      this.faceMaterials.push(mat);
    }

    // Create 3D Cube Mesh
    const boxGeo = new THREE.BoxGeometry(this.CUBE_SIZE, this.CUBE_SIZE, this.CUBE_SIZE);

    // Adjust UVs for Top and Bottom faces so they align right-side up with Front face
    this.adjustBoxUVs(boxGeo);

    this.cubeMesh = new THREE.Mesh(boxGeo, this.faceMaterials);
    this.scene.add(this.cubeMesh);

    // Glowing Neon Edges outlining the 3D cube
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    this.cubeEdges = new THREE.LineSegments(edgeGeo, edgeMat);
    this.cubeMesh.add(this.cubeEdges);

    window.addEventListener('resize', this.onWindowResize);
  }

  /**
   * Adjust UV mapping of the BoxGeometry so that Top (+Y) and Bottom (-Y) faces
   * render with the same vertical orientation when tumbled forward/backward.
   */
  private adjustBoxUVs(geometry: THREE.BoxGeometry): void {
    const uvAttr = geometry.attributes.uv;
    if (!uvAttr) return;

    // In BoxGeometry, faces are 4 vertices each (6 faces * 4 = 24 vertices).
    // Indices:
    // +X (Right):  0..3
    // -X (Left):   4..7
    // +Y (Top):    8..11
    // -Y (Bottom): 12..15
    // +Z (Front):  16..19
    // -Z (Back):   20..23

    // For Top face (+Y), we ensure top is towards -Z and bottom towards +Z
    // For Bottom face (-Y), we ensure top is towards +Z and bottom towards -Z
    // This provides natural continuous seam when tumbling along X-axis!
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
   * Pre-binds the current room to Front (+Z = index 4) and neighbors to their respective faces
   */
  public bindCurrentAndNeighborRooms(currentRoom: ScreenData, levelMap: LevelMap): void {
    // 4: Front face = Current room
    this.updateFaceCanvas(4, currentRoom, levelMap);

    // 0: Right face (+X) = (X+1, Y)
    const rightRoom = levelMap.getRoom(currentRoom.coords.x + 1, currentRoom.coords.y);
    if (rightRoom) {
      this.updateFaceCanvas(0, rightRoom, levelMap);
    } else {
      this.drawVoidFace(0, 'Void Barrier');
    }

    // 1: Left face (-X) = (X-1, Y)
    const leftRoom = levelMap.getRoom(currentRoom.coords.x - 1, currentRoom.coords.y);
    if (leftRoom) {
      this.updateFaceCanvas(1, leftRoom, levelMap);
    } else {
      this.drawVoidFace(1, 'Void Barrier');
    }

    // 2: Top face (+Y) = (X, Y+1)
    const topRoom = levelMap.getRoom(currentRoom.coords.x, currentRoom.coords.y + 1);
    if (topRoom) {
      this.updateFaceCanvas(2, topRoom, levelMap);
    } else {
      this.drawVoidFace(2, 'Void Barrier');
    }

    // 3: Bottom face (-Y) = (X, Y-1)
    const bottomRoom = levelMap.getRoom(currentRoom.coords.x, currentRoom.coords.y - 1);
    if (bottomRoom) {
      this.updateFaceCanvas(3, bottomRoom, levelMap);
    } else {
      this.drawVoidFace(3, 'Void Barrier');
    }
  }

  private drawVoidFace(faceIndex: number, text: string): void {
    const ctx = this.faceContexts[faceIndex];
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE);
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.2)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, FACE_SIZE - 20, FACE_SIZE - 20);

    ctx.font = '24px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 0, 85, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(text, FACE_SIZE * 0.5, FACE_SIZE * 0.5);
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
        // Turn cube to show Right face (+X) at Front (+Z): rotate around Y by -90 deg
        deltaQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -halfPi);
        break;
      case 'left':
        // Turn cube to show Left face (-X) at Front (+Z): rotate around Y by +90 deg
        deltaQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), halfPi);
        break;
      case 'up':
        // Turn cube to show Top face (+Y) at Front (+Z): rotate around X by +90 deg
        deltaQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), halfPi);
        break;
      case 'down':
        // Turn cube to show Bottom face (-Y) at Front (+Z): rotate around X by -90 deg
        deltaQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -halfPi);
        break;
    }

    // Multiply target quaternion
    this.rotTargetQuat.copy(deltaQuat).multiply(this.rotStartQuat);
  }

  public update(dt: number): void {
    this.voidBg.update(dt);

    if (this.isRotating) {
      this.rotProgress += dt / this.rotDuration;
      if (this.rotProgress >= 1.0) {
        this.rotProgress = 1.0;
        this.cubeMesh.quaternion.copy(this.rotTargetQuat);
        this.isRotating = false;

        // Trigger callback to rebind textures and reset rotation to 0
        if (this.onRotationCompleteCallback) {
          const cb = this.onRotationCompleteCallback;
          this.onRotationCompleteCallback = null;
          cb();
        }
      } else {
        // Smooth ease-in-out cubic interpolation
        const t = this.easeInOutCubic(this.rotProgress);
        this.cubeMesh.quaternion.slerpQuaternions(this.rotStartQuat, this.rotTargetQuat, t);
      }
    } else {
      // Subtle idle breathing
      // Keeps cube steady for play
    }

    this.renderer.render(this.scene, this.camera);
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
    this.updateCameraLayout();
  }

  public updateCameraLayout(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    this.camera.aspect = aspect;

    // Frame the 16x16 cube with comfortable margins so all tiles,
    // including the bottom floor (row 18), top wall (row 0), and HUD overlays are fully visible.
    // In widescreen (aspect >= 1.2):
    // 3D Depth mode uses z=38, y=1.2 for slight top bevel view
    // Flat Face mode uses z=36, y=0 for direct 2D alignment
    // In narrower aspect ratios (aspect < 1.2), scale distance by (1.2 / aspect) so width doesn't clip
    const baseZ = this.is3DMode ? 38 : 36;
    const effectiveZ = aspect < 1.2 ? baseZ * (1.2 / aspect) : baseZ;
    const targetY = this.is3DMode ? 1.2 : 0;

    this.camera.position.set(0, targetY, effectiveZ);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onWindowResize = () => {
    this.updateCameraLayout();
  };

  public destroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
