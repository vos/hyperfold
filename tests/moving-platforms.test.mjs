import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { MovingPlatform } = require('./dist-world/entities/MovingPlatform.js');
const { TileType } = require('./dist-world/world/ScreenData.js');
const { Player } = require('./dist-world/entities/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');

test('Moving Platforms Verification', async (t) => {
  const map = WorldRegistry.getWorld('demo').load();

  await t.test('Demo sectors have moving platforms configured', () => {
    const expectedSectorsWithPlatforms = [
      [1, 0], // Sector 1: Neon Nexus
      [3, 0], // Sector 3: Laser Grid
      [4, 0], // Sector 4: Gravity Well
      [5, 0], // Sector 5: Beyond Euclidean Space
      [2, 1], // Sector (2,1): The Spire
      [2, 2], // Sector (2,2): Starlight Zenith
    ];

    for (const [x, y] of expectedSectorsWithPlatforms) {
      const room = map.getRoom(x, y);
      assert.ok(room, `Sector (${x}, ${y}) must exist`);
      assert.ok(
        room.movingPlatforms && room.movingPlatforms.length > 0,
        `Sector (${x}, ${y}) must have at least one moving platform`
      );

      for (const plat of room.movingPlatforms) {
        assert.ok(plat.id, 'Platform must have an ID');
        assert.ok(plat.width > 0, 'Platform width must be positive');
        assert.ok((plat.height ?? 16) > 0, 'Platform height must be positive');
        assert.ok(plat.speed > 0, 'Platform speed must be positive');
        assert.ok(plat.startX >= 0 && plat.startX <= 800, 'startX within screen bounds');
        assert.ok(plat.endX >= 0 && plat.endX <= 800, 'endX within screen bounds');
        assert.ok(plat.startY >= 0 && plat.startY <= 800, 'startY within screen bounds');
        assert.ok(plat.endY >= 0 && plat.endY <= 800, 'endY within screen bounds');
      }
    }
  });

  await t.test('Sector (2,1) The Spire features a vertical elevator lift', () => {
    const room = map.getRoom(2, 1);
    const plat = room.movingPlatforms.find((p) => p.id === 'plat_2_1_1');
    assert.ok(plat, 'plat_2_1_1 must exist in Sector (2,1)');

    // Vertical elevator: startX === endX, startY !== endY
    assert.equal(plat.startX, plat.endX, 'Elevator must move strictly vertically (startX === endX)');
    assert.notEqual(plat.startY, plat.endY, 'Elevator must have vertical displacement');
    assert.ok(plat.startY > plat.endY, 'Elevator startY should be lower than endY (ascending lift)');
  });

  await t.test('Sector 1, 3, 4, 5, (2,2) feature horizontal hover cruisers', () => {
    const horizontalPlatIds = [
      { coords: [1, 0], id: 'plat_1_0_1' },
      { coords: [3, 0], id: 'plat_3_0_1' },
      { coords: [4, 0], id: 'plat_4_0_1' },
      { coords: [5, 0], id: 'plat_5_0_1' },
      { coords: [2, 2], id: 'plat_2_2_1' },
    ];

    for (const { coords, id } of horizontalPlatIds) {
      const room = map.getRoom(coords[0], coords[1]);
      const plat = room.movingPlatforms.find((p) => p.id === id);
      assert.ok(plat, `Platform ${id} must exist in Sector (${coords.join(',')})`);
      assert.equal(plat.startY, plat.endY, `Platform ${id} must be horizontal (startY === endY)`);
      assert.ok(Math.abs(plat.endX - plat.startX) >= 200, `Platform ${id} must span a wide patrol range`);
    }
  });

  await t.test('MovingPlatform harmonic easing accurately navigates between endpoints and pauses', () => {
    const config = {
      id: 'test_plat',
      startX: 200,
      startY: 500,
      endX: 600,
      endY: 500,
      width: 80,
      height: 16,
      speed: 200, // 400px distance / 200 speed = 2.0 seconds transit
      pauseTime: 0.5,
    };

    // Total half-cycle: 2.0s move + 0.5s pause = 2.5s
    // Total full-cycle: 5.0s

    // At t = 0: Start point
    const s0 = MovingPlatform.computePlatformState(config, 0);
    assert.equal(Math.round(s0.x), 200, 'At t=0, x should be startX');
    assert.equal(Math.round(s0.y), 500, 'At t=0, y should be startY');
    assert.equal(s0.progress, 0, 'At t=0, progress should be 0');

    // At t = 1.0s (midpoint of transit):
    const sMid = MovingPlatform.computePlatformState(config, 1.0);
    assert.equal(Math.round(sMid.x), 400, 'At midpoint t=1.0s, x should be 400');
    assert.ok(sMid.vx > 0, 'Velocity should be positive in forward direction');
    assert.ok(Math.abs(sMid.progress - 0.5) < 0.01, 'Progress should be ~0.5');

    // At t = 2.0s (just arrived at end):
    const sEnd = MovingPlatform.computePlatformState(config, 2.0);
    assert.equal(Math.round(sEnd.x), 600, 'At t=2.0s, x should reach endX');
    assert.equal(sEnd.progress, 1, 'Progress should be 1');

    // At t = 2.25s (paused at end):
    const sPauseEnd = MovingPlatform.computePlatformState(config, 2.25);
    assert.equal(Math.round(sPauseEnd.x), 600, 'During pause, x should remain at endX');
    assert.equal(sPauseEnd.vx, 0, 'During pause, vx should be 0');

    // At t = 3.5s (midpoint of return transit):
    const sReturnMid = MovingPlatform.computePlatformState(config, 3.5);
    assert.equal(Math.round(sReturnMid.x), 400, 'At return midpoint t=3.5s, x should be 400');
    assert.ok(sReturnMid.vx < 0, 'Velocity should be negative on return journey');

    // At t = 4.75s (paused at start):
    const sPauseStart = MovingPlatform.computePlatformState(config, 4.75);
    assert.equal(Math.round(sPauseStart.x), 200, 'During start pause, x should remain at startX');
    assert.equal(sPauseStart.vx, 0, 'During start pause, vx should be 0');

    // At t = 5.0s (full cycle complete, restarts):
    const sLoop = MovingPlatform.computePlatformState(config, 5.0);
    assert.equal(Math.round(sLoop.x), 200, 'At t=5.0s, full cycle should loop back to start');
  });

  await t.test('MovingPlatform instance tracks displacement delta correctly across frames', () => {
    const config = {
      id: 'test_inst',
      startX: 100,
      startY: 300,
      endX: 300,
      endY: 300,
      width: 80,
      height: 16,
      speed: 100,
      pauseTime: 0.5,
    };

    const plat = new MovingPlatform(config, 0);
    assert.equal(plat.x, 100);
    assert.equal(plat.prevX, 100);

    // Advance 0.1 seconds
    plat.update(0.1);
    assert.ok(plat.x > plat.prevX, 'plat.x must advance forward');
    assert.equal(plat.prevX, 100, 'plat.prevX should be 100 from previous update');
  });

  await t.test('Passenger physics: player displacement and momentum inheritance', () => {
    const config = {
      id: 'phys_test_plat',
      startX: 200,
      startY: 500,
      endX: 400,
      endY: 300, // moves right and up
      width: 80,
      height: 16,
      speed: 100,
      pauseTime: 0.5,
    };

    const plat = new MovingPlatform(config, 0);

    // Mock player
    const player = {
      x: 220,
      y: plat.y - 36, // standing on top
      vx: 0,
      vy: 0,
      width: 24,
      height: 36,
      isGrounded: true,
      standingPlatform: plat,
      JUMP_VELOCITY: -520,
    };

    // 1. Carriage displacement: platform moves from t=0 to t=0.2s
    plat.update(0.2);
    const deltaX = plat.x - plat.prevX;
    assert.ok(deltaX > 0, 'Platform moved horizontally');
    assert.ok(plat.y < plat.prevY, 'Platform moved vertically upward');

    // Simulate physics engine carriage
    player.x += deltaX;
    player.y = plat.y - player.height;

    assert.equal(player.y, plat.y - 36, 'Player should remain glued to top of platform');
    assert.ok(player.x > 220, 'Player should be carried along horizontal axis');

    // 2. Momentum boost on jump: upward elevator boost
    assert.ok(plat.vy < 0, 'Platform has upward velocity');
    const boostedJumpVy = Math.min(player.JUMP_VELOCITY, player.JUMP_VELOCITY + plat.vy * 0.75);
    assert.ok(
      boostedJumpVy < player.JUMP_VELOCITY,
      `Jump should receive upward boost (got ${boostedJumpVy}, standard ${player.JUMP_VELOCITY})`
    );

    // 3. Horizontal momentum inheritance on jump:
    const inheritedVx = player.vx + plat.vx * 0.8;
    assert.ok(inheritedVx > 0, 'Player should inherit forward momentum from moving platform');
  });

  await t.test('Down + Jump triggers drop-through on one-way platforms and moving platforms', () => {
    const mockAudio = {
      playJump: () => {},
      playLand: () => {},
      playDropThrough: () => {},
      playBounce: () => {},
      playDeath: () => {},
    };
    const mockParticles = {
      emitDust: () => {},
      emitSparks: () => {},
      emitTrail: () => {},
    };

    const physics = new PhysicsEngine(mockAudio, mockParticles);

    // 1. Drop-through on static TileType.ONE_WAY
    const testRoom = {
      id: 'test_room',
      coords: { x: 0, y: 0 },
      title: 'Test',
      themeColor: '#00ffff',
      accentColor: '#ff007f',
      tiles: Array(20).fill(null).map(() => Array(20).fill(TileType.EMPTY)),
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
      movingPlatforms: [],
    };

    // Place ONE_WAY tiles at row 12 (y = 480 to 520)
    for (let c = 4; c <= 10; c++) {
      testRoom.tiles[12][c] = TileType.ONE_WAY;
    }
    // Place SOLID floor at row 18 (y = 720)
    for (let c = 0; c < 20; c++) {
      testRoom.tiles[18][c] = TileType.SOLID;
    }

    const player = new Player(testRoom.tiles[12].indexOf(TileType.ONE_WAY) * 40 + 8, 480 - 36);
    player.isGrounded = true;

    // A. Verify normal jump when ONLY Jump is pressed on ONE_WAY
    const jumpInput = {
      left: false, right: false, up: false, down: false,
      jump: true, jumpJustPressed: true, dashJustPressed: false, restartJustPressed: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };
    physics.update(player, testRoom, jumpInput, 1 / 60);
    assert.ok(player.vy < -450, `Normal jump should trigger upward jump velocity (got ${player.vy})`);
    assert.equal(player.dropThroughTimer, 0, 'dropThroughTimer should be 0 on normal jump');

    // B. Put player back standing on ONE_WAY platform
    player.x = 240;
    player.y = 480 - 36;
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = true;

    // Press Down + Jump on ONE_WAY platform
    const dropThroughInput = {
      left: false, right: false, up: false, down: true,
      jump: true, jumpJustPressed: true, dashJustPressed: false, restartJustPressed: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };

    const prevY = player.y;
    physics.update(player, testRoom, dropThroughInput, 1 / 60);

    assert.ok(player.dropThroughTimer > 0, 'dropThroughTimer should be activated');
    assert.ok(player.y > prevY, 'Player y should advance downward past the platform surface');
    assert.ok(player.vy > 0, 'Player vy should be positive (downward velocity)');
    assert.equal(player.isGrounded, false, 'Player should no longer be grounded');

    // Advance physics a few frames while falling through the one-way tile
    const neutralInput = {
      left: false, right: false, up: false, down: false,
      jump: false, jumpJustPressed: false, dashJustPressed: false, restartJustPressed: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };
    for (let i = 0; i < 15; i++) {
      physics.update(player, testRoom, neutralInput, 1 / 60);
    }
    // Player should have passed completely through row 12 (y = 480)
    assert.ok(player.y > 480, 'Player should have fallen cleanly through the ONE_WAY platform');

    // C. Verify Down + Jump on SOLID tile does NOT drop through, but executes standard jump
    player.x = 240;
    player.y = 18 * 40 - 36; // standing on row 18 SOLID
    player.vx = 0;
    player.vy = 0;
    player.isGrounded = true;
    player.dropThroughTimer = 0;

    physics.update(player, testRoom, dropThroughInput, 1 / 60);
    assert.equal(player.dropThroughTimer, 0, 'dropThroughTimer must NOT activate on SOLID ground');
    assert.ok(player.vy < -450, `Player on SOLID ground should jump upwards even when holding Down (got ${player.vy})`);

    // D. Drop-through on MovingPlatform (oneWay: true)
    const platConfig = {
      id: 'test_drop_plat',
      startX: 200,
      startY: 400,
      endX: 400,
      endY: 400,
      width: 100,
      height: 16,
      speed: 60,
      oneWay: true,
    };
    testRoom.movingPlatforms = [platConfig];
    const roomPlats = physics.getPlatformsForRoom(testRoom, 0);
    const movingPlat = roomPlats[0];

    // Mount player on moving platform
    player.x = movingPlat.x + 20;
    player.y = movingPlat.y - player.height;
    player.vx = 0;
    player.vy = 0;
    player.standingPlatform = movingPlat;
    player.isGrounded = true;

    physics.update(player, testRoom, dropThroughInput, 1 / 60);
    assert.ok(player.dropThroughTimer > 0, 'dropThroughTimer should activate on moving platform');
    assert.equal(player.standingPlatform, null, 'standingPlatform should be detached');
    assert.ok(player.vy >= 120, 'Player should have downward velocity');

    // Verify next frame does not re-collide or remount moving platform
    physics.update(player, testRoom, neutralInput, 1 / 60);
    assert.equal(player.standingPlatform, null, 'Player must not re-stick to one-way moving platform');
    assert.ok(player.y > movingPlat.y - player.height, 'Player should continue falling below platform');
  });

  await t.test('3D Transition Pre-Render: all incoming and adjacent faces mapped before 90-degree tumble', () => {
    // Helper replicating prepareTransition face mapping
    function computeTransitionBindings(direction, currentRoom, nextRoom, levelMap) {
      const bindings = Array(6).fill(null);
      let targetFace = 0;
      if (direction === 'right') targetFace = 0;
      if (direction === 'left') targetFace = 1;
      if (direction === 'up') targetFace = 2;
      if (direction === 'down') targetFace = 3;

      // 1. Destination room onto target face
      bindings[targetFace] = { type: 'room', id: nextRoom.id };

      // 2. Current room onto Face 4
      bindings[4] = { type: 'room', id: currentRoom.id };

      // 3. Trailing incoming face (Face 5: -Z) and perpendicular faces
      if (direction === 'right') {
        const nextRight = levelMap.getRoom(nextRoom.coords.x + 1, nextRoom.coords.y);
        bindings[5] = nextRight ? { type: 'room', id: nextRight.id } : { type: 'void' };
        const top = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y + 1);
        bindings[2] = top ? { type: 'room', id: top.id } : { type: 'void' };
        const bottom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y - 1);
        bindings[3] = bottom ? { type: 'room', id: bottom.id } : { type: 'void' };
      } else if (direction === 'left') {
        const nextLeft = levelMap.getRoom(nextRoom.coords.x - 1, nextRoom.coords.y);
        bindings[5] = nextLeft ? { type: 'room', id: nextLeft.id } : { type: 'void' };
        const top = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y + 1);
        bindings[2] = top ? { type: 'room', id: top.id } : { type: 'void' };
        const bottom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y - 1);
        bindings[3] = bottom ? { type: 'room', id: bottom.id } : { type: 'void' };
      } else if (direction === 'up') {
        const nextTop = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y + 1);
        bindings[5] = nextTop ? { type: 'room', id: nextTop.id, rotationAngle: Math.PI } : { type: 'void', rotationAngle: Math.PI };
        const right = levelMap.getRoom(nextRoom.coords.x + 1, nextRoom.coords.y);
        bindings[0] = right ? { type: 'room', id: right.id } : { type: 'void' };
        const left = levelMap.getRoom(nextRoom.coords.x - 1, nextRoom.coords.y);
        bindings[1] = left ? { type: 'room', id: left.id } : { type: 'void' };
      } else if (direction === 'down') {
        const nextBottom = levelMap.getRoom(nextRoom.coords.x, nextRoom.coords.y - 1);
        bindings[5] = nextBottom ? { type: 'room', id: nextBottom.id, rotationAngle: Math.PI } : { type: 'void', rotationAngle: Math.PI };
        const right = levelMap.getRoom(nextRoom.coords.x + 1, nextRoom.coords.y);
        bindings[0] = right ? { type: 'room', id: right.id } : { type: 'void' };
        const left = levelMap.getRoom(nextRoom.coords.x - 1, nextRoom.coords.y);
        bindings[1] = left ? { type: 'room', id: left.id } : { type: 'void' };
      }
      return { targetFace, bindings };
    }

    const currentRoom = map.getRoom(1, 0); // Sector 1
    const nextRoom = map.getRoom(2, 0);    // Sector 2 (Quantum Junction)
    assert.ok(currentRoom && nextRoom, 'Rooms must exist');

    // Test transition right: (1, 0) -> (2, 0)
    const { targetFace, bindings } = computeTransitionBindings('right', currentRoom, nextRoom, map);
    assert.equal(targetFace, 0, 'Target face for right transition must be Face 0 (+X)');
    assert.equal(bindings[0].id, 'room_2_0', 'Face 0 must hold nextRoom (Sector 2, 0)');
    assert.equal(bindings[4].id, 'room_1_0', 'Face 4 must hold departing room (Sector 1, 0)');

    // Crucial: Face 5 must be pre-rendered as Sector (3, 0) Laser Grid, NOT void!
    assert.equal(bindings[5].type, 'room', 'Face 5 must be pre-rendered as a room, NOT void');
    assert.equal(bindings[5].id, 'room_3_0', 'Face 5 must hold Sector (3, 0) Laser Grid');

    // Face 2 must be pre-rendered as Sector (2, 1) The Spire
    assert.equal(bindings[2].type, 'room', 'Face 2 must hold Sector (2, 1) The Spire');
    assert.equal(bindings[2].id, 'room_2_1', 'Face 2 must hold room_2_1');

    // Test transition up: (2, 0) -> (2, 1) The Spire
    const spireRoom = map.getRoom(2, 1);
    const zenithRoom = map.getRoom(2, 2);
    const upBindings = computeTransitionBindings('up', nextRoom, spireRoom, map);
    assert.equal(upBindings.targetFace, 2, 'Target face for up transition must be Face 2 (+Y)');
    assert.equal(upBindings.bindings[2].id, 'room_2_1', 'Target face must hold Sector (2, 1)');
    assert.equal(upBindings.bindings[4].id, 'room_2_0', 'Departing face must hold Sector (2, 0)');
    // Face 5 must hold Sector (2, 2) Starlight Zenith with 180-degree rotation!
    assert.equal(upBindings.bindings[5].type, 'room', 'Face 5 must hold room above destination');
    assert.equal(upBindings.bindings[5].id, zenithRoom.id, 'Face 5 must hold Sector (2, 2) Starlight Zenith');
    assert.equal(upBindings.bindings[5].rotationAngle, Math.PI, 'Face 5 must have 180-degree rotation angle');
  });
});
