import * as THREE from 'three';

export class VoidBackground {
  public group: THREE.Group;
  private stars: THREE.Points;
  private floatingDodecahedrons: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();

    // 1. Deep Space Starfield (Stationary)
    const starCount = 1200;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color('#00ffff'),
      new THREE.Color('#ff00aa'),
      new THREE.Color('#39ff14'),
      new THREE.Color('#ffe600'),
      new THREE.Color('#ffffff'),
    ];

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      // Spread stars in a sphere shell far behind the cube
      const r = 250 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[idx + 2] = -50 - Math.random() * 150;

      const c = palette[Math.floor(Math.random() * palette.length)];
      starColors[idx] = c.r;
      starColors[idx + 1] = c.g;
      starColors[idx + 2] = c.b;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.group.add(this.stars);

    // 2. Distant wireframe polyhedra slowly tumbling in the cosmic void
    const polyGeo = new THREE.OctahedronGeometry(6, 0);
    const polyMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });

    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(polyGeo, polyMat);
      mesh.position.set(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 150,
        -80 - Math.random() * 60
      );
      const scale = 0.8 + Math.random() * 1.5;
      mesh.scale.set(scale, scale, scale);
      this.floatingDodecahedrons.push(mesh);
      this.group.add(mesh);
    }
  }

  public update(dt: number): void {
    // Ambient micro-drift for deep space elements
    for (let i = 0; i < this.floatingDodecahedrons.length; i++) {
      const mesh = this.floatingDodecahedrons[i];
      mesh.rotation.x += dt * 0.2 * ((i % 2 === 0) ? 1 : -1);
      mesh.rotation.y += dt * 0.15;
    }
  }
}
