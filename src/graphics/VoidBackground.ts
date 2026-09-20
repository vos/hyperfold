import * as THREE from 'three';

export class VoidBackground {
  public group: THREE.Group;
  private stars: THREE.Points;
  private floatingDodecahedrons: THREE.Mesh[] = [];
  private gridSegments: THREE.LineSegments;
  private time: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Deep Space Starfield (Multi-layered colors & depths)
    const starCount = 1800;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color('#00ffff'), // Cyan
      new THREE.Color('#ff00aa'), // Magenta
      new THREE.Color('#7b2cbf'), // Deep purple
      new THREE.Color('#39ff14'), // Neon green
      new THREE.Color('#ffe600'), // Electric yellow
      new THREE.Color('#ffffff'), // White
      new THREE.Color('#88ccff'), // Starlight blue
    ];

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      // Spread stars across a deep spherical dome behind and around the cube
      const r = 200 + Math.random() * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[idx + 2] = -40 - Math.random() * 200;

      const c = palette[Math.floor(Math.random() * palette.length)];
      starColors[idx] = c.r;
      starColors[idx + 1] = c.g;
      starColors[idx + 2] = c.b;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.group.add(this.stars);

    // 2. Cosmic Synthwave Horizon Perspective Grid (Iconic 3D cyber grid)
    const gridLines: number[] = [];
    const gridColors: number[] = [];
    const gridExtentX = 140;
    const gridStartZ = 30;
    const gridEndZ = -160;
    const gridY = -24;
    const stepX = 10;
    const stepZ = 10;

    const cyan = new THREE.Color('#00ffff');
    const magenta = new THREE.Color('#ff00aa');

    // Longitudinal lines (running along Z towards the distant horizon)
    for (let x = -gridExtentX; x <= gridExtentX; x += stepX) {
      gridLines.push(x, gridY, gridStartZ);
      gridLines.push(x, gridY, gridEndZ);

      const color = Math.abs(x) < 25 ? cyan : magenta;
      gridColors.push(color.r, color.g, color.b);
      gridColors.push(color.r * 0.2, color.g * 0.2, color.b * 0.2); // Fades into deep distance
    }

    // Latitudinal lines (running along X across the horizon plane)
    for (let z = gridStartZ; z >= gridEndZ; z -= stepZ) {
      gridLines.push(-gridExtentX, gridY, z);
      gridLines.push(gridExtentX, gridY, z);

      const depthRatio = (z - gridEndZ) / (gridStartZ - gridEndZ); // 1 near, 0 far
      const color = depthRatio > 0.5 ? cyan : magenta;
      const alpha = 0.2 + depthRatio * 0.6;
      gridColors.push(color.r * alpha, color.g * alpha, color.b * alpha);
      gridColors.push(color.r * alpha, color.g * alpha, color.b * alpha);
    }

    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridLines, 3));
    gridGeo.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 3));

    const gridMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    this.gridSegments = new THREE.LineSegments(gridGeo, gridMat);
    this.group.add(this.gridSegments);

    // 3. Distant Glowing Cybernetic Polyhedra tumbling in deep 3D space
    const polyGeoOcta = new THREE.OctahedronGeometry(5, 0);
    const polyGeoIcosa = new THREE.IcosahedronGeometry(4, 0);

    for (let i = 0; i < 10; i++) {
      const geo = i % 2 === 0 ? polyGeoOcta : polyGeoIcosa;
      const color = i % 2 === 0 ? 0x00ffff : 0xff00aa;
      const polyMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      });

      const mesh = new THREE.Mesh(geo, polyMat);
      mesh.position.set(
        (Math.random() - 0.5) * 220,
        (Math.random() - 0.5) * 160 + 10,
        -70 - Math.random() * 80
      );
      const scale = 0.8 + Math.random() * 1.6;
      mesh.scale.set(scale, scale, scale);
      this.floatingDodecahedrons.push(mesh);
      this.group.add(mesh);
    }
  }

  public update(dt: number): void {
    this.time += dt;

    // Ambient micro-drift for deep space elements
    for (let i = 0; i < this.floatingDodecahedrons.length; i++) {
      const mesh = this.floatingDodecahedrons[i];
      mesh.rotation.x += dt * 0.25 * (i % 2 === 0 ? 1 : -1);
      mesh.rotation.y += dt * 0.18;
    }

    // Subtle breathing pulse for the cosmic horizon grid
    const pulse = 0.4 + Math.sin(this.time * 1.8) * 0.08;
    (this.gridSegments.material as THREE.LineBasicMaterial).opacity = pulse;
  }
}
