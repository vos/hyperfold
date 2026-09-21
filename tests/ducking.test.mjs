import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TileType, TILE_SIZE } = require('./dist-world/world/ScreenData.js');
const { Player } = require('./dist-world/entities/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');
const { LaserBarrier } = require('./dist-world/entities/LaserBarrier.js');
const { LaserTurret } = require('./dist-world/entities/LaserTurret.js');

function createMockAudio() {
  return {
    playJump: () => {},
    playLand: () => {},
    playCollect: () => {},
    playDeath: () => {},
    playLaserWarning: () => {},
    playLaserHum: () => {},
    playLaserImpact: () => {},
    playLaserShoot: () => {},
    playBounce: () => {},
    playDropThrough: () => {},
    playLevelReset: () => {},
    playWin: () => {},
  };
}

function createMockParticles() {
  return {
    emitDust: () => {},
    emitSparks: () => {},
    emitPlayerExplosion: () => {},
    emitLaserCharge: () => {},
    emitLaserSparks: () => {},
    emitLaserMuzzle: () => {},
    clear: () => {},
  };
}

function createEmptyRoom(id = 'duck_test_room') {
  const tiles = Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY));
  // Solid floor on row 18 (y = 720 to 760)
  for (let c = 0; c < 20; c++) {
    tiles[18][c] = TileType.SOLID;
  }
  return {
    id,
    coords: { x: 0, y: 0 },
    title: 'Ducking Test Room',
    themeColor: '#00ffff',
    accentColor: '#ff007f',
    tiles,
    collectibles: [],
    exits: { left: false, right: false, up: false, down: false },
    movingPlatforms: [],
    laserBarriers: [],
    laserTurrets: [],
  };
}

test('Player Ducking / Crouching Mechanics Verification', async (t) => {
  const audio = createMockAudio();
  const particles = createMockParticles();
  const physics = new PhysicsEngine(audio, particles);

  await t.test('Pressing Down / S reduces player height by half (36 -> 18) and sets isDucking', () => {
    const room = createEmptyRoom();
    const player = new Player(200, 18 * TILE_SIZE - 36); // y = 684, feet at 720
    player.isGrounded = true;

    assert.equal(player.height, 36, 'Initial standing height must be 36');
    assert.equal(player.isDucking, false, 'Player should initially not be ducking');

    const downInput = {
      left: false, right: false, up: false, down: true,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    physics.update(player, room, downInput, 1 / 60);

    assert.equal(player.isDucking, true, 'isDucking should become true when holding Down');
    assert.equal(player.height, 18, 'Height must be reduced by half to 18');
    assert.equal(player.getBounds().height, 18, 'getBounds().height must report 18');
    // Feet should remain anchored at y = 720
    assert.equal(player.y + player.height, 720, 'Feet position (y + height) must remain at ground level (720)');
    assert.equal(player.y, 702, 'Head position y should drop by 18px from 684 to 702');
  });

  await t.test('Releasing Down / S restores standing height (36) when clearance is available', () => {
    const room = createEmptyRoom();
    const player = new Player(200, 18 * TILE_SIZE - 18);
    player.height = 18;
    player.isDucking = true;
    player.isGrounded = true;

    const neutralInput = {
      left: false, right: false, up: false, down: false,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    physics.update(player, room, neutralInput, 1 / 60);

    assert.equal(player.isDucking, false, 'isDucking should become false when releasing Down in open space');
    assert.equal(player.height, 36, 'Height must be restored to 36');
    assert.equal(player.getBounds().height, 36, 'getBounds().height must report 36');
    assert.equal(player.y + player.height, 720, 'Feet position (y + height) must remain at ground level (720)');
    assert.equal(player.y, 684, 'Head position y should return to 684');
  });

  await t.test('Player remains ducked under low ceiling even if Down / S is released', () => {
    const room = createEmptyRoom();
    // Place solid blocks at row 17 (y = 680 to 720) over columns 4..6, but leave row 17 at col 5 empty
    // Clearance under row 17: row 17 is y=680..720, floor is at y=720 (row 18).
    // Let's place solid block at row 16 (y = 640..680). Col 5 is clear, but row 17 has an obstacle block at y=680..700?
    // In grid: tile row 17 is y = 680..720.
    // If row 16 is SOLID (y = 640..680):
    // If player stands (height 36): y = 684..720. 684 > 680, so standing fits under row 16.
    // To create a tunnel where ducking (height 18) fits but standing (height 36) does not:
    // We can place a solid platform or check canStandUp directly with a solid tile overhead.
    // Suppose col 5 row 17 is EMPTY, but row 16 is SOLID, and we place a solid block at y = 680..720?
    // Wait! If row 17 is SOLID, player y would be 680 - 18 = 662.
    // Let's place a movingPlatform (oneWay: false) as an overhead ceiling at y = 680, height 20.
    // Ground at y = 720. Gap between overhead ceiling (y=700) and ground (y=720) is 20px!
    // Ducking player (height 18) fits in 20px (y = 702 to 720).
    // Standing player (height 36, head at 684) would overlap the ceiling [680, 700]!
    const ceilingPlat = {
      id: 'low_ceiling',
      startX: 150,
      startY: 680,
      endX: 150,
      endY: 680,
      width: 100,
      height: 20, // extends y from 680 to 700
      speed: 0,
      oneWay: false,
    };
    room.movingPlatforms = [ceilingPlat];

    const player = new Player(180, 702);
    player.height = 18;
    player.isDucking = true;
    player.isGrounded = true;

    // Verify canStandUp reports false
    const plats = physics.getPlatformsForRoom(room, 0);
    assert.equal(physics.canStandUp(player, room, plats), false, 'canStandUp must return false under low ceiling');

    // Update with neutral input (down is released)
    const neutralInput = {
      left: false, right: false, up: false, down: false,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    physics.update(player, room, neutralInput, 1 / 60);

    assert.equal(player.isDucking, true, 'Player must remain ducked while under low ceiling');
    assert.equal(player.height, 18, 'Player height must stay 18 under low ceiling');

    // Move player out from under ceiling (x = 300)
    player.x = 300;
    assert.equal(physics.canStandUp(player, room, plats), true, 'canStandUp must return true in open space');

    physics.update(player, room, neutralInput, 1 / 60);
    assert.equal(player.isDucking, false, 'Player should stand up once clear of the ceiling');
    assert.equal(player.height, 36, 'Player height should return to 36');
  });

  await t.test('Ducking player crawls at CRAWL_SPEED (140 px/s)', () => {
    const room = createEmptyRoom();
    const player = new Player(200, 18 * TILE_SIZE - 36);
    player.isGrounded = true;

    const crawlRightInput = {
      left: false, right: true, up: false, down: true,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    // Run a few frames to accelerate
    for (let i = 0; i < 20; i++) {
      physics.update(player, room, crawlRightInput, 1 / 60);
    }

    assert.equal(player.isDucking, true, 'Player is ducking');
    assert.ok(Math.abs(player.vx - player.CRAWL_SPEED) < 5, `Horizontal speed should approach CRAWL_SPEED (140), got ${player.vx}`);
  });

  await t.test('Ducking allows dodging a horizontal laser barrier at head height', () => {
    const room = createEmptyRoom();
    // Floor is at y = 720. Standing player spans y = 684..720. Ducking player spans y = 702..720.
    // Horizontal laser barrier at y = 692 (active):
    // Intersects standing player (684 <= 692 <= 720), misses ducking player (692 < 702).
    const barrierConfig = {
      id: 'head_laser',
      startX1: 100,
      startY1: 692,
      startX2: 300,
      startY2: 692,
      activeDuration: 5.0,
      inactiveDuration: 1.0,
      warningDuration: 0.2,
    };
    room.laserBarriers = [barrierConfig];

    const standingPlayer = new Player(200, 684);
    standingPlayer.height = 36;
    standingPlayer.isDucking = false;
    standingPlayer.isGrounded = true;

    let standingDied = false;
    const neutralInput = {
      left: false, right: false, up: false, down: false,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };
    physics.update(standingPlayer, room, neutralInput, 1 / 60, undefined, () => { standingDied = true; }, 1.0);
    assert.equal(standingDied, true, 'Standing player must be killed by head-height laser barrier');

    // Now test ducking player at the exact same location
    const duckingPlayer = new Player(200, 684);
    duckingPlayer.isGrounded = true;
    let duckingDied = false;
    const downInput = {
      left: false, right: false, up: false, down: true,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    physics.update(duckingPlayer, room, downInput, 1 / 60, undefined, () => { duckingDied = true; }, 1.0);
    assert.equal(duckingDied, false, 'Ducking player must dodge head-height laser barrier and survive');
    assert.equal(duckingPlayer.height, 18, 'Ducking player height is 18');
    assert.equal(duckingPlayer.y, 702, 'Ducking player head is at y=702, below laser at y=692');
  });

  await t.test('Ducking allows dodging a horizontal laser turret beam at head height', () => {
    const room = createEmptyRoom();
    // Turret at left wall (x=40, y=692) firing right across the room at angle 0
    const turretConfig = {
      id: 'head_turret',
      x: 40,
      y: 692,
      direction: 'right',
      mode: 'beam',
      beamActiveDuration: 5.0,
      beamInactiveDuration: 0,
      beamWarningDuration: 0,
    };
    room.laserTurrets = [turretConfig];

    const standingPlayer = new Player(200, 684);
    standingPlayer.height = 36;
    standingPlayer.isDucking = false;
    standingPlayer.isGrounded = true;

    let standingDied = false;
    const neutralInput = {
      left: false, right: false, up: false, down: false,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };
    physics.update(standingPlayer, room, neutralInput, 1 / 60, undefined, () => { standingDied = true; }, 1.0);
    assert.equal(standingDied, true, 'Standing player must be killed by turret beam at head height');

    // Ducking player at the same location
    const duckingPlayer = new Player(200, 684);
    duckingPlayer.isGrounded = true;
    let duckingDied = false;
    const downInput = {
      left: false, right: false, up: false, down: true,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    physics.update(duckingPlayer, room, downInput, 1 / 60, undefined, () => { duckingDied = true; }, 1.0);
    assert.equal(duckingDied, false, 'Ducking player must dodge horizontal turret beam and survive');
  });

  await t.test('Pressing Down alone on one-way platform ducks without dropping through', () => {
    const room = createEmptyRoom();
    // One-way platform at row 14 (y = 560)
    for (let c = 5; c < 15; c++) {
      room.tiles[14][c] = TileType.ONE_WAY;
    }

    const player = new Player(300, 14 * TILE_SIZE - 36); // standing on row 14
    player.isGrounded = true;

    const downOnlyInput = {
      left: false, right: false, up: false, down: true,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false, restartJustReleased: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    physics.update(player, room, downOnlyInput, 1 / 60);

    assert.equal(player.isDucking, true, 'Player should duck on one-way platform when holding Down');
    assert.equal(player.dropThroughTimer, 0, 'dropThroughTimer must NOT trigger on Down alone');
    assert.equal(player.isGrounded, true, 'Player should remain grounded on one-way platform');
    assert.equal(player.y + player.height, 560, 'Player feet must remain anchored on row 14 surface (560)');
  });
});
