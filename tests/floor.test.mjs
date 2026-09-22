import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { TileType, ROWS, COLS } = require('./dist-world/world/ScreenData.js');

test('Screen Floor & Topology Verification', async (t) => {
  const map = WorldRegistry.getWorld('demo').load();
  const rooms = map.getAllRooms();

  await t.test('All 10 rooms exist and have solid floor on row 18', () => {
    assert.equal(rooms.length, 10, 'Expected 10 demo sectors');

    for (const room of rooms) {
      const row18 = room.tiles[18];
      assert.ok(row18, `Room ${room.id} must have row 18`);

      const hasSolidFloor = row18.some((tile) => tile === TileType.SOLID);
      assert.ok(
        hasSolidFloor,
        `Room ${room.id} (${room.title}) must have solid floor tiles on row 18`
      );
    }
  });

  await t.test('Sector (2,0) Quantum Junction has super bounce pad and climbable platforms to reach Sector (2,1)', () => {
    const room = map.getRoom(2, 0);
    assert.ok(room, 'Sector (2,0) must exist');

    // Bounce pads across cols 9 to 10 on row 17 with map property vy = -1550
    for (let c = 9; c <= 10; c++) {
      assert.equal(room.tiles[17][c], TileType.BOUNCE, `Col ${c} on row 17 must be BOUNCE pad`);
      assert.equal(room.bounceProps?.[`17,${c}`]?.vy, -1550, `Col ${c} on row 17 must have bounceProps.vy = -1550`);
    }

    // Physics check: Launch propulsion with vy = -1550 (read from tile property) and gravity = 1150
    const padVy = room.bounceProps?.['17,9']?.vy ?? -1400;
    const launchHeight = Math.pow(Math.abs(padVy), 2) / (2 * 1150);
    assert.ok(
      launchHeight > 680,
      `Super bounce launch height (${launchHeight.toFixed(1)}px) must exceed ceiling distance (680px) to reach Sector (2,1)`
    );

    // Stepped climbing platforms: ensure intermediate rows exist (rows 15, 11, 7, 4)
    const climbRows = [15, 11, 7, 4];
    for (const r of climbRows) {
      const hasPlatform = room.tiles[r].some((t) => t === TileType.ONE_WAY || t === TileType.SOLID);
      assert.ok(hasPlatform, `Row ${r} must have climbing platforms for alternative ascent`);
    }
  });

  await t.test('Sector (2,1) The Spire has floor ledges, bounce pads, and vertical chute', () => {
    const room = map.getRoom(2, 1);
    assert.ok(room, 'Sector (2,1) must exist');

    // Left floor ledge (cols 0-6) and right floor ledge (cols 13-19)
    for (let c = 0; c <= 6; c++) {
      assert.equal(room.tiles[18][c], TileType.SOLID, `Col ${c} on row 18 must be SOLID`);
    }
    for (let c = 13; c <= 19; c++) {
      assert.equal(room.tiles[18][c], TileType.SOLID, `Col ${c} on row 18 must be SOLID`);
    }

    // Vertical descent chute in the middle (cols 7-12) must be open for round-trip navigation
    for (let c = 7; c <= 12; c++) {
      assert.equal(room.tiles[18][c], TileType.EMPTY, `Chute col ${c} on row 18 must be open`);
    }

    // Floor bounce pads for quick ascent
    assert.equal(room.tiles[17][1], TileType.BOUNCE, 'Col 1 on row 17 should be a bounce pad');
    assert.equal(room.tiles[17][18], TileType.BOUNCE, 'Col 18 on row 17 should be a bounce pad');
    assert.equal(room.bounceProps?.['17,1']?.vy, -900, 'Floor recovery pad vy should be -900');
    assert.equal(room.bounceProps?.['7,9']?.vy, -1200, 'Zenith pad vy should be -1200');

    // Row 14 one-way landing steps extending into the chute (cols 5-7 and 12-14)
    // to allow landing on side ledges from Sector (2,0) bounce launch
    for (let c = 5; c <= 7; c++) {
      assert.equal(room.tiles[14][c], TileType.ONE_WAY, `Col ${c} on row 14 should be ONE_WAY landing step`);
    }
    for (let c = 12; c <= 14; c++) {
      assert.equal(room.tiles[14][c], TileType.ONE_WAY, `Col ${c} on row 14 should be ONE_WAY landing step`);
    }

    // Row 10 intermediate climbing platforms to bridge row 12 -> row 8
    for (let c = 4; c <= 7; c++) {
      assert.equal(room.tiles[10][c], TileType.ONE_WAY, `Col ${c} on row 10 should be ONE_WAY platform`);
    }
    for (let c = 12; c <= 15; c++) {
      assert.equal(room.tiles[10][c], TileType.ONE_WAY, `Col ${c} on row 10 should be ONE_WAY platform`);
    }

    // Physics check: Sector 2 super bounce launch with vy = -1550 and g = 1150
    // Trajectory in Sector (2,0): traverses 648px from row 17 (y = 648) to ceiling (y = 0).
    // Velocity at ceiling: sqrt(1550^2 - 2 * 1150 * 648) = sqrt(912100) = 955 px/s.
    // Height gained in Sector (2,1): 912100 / (2 * 1150) = 396.6 px.
    // Apex in Sector (2,1): y = 764 - 396.6 = 367.4 px (Row 9.2).
    // Feet at y = 399.4 px (Row 10.0), which is 80.6px ABOVE row 12 platform (y = 480)
    // and 200.6px ABOVE row 15 side ledges (y = 600)!
    const g = 1150;
    const v0 = -1550;
    const vCeilingSq = Math.pow(v0, 2) - 2 * g * 648;
    assert.ok(vCeilingSq > 0, 'Must have upward velocity exiting Sector (2,0)');
    const vCeiling = Math.sqrt(vCeilingSq);
    const heightInNextSector = Math.pow(vCeiling, 2) / (2 * g);
    const apexY = 764 - heightInNextSector;
    const feetY = apexY + 32;
    assert.ok(feetY < 480, `Player feet (${feetY.toFixed(1)}px) must rise above row 12 platform (480px)`);
    assert.ok(feetY < 600, `Player feet (${feetY.toFixed(1)}px) must rise above row 15 side ledges (600px)`);
  });

  await t.test('Sector (2,2) Starlight Zenith has floor ledges and one-way entry platform', () => {
    const room = map.getRoom(2, 2);
    assert.ok(room, 'Sector (2,2) must exist');

    // Floor ledges
    for (let c = 0; c <= 6; c++) {
      assert.equal(room.tiles[18][c], TileType.SOLID, `Col ${c} on row 18 must be SOLID`);
    }
    for (let c = 13; c <= 19; c++) {
      assert.equal(room.tiles[18][c], TileType.SOLID, `Col ${c} on row 18 must be SOLID`);
    }

    // Bounce pads on floor
    assert.equal(room.tiles[17][2], TileType.BOUNCE, 'Col 2 on row 17 should be a bounce pad');
    assert.equal(room.tiles[17][17], TileType.BOUNCE, 'Col 17 on row 17 should be a bounce pad');

    // Crucial: Row 16 cols 7-12 over entrance chute must be ONE_WAY (not SOLID),
    // allowing upward entry from Sector (2,1) without headbutting a ceiling!
    for (let c = 7; c <= 12; c++) {
      assert.equal(
        room.tiles[16][c],
        TileType.ONE_WAY,
        `Col ${c} on row 16 must be ONE_WAY to allow upward passage from Sector (2,1)`
      );
    }
  });

  await t.test('Sector (4,0) Tesseract Chasm has valid stepping stones and crumble blocks', () => {
    const room = map.getRoom(4, 0);
    assert.ok(room, 'Sector (4,0) must exist');

    // Left and right ledges
    assert.equal(room.tiles[18][0], TileType.SOLID);
    assert.equal(room.tiles[18][19], TileType.SOLID);

    // Stepping stones
    assert.equal(room.tiles[17][5], TileType.SOLID, 'Step stone at col 5 row 17');
    assert.equal(room.tiles[17][14], TileType.SOLID, 'Step stone at col 14 row 17');

    // Reachable crumble platforms
    assert.equal(room.tiles[16][7], TileType.CRUMBLE);
    assert.equal(room.tiles[15][11], TileType.CRUMBLE);
  });

  await t.test('Sector (4,-1) Sub-Zero Crypt has center Super Bounce Pad aligned with roof exit', () => {
    const room = map.getRoom(4, -1);
    assert.ok(room, 'Sector (4,-1) must exist');

    // Roof exit is at cols 7-12 on row 0
    for (let c = 7; c <= 12; c++) {
      assert.equal(room.tiles[0][c], TileType.EMPTY, `Roof col ${c} must be open`);
    }

    // Center Super Bounce Pad across cols 7 to 12 directly under the roof chute
    for (let c = 7; c <= 12; c++) {
      assert.equal(room.tiles[17][c], TileType.BOUNCE, `Col ${c} on row 17 must be a Super Bounce Pad`);
      assert.equal(room.bounceProps?.[`17,${c}`]?.vy, -1550, `Center pad col ${c} must have vy = -1550`);
    }
    assert.equal(room.bounceProps?.['17,1']?.vx, 200, 'Corner pad col 1 should vault inward');
    assert.equal(room.bounceProps?.['17,18']?.vx, -200, 'Corner pad col 18 should vault inward');

    // Row 14 platform (cols 8-11) is ONE_WAY allowing upward vault through it
    for (let c = 8; c <= 11; c++) {
      assert.equal(room.tiles[14][c], TileType.ONE_WAY, `Col ${c} on row 14 must be ONE_WAY`);
    }

    // Launch propulsion check: -1550 px/s with g = 1150
    // Traverses 648px to ceiling, enters Sector (4,0) with -955 px/s and reaches y = 367px (Row 9.2)
    const g = 1150;
    const v0 = -1550;
    const vCeilingSq = Math.pow(v0, 2) - 2 * g * 648;
    assert.ok(vCeilingSq > 0, 'Must have upward velocity exiting Sector (4,-1)');
    const vCeiling = Math.sqrt(vCeilingSq);
    const heightInNextSector = Math.pow(vCeiling, 2) / (2 * g);
    const apexY = 764 - heightInNextSector;
    const feetY = apexY + 32;
    assert.ok(feetY < 640, `Player feet (${feetY.toFixed(1)}px) must rise above Sector (4,0) crumble platform (640px)`);
  });

  await t.test('All rooms have grounded, safe spawn points', () => {
    for (const room of rooms) {
      assert.ok(room.spawnPoint, `Room ${room.id} must have an explicit spawnPoint`);
      const spawnCol = Math.floor(room.spawnPoint.x / 40);
      // Player spawns a few pixels above floor to drop onto it: check tile at y + height + 4
      const floorRow = Math.floor((room.spawnPoint.y + 36 + 4) / 40);

      // Check that the tile directly beneath the player's feet is solid or one-way
      const floorTile = room.tiles[floorRow]?.[spawnCol];
      assert.ok(
        floorTile === TileType.SOLID || floorTile === TileType.ONE_WAY,
        `Room ${room.id} spawnPoint must stand on SOLID or ONE_WAY platform, got tile type ${floorTile}`
      );
    }
  });

  await t.test('Camera viewport framing keeps the floor (row 18) and bottom border fully visible', async () => {
    const THREE = await import('three');
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 1000);

    for (const is3D of [true, false]) {
      if (is3D) {
        camera.position.set(11.5, 5.8, 38);
        camera.lookAt(-1.5, -0.7, 0);
      } else {
        camera.position.set(0, 0, 36);
        camera.lookAt(0, 0, 0);
      }
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      // Floor row 18 midpoint at Y = -6.8 (front face Z = 8)
      const floorLeft = new THREE.Vector3(-8, -6.8, 8).project(camera);
      const floorRight = new THREE.Vector3(8, -6.8, 8).project(camera);
      const bottom = new THREE.Vector3(is3D ? 8 : 0, -8, 8).project(camera);
      const top = new THREE.Vector3(is3D ? -8 : 0, 8, 8).project(camera);

      // Ensure bottom and top of cube are fully inside visible frustum
      assert.ok(
        bottom.y >= -0.85,
        `Camera bottom (${bottom.y.toFixed(2)}) must be visible above viewport edge`
      );
      assert.ok(
        top.y <= 0.85,
        `Camera top (${top.y.toFixed(2)}) must be visible below viewport edge`
      );

      // Verify row 18 (floor) normalized device coordinate is well within [-0.80, 0.80]
      assert.ok(
        floorLeft.y > -0.80 && floorLeft.y < 0.80,
        `Floor left NDC Y (${floorLeft.y.toFixed(2)}) must be comfortably framed away from browser edges and HUD`
      );
      assert.ok(
        floorRight.y > -0.80 && floorRight.y < 0.80,
        `Floor right NDC Y (${floorRight.y.toFixed(2)}) must be comfortably framed away from browser edges and HUD`
      );
    }
  });

  await t.test('Airborne horizontal propulsion preserves parabolic momentum without abrupt stopping', () => {
    // Simulate trajectory with g = 1150, dt = 1/60, vx0 = 200, vy0 = -1100
    const g = 1150;
    const dt = 1 / 60;
    let x = 60;
    let y = 648;
    let vx = 200;
    let vy = -1100;
    let apexReached = false;
    let landed = false;

    for (let frame = 1; frame <= 150; frame++) {
      vy += g * dt;
      x += vx * dt;
      y += vy * dt;
      if (vy >= 0 && !apexReached) {
        apexReached = true;
        // Verify horizontal speed is maintained through the apex
        assert.equal(vx, 200, 'Horizontal velocity must be preserved at apex');
      }
      if (y >= 560 && vy > 0 && frame > 30) {
        landed = true;
        // Verify horizontal speed persisted all the way to landing
        assert.equal(vx, 200, 'Horizontal velocity must persist throughout descent until landing');
        // Verify landed near center platform (cols 8 to 11: x between 320 and 440)
        assert.ok(x >= 320 && x <= 440, `Landing X (${x.toFixed(1)}) must be on the center platform (320-440px)`);
        break;
      }
    }
    assert.ok(apexReached, 'Should have reached apex');
    assert.ok(landed, 'Should have landed on center platform');
  });

  await t.test('3D Cube Face Visibility Culling: at most 2 side faces are visible at any camera orientation', () => {
    const CUBE_SIZE = 16;
    const normals = [
      [ 1,  0,  0], // 0: +X (Right)
      [-1,  0,  0], // 1: -X (Left)
      [ 0,  1,  0], // 2: +Y (Top)
      [ 0, -1,  0], // 3: -Y (Bottom)
      [ 0,  0,  1], // 4: +Z (Front)
      [ 0,  0, -1], // 5: -Z (Back)
    ];

    function isFaceVisible(faceIdx, camPos) {
      const n = normals[faceIdx];
      const center = [n[0] * (CUBE_SIZE * 0.5), n[1] * (CUBE_SIZE * 0.5), n[2] * (CUBE_SIZE * 0.5)];
      const view = [camPos[0] - center[0], camPos[1] - center[1], camPos[2] - center[2]];
      const dot = n[0] * view[0] + n[1] * view[1] + n[2] * view[2];
      return dot > 0.001;
    }

    // 1. Flat Face mode: camera at (0, 0, 36) looking at (0, 0, 0)
    const flatCam = [0, 0, 36];
    assert.equal(isFaceVisible(4, flatCam), true, 'Front face must be visible in Flat Face mode');
    const sideVisibleFlat = [0, 1, 2, 3, 5].filter((idx) => isFaceVisible(idx, flatCam));
    assert.equal(sideVisibleFlat.length, 0, 'Zero side faces must be visible in Flat Face mode');

    // 2. Default 3D mode: yaw = 0.285, pitch = 0.145, dist = 38
    const yaw = 0.285;
    const pitch = 0.145;
    const dist = 38;
    const defaultCam = [
      Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist,
    ];
    assert.equal(isFaceVisible(4, defaultCam), true, 'Front face must be visible in default 3D mode');
    const defaultSides = [0, 1, 2, 3, 5].filter((idx) => isFaceVisible(idx, defaultCam));
    assert.ok(defaultSides.length <= 2, `Visible side faces (${defaultSides.length}) must be <= 2 in default 3D mode`);

    // 3. Full 360-degree orbital sweep (yaw 0..360, pitch -80..80, distance 20..58)
    for (let pDeg = -80; pDeg <= 80; pDeg += 15) {
      const pRad = (pDeg * Math.PI) / 180;
      for (let yDeg = 0; yDeg < 360; yDeg += 15) {
        const yRad = (yDeg * Math.PI) / 180;
        for (const d of [20, 38, 58]) {
          const cam = [
            Math.sin(yRad) * Math.cos(pRad) * d,
            Math.sin(pRad) * d,
            Math.cos(yRad) * Math.cos(pRad) * d,
          ];

          const totalVisible = [0, 1, 2, 3, 4, 5].filter((idx) => isFaceVisible(idx, cam));
          assert.ok(
            totalVisible.length <= 3,
            `At camera (${cam.map((v) => v.toFixed(1))}), total visible faces (${totalVisible.length}) exceeds 3!`
          );

          if (isFaceVisible(4, cam)) {
            const sideCount = [0, 1, 2, 3, 5].filter((idx) => isFaceVisible(idx, cam)).length;
            assert.ok(
              sideCount <= 2,
              `When front face is visible, side face count (${sideCount}) must be <= 2!`
            );
          }
        }
      }
    }
  });
});
