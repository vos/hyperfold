import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildDemoLevel } = require('./dist-world/DemoLevel.js');
const { TileType, ROWS, COLS, getSpikeDirection } = require('./dist-world/ScreenData.js');
const { Player } = require('./dist-world/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');

test('Directional Spikes (Walls, Roof, Solid Platforms) Verification', async (t) => {
  const map = buildDemoLevel();

  await t.test('getSpikeDirection accurately resolves explicit and auto-detected directions', () => {
    // Room with custom spikeProps
    const dummyRoom = {
      id: 'test_spikes',
      coords: { x: 0, y: 0 },
      title: 'Spike Test',
      themeColor: '#ff0055',
      accentColor: '#ffaa00',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
      spikeProps: {
        '5,5': { direction: 'down' },
        '6,6': { direction: 'left' },
      },
    };

    // Explicit checks
    assert.equal(getSpikeDirection(dummyRoom, 5, 5), 'down', 'Explicit spike direction down');
    assert.equal(getSpikeDirection(dummyRoom, 6, 6), 'left', 'Explicit spike direction left');

    // Auto-detection checks:
    // Ceiling tile at (0, 10) is SOLID, spike at (1, 10) should auto-detect 'down'
    dummyRoom.tiles[0][10] = TileType.SOLID;
    assert.equal(getSpikeDirection(dummyRoom, 1, 10), 'down', 'Auto-detect ceiling spike as down');

    // Left wall at (10, 0) is SOLID, spike at (10, 1) should auto-detect 'right'
    dummyRoom.tiles[10][0] = TileType.SOLID;
    assert.equal(getSpikeDirection(dummyRoom, 10, 1), 'right', 'Auto-detect left wall spike as right');

    // Right wall at (10, 19) is SOLID, spike at (10, 18) should auto-detect 'left'
    dummyRoom.tiles[10][19] = TileType.SOLID;
    assert.equal(getSpikeDirection(dummyRoom, 10, 18), 'left', 'Auto-detect right wall spike as left');

    // Floor at (18, 10) is SOLID, spike at (17, 10) should auto-detect 'up'
    dummyRoom.tiles[18][10] = TileType.SOLID;
    assert.equal(getSpikeDirection(dummyRoom, 17, 10), 'up', 'Auto-detect floor spike as up');
  });

  await t.test('PhysicsEngine detects lethal contact with roof, wall, and platform spikes', () => {
    const dummyAudio = {
      playDeath: () => {},
      playBounce: () => {},
      playLand: () => {},
      playJump: () => {},
      playDropThrough: () => {},
      playLaserShoot: () => {},
      playLaserImpact: () => {},
      playLaserWarning: () => {},
      playLaserHum: () => {},
    };
    const dummyParticles = {
      emitSparks: () => {},
      emitDust: () => {},
      emitLaserSparks: () => {},
      emitLaserCharge: () => {},
      emitLaserVaporize: () => {},
      emitLaserMuzzle: () => {},
      emitPlayerExplosion: () => {},
    };

    const physics = new PhysicsEngine(dummyAudio, dummyParticles);

    // Build room with roof spike (pointing down), wall spike (pointing right), and platform spike (pointing up)
    const tiles = Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY));
    // Solid floor at row 18
    for (let c = 0; c < 20; c++) tiles[18][c] = TileType.SOLID;
    // Solid roof at row 0
    for (let c = 0; c < 20; c++) tiles[0][c] = TileType.SOLID;
    // Solid left wall at col 0
    for (let r = 0; r < 20; r++) tiles[r][0] = TileType.SOLID;

    // Roof spike at row 1, col 5 (points down)
    tiles[1][5] = TileType.SPIKE;
    // Wall spike at row 10, col 1 (points right)
    tiles[10][1] = TileType.SPIKE;
    // Solid platform at row 14, col 8..11, with spike on top at (13, 9)
    tiles[14][8] = TileType.SOLID;
    tiles[14][9] = TileType.SOLID;
    tiles[14][10] = TileType.SOLID;
    tiles[14][11] = TileType.SOLID;
    tiles[13][9] = TileType.SPIKE;

    const testRoom = {
      id: 'test_spike_room',
      coords: { x: 0, y: 0 },
      title: 'Spike Hazard Room',
      themeColor: '#ff0055',
      accentColor: '#ffaa00',
      tiles,
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
    };

    const player = new Player(200, 600);

    // 1. Test Roof Spike (jumping up into row 1, col 5)
    // Spike at row 1, col 5: x: 200..240, y: 40..80. Dangerous box: y: 40..70.
    player.setPosition(204, 60);
    let diedRoof = false;
    physics.checkSpikeCollisions(player, testRoom, () => { diedRoof = true; });
    assert.ok(diedRoof, 'Player jumping into roof spike should die');

    // 2. Test Wall Spike (running left into row 10, col 1)
    // Spike at row 10, col 1: x: 40..80, y: 400..440. Dangerous box: x: 40..70.
    player.setPosition(50, 404);
    let diedWall = false;
    physics.checkSpikeCollisions(player, testRoom, () => { diedWall = true; });
    assert.ok(diedWall, 'Player running into wall spike should die');

    // 3. Test Platform Spike (landing onto row 13, col 9)
    // Spike at row 13, col 9: x: 360..400, y: 520..560. Dangerous box: y: 530..560.
    player.setPosition(365, 540);
    let diedPlatform = false;
    physics.checkSpikeCollisions(player, testRoom, () => { diedPlatform = true; });
    assert.ok(diedPlatform, 'Player landing on solid platform spike should die');

    // 4. Safe position far from spikes
    player.setPosition(200, 680);
    let diedSafe = false;
    physics.checkSpikeCollisions(player, testRoom, () => { diedSafe = true; });
    assert.ok(!diedSafe, 'Player standing far from spikes should survive');
  });

  await t.test('Demo level sectors configure roof, wall, and solid platform spikes', () => {
    // Sector 1: Neon Nexus has roof spikes hanging down
    const sec1 = map.getRoom(1, 0);
    assert.ok(sec1, 'Sector 1 must exist');
    assert.ok(sec1.spikeProps, 'Sector 1 must have spikeProps');
    assert.equal(sec1.tiles[1][8], TileType.SPIKE, 'Sector 1 must have roof spike at row 1 col 8');
    assert.equal(getSpikeDirection(sec1, 1, 8), 'down', 'Sector 1 roof spike must point down');

    // Sector 2: Quantum Junction has wall, roof, and platform spikes
    const sec2 = map.getRoom(2, 0);
    assert.ok(sec2, 'Sector 2 must exist');
    assert.ok(sec2.spikeProps, 'Sector 2 must have spikeProps');
    assert.equal(sec2.tiles[8][1], TileType.SPIKE, 'Sector 2 must have wall spike at row 8 col 1');
    assert.equal(getSpikeDirection(sec2, 8, 1), 'right', 'Sector 2 wall spike must point right into room');
    assert.equal(sec2.tiles[1][2], TileType.SPIKE, 'Sector 2 must have roof spike at row 1 col 2');
    assert.equal(getSpikeDirection(sec2, 1, 2), 'down', 'Sector 2 roof spike must point down');
    assert.equal(sec2.tiles[14][18], TileType.SPIKE, 'Sector 2 must have solid platform spike at row 14 col 18');
    assert.equal(getSpikeDirection(sec2, 14, 18), 'up', 'Sector 2 platform spike must point up');

    // Sector 3: Laser Grid has wall, roof, and solid platform spikes
    const sec3 = map.getRoom(3, 0);
    assert.ok(sec3, 'Sector 3 must exist');
    assert.ok(sec3.spikeProps, 'Sector 3 must have spikeProps');
    assert.equal(sec3.tiles[1][5], TileType.SPIKE, 'Sector 3 roof spike at row 1 col 5');
    assert.equal(getSpikeDirection(sec3, 1, 5), 'down', 'Sector 3 roof spike must point down');
    assert.equal(sec3.tiles[10][1], TileType.SPIKE, 'Sector 3 wall spike at row 10 col 1');
    assert.equal(getSpikeDirection(sec3, 10, 1), 'right', 'Sector 3 wall spike must point right');
    assert.equal(sec3.tiles[13][9], TileType.SPIKE, 'Sector 3 pillar platform spike at row 13 col 9');
    assert.equal(getSpikeDirection(sec3, 13, 9), 'up', 'Sector 3 pillar platform spike must point up');

    // Sector (2, 1): The Spire has roof, wall, and solid platform spikes
    const sec21 = map.getRoom(2, 1);
    assert.ok(sec21, 'Sector (2,1) must exist');
    assert.ok(sec21.spikeProps, 'Sector (2,1) must have spikeProps');
    assert.equal(sec21.tiles[14][2], TileType.SPIKE, 'Sector (2,1) solid platform spike at row 14 col 2');
    assert.equal(getSpikeDirection(sec21, 14, 2), 'up', 'Sector (2,1) platform spike must point up');
    assert.equal(sec21.tiles[1][2], TileType.SPIKE, 'Sector (2,1) roof spike at row 1 col 2');
    assert.equal(getSpikeDirection(sec21, 1, 2), 'down', 'Sector (2,1) roof spike must point down');
    assert.equal(sec21.tiles[5][1], TileType.SPIKE, 'Sector (2,1) wall spike at row 5 col 1');
    assert.equal(getSpikeDirection(sec21, 5, 1), 'right', 'Sector (2,1) wall spike must point right');

    // Sector (4, -1): Sub-Zero Crypt has roof and wall spikes
    const sec4m1 = map.getRoom(4, -1);
    assert.ok(sec4m1, 'Sector (4,-1) must exist');
    assert.ok(sec4m1.spikeProps, 'Sector (4,-1) must have spikeProps');
    assert.equal(sec4m1.tiles[15][1], TileType.SPIKE, 'Sector (4,-1) wall spike at row 15 col 1');
    assert.equal(getSpikeDirection(sec4m1, 15, 1), 'right', 'Sector (4,-1) wall spike must point right');
    assert.equal(sec4m1.tiles[1][2], TileType.SPIKE, 'Sector (4,-1) roof spike at row 1 col 2');
    assert.equal(getSpikeDirection(sec4m1, 1, 2), 'down', 'Sector (4,-1) roof spike must point down');
  });
});

