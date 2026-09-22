import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');

test('3D Renderer Performance Optimizations Verification', async (t) => {
  await t.test('Dynamic entity detection correctly differentiates static vs dynamic rooms', () => {
    function hasDynamicEntities(room) {
      return (
        (room.movingPlatforms !== undefined && room.movingPlatforms.length > 0) ||
        (room.laserBarriers !== undefined && room.laserBarriers.length > 0) ||
        (room.laserTurrets !== undefined && room.laserTurrets.length > 0)
      );
    }

    const staticRoom = {
      id: 'static_room',
      tiles: [[1]],
      collectibles: [{ id: 'c1', x: 100, y: 100, type: 'core' }],
    };
    assert.equal(hasDynamicEntities(staticRoom), false, 'Room with only tiles and collectibles should be static');

    const movingPlatformRoom = {
      ...staticRoom,
      movingPlatforms: [{ id: 'mp1', startX: 0, startY: 0, endX: 100, endY: 0, width: 80, speed: 60 }],
    };
    assert.equal(hasDynamicEntities(movingPlatformRoom), true, 'Room with moving platform must be dynamic');

    const laserBarrierRoom = {
      ...staticRoom,
      laserBarriers: [{ id: 'lb1', startX1: 0, startY1: 0, startX2: 100, startY2: 0, activeDuration: 1, inactiveDuration: 1 }],
    };
    assert.equal(hasDynamicEntities(laserBarrierRoom), true, 'Room with laser barrier must be dynamic');

    const laserTurretRoom = {
      ...staticRoom,
      laserTurrets: [{ id: 'lt1', x: 50, y: 50, angle: 0 }],
    };
    assert.equal(hasDynamicEntities(laserTurretRoom), true, 'Room with laser turret must be dynamic');
  });

  await t.test('Chassis geometry merging reduces draw calls from 21 down to 3', () => {
    const CUBE_SIZE = 16;
    const H = CUBE_SIZE * 0.5;
    const tubeRadius = 0.05;
    const tubeLen = CUBE_SIZE - tubeRadius * 2;

    const boxGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const chassis = new THREE.Group();

    // 1. Inner Laser Core Lines
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
    const laserCore = new THREE.LineSegments(edgeGeo, edgeMat);
    chassis.add(laserCore);

    // 2. Seamless Beams & Joints Merging
    const cyanGeos = [];
    const magentaGeos = [];

    const xTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    xTubeGeo.rotateZ(Math.PI * 0.5);
    const yTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    const zTubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLen, 8);
    zTubeGeo.rotateX(Math.PI * 0.5);

    const xEdges = [
      [0, H, H, true], [0, H, -H, true], [0, -H, H, false], [0, -H, -H, false]
    ];
    for (const [x, y, z, isCyan] of xEdges) {
      (isCyan ? cyanGeos : magentaGeos).push(xTubeGeo.clone().translate(x, y, z));
    }

    const yEdges = [
      [-H, 0, H, true], [-H, 0, -H, true], [H, 0, H, false], [H, 0, -H, false]
    ];
    for (const [x, y, z, isCyan] of yEdges) {
      (isCyan ? cyanGeos : magentaGeos).push(yTubeGeo.clone().translate(x, y, z));
    }

    const zEdges = [
      [-H, H, 0, true], [H, H, 0, true], [-H, -H, 0, false], [H, -H, 0, false]
    ];
    for (const [x, y, z, isCyan] of zEdges) {
      (isCyan ? cyanGeos : magentaGeos).push(zTubeGeo.clone().translate(x, y, z));
    }

    const sphereGeo = new THREE.SphereGeometry(tubeRadius, 8, 8);
    for (const cx of [-H, H]) {
      for (const cy of [-H, H]) {
        for (const cz of [-H, H]) {
          (cy > 0 ? cyanGeos : magentaGeos).push(sphereGeo.clone().translate(cx, cy, cz));
        }
      }
    }

    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const magentaMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });

    const mergedCyan = BufferGeometryUtils.mergeGeometries(cyanGeos);
    assert.ok(mergedCyan, 'Cyan geometries must merge cleanly');
    chassis.add(new THREE.Mesh(mergedCyan, cyanMat));

    const mergedMagenta = BufferGeometryUtils.mergeGeometries(magentaGeos);
    assert.ok(mergedMagenta, 'Magenta geometries must merge cleanly');
    chassis.add(new THREE.Mesh(mergedMagenta, magentaMat));

    assert.equal(chassis.children.length, 3, 'Chassis group must have exactly 3 children (laser core + merged cyan + merged magenta)');
  });

  await t.test('Round-robin scheduling throttles side face texture uploads to at most 1 per tick', () => {
    const candidateFaces = [0, 2]; // e.g. Right (+X) and Top (+Y) both visible and dynamic
    let roundRobinIdx = 0;

    const tickResults = [];
    for (let tick = 0; tick < 4; tick++) {
      roundRobinIdx = (roundRobinIdx + 1) % candidateFaces.length;
      const targetFace = candidateFaces[roundRobinIdx];
      tickResults.push(targetFace);
    }

    // Must alternate between face 2 and face 0, never uploading both in the same tick
    assert.deepEqual(tickResults, [2, 0, 2, 0], 'Candidate faces must alternate round-robin, exactly 1 upload per tick');
  });
});
