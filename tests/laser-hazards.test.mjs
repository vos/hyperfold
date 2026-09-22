import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { LaserBarrier } = require('./dist-world/entities/LaserBarrier.js');
const { LaserTurret } = require('./dist-world/entities/LaserTurret.js');
const { MovingPlatform } = require('./dist-world/entities/MovingPlatform.js');
const { TileType, TILE_SIZE, FACE_SIZE } = require('./dist-world/world/ScreenData.js');
const { Player } = require('./dist-world/entities/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');

test('Laser Hazards & Shooting Lasers Verification', async (t) => {
  const map = WorldRegistry.getWorld('demo').load();

  await t.test('LaserBarrier timing cycle correctly transitions between INACTIVE, WARNING, and ACTIVE', () => {
    const config = {
      id: 'test_barrier',
      startX1: 300,
      startY1: 200,
      startX2: 300,
      startY2: 500,
      activeDuration: 2.0,
      inactiveDuration: 2.0,
      warningDuration: 0.8,
      initialPhase: 0,
    };
    // Total cycle = 2.0 (active) + 2.0 (inactive) = 4.0s
    // Active window: [0.0, 2.0)
    // Inactive window: [2.0, 3.2)
    // Warning window: [3.2, 4.0)

    // At t = 0.5s: Should be ACTIVE
    const sActive = LaserBarrier.computeBarrierState(config, 0.5);
    assert.equal(sActive.state, 'ACTIVE');
    assert.equal(sActive.isActive, true);
    assert.equal(sActive.chargeProgress, 1);

    // At t = 2.5s: Should be INACTIVE
    const sInactive = LaserBarrier.computeBarrierState(config, 2.5);
    assert.equal(sInactive.state, 'INACTIVE');
    assert.equal(sInactive.isActive, false);
    assert.equal(sInactive.chargeProgress, 0);

    // At t = 3.6s (midway through 0.8s warning window): Should be WARNING
    const sWarning = LaserBarrier.computeBarrierState(config, 3.6);
    assert.equal(sWarning.state, 'WARNING');
    assert.equal(sWarning.isActive, false);
    assert.ok(sWarning.chargeProgress > 0.4 && sWarning.chargeProgress < 0.6, 'Warning chargeProgress should be ~0.5');

    // At t = 4.1s (next cycle started): Should be ACTIVE again
    const sNextActive = LaserBarrier.computeBarrierState(config, 4.1);
    assert.equal(sNextActive.state, 'ACTIVE');
    assert.equal(sNextActive.isActive, true);
  });

  await t.test('LaserBarrier always-active mode remains continuously active and lethal at all times', () => {
    // 1. Config with alwaysActive: true
    const configAlways = {
      id: 'always_active_barrier',
      startX1: 200,
      startY1: 200,
      startX2: 400,
      startY2: 200,
      alwaysActive: true,
      inactiveDuration: 0,
    };

    const testTimes = [0, 0.25, 0.8, 1.5, 2.0, 3.5, 4.0, 10.0, 50.0, 99.9];
    for (const time of testTimes) {
      const state = LaserBarrier.computeBarrierState(configAlways, time);
      assert.equal(state.state, 'ACTIVE', `Barrier with alwaysActive: true must be ACTIVE at t=${time}`);
      assert.equal(state.isActive, true, `Barrier with alwaysActive: true must have isActive=true at t=${time}`);
      assert.equal(state.chargeProgress, 1);
    }

    // 2. Config with inactiveDuration: 0 (without explicit alwaysActive flag)
    const configZeroInactive = {
      id: 'zero_inactive_barrier',
      startX1: 200,
      startY1: 200,
      startX2: 400,
      startY2: 200,
      activeDuration: 2.0,
      inactiveDuration: 0,
    };
    for (const time of testTimes) {
      const state = LaserBarrier.computeBarrierState(configZeroInactive, time);
      assert.equal(state.state, 'ACTIVE', `Barrier with inactiveDuration: 0 must be ACTIVE at t=${time}`);
      assert.equal(state.isActive, true, `Barrier with inactiveDuration: 0 must have isActive=true at t=${time}`);
    }

    // 3. Lethality check: player crossing beam is killed at any time
    const barrier = new LaserBarrier(configAlways, 0);
    const playerOnBeam = new Player(300, 200); // directly on beam
    for (const time of [0, 1.5, 3.0, 7.5, 12.0]) {
      barrier.update(time);
      assert.ok(barrier.intersectsPlayer(playerOnBeam), `Always-active barrier must intersect player at t=${time}`);
    }

    // 4. Moving always-active barrier interpolates positions while staying active
    const movingAlways = {
      id: 'moving_always_active',
      startX1: 100,
      startY1: 100,
      startX2: 300,
      startY2: 100,
      endX1: 100,
      endY1: 300,
      endX2: 300,
      endY2: 300,
      speed: 100,
      pauseTime: 0,
      alwaysActive: true,
    };
    const s0 = LaserBarrier.computeBarrierState(movingAlways, 0);
    assert.equal(s0.state, 'ACTIVE');
    assert.equal(s0.y1, 100);

    const s1 = LaserBarrier.computeBarrierState(movingAlways, 1.0); // midway through 200px transit at 100px/s
    assert.equal(s1.state, 'ACTIVE');
    assert.ok(s1.y1 > 100 && s1.y1 < 300, 'Endpoints should interpolate smoothly during transit');

    const s2 = LaserBarrier.computeBarrierState(movingAlways, 2.0); // at destination
    assert.equal(s2.state, 'ACTIVE');
    assert.equal(Math.round(s2.y1), 300);
  });

  await t.test('LaserBarrier harmonic movement smoothly interpolates endpoints', () => {
    const config = {
      id: 'moving_barrier',
      startX1: 200,
      startY1: 100,
      startX2: 200,
      startY2: 400,
      endX1: 600,
      endY1: 100,
      endX2: 600,
      endY2: 400,
      speed: 200, // 400px / 200 speed = 2.0s travel
      pauseTime: 0.5,
      activeDuration: 5.0,
      inactiveDuration: 5.0,
    };

    // At t = 0: Start position
    const s0 = LaserBarrier.computeBarrierState(config, 0);
    assert.equal(Math.round(s0.x1), 200);
    assert.equal(Math.round(s0.x2), 200);

    // At t = 1.0s (midpoint): 400px
    const sMid = LaserBarrier.computeBarrierState(config, 1.0);
    assert.equal(Math.round(sMid.x1), 400);
    assert.equal(Math.round(sMid.x2), 400);

    // At t = 2.2s (during endpoint pause): 600px
    const sEnd = LaserBarrier.computeBarrierState(config, 2.2);
    assert.equal(Math.round(sEnd.x1), 600);
    assert.equal(Math.round(sEnd.x2), 600);
  });

  await t.test('LaserBarrier intersectsPlayer detects collision only when ACTIVE', () => {
    const config = {
      id: 'col_barrier',
      startX1: 400,
      startY1: 100,
      startX2: 400,
      startY2: 600,
      activeDuration: 2.0,
      inactiveDuration: 2.0,
      warningDuration: 0.8,
    };

    const barrier = new LaserBarrier(config, 0.5); // Active at t=0.5
    assert.equal(barrier.state.isActive, true);

    const player = new Player(390, 300); // Player box overlaps x=400 (player width=24)
    assert.ok(barrier.intersectsPlayer(player), 'Player intersecting active beam must be hit');

    // Safe when outside beam
    const distantPlayer = new Player(100, 300);
    assert.ok(!barrier.intersectsPlayer(distantPlayer), 'Distant player must not be hit');

    // Harmless during WARNING state
    barrier.update(3.6); // Warning at t=3.6
    assert.equal(barrier.state.state, 'WARNING');
    assert.ok(!barrier.intersectsPlayer(player), 'Beam must not kill player during WARNING telegraph phase');

    // Harmless during INACTIVE state
    barrier.update(2.5); // Inactive at t=2.5
    assert.equal(barrier.state.state, 'INACTIVE');
    assert.ok(!barrier.intersectsPlayer(player), 'Beam must not kill player when INACTIVE');
  });

  await t.test('LaserTurret raycasting collides against solid walls', () => {
    const tiles = [];
    for (let r = 0; r < 20; r++) {
      tiles[r] = new Array(20).fill(TileType.EMPTY);
    }
    // Solid wall at col 10 (x = 400)
    for (let r = 0; r < 20; r++) {
      tiles[r][10] = TileType.SOLID;
    }

    // Cast ray from (100, 200) shooting right
    const hit = LaserTurret.castRay(100, 200, 'right', tiles, []);
    assert.equal(hit.hitType, 'wall');
    assert.equal(hit.hitX, 400, 'Ray must terminate at solid wall at x=400');
    assert.equal(hit.normalX, -1, 'Normal should face left (-1)');
  });

  await t.test('LaserTurret raycasting is dynamically blocked by MovingPlatforms (shielding mechanic)', () => {
    const tiles = [];
    for (let r = 0; r < 20; r++) {
      tiles[r] = new Array(20).fill(TileType.EMPTY);
    }
    // Wall far away at col 18 (x = 720)
    for (let r = 0; r < 20; r++) {
      tiles[r][18] = TileType.SOLID;
    }

    const platConfig = {
      id: 'shield_plat',
      startX: 300,
      startY: 190,
      endX: 300,
      endY: 190,
      width: 100,
      height: 20,
      speed: 100,
    };
    const platform = new MovingPlatform(platConfig, 0);

    // Platform is at x=300..400, y=190..210
    // Cast ray at y=200 shooting right from x=100
    const hitWithPlatform = LaserTurret.castRay(100, 200, 'right', tiles, [platform]);
    assert.equal(hitWithPlatform.hitType, 'platform');
    assert.equal(hitWithPlatform.hitX, 300, 'Ray must terminate at platform surface at x=300');
    assert.equal(hitWithPlatform.hitPlatform, platform);

    // When platform is moved out of the ray's vertical path (e.g. y = 400):
    const movedPlatform = new MovingPlatform({ ...platConfig, startY: 400, endY: 400 }, 0);
    const hitWithoutPlatform = LaserTurret.castRay(100, 200, 'right', tiles, [movedPlatform]);
    assert.equal(hitWithoutPlatform.hitType, 'wall');
    assert.equal(hitWithoutPlatform.hitX, 720, 'Ray should pass through to wall at x=720 when platform is out of the way');
  });

  await t.test('LaserTurret projectile simulation detects wall collision, platform collision, and player death', () => {
    const dummyAudio = {
      playLaserShoot: () => {},
      playLaserImpact: () => {},
      playLaserWarning: () => {},
      playLaserHum: () => {},
      playDeath: () => {},
      playLand: () => {},
    };
    const dummyParticles = {
      emitLaserSparks: () => {},
      emitLaserCharge: () => {},
      emitLaserVaporize: () => {},
      emitLaserMuzzle: () => {},
      emitDust: () => {},
      emitSparks: () => {},
      emitPlayerExplosion: () => {},
    };

    const physics = new PhysicsEngine(dummyAudio, dummyParticles);

    // Create a room with a turret shooting right
    const tiles = [];
    for (let r = 0; r < 20; r++) {
      tiles[r] = new Array(20).fill(TileType.EMPTY);
    }
    // Floor
    for (let c = 0; c < 20; c++) tiles[18][c] = TileType.SOLID;
    // Wall at col 15 (x = 600)
    for (let r = 0; r < 18; r++) tiles[r][15] = TileType.SOLID;

    const room = {
      id: 'test_turret_room',
      coords: { x: 99, y: 99 },
      title: 'Test Room',
      themeColor: '#ff0055',
      accentColor: '#ffaa00',
      tiles,
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
      laserTurrets: [
        {
          id: 'turret_test',
          x: 40,
          y: 300,
          direction: 'right',
          mode: 'projectile',
          projectileSpeed: 500,
          fireInterval: 1.0,
          fireOffset: 0,
        },
      ],
    };

    const player = new Player(100, 600); // Player on floor far away from y=300
    const dummyInput = { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restartJustPressed: false, cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false };

    // Update frame 1: turret fires projectile
    physics.update(player, room, dummyInput, 0.016, undefined, undefined, 0.016);
    const projectiles = physics.getProjectilesForRoom(room.id);
    assert.equal(projectiles.length, 1, 'Turret should have spawned 1 projectile');
    assert.ok(projectiles[0].vx > 0, 'Projectile vx should be positive');
    const firstProjId = projectiles[0].id;

    // Simulate projectile flying into solid wall at x=600
    // Distance from x=56 to x=600 is 544px / 500px/s ~= 1.1s
    let wallHit = false;
    for (let step = 0; step < 80; step++) {
      physics.update(player, room, dummyInput, 0.02, undefined, undefined, 0.016 + step * 0.02);
      if (!physics.getProjectilesForRoom(room.id).some((p) => p.id === firstProjId)) {
        wallHit = true;
        break;
      }
    }
    assert.ok(wallHit, 'Projectile should collide with wall and be removed');

    // Test player collision: clear projectiles, place player directly in line of fire (x=80, y=290)
    physics.clearProjectiles();
    player.setPosition(80, 290);
    let playerDied = false;
    // Spawn projectile (at t = 10.0s)
    physics.update(player, room, dummyInput, 0.02, undefined, () => { playerDied = true; }, 10.0);
    // Projectile moves from x=56 towards x=80
    for (let step = 0; step < 20; step++) {
      physics.update(player, room, dummyInput, 0.02, undefined, () => { playerDied = true; }, 10.02 + step * 0.02);
      if (playerDied) break;
    }
    assert.ok(playerDied, 'Laser projectile colliding with player must trigger onPlayerDeath');
  });

  await t.test('LaserTurret correctly resolves nozzle position and directional vectors from custom angle', () => {
    // 45 degrees (diagonal down-right)
    const t45 = new LaserTurret({ id: 't45', x: 200, y: 200, angle: 45 });
    const n45 = t45.getNozzlePosition();
    assert.ok(Math.abs(n45.dirX - Math.SQRT1_2) < 0.001, 'dirX for 45 deg should be ~0.7071');
    assert.ok(Math.abs(n45.dirY - Math.SQRT1_2) < 0.001, 'dirY for 45 deg should be ~0.7071');
    assert.ok(n45.x > 200 && n45.y > 200, 'Nozzle should be offset diagonally down-right');

    // 135 degrees (diagonal down-left)
    const t135 = new LaserTurret({ id: 't135', x: 400, y: 100, angle: 135 });
    const n135 = t135.getNozzlePosition();
    assert.ok(Math.abs(n135.dirX - -Math.SQRT1_2) < 0.001, 'dirX for 135 deg should be ~ -0.7071');
    assert.ok(Math.abs(n135.dirY - Math.SQRT1_2) < 0.001, 'dirY for 135 deg should be ~0.7071');
    assert.ok(n135.x < 400 && n135.y > 100, 'Nozzle should be offset diagonally down-left');

    // -90 degrees (upward)
    const tUp = new LaserTurret({ id: 'tUp', x: 300, y: 300, angle: -90 });
    const nUp = tUp.getNozzlePosition();
    assert.ok(Math.abs(nUp.dirX) < 0.001, 'dirX for -90 deg should be 0');
    assert.ok(Math.abs(nUp.dirY - -1) < 0.001, 'dirY for -90 deg should be -1');
    assert.equal(Math.round(nUp.y), 284, 'Nozzle y should be 300 - 16 = 284');
  });

  await t.test('LaserTurret diagonal raycasting accurately collides with solid obstacle', () => {
    const tiles = [];
    for (let r = 0; r < 20; r++) {
      tiles[r] = new Array(20).fill(TileType.EMPTY);
    }
    // Place solid block at row 6, col 6 (x: 240..280, y: 240..280)
    tiles[6][6] = TileType.SOLID;

    // Raycast from (0, 0) at angle 45 deg (dirX: 0.7071, dirY: 0.7071)
    const hit = LaserTurret.castRay(0, 0, Math.PI / 4, tiles, []);
    assert.equal(hit.hitType, 'wall');
    assert.ok(hit.hitX >= 239 && hit.hitX <= 281, `hitX (${hit.hitX}) should strike cell at x=240`);
    assert.ok(hit.hitY >= 239 && hit.hitY <= 281, `hitY (${hit.hitY}) should strike cell at y=240`);
  });

  await t.test('LaserTurret beam mode tracks state transitions and audio triggers correctly', () => {
    const turret = new LaserTurret({
      id: 'test_beam',
      x: 100,
      y: 100,
      direction: 'right',
      mode: 'beam',
      activeDuration: 2.0,
      inactiveDuration: 2.0,
      warningDuration: 0.5,
      initialPhase: 0,
    });

    // t = 0.1s -> activeDur is 2.0s -> ACTIVE
    turret.updateBeam(0.1);
    assert.equal(turret.beamState, 'ACTIVE');
    assert.ok(turret.isBeamActive);

    // t = 2.5s -> inactiveDur is 2.0s (total cycle 4.0s). Inactive window is [2.0, 3.5), warning is [3.5, 4.0)
    turret.updateBeam(2.5);
    assert.equal(turret.beamState, 'INACTIVE');
    assert.ok(!turret.isBeamActive);

    // t = 3.6s -> enters WARNING state
    turret.updateBeam(3.6);
    assert.equal(turret.beamState, 'WARNING');
    assert.ok(turret.justEnteredWarning(), 'Turret should report justEnteredWarning');

    // Next step in WARNING should not report justEnteredWarning again
    turret.updateBeam(3.7);
    assert.ok(!turret.justEnteredWarning(), 'Consecutive step in WARNING should not report justEnteredWarning');

    // t = 4.05s -> wraps to t = 0.05s -> transitions to ACTIVE
    turret.updateBeam(4.05);
    assert.equal(turret.beamState, 'ACTIVE');
    assert.ok(turret.justActivated(), 'Turret should report justActivated on entering ACTIVE');
  });

  await t.test('Demo level prominently features Laser Beams across multiple sectors', () => {
    const sectorsWithBeams = [
      [0, 0], // Sector 0: Genesis Core (introductory upper beam)
      [1, 0], // Sector 1: Neon Nexus (platform-shielding downward beam)
      [3, 0], // Sector 3: Laser Grid (high-voltage corridor beam)
      [4, 0], // Sector 4: Gravity Well (diagonal void beam)
      [5, 0], // Sector 5: Beyond Euclidean Space (crossfire beam)
      [6, 0], // Sector 6: Prism Horizon (warp core defense beam)
      [2, 1], // Sector (2,1): The Spire (mid-shaft elevator beam)
      [2, 2], // Sector (2,2): Starlight Zenith (diagonal solar beam)
      [4, -1], // Sector (4,-1): Sub-Zero Crypt (cryogenic vault beam)
    ];

    for (const [x, y] of sectorsWithBeams) {
      const room = map.getRoom(x, y);
      assert.ok(room, `Sector (${x}, ${y}) must exist`);
      assert.ok(room.laserTurrets, `Sector (${x}, ${y}) must have laser turrets`);
      const beamTurret = room.laserTurrets.find((t) => t.mode === 'beam');
      assert.ok(beamTurret, `Sector (${x}, ${y}) must have at least one turret in mode 'beam'`);
      assert.ok((beamTurret.activeDuration ?? 2) > 0, 'activeDuration must be positive');
      assert.ok((beamTurret.inactiveDuration ?? 2) > 0, 'inactiveDuration must be positive');
      assert.ok((beamTurret.warningDuration ?? 0.6) > 0, 'warningDuration must be positive');
    }
  });

  await t.test('Demo sectors have valid laser hazard configurations and safe spawn points', () => {
    // Check Sector 3: Laser Grid
    const sector3 = map.getRoom(3, 0);
    assert.ok(sector3, 'Sector 3 must exist');
    assert.ok(sector3.laserBarriers && sector3.laserBarriers.length > 0, 'Sector 3 must have laserBarriers');
    assert.ok(sector3.laserTurrets && sector3.laserTurrets.length > 0, 'Sector 3 must have laserTurrets');

    // Verify Sector 3 has angled turret
    const angledTurret3 = sector3.laserTurrets.find((t) => t.id === 'turret_3_0_3');
    assert.ok(angledTurret3, 'Sector 3 must have angled turret turret_3_0_3');
    assert.equal(angledTurret3.angle, 135, 'turret_3_0_3 must fire at 135 degrees');

    // Verify Sector (2,2) has angled turret
    const sector22 = map.getRoom(2, 2);
    assert.ok(sector22, 'Sector (2,2) must exist');
    const angledTurret22 = sector22.laserTurrets?.find((t) => t.id === 'turret_2_2_1');
    assert.ok(angledTurret22, 'Sector (2,2) must have angled turret turret_2_2_1');
    assert.equal(angledTurret22.angle, 45, 'turret_2_2_1 must fire at 45 degrees');

    const barrier3 = sector3.laserBarriers[0];
    assert.ok(barrier3.speed && barrier3.speed > 0, 'Sector 3 laser barrier must be mobile');
    assert.ok(barrier3.activeDuration > 0, 'Active duration must be positive');
    assert.ok(barrier3.inactiveDuration > 0, 'Inactive duration must be positive');

    // Verify all 10 demo sectors have safe spawn points that do not overlap active laser barriers or beams
    const rooms = map.getAllRooms();
    for (const r of rooms) {
      const spawn = r.spawnPoint || { x: 80, y: 660 };
      const playerAtSpawn = new Player(spawn.x, spawn.y);

      // Verify no barrier intersects player at spawn at t = 0
      if (r.laserBarriers) {
        for (const bConfig of r.laserBarriers) {
          const barrier = new LaserBarrier(bConfig, 0);
          assert.ok(
            !barrier.intersectsPlayer(playerAtSpawn),
            `Room ${r.id} spawn point (${spawn.x}, ${spawn.y}) must not collide with barrier ${bConfig.id}`
          );
        }
      }

      // Verify no active beam intersects player at spawn at t = 0
      if (r.laserTurrets) {
        for (const tConfig of r.laserTurrets) {
          if (tConfig.mode === 'beam') {
            const turret = new LaserTurret(tConfig);
            turret.updateBeam(0);
            if (turret.isBeamActive) {
              const nozzle = turret.getNozzlePosition();
              const ray = LaserTurret.castRay(nozzle.x, nozzle.y, nozzle.angle, r.tiles, []);
              assert.ok(
                !LaserTurret.rayIntersectsPlayer(nozzle.x, nozzle.y, ray.hitX, ray.hitY, playerAtSpawn),
                `Room ${r.id} spawn point (${spawn.x}, ${spawn.y}) must not collide with active beam ${tConfig.id}`
              );
            }
          }
        }
      }
    }
  });

  await t.test('Sector 3 Rebuild: alternating beams, moving platform shielding, and beatable path', () => {
    const sec3 = map.getRoom(3, 0);
    assert.ok(sec3, 'Sector 3 must exist');

    // 1. Dual ceiling beam turrets
    const beam1 = sec3.laserTurrets.find((t) => t.id === 'turret_3_0_1');
    const beam2 = sec3.laserTurrets.find((t) => t.id === 'turret_3_0_4');
    assert.ok(beam1 && beam1.mode === 'beam', 'Beam 1 must exist in beam mode');
    assert.ok(beam2 && beam2.mode === 'beam', 'Beam 2 must exist in beam mode');
    assert.equal(beam1.direction, 'down', 'Beam 1 must fire down');
    assert.equal(beam2.direction, 'down', 'Beam 2 must fire down');

    // Alternating phase: at t = 0.5s, Beam 1 should be ACTIVE, Beam 2 should be INACTIVE
    const t1 = new LaserTurret(beam1);
    const t2 = new LaserTurret(beam2);
    t1.updateBeam(0.5);
    t2.updateBeam(0.5);
    assert.equal(t1.isBeamActive, true, 'Beam 1 should be ACTIVE at t=0.5s');
    assert.equal(t2.isBeamActive, false, 'Beam 2 should be INACTIVE at t=0.5s');

    // At t = 2.5s, Beam 1 should be INACTIVE, Beam 2 should be ACTIVE
    t1.updateBeam(2.5);
    t2.updateBeam(2.5);
    assert.equal(t1.isBeamActive, false, 'Beam 1 should be INACTIVE at t=2.5s');
    assert.equal(t2.isBeamActive, true, 'Beam 2 should be ACTIVE at t=2.5s');

    // 2. Moving platform shielding verification
    const plat = sec3.movingPlatforms[0];
    assert.ok(plat, 'Sector 3 must have a moving platform');
    assert.equal(plat.startY, 480, 'Platform must operate at y=480');
    // Platform traverses x=240 to x=520, which spans both beam1 (x=300) and beam2 (x=480)
    assert.ok(plat.startX <= 300 && plat.endX >= 480, 'Platform travel must cover both beam x positions');

    const movingPlatInstance = new MovingPlatform(plat, 0);
    // When platform is at x=300 (under beam 1), casting ray down from nozzle should hit platform
    const nozzle1 = t1.getNozzlePosition();
    const rayHit = LaserTurret.castRay(nozzle1.x, nozzle1.y, nozzle1.angle, sec3.tiles, [movingPlatInstance]);
    assert.equal(rayHit.hitType, 'platform', 'Laser beam 1 must be blocked by moving platform');
    assert.equal(rayHit.hitY, 480, 'Laser beam 1 must hit top surface of moving platform at y=480');

    // 3. Headroom clearance under upper laser barrier
    const barrier = sec3.laserBarriers[0];
    assert.ok(barrier, 'Sector 3 must have laser barrier');
    assert.ok(barrier.startY2 <= 340, 'Barrier bottom must stay in upper airspace (<= 340px)');
    const clearance = plat.startY - barrier.startY2;
    assert.ok(clearance >= 140, `Clearance between barrier bottom and platform (${clearance}px) must be >= 140px for player clearance`);

    // 4. Safe stepping platform geometry
    assert.equal(sec3.tiles[16][4], TileType.SOLID, 'Platform 1 must have solid tile at row 16 col 4');
    assert.equal(sec3.tiles[15][7], TileType.SOLID, 'Platform 2 must have solid landing tile at row 15 col 7');
    assert.equal(sec3.tiles[15][11], TileType.SOLID, 'Platform 3 must have solid landing tile at row 15 col 11');
    assert.equal(sec3.tiles[16][14], TileType.SOLID, 'Platform 4 must have solid tile at row 16 col 14');
    assert.equal(sec3.tiles[18][17], TileType.SOLID, 'Exit ledge must have solid floor at row 18 col 17');
  });

  await t.test('Auto-targeting projectile turret aims towards player center and respects target range', () => {
    const turret = new LaserTurret({
      id: 'auto_turret_1',
      x: 200,
      y: 200,
      direction: 'right',
      autoTarget: true,
    });

    const player = new Player(300, 300);
    // Player center is (300 + 12 = 312, 300 + 18 = 318)
    const expectedAngle = Math.atan2(318 - 200, 312 - 200);
    const angle = turret.getFiringAngle(player);
    assert.ok(Math.abs(angle - expectedAngle) < 1e-6, `Angle should match player center (got ${angle}, expected ${expectedAngle})`);

    const nozzle = turret.getNozzlePosition(player);
    assert.ok(Math.abs(nozzle.angle - expectedAngle) < 1e-6, 'Nozzle angle should match expected target angle');

    // Test with targetRange configured
    const rangedTurret = new LaserTurret({
      id: 'auto_turret_range',
      x: 200,
      y: 200,
      direction: 'down', // base angle = 90 deg (PI/2)
      autoTarget: true,
      targetRange: 100,
    });

    // Player at (300, 300) is dist ~162.7px > 100px range -> should fall back to base firing angle (down = PI/2)
    const outOfRangeAngle = rangedTurret.getFiringAngle(player);
    assert.equal(outOfRangeAngle, Math.PI * 0.5, 'Turret out of range should use base firing angle');

    // Move player within 100px: (240, 200) -> center (252, 218), dist = hypot(52, 18) ~= 55px <= 100px
    player.setPosition(240, 200);
    const inRangeExpected = Math.atan2(218 - 200, 252 - 200);
    const inRangeAngle = rangedTurret.getFiringAngle(player);
    assert.ok(Math.abs(inRangeAngle - inRangeExpected) < 1e-6, 'Turret in range should track player');
  });

  await t.test('Auto-targeting beam turret locks angle upon entering warning state, allowing player to dodge during warning', () => {
    const beamTurret = new LaserTurret({
      id: 'auto_beam_1',
      x: 400,
      y: 100,
      direction: 'down',
      mode: 'beam',
      autoTarget: true,
      activeDuration: 2.0,
      inactiveDuration: 2.0,
      warningDuration: 1.0,
      initialPhase: 0,
    });
    // Total cycle = 4.0s:
    // [0.0, 2.0) -> ACTIVE
    // [2.0, 3.0) -> INACTIVE
    // [3.0, 4.0) -> WARNING

    const player = new Player(200, 500);

    // At t = 2.5s: Beam is INACTIVE -> tracks player
    beamTurret.updateBeam(2.5, player);
    assert.equal(beamTurret.beamState, 'INACTIVE');
    assert.equal(beamTurret.lockedBeamAngle, null, 'Angle should not be locked in INACTIVE state');
    const inactiveAngle = beamTurret.getFiringAngle(player);
    const expectedAngle1 = Math.atan2((500 + 18) - 100, (200 + 12) - 400);
    assert.ok(Math.abs(inactiveAngle - expectedAngle1) < 1e-6, 'Should track player during INACTIVE state');

    // At t = 3.01s: Transitions from INACTIVE into WARNING state
    beamTurret.updateBeam(3.01, player);
    assert.equal(beamTurret.beamState, 'WARNING');
    assert.ok(beamTurret.lockedBeamAngle !== null, 'Beam angle MUST lock upon entering WARNING state');
    assert.ok(Math.abs(beamTurret.lockedBeamAngle - expectedAngle1) < 1e-6, 'Locked angle must capture aim at warning start');

    // Player moves to (600, 500) during WARNING -> turret angle MUST stay locked at position 1
    player.setPosition(600, 500);
    beamTurret.updateBeam(3.5, player);
    assert.equal(beamTurret.beamState, 'WARNING');
    const warningAngleAfterMove = beamTurret.getFiringAngle(player);
    assert.ok(Math.abs(warningAngleAfterMove - expectedAngle1) < 1e-6, 'Angle MUST remain locked to original position during WARNING even if player moves');

    // At t = 4.0s: Transitions into ACTIVE lethal state
    beamTurret.updateBeam(4.0, player);
    assert.equal(beamTurret.beamState, 'ACTIVE');
    assert.equal(beamTurret.isBeamActive, true);
    const activeAngle = beamTurret.getFiringAngle(player);
    assert.ok(Math.abs(activeAngle - expectedAngle1) < 1e-6, 'Active beam angle must remain locked to the warning angle');

    // Raycast check: beam fires along locked angle (towards (200, 500)). Player is now at (600, 500).
    const nozzle = beamTurret.getNozzlePosition(player);
    const tiles = Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY));
    const ray = LaserTurret.castRay(nozzle.x, nozzle.y, nozzle.angle, tiles, []);
    const hitsPlayer = LaserTurret.rayIntersectsPlayer(nozzle.x, nozzle.y, ray.hitX, ray.hitY, player);
    assert.equal(hitsPlayer, false, 'Player who moved away during warning lock must NOT be hit when laser activates');

    // If player had NOT moved (remained at (200, 500)), the laser would hit them:
    const stationaryPlayer = new Player(200, 500);
    const hitsStationary = LaserTurret.rayIntersectsPlayer(nozzle.x, nozzle.y, ray.hitX, ray.hitY, stationaryPlayer);
    assert.equal(hitsStationary, true, 'Stationary player who did not move must be hit');

    // When cycle returns to INACTIVE at t = 6.1s: lock is released
    beamTurret.updateBeam(6.1, player);
    assert.equal(beamTurret.beamState, 'INACTIVE');
    assert.equal(beamTurret.lockedBeamAngle, null, 'Lock should clear when beam becomes INACTIVE');
  });

  await t.test('Auto-targeting projectile turret simulation in PhysicsEngine fires projectiles towards player', () => {
    const dummyAudio = {
      playDeath: () => {},
      playJump: () => {},
      playDropThrough: () => {},
      playLaserShoot: () => {},
      playLaserImpact: () => {},
      playLaserWarning: () => {},
      playLaserHum: () => {},
    };
    const dummyParticles = {
      emitPlayerExplosion: () => {},
      emitSparks: () => {},
      emitDust: () => {},
      emitLaserSparks: () => {},
      emitLaserCharge: () => {},
      emitLaserVaporize: () => {},
      emitLaserMuzzle: () => {},
    };

    const physics = new PhysicsEngine(dummyAudio, dummyParticles);
    const room = {
      id: 'auto_turret_test_room',
      coords: { x: 0, y: 0 },
      title: 'Auto Turret Test',
      themeColor: '#00ffff',
      accentColor: '#ff007f',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
      laserTurrets: [
        {
          id: 'auto_p_turret',
          x: 100,
          y: 100,
          direction: 'right',
          autoTarget: true,
          fireInterval: 1.0,
          projectileSpeed: 400,
        },
      ],
    };

    const player = new Player(400, 400); // player center is (412, 418)
    const dummyInput = { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restartJustPressed: false, cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false };

    // Run physics update to trigger a shot at gameTime = 1.0
    physics.update(player, room, dummyInput, 0.016, undefined, undefined, 1.0);

    const projectiles = physics.getProjectilesForRoom(room.id);
    assert.equal(projectiles.length, 1, 'Turret should have fired one projectile');

    const p = projectiles[0];
    const expectedAngle = Math.atan2(
      (player.y + player.height * 0.5) - 100,
      (player.x + player.width * 0.5) - 100
    );
    assert.ok(Math.abs(p.angle - expectedAngle) < 1e-4, 'Projectile angle should aim towards player center');
    const expectedVx = Math.cos(expectedAngle) * 400;
    const expectedVy = Math.sin(expectedAngle) * 400;
    assert.ok(Math.abs(p.vx - expectedVx) < 1e-3, 'Projectile vx should point towards player');
    assert.ok(Math.abs(p.vy - expectedVy) < 1e-3, 'Projectile vy should point towards player');
  });
});
