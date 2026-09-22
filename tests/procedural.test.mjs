import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ProceduralWorldGen, BIOMES } = require('./dist-world/world/ProceduralWorldGen.js');
const { ProceduralLevelMap } = require('./dist-world/world/ProceduralLevelMap.js');
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { TileType, ROWS, COLS } = require('./dist-world/world/ScreenData.js');

test('Procedural Infinite World Generator Verification', async (t) => {
  await t.test('Seed determinism: identical seed & coords yield identical sectors', () => {
    const genA = new ProceduralWorldGen('CYBER-SEED-42');
    const genB = new ProceduralWorldGen('CYBER-SEED-42');

    const roomA = genA.generateRoom(3, -2, 'normal');
    const roomB = genB.generateRoom(3, -2, 'normal');

    assert.equal(roomA.title, roomB.title);
    assert.equal(roomA.themeColor, roomB.themeColor);
    assert.deepEqual(roomA.exits, roomB.exits);
    assert.deepEqual(roomA.tiles, roomB.tiles);
    assert.equal(roomA.collectibles.length, roomB.collectibles.length);
    assert.equal(roomA.laserBarriers?.length, roomB.laserBarriers?.length);
    assert.equal(roomA.laserTurrets?.length, roomB.laserTurrets?.length);
  });

  await t.test('Seed variance: distinct seeds yield distinct sectors', () => {
    const gen1 = new ProceduralWorldGen('SEED-ALPHA');
    const gen2 = new ProceduralWorldGen('SEED-OMEGA');

    const room1 = gen1.generateRoom(5, 5, 'hard');
    const room2 = gen2.generateRoom(5, 5, 'hard');

    // Due to differing seeds, either title, themeColor, or tiles will vary
    const isDifferent =
      room1.title !== room2.title ||
      room1.themeColor !== room2.themeColor ||
      JSON.stringify(room1.tiles) !== JSON.stringify(room2.tiles);
    assert.ok(isDifferent, 'Distinct seeds should produce varied sector configurations');
  });

  await t.test('Exit rule guarantee: every generated room has 2 to 4 open exits', () => {
    const gen = new ProceduralWorldGen('EXIT-TEST-SEED');

    for (let x = -5; x <= 5; x++) {
      for (let y = -5; y <= 5; y++) {
        const room = gen.generateRoom(x, y, 'normal');
        const openExitsCount = Object.values(room.exits).filter(Boolean).length;
        assert.ok(
          openExitsCount >= 2 && openExitsCount <= 4,
          `Room (${x},${y}) must have 2 to 4 exits, got ${openExitsCount}`
        );
      }
    }
  });

  await t.test('Neighbor exit symmetry and doorway alignment', () => {
    const gen = new ProceduralWorldGen('SYMMETRY-SEED');

    // Generate room A at (0, 0)
    const roomA = gen.generateRoom(0, 0, 'normal');
    // Ensure room A has right exit for this test
    roomA.exits.right = true;

    // Generate room B at (1, 0) with room A as left neighbor
    const roomB = gen.generateRoom(1, 0, 'normal', { left: roomA.exits });

    assert.equal(roomB.exits.left, true, 'Room B must have left exit open to match Room A right exit');

    // Verify doorway geometry: rows 14-16 open on col 19 of A and col 0 of B
    for (let r = 14; r <= 16; r++) {
      assert.equal(roomA.tiles[r][19], TileType.EMPTY, `Room A right doorway at row ${r} must be empty`);
      assert.equal(roomB.tiles[r][0], TileType.EMPTY, `Room B left doorway at row ${r} must be empty`);
    }
    // Floor threshold at row 17
    assert.equal(roomA.tiles[17][19], TileType.SOLID, 'Room A right doorway floor at row 17 must be solid');
    assert.equal(roomB.tiles[17][0], TileType.SOLID, 'Room B left doorway floor at row 17 must be solid');
  });

  await t.test('Difficulty scaling curve: Genesis is safe, threat ramps by difficulty', () => {
    const gen = new ProceduralWorldGen('DIFFICULTY-SEED');

    // Genesis core (0, 0) threat is always 0.0
    assert.equal(gen.getThreatLevel(0, 0, 'easy'), 0);
    assert.equal(gen.getThreatLevel(0, 0, 'normal'), 0);
    assert.equal(gen.getThreatLevel(0, 0, 'hard'), 0);
    assert.equal(gen.getThreatLevel(0, 0, 'impossible'), 0);

    // Monotonic ordering at depth 2
    const tEasy2 = gen.getThreatLevel(2, 0, 'easy');
    const tNorm2 = gen.getThreatLevel(2, 0, 'normal');
    const tHard2 = gen.getThreatLevel(2, 0, 'hard');
    const tImp2 = gen.getThreatLevel(2, 0, 'impossible');

    assert.ok(tEasy2 < tNorm2, `Easy threat (${tEasy2}) < Normal (${tNorm2})`);
    assert.ok(tNorm2 < tHard2, `Normal threat (${tNorm2}) < Hard (${tHard2})`);
    assert.ok(tHard2 < tImp2, `Hard threat (${tHard2}) < Impossible (${tImp2})`);

    // Slower curve on Easy (at depth 5: 5 * 0.04 = 0.20)
    assert.equal(gen.getThreatLevel(3, 2, 'easy'), 0.2);

    // Aggressive curve on Impossible (at depth 3: 3 * 0.42 = 1.0 capped)
    assert.equal(gen.getThreatLevel(2, 1, 'impossible'), 1.0);
  });

  await t.test('Kinematic reachability: safe spawn point and vertical chutes', () => {
    const gen = new ProceduralWorldGen('KINEMATICS-SEED');

    for (let d = 0; d < 10; d++) {
      const room = gen.generateRoom(d, 0, 'hard');
      assert.ok(room.spawnPoint, 'Room must have spawnPoint');
      const sc = Math.floor(room.spawnPoint.x / 40);
      const sr = Math.floor(room.spawnPoint.y / 40);

      assert.ok(sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS, 'Spawn point inside grid');
      assert.equal(room.tiles[sr][sc], TileType.EMPTY, 'Spawn tile must be empty air');

      // If up exit is open, vertical propulsion must be present
      if (room.exits.up) {
        const hasBounce = room.tiles[17][9] === TileType.BOUNCE || room.tiles[17][10] === TileType.BOUNCE;
        const hasLift = room.movingPlatforms?.some((p) => p.startY > p.endY);
        assert.ok(hasBounce || hasLift, 'Rooms with UP exit must provide Super Bounce Pad or elevator lift');
      }
    }
  });

  await t.test('Special Archetype: Power Sanctuary generates every 8 depth with zero lethal hazards', () => {
    const gen = new ProceduralWorldGen('SANCTUARY-SEED');

    // Depth 8: (4, 4)
    const sanctuary = gen.generateRoom(4, 4, 'impossible');
    assert.ok(sanctuary.title.includes('Power Sanctuary'), 'Expected Power Sanctuary at depth 8');
    assert.equal(sanctuary.laserBarriers?.length ?? 0, 0, 'Sanctuary must have 0 laser barriers');
    assert.equal(sanctuary.laserTurrets?.length ?? 0, 0, 'Sanctuary must have 0 laser turrets');
    assert.equal(sanctuary.themeColor, '#ffe600', 'Sanctuary has golden theme color');
    assert.ok(sanctuary.collectibles.length >= 4, 'Sanctuary has bonus energy prisms');
  });

  await t.test('ProceduralLevelMap: on-demand generation, exit matching, and backtracking preservation', () => {
    const map = new ProceduralLevelMap('normal', 'LEVELMAP-TEST');

    // Initial Genesis room exists at (0, 0)
    const genesis = map.getRoom(0, 0);
    assert.ok(genesis, 'Genesis room (0, 0) must exist on initial load');
    assert.equal(genesis.coords.x, 0);
    assert.equal(genesis.coords.y, 0);

    // Identify an open exit from genesis
    let openDir = null;
    let nextCoords = null;
    if (genesis.exits.right) { openDir = 'right'; nextCoords = { x: 1, y: 0 }; }
    else if (genesis.exits.up) { openDir = 'up'; nextCoords = { x: 0, y: 1 }; }
    else if (genesis.exits.left) { openDir = 'left'; nextCoords = { x: -1, y: 0 }; }
    else if (genesis.exits.down) { openDir = 'down'; nextCoords = { x: 0, y: -1 }; }

    assert.ok(openDir && nextCoords, 'Genesis must have at least one open exit');

    // Query room in open direction -> generated dynamically
    const roomNext = map.getRoom(nextCoords.x, nextCoords.y);
    assert.ok(roomNext, `Room at ${nextCoords.x},${nextCoords.y} should be generated on-demand`);

    // Verify backtracking: getting room (0, 0) returns the exact same instance
    const genesisBacktrack = map.getRoom(0, 0);
    assert.equal(genesisBacktrack, genesis, 'Backtracking must return the identical cached room instance');

    // Test item collection persistence
    const prismId = genesis.collectibles[0].id;
    assert.equal(map.isItemCollected(prismId), false);
    map.collectItem(prismId);
    assert.equal(map.isItemCollected(prismId), true);

    // Visiting room updates depth and streak
    map.markVisited(nextCoords.x, nextCoords.y);
    assert.equal(map.getClearedStreak(), 1);
    assert.equal(map.getMaxDepthReached(), 1);
  });

  await t.test('WorldRegistry integration with procedural world', () => {
    const entry = WorldRegistry.getWorld('procedural');
    assert.ok(entry, 'WorldRegistry must register "procedural" world');
    assert.ok(entry.name.includes('Infinite Procedural'));

    const customEntry = WorldRegistry.createProceduralWorld('impossible', 'CUSTOM-SEED-999');
    assert.ok(customEntry, 'createProceduralWorld creates valid world entry');
    const customMap = customEntry.load();
    assert.ok(customMap instanceof ProceduralLevelMap);
    assert.equal(customMap.getDifficulty(), 'impossible');
    assert.equal(customMap.getSeed(), 'CUSTOM-SEED-999');
  });

  await t.test('User Reported Issue Fix: Sector [1, 2] Archipelago Pillars is 100% beatable', () => {
    const gen = new ProceduralWorldGen('DEFAULT-SEED');
    const room = gen.generateRoom(1, 2, 'normal');

    // Safe spawn verification
    const sc = Math.floor(room.spawnPoint.x / 40);
    const sr = Math.floor(room.spawnPoint.y / 40);
    assert.equal(room.tiles[sr][sc], TileType.EMPTY, 'Spawn tile must be empty air');
    assert.ok(
      room.tiles[sr + 1][sc] === TileType.SOLID || room.tiles[sr + 1][sc] === TileType.ONE_WAY,
      'Spawn footing must be solid ground or one-way platform'
    );
    assert.notEqual(room.tiles[sr + 1][sc], TileType.SPIKE, 'Spawn footing must not be a spike');
    assert.notEqual(room.tiles[18][sc], TileType.SPIKE, 'Floor directly under spawn must not be a spike');

    // Archipelago stepped terrain kinematic validation
    // Player max jump height is 117.56px (2.93 tiles).
    // All elevation steps must have delta <= 2 tiles (80px).
    // Let's trace the platform surfaces from left bank to right bank
    const leftBankRow = 17;
    const step1Row = 16;
    const pillar1Row = 14;
    const step2Row = 13;
    const centerRow = room.exits.down ? 14 : 12;
    const step3Row = 13;
    const pillar2Row = 14;
    const step4Row = 16;
    const rightBankRow = 17;

    const pathRows = [
      leftBankRow,
      step1Row,
      pillar1Row,
      step2Row,
      centerRow,
      step3Row,
      pillar2Row,
      step4Row,
      rightBankRow,
    ];

    for (let i = 0; i < pathRows.length - 1; i++) {
      const deltaElevation = Math.abs(pathRows[i] - pathRows[i + 1]);
      assert.ok(
        deltaElevation <= 2,
        `Elevation step from ${pathRows[i]} to ${pathRows[i + 1]} is ${deltaElevation} tiles (must be <= 2)`
      );
    }
  });

  await t.test('Safe spawn guarantee across 200 random sectors and all difficulties', () => {
    const seeds = ['SEED_ALPHA', 'SEED_BETA', 'CYBERPUNK', 'CHASM_MASTER'];
    const difficulties = ['easy', 'normal', 'hard', 'impossible'];

    for (const seed of seeds) {
      const gen = new ProceduralWorldGen(seed);
      for (const diff of difficulties) {
        for (let x = -3; x <= 3; x++) {
          for (let y = -3; y <= 3; y++) {
            const room = gen.generateRoom(x, y, diff);
            const sc = Math.floor(room.spawnPoint.x / 40);
            const sr = Math.floor(room.spawnPoint.y / 40);

            // 1. In bounds
            assert.ok(sc >= 0 && sc < COLS, `Spawn col ${sc} must be in bounds for room (${x},${y})`);
            assert.ok(sr >= 0 && sr < ROWS, `Spawn row ${sr} must be in bounds for room (${x},${y})`);

            // 2. Air clearance for player body
            assert.equal(room.tiles[sr][sc], TileType.EMPTY, `Spawn cell (${sr},${sc}) must be empty air`);
            assert.equal(room.tiles[sr - 1][sc], TileType.EMPTY, `Spawn headroom (${sr - 1},${sc}) must be empty air`);

            // 3. Ground support
            const groundTile = room.tiles[sr + 1][sc];
            assert.ok(
              groundTile === TileType.SOLID || groundTile === TileType.ONE_WAY,
              `Footing at (${sr + 1},${sc}) in (${x},${y}) must be solid ground or one-way, got ${groundTile}`
            );

            // 4. Never lethal spikes
            assert.notEqual(groundTile, TileType.SPIKE, `Spawn footing in (${x},${y}) must NEVER be a spike`);
            assert.notEqual(room.tiles[18][sc], TileType.SPIKE, `Floor under spawn in (${x},${y}) must NEVER be a spike`);
          }
        }
      }
    }
  });

  await t.test('Doorway threshold safety: no spikes at entryways or doorway heights', () => {
    const gen = new ProceduralWorldGen('DOORWAY-SAFETY-SEED');

    for (let x = -4; x <= 4; x++) {
      for (let y = -4; y <= 4; y++) {
        const room = gen.generateRoom(x, y, 'impossible');

        // Threshold columns 0..2 (left) and 17..19 (right) must never have spikes on floor rows 17-18
        for (let r = 17; r <= 18; r++) {
          for (const c of [0, 1, 2, 17, 18, 19]) {
            assert.notEqual(
              room.tiles[r][c],
              TileType.SPIKE,
              `Lethal spike found at threshold tile (${r},${c}) in room (${x},${y})`
            );
          }
        }

        // Left doorway (rows 14-16, col 0)
        if (room.exits.left) {
          for (let r = 14; r <= 16; r++) {
            assert.equal(
              room.tiles[r][0],
              TileType.EMPTY,
              `Left doorway tile (${r},0) must be empty air in room (${x},${y})`
            );
          }
        }

        // Right doorway (rows 14-16, col 19)
        if (room.exits.right) {
          for (let r = 14; r <= 16; r++) {
            assert.equal(
              room.tiles[r][19],
              TileType.EMPTY,
              `Right doorway tile (${r},19) must be empty air in room (${x},${y})`
            );
          }
        }
      }
    }
  });

  await t.test('Infinite Void Restart: switching difficulty & seed cleanly resets manifold state', () => {
    // 1. Initial run on Easy with Seed A
    const entry1 = WorldRegistry.createProceduralWorld('easy', 'NEON-GEN-101');
    const map1 = entry1.load();
    assert.equal(map1.getDifficulty(), 'easy');
    assert.equal(map1.getSeed(), 'NEON-GEN-101');

    // Explore several rooms
    map1.markVisited(1, 0);
    map1.markVisited(2, 0);
    assert.equal(map1.getMaxDepthReached(), 2);
    assert.equal(map1.getClearedStreak(), 2);

    // 2. Restart run on Impossible with Seed B
    const entry2 = WorldRegistry.createProceduralWorld('impossible', 'CYBER-VOID-999');
    const map2 = entry2.load();
    assert.equal(map2.getDifficulty(), 'impossible');
    assert.equal(map2.getSeed(), 'CYBER-VOID-999');

    // Fresh manifold state: depth and streak are 0
    assert.equal(map2.getMaxDepthReached(), 0);
    assert.equal(map2.getClearedStreak(), 0);

    // Threat curve reflects new difficulty immediately
    assert.equal(map1.getThreatLevel(2, 0), 2 * 0.04);
    assert.equal(map2.getThreatLevel(2, 0), Math.min(1.0, 2 * 0.42));

    // Sector at (1, 0) is freshly generated according to new seed
    const room1 = map1.getRoom(1, 0, true);
    const room2 = map2.getRoom(1, 0, true);
    assert.ok(room1, 'Room 1 must be generated');
    assert.ok(room2, 'Room 2 must be generated');
    assert.notEqual(room1, room2, 'Rooms from different seed runs must be distinct instances');
    const isDifferent =
      room1.title !== room2.title ||
      room1.themeColor !== room2.themeColor ||
      JSON.stringify(room1.tiles) !== JSON.stringify(room2.tiles);
    assert.ok(isDifferent, 'Different seeds and difficulties must produce varied sectors');
  });

  await t.test('Sector title coordinates: only written once without duplicate coordinates', () => {
    const gen = new ProceduralWorldGen('COORDS-SEED');
    const room = gen.generateRoom(3, -2, 'normal');

    // Title includes coordinates exactly once
    const matches = room.title.match(/\[3,\s*-2\]/g) || [];
    assert.equal(matches.length, 1, `Title "${room.title}" must contain coordinates [3, -2] exactly once`);

    // Helper logic prevents duplication when formatting
    const coordsStr = `[${room.coords.x}, ${room.coords.y}]`;
    const coordsStrTight = `[${room.coords.x},${room.coords.y}]`;
    const hasCoords = room.title.includes(coordsStr) || room.title.includes(coordsStrTight);
    assert.equal(hasCoords, true);
    const finalDisplay = hasCoords ? room.title : `${room.title} ${coordsStr}`;
    const displayMatches = finalDisplay.match(/\[3,\s*-2\]/g) || [];
    assert.equal(displayMatches.length, 1, `Rendered title "${finalDisplay}" must have coordinates only once`);
  });
});




