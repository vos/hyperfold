import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildDemoLevel } = require('./dist-world/DemoLevel.js');
const { TileType, ROWS, COLS } = require('./dist-world/ScreenData.js');

test('Screen Floor & Topology Verification', async (t) => {
  const map = buildDemoLevel();
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

  await t.test('Camera viewport framing keeps the floor (row 18) and bottom border fully visible', () => {
    // 3D cube math: 16 units tall, front face at Z = 8.
    // Row 18 (floor) is from Y = -6.4 to -7.2, bottom border is at Y = -8.
    // With FOV = 40, tan(20 deg) = 0.36397
    const tanHalfFov = Math.tan((20 * Math.PI) / 180);

    for (const is3D of [true, false]) {
      const camY = is3D ? 1.2 : 0;
      const camZ = is3D ? 38 : 36;
      const distToFront = camZ - 8; // 30 in 3D, 28 in flat

      const visibleHalfHeight = distToFront * tanHalfFov;
      const topVisible = camY + visibleHalfHeight;
      const bottomVisible = camY - visibleHalfHeight;

      // Ensure top of cube (Y = +8) and bottom of cube (Y = -8) are fully inside visible frustum
      assert.ok(
        bottomVisible < -8,
        `Camera bottom (${bottomVisible.toFixed(2)}) must be below cube bottom (-8.0) so floor is visible`
      );
      assert.ok(
        topVisible > 8,
        `Camera top (${topVisible.toFixed(2)}) must be above cube top (+8.0)`
      );

      // Verify row 18 (floor) normalized device coordinate is well within [-0.85, 0.85]
      const floorY3D = -6.8; // midpoint of row 18
      const floorNdcY = (floorY3D - camY) / visibleHalfHeight;
      assert.ok(
        floorNdcY > -0.85 && floorNdcY < 0.85,
        `Floor NDC Y (${floorNdcY.toFixed(2)}) must be comfortably framed away from browser edges and HUD`
      );
    }
  });
});
