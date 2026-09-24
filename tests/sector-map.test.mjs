import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { LevelMap } = require('./dist-world/world/LevelMap.js');
const { ProceduralLevelMap } = require('./dist-world/world/ProceduralLevelMap.js');
const { TileType, ROWS, COLS } = require('./dist-world/world/ScreenData.js');

test('2D Sector Map Verification', async (t) => {
  await t.test('LevelMap tracks discovered coordinates and rooms accurately', () => {
    const demoEntry = WorldRegistry.getWorld('demo');
    assert.ok(demoEntry, 'Demo world entry must exist');

    const levelMap = demoEntry.load();
    assert.equal(levelMap.getDiscoveredRoomsCount(), 0);
    assert.equal(levelMap.getDiscoveredRooms().length, 0);

    // Mark genesis (0, 0) as visited
    levelMap.markVisited(0, 0);
    assert.equal(levelMap.getDiscoveredRoomsCount(), 1);
    assert.equal(levelMap.isVisited(0, 0), true);
    assert.equal(levelMap.isVisited(1, 0), false);

    const visitedSet = levelMap.getVisitedCoordinates();
    assert.equal(visitedSet.has('0,0'), true);
    assert.equal(visitedSet.has('1,0'), false);

    const discoveredRooms = levelMap.getDiscoveredRooms();
    assert.equal(discoveredRooms.length, 1);
    assert.equal(discoveredRooms[0].coords.x, 0);
    assert.equal(discoveredRooms[0].coords.y, 0);
    assert.ok(discoveredRooms[0].themeColor, 'Room must have key themeColor');
  });

  await t.test('getAdjacentUnexploredCoords detects adjacent unexplored sectors on fixed worlds', () => {
    const demoEntry = WorldRegistry.getWorld('demo');
    const levelMap = demoEntry.load();

    // Genesis (0, 0) has an open exit to the right leading to (1, 0)
    levelMap.markVisited(0, 0);
    const unexplored = levelMap.getAdjacentUnexploredCoords();

    assert.equal(unexplored.length, 1, 'Genesis [0,0] should have exactly 1 adjacent unexplored sector [1,0]');
    assert.equal(unexplored[0].x, 1);
    assert.equal(unexplored[0].y, 0);
    assert.equal(unexplored[0].fromDirection, 'right');

    // After traversing into (1, 0)
    levelMap.markVisited(1, 0);
    const unexplored2 = levelMap.getAdjacentUnexploredCoords();
    // [0, 0] is visited, so only [2, 0] should be in unexplored
    assert.equal(unexplored2.length, 1);
    assert.equal(unexplored2[0].x, 2);
    assert.equal(unexplored2[0].y, 0);

    // Traverse into (2, 0) Quantum Junction, which has exits right (3, 0) and up (2, 1)
    levelMap.markVisited(2, 0);
    const unexplored3 = levelMap.getAdjacentUnexploredCoords();
    assert.equal(unexplored3.length, 2, 'Quantum Junction [2,0] opens up both [3,0] and [2,1] The Spire');
    const coordKeys = unexplored3.map((u) => `${u.x},${u.y}`).sort();
    assert.deepEqual(coordKeys, ['2,1', '3,0']);
  });

  await t.test('ProceduralLevelMap discovers and identifies crypted unexplored sectors dynamically', () => {
    const procMap = new ProceduralLevelMap('normal', 'CYBER-TEST-SEED');
    assert.equal(procMap.isVisited(0, 0), true, 'Genesis room is visited on creation');

    const genesis = procMap.getRoom(0, 0);
    assert.ok(genesis, 'Genesis room exists');

    const unexplored = procMap.getAdjacentUnexploredCoords();
    assert.ok(unexplored.length >= 1, 'Genesis room must have at least 1 open exit to unexplored sectors');

    // Every unexplored sector should not be visited yet
    for (const u of unexplored) {
      assert.equal(procMap.isVisited(u.x, u.y), false);
    }
  });

  await t.test('Bounding box & fit-to-screen scale calculation preserves all discovered sectors', () => {
    const demoEntry = WorldRegistry.getWorld('demo');
    const levelMap = demoEntry.load();

    // Mark all 10 demo rooms visited to simulate complete exploration
    const coords = [
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
      [2, 1], [2, 2], [4, -1]
    ];
    for (const [x, y] of coords) {
      levelMap.markVisited(x, y);
    }

    const discovered = levelMap.getDiscoveredRooms();
    assert.equal(discovered.length, 10);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const r of discovered) {
      if (r.coords.x < minX) minX = r.coords.x;
      if (r.coords.x > maxX) maxX = r.coords.x;
      if (r.coords.y < minY) minY = r.coords.y;
      if (r.coords.y > maxY) maxY = r.coords.y;
    }

    assert.equal(minX, 0);
    assert.equal(maxX, 6);
    assert.equal(minY, -1);
    assert.equal(maxY, 2);

    const SECTOR_SPACING = 200;
    const ROOM_SIZE = 136;
    const worldW = (maxX - minX) * SECTOR_SPACING + ROOM_SIZE;
    const worldH = (maxY - minY) * SECTOR_SPACING + ROOM_SIZE;

    // Viewport dimensions 1200x800 with 120px padding
    const availW = 1200 - 120;
    const availH = 800 - 120;

    const scale = Math.min(availW / worldW, availH / worldH);
    assert.ok(scale > 0 && scale <= 1.2, `Computed fit scale ${scale} should be reasonable`);
  });

  await t.test('All rooms have key themeColor and valid 20x20 tile matrices for thumbnail rendering', () => {
    const demoEntry = WorldRegistry.getWorld('demo');
    const levelMap = demoEntry.load();
    const rooms = levelMap.getAllRooms();

    for (const room of rooms) {
      assert.ok(room.themeColor, `Room ${room.id} must have a key themeColor`);
      assert.match(room.themeColor, /^#[0-9a-fA-F]{6}$/, `Room ${room.id} themeColor must be valid hex`);
      assert.equal(room.tiles.length, ROWS, `Room ${room.id} must have ${ROWS} rows`);
      for (let r = 0; r < ROWS; r++) {
        assert.equal(room.tiles[r].length, COLS, `Row ${r} in room ${room.id} must have ${COLS} cols`);
      }
    }
  });

  await t.test('Sector Map Key Symbols and Locked Gate Detection', () => {
    const demoEntry = WorldRegistry.getWorld('demo');
    const levelMap = demoEntry.load();

    const sectorZenith = levelMap.getRoom(2, 2);
    assert.ok(sectorZenith, 'Sector (2, 2) must exist');

    const sector5 = levelMap.getRoom(5, 0);
    assert.ok(sector5, 'Sector (5, 0) must exist');

    // 1. Sector (2, 2) initially has an uncollected key
    const uncollectedBefore = levelMap.getUncollectedKeysInRoom(sectorZenith);
    assert.equal(uncollectedBefore.length, 1);
    assert.equal(uncollectedBefore[0].id, 'key_warp_core');
    assert.equal(uncollectedBefore[0].label, 'Warp Core Key');
    assert.equal(uncollectedBefore[0].color, '#ff0077');

    // 2. Sector (5, 0) initially has a locked door requiring the Warp Core Key
    const lockedGatesBefore = levelMap.getLockedGatesInRoom(sector5);
    assert.equal(lockedGatesBefore.length, 1);
    assert.equal(lockedGatesBefore[0].dir, 'right');
    assert.equal(lockedGatesBefore[0].gate.id, 'key_warp_core');
    assert.equal(lockedGatesBefore[0].keyLabel, 'Warp Core Key');
    assert.equal(lockedGatesBefore[0].color, '#ff0077');

    // 3. Collect the key
    levelMap.collectItem('key_warp_core');

    // 4. Sector (2, 2) now has NO uncollected keys (key symbol goes away)
    const uncollectedAfter = levelMap.getUncollectedKeysInRoom(sectorZenith);
    assert.equal(uncollectedAfter.length, 0);

    // 5. Sector (5, 0) now has NO locked doors (locked door marker goes away)
    const lockedGatesAfter = levelMap.getLockedGatesInRoom(sector5);
    assert.equal(lockedGatesAfter.length, 0);
  });
});

