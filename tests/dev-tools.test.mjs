import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { DevManager } = require('./dist-world/engine/DevManager.js');
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { ProceduralLevelMap } = require('./dist-world/world/ProceduralLevelMap.js');
const { LaserBarrier } = require('./dist-world/entities/LaserBarrier.js');
const { LaserTurret } = require('./dist-world/entities/LaserTurret.js');
const { TileType, TILE_SIZE, FACE_SIZE } = require('./dist-world/world/ScreenData.js');
const { Player } = require('./dist-world/entities/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');

function createMockPhysics() {
  const dummyAudio = {
    playDeath: () => {},
    playLaserWarning: () => {},
    playLaserHum: () => {},
    playLaserShoot: () => {},
    playLaserImpact: () => {},
    playJump: () => {},
    playLand: () => {},
  };
  const dummyParticles = {
    emitPlayerExplosion: () => {},
    emitLaserSparks: () => {},
    emitLaserCharge: () => {},
    emitLaserMuzzle: () => {},
    emitSparks: () => {},
    emitDust: () => {},
    emitWallSlide: () => {},
  };
  return new PhysicsEngine(dummyAudio, dummyParticles);
}

test('Developer Tools & Debug Mode Verification', async (t) => {
  const dev = DevManager.getInstance();

  // Reset dev state before tests
  dev.resetToDefaults();
  dev.enabled = false;

  await t.test('DevManager initial state, singleton access, and hazard mode predicates', () => {
    assert.equal(dev.enabled, false);
    assert.equal(dev.hazardMode, 'normal');
    assert.equal(dev.godMode, false);
    assert.equal(dev.disableSpikes, false);
    assert.equal(dev.flyMode, false);
    assert.equal(dev.infiniteJump, false);
    assert.equal(dev.timeScale, 1.0);
    assert.equal(dev.isPaused, false);

    assert.equal(dev.isHazardNormal(), true);
    assert.equal(dev.isHazardNonLethal(), false);
    assert.equal(dev.isHazardFrozen(), false);
    assert.equal(dev.isDynamicHazardLethal(), true);
    assert.equal(dev.isSpikeLethal(), true);

    // Toggle dev mode
    dev.toggle();
    assert.equal(dev.enabled, true);

    // Hazard mode transitions
    dev.hazardMode = 'non-lethal';
    assert.equal(dev.isHazardNonLethal(), true);
    assert.equal(dev.isDynamicHazardLethal(), false);
    assert.equal(dev.isHazardFrozen(), false);

    dev.hazardMode = 'frozen';
    assert.equal(dev.isHazardFrozen(), true);
    assert.equal(dev.isDynamicHazardLethal(), false);

    dev.hazardMode = 'normal';
    assert.equal(dev.isHazardNormal(), true);
    assert.equal(dev.isDynamicHazardLethal(), true);

    // God mode and disable spikes predicates
    dev.godMode = true;
    assert.equal(dev.isSpikeLethal(), false);
    assert.equal(dev.isDynamicHazardLethal(), false);

    dev.godMode = false;
    assert.equal(dev.isSpikeLethal(), true);

    dev.disableSpikes = true;
    assert.equal(dev.isSpikeLethal(), false);

    dev.resetToDefaults();
    assert.equal(dev.enabled, true); // reset keeps dev on if opened
    assert.equal(dev.godMode, false);
    assert.equal(dev.disableSpikes, false);
    assert.equal(dev.hazardMode, 'normal');
  });

  await t.test('Dynamic Hazard Disabling: LaserBarriers (Normal vs Non-Lethal vs Frozen)', () => {
    const map = WorldRegistry.getWorld('demo').load();
    const physics = createMockPhysics();

    // Room with laser barrier
    const roomWithLaser = Array.from(map.rooms.values()).find((r) => r.laserBarriers && r.laserBarriers.length > 0);
    assert.ok(roomWithLaser, 'A demo room must have laser barriers');

    const barrierConfig = roomWithLaser.laserBarriers[0];
    const barrier = new LaserBarrier(barrierConfig);

    // Position player directly in the middle of the barrier
    const midX = (barrierConfig.startX1 + barrierConfig.startX2) * 0.5;
    const midY = (barrierConfig.startY1 + barrierConfig.startY2) * 0.5;
    const player = new Player(midX - 14, midY - 14);

    // 1. Normal Mode: Lethal
    dev.enabled = true;
    dev.hazardMode = 'normal';
    dev.godMode = false;

    let deathCalled = false;
    // Advance physics time to ensure barrier is active
    physics.gameTime = 0.5; // active window
    const killedNormal = physics.checkLaserBarriers(player, roomWithLaser, () => {
      deathCalled = true;
    });
    assert.equal(killedNormal, true, 'Player should be killed in Normal mode');
    assert.equal(deathCalled, true, 'onPlayerDeath should be called in Normal mode');

    // 2. Non-Lethal Mode: Player passes through without dying
    dev.hazardMode = 'non-lethal';
    deathCalled = false;
    const killedNonLethal = physics.checkLaserBarriers(player, roomWithLaser, () => {
      deathCalled = true;
    });
    assert.equal(killedNonLethal, false, 'Player must survive in Non-Lethal mode');
    assert.equal(deathCalled, false, 'onPlayerDeath should NOT be called in Non-Lethal mode');

    // 3. Frozen Mode: Hazards completely deactivated
    dev.hazardMode = 'frozen';
    deathCalled = false;
    const killedFrozen = physics.checkLaserBarriers(player, roomWithLaser, () => {
      deathCalled = true;
    });
    assert.equal(killedFrozen, false, 'Player must survive in Frozen mode');
    assert.equal(deathCalled, false, 'onPlayerDeath should NOT be called in Frozen mode');
  });

  await t.test('Dynamic Hazard Disabling: LaserTurrets (Beam & Projectile)', () => {
    const map = WorldRegistry.getWorld('demo').load();
    const physics = createMockPhysics();

    // Room with laser turret
    const roomWithTurret = Array.from(map.rooms.values()).find((r) => r.laserTurrets && r.laserTurrets.length > 0);
    assert.ok(roomWithTurret, 'A demo room must have laser turrets');

    // Case 1: Frozen mode empties room projectiles and bypasses updates
    dev.enabled = true;
    dev.hazardMode = 'frozen';
    physics.roomProjectiles.set(roomWithTurret.id, [{
      id: 'p1', x: 200, y: 200, vx: 100, vy: 0, width: 20, height: 6, color: '#f00',
      turretId: 't1', life: 0, maxLife: 4, direction: 'right', angle: 0
    }]);

    const player = new Player(200, 200);
    const frozenResult = physics.updateLaserTurrets(player, roomWithTurret, [], 0.016, () => {});
    assert.equal(frozenResult, false, 'Frozen mode must return false');
    assert.equal(physics.getProjectilesForRoom(roomWithTurret.id).length, 0, 'Frozen mode must clear projectiles');

    // Case 2: Non-lethal mode defuses projectile collision with player
    dev.hazardMode = 'non-lethal';
    physics.roomProjectiles.set(roomWithTurret.id, [{
      id: 'p2', x: player.x + 10, y: player.y + 10, vx: 0, vy: 0, width: 20, height: 6, color: '#f00',
      turretId: 't1', life: 0, maxLife: 4, direction: 'right', angle: 0
    }]);

    let died = false;
    const nonLethalResult = physics.updateLaserTurrets(player, roomWithTurret, [], 0.016, () => {
      died = true;
    });
    assert.equal(nonLethalResult, false, 'Non-lethal mode must not return true (no kill)');
    assert.equal(died, false, 'onPlayerDeath should NOT be called in non-lethal mode');
    assert.equal(physics.roomProjectiles.get(roomWithTurret.id).length, 0, 'Projectile should be consumed/deflected on contact');
  });

  await t.test('God Mode and Spike Disabling', () => {
    const physics = createMockPhysics();

    // Create a 20x20 room of empty air with a spike row at bottom
    const tiles = Array(20).fill(null).map(() => Array(20).fill(TileType.EMPTY));
    for (let c = 0; c < 20; c++) {
      tiles[19][c] = TileType.SPIKE;
    }
    const room = {
      id: 'test_spikes',
      tiles,
      themeColor: '#00f',
    };

    // Position player directly into spike hitbox (row 19 starts at y=760, forgiving top is 770)
    const player = new Player(100, 765);

    // 1. Normal mode: Spikes kill player
    dev.enabled = true;
    dev.godMode = false;
    dev.disableSpikes = false;

    let spikeDied = false;
    const diedNormal = physics.checkSpikeCollisions(player, room, () => {
      spikeDied = true;
    });
    assert.equal(diedNormal, true, 'Spike collision should kill player in normal mode');
    assert.equal(spikeDied, true);

    // 2. God Mode: Spikes do NOT kill player
    dev.godMode = true;
    spikeDied = false;
    const diedGod = physics.checkSpikeCollisions(player, room, () => {
      spikeDied = true;
    });
    assert.equal(diedGod, false, 'God mode must prevent spike death');
    assert.equal(spikeDied, false);

    // 3. Disable Spikes toggle: Spikes do NOT kill player even without full God mode
    dev.godMode = false;
    dev.disableSpikes = true;
    spikeDied = false;
    const diedDisabled = physics.checkSpikeCollisions(player, room, () => {
      spikeDied = true;
    });
    assert.equal(diedDisabled, false, 'Spike disable must prevent spike death');
    assert.equal(spikeDied, false);
  });

  await t.test('Fly Mode (No-Clip) and Infinite Air-Jump', () => {
    const physics = createMockPhysics();
    const tiles = Array(20).fill(null).map(() => Array(20).fill(TileType.SOLID)); // completely solid room
    const room = {
      id: 'solid_box',
      tiles,
      themeColor: '#fff',
    };

    const player = new Player(200, 200);

    // With fly mode enabled, player can move directly through solid geometry
    dev.enabled = true;
    dev.flyMode = true;

    // Simulating pressing right
    const input = { left: false, right: true, up: false, down: false, jump: false, action: false };
    physics.update(player, room, input, 0.1, []);

    // Player position should have moved right without being blocked by solid tile
    assert.ok(player.x > 200, `Player should move right through solids in fly mode (x=${player.x})`);
    assert.equal(player.vy, 0, 'Vertical velocity should remain 0 when no vertical input in fly mode (no gravity)');

    // Test Infinite Air-Jump in open space
    const airRoom = {
      id: 'air_box',
      tiles: Array(20).fill(null).map(() => Array(20).fill(TileType.EMPTY)),
      themeColor: '#fff',
    };
    dev.flyMode = false;
    dev.infiniteJump = true;
    player.setPosition(200, 400);
    player.isGrounded = false;
    player.coyoteTime = 0; // cannot jump normally in air
    player.isJumping = false;
    player.jumpBufferTime = 0;

    // Press jump in mid-air
    const jumpInput = { left: false, right: false, up: false, down: false, jump: true, jumpJustPressed: true, action: false };
    physics.update(player, airRoom, jumpInput, 0.016, []);

    assert.ok(player.vy < 0, `Player should jump upwards in mid-air with infiniteJump enabled (vy=${player.vy})`);
  });

  await t.test('LevelMap Dev Helpers: Keys, Prisms, Reset, and Reveal Map', () => {
    const map = WorldRegistry.getWorld('demo').load();

    // 1. Give All Keys
    map.collectAllKeys();
    for (const room of map.rooms.values()) {
      if (room.collectibles) {
        for (const col of room.collectibles) {
          if (col.type === 'key') {
            assert.equal(map.isItemCollected(col.id), true, `Key ${col.id} should be collected`);
          }
        }
      }
    }

    // 2. Collect All Prisms
    map.collectAllPrisms();
    for (const room of map.rooms.values()) {
      if (room.collectibles) {
        for (const col of room.collectibles) {
          if (col.type === 'prism' || col.type === 'core') {
            assert.equal(map.isItemCollected(col.id), true, `Prism ${col.id} should be collected`);
          }
        }
      }
    }

    // 3. Reset Room Collectibles
    const firstRoom = Array.from(map.rooms.values())[0];
    map.resetRoomCollectibles(firstRoom);
    if (firstRoom.collectibles) {
      for (const col of firstRoom.collectibles) {
        assert.equal(map.isItemCollected(col.id), false, `Collectible ${col.id} should be uncollected after reset`);
      }
    }

    // 4. Mark All Visited
    map.markAllVisited();
    for (const room of map.rooms.values()) {
      assert.equal(map.isVisited(room.coords.x, room.coords.y), true, `Room at (${room.coords.x}, ${room.coords.y}) must be visited`);
    }
  });

  await t.test('Hazard Mode "frozen" triggers immediate projectile purge via subscription', () => {
    const physics = createMockPhysics();
    dev.enabled = true;
    dev.hazardMode = 'normal';
    physics.setDevManager(dev);

    // Plant in-flight projectiles in physics engine
    physics.roomProjectiles.set('room_1', [
      { id: 'p1', x: 100, y: 100, vx: 50, vy: 0, width: 20, height: 6, color: '#f00', turretId: 't1', life: 0, maxLife: 4, direction: 'right', angle: 0 }
    ]);
    physics.roomProjectiles.set('room_2', [
      { id: 'p2', x: 200, y: 200, vx: 50, vy: 0, width: 20, height: 6, color: '#0ff', turretId: 't2', life: 0, maxLife: 4, direction: 'down', angle: 0 }
    ]);

    assert.equal(physics.getProjectilesForRoom('room_1').length, 1);
    assert.equal(physics.getProjectilesForRoom('room_2').length, 1);

    // Switch hazard mode to frozen
    dev.setHazardMode('frozen');

    // Both room projectile lists must be immediately purged
    assert.equal(physics.getProjectilesForRoom('room_1').length, 0, 'Room 1 projectiles must be purged on freeze');
    assert.equal(physics.getProjectilesForRoom('room_2').length, 0, 'Room 2 projectiles must be purged on freeze');
  });

  await t.test('Cardinal Jump reachability predicate validates existing vs non-existent neighbor rooms', () => {
    const map = WorldRegistry.getWorld('demo').load();

    const isCardinalJumpPossible = (currentRoom, dir) => {
      const cur = currentRoom.coords;
      let targetX = cur.x;
      let targetY = cur.y;
      if (dir === 'up') targetY += 1;
      else if (dir === 'down') targetY -= 1;
      else if (dir === 'left') targetX -= 1;
      else if (dir === 'right') targetX += 1;

      const hasExit = currentRoom.exits ? currentRoom.exits[dir] !== false : true;
      const targetRoom = map.getRoom(targetX, targetY);
      return hasExit && targetRoom !== undefined;
    };

    // Genesis Core at (0, 0): Only RIGHT to (1, 0) is possible
    const genesis = map.getRoom(0, 0);
    assert.equal(isCardinalJumpPossible(genesis, 'right'), true, 'Right to (1,0) should be possible from (0,0)');
    assert.equal(isCardinalJumpPossible(genesis, 'left'), false, 'Left from (0,0) should be disabled');
    assert.equal(isCardinalJumpPossible(genesis, 'up'), false, 'Up from (0,0) should be disabled');
    assert.equal(isCardinalJumpPossible(genesis, 'down'), false, 'Down from (0,0) should be disabled');

    // The Spire at (2, 1): Only UP to (2, 2) and DOWN to (2, 0) are possible
    const spire = map.getRoom(2, 1);
    assert.equal(isCardinalJumpPossible(spire, 'up'), true, 'Up to (2,2) should be possible from (2,1)');
    assert.equal(isCardinalJumpPossible(spire, 'down'), true, 'Down to (2,0) should be possible from (2,1)');
    assert.equal(isCardinalJumpPossible(spire, 'left'), false, 'Left from (2,1) should be disabled');
    assert.equal(isCardinalJumpPossible(spire, 'right'), false, 'Right from (2,1) should be disabled');
  });

  await t.test('DevManager hasActiveModifiers accurately detects active cheats and resets cleanly', () => {
    dev.resetToDefaults();
    assert.equal(dev.hasActiveModifiers(), false);

    dev.godMode = true;
    assert.equal(dev.hasActiveModifiers(), true);
    dev.godMode = false;
    assert.equal(dev.hasActiveModifiers(), false);

    dev.hazardMode = 'frozen';
    assert.equal(dev.hasActiveModifiers(), true);
    dev.hazardMode = 'non-lethal';
    assert.equal(dev.hasActiveModifiers(), true);
    dev.hazardMode = 'normal';
    assert.equal(dev.hasActiveModifiers(), false);

    dev.flyMode = true;
    assert.equal(dev.hasActiveModifiers(), true);
    dev.flyMode = false;
    assert.equal(dev.hasActiveModifiers(), false);

    dev.infiniteJump = true;
    assert.equal(dev.hasActiveModifiers(), true);
    dev.infiniteJump = false;
    assert.equal(dev.hasActiveModifiers(), false);

    dev.disableSpikes = true;
    assert.equal(dev.hasActiveModifiers(), true);
    dev.resetToDefaults();
    assert.equal(dev.hasActiveModifiers(), false);
  });

  await t.test('DevManager localStorage persistence preserves all dev options across reload', () => {
    const store = new Map();
    const originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };

    try {
      dev.resetToDefaults();
      dev.enabled = true;
      dev.setHazardMode('frozen');
      dev.setGodMode(true);
      dev.setFlyMode(true);
      dev.setInfiniteJump(true);
      dev.setDisableSpikes(true);
      dev.setShowHitboxes(true);
      dev.setShowTileGrid(true);
      dev.setTimeScale(0.5);
      dev.setPaused(true);

      // Verify localStorage was written
      assert.ok(globalThis.localStorage.getItem('hyperfold_dev_settings'));
      const saved = JSON.parse(globalThis.localStorage.getItem('hyperfold_dev_settings'));
      assert.equal(saved.enabled, true);
      assert.equal(saved.hazardMode, 'frozen');
      assert.equal(saved.godMode, true);
      assert.equal(saved.flyMode, true);
      assert.equal(saved.infiniteJump, true);
      assert.equal(saved.disableSpikes, true);
      assert.equal(saved.showHitboxes, true);
      assert.equal(saved.showTileGrid, true);
      assert.equal(saved.revealFullMap, undefined, 'revealFullMap should NOT be saved to localStorage');
      assert.equal(saved.timeScale, 0.5);
      assert.equal(saved.isPaused, true);

      // Simulate app reload by wiping DevManager in-memory state and calling loadFromStorage()
      dev.hazardMode = 'normal';
      dev.godMode = false;
      dev.flyMode = false;
      dev.infiniteJump = false;
      dev.disableSpikes = false;
      dev.showHitboxes = false;
      dev.showTileGrid = false;
      dev.timeScale = 1.0;
      dev.isPaused = false;

      // Reload
      dev.loadFromStorage();

      assert.equal(dev.enabled, true);
      assert.equal(dev.hazardMode, 'frozen');
      assert.equal(dev.godMode, true);
      assert.equal(dev.flyMode, true);
      assert.equal(dev.infiniteJump, true);
      assert.equal(dev.disableSpikes, true);
      assert.equal(dev.showHitboxes, true);
      assert.equal(dev.showTileGrid, true);
      assert.equal(dev.timeScale, 0.5);
      assert.equal(dev.isPaused, true);

      // Test resetToDefaults also updates localStorage
      dev.resetToDefaults();
      const resetSaved = JSON.parse(globalThis.localStorage.getItem('hyperfold_dev_settings'));
      assert.equal(resetSaved.hazardMode, 'normal');
      assert.equal(resetSaved.godMode, false);
      assert.equal(resetSaved.flyMode, false);
      assert.equal(resetSaved.timeScale, 1.0);
      assert.equal(resetSaved.isPaused, false);
    } finally {
      if (originalLocalStorage) {
        globalThis.localStorage = originalLocalStorage;
      } else {
        delete globalThis.localStorage;
      }
    }
  });

  await t.test('LevelMap.onMapChanged fires notifications when rooms are added or visited', () => {
    const map = new ProceduralLevelMap('normal', 'TEST_SEED');
    let notificationCount = 0;
    const unsubscribe = map.onMapChanged(() => {
      notificationCount++;
    });

    // Genesis room is already at (0, 0). Adding an adjacent room should trigger notification
    const newRoom = map.getRoom(1, 0, true);
    assert.ok(newRoom, 'Room should be generated');
    assert.ok(notificationCount >= 1, 'onMapChanged listener should have been notified');

    const prevCount = notificationCount;
    map.markVisited(1, 0);
    assert.equal(notificationCount, prevCount + 1, 'Marking visited should trigger notification');

    // Unsubscribe
    unsubscribe();
    map.markVisited(2, 0);
    assert.equal(notificationCount, prevCount + 1, 'Unsubscribed listener should not be notified');
  });

  await t.test('ProceduralLevelMap: getRoom(depth, 0, true) enables VOID tab depth and sanctuary warping', () => {
    const map = new ProceduralLevelMap('normal', 'HYPERFOLD');

    // Without forceGenerate, jumping to depth 10 with no neighbors returns undefined
    const distantWithoutForce = map.getRoom(10, 0, false);
    assert.equal(distantWithoutForce, undefined, 'Unconnected distant room without forceGenerate should be undefined');

    // With forceGenerate=true, VOID tab buttons (Depth 10, 25, 50, 100) generate the sector on demand
    const depth10Room = map.getRoom(10, 0, true);
    assert.ok(depth10Room, 'Depth 10 room should be synthesized on demand');
    assert.equal(depth10Room.coords.x, 10);
    assert.equal(depth10Room.coords.y, 0);

    const depth25Room = map.getRoom(25, 0, true);
    assert.ok(depth25Room, 'Depth 25 room should be synthesized on demand');

    const depth50Room = map.getRoom(50, 0, true);
    assert.ok(depth50Room, 'Depth 50 room should be synthesized on demand');

    const depth100Room = map.getRoom(100, 0, true);
    assert.ok(depth100Room, 'Depth 100 room should be synthesized on demand');

    // Power Sanctuary at depth 8k (e.g. depth 8, 16, 24, 32)
    const sanctuaryRoom = map.getRoom(8, 0, true);
    assert.ok(sanctuaryRoom, 'Power sanctuary room should be synthesized');
    assert.ok(sanctuaryRoom.title.includes('Power Sanctuary'), 'Depth 8 sector should be a Power Sanctuary');
    assert.equal(sanctuaryRoom.laserBarriers?.length || 0, 0, 'Power sanctuary should have 0 laser barriers');
    assert.equal(sanctuaryRoom.laserTurrets?.length || 0, 0, 'Power sanctuary should have 0 laser turrets');
  });

  await t.test('ProceduralLevelMap: markAllVisited discovers adjacent frontier rooms and expands iteratively', () => {
    const map = new ProceduralLevelMap('normal', 'HYPERFOLD');

    // Initial state: only Genesis Core (0, 0)
    assert.equal(map.getTotalRoomsCount(), 1);
    assert.equal(map.getDiscoveredRoomsCount(), 1);

    let notifyFired = false;
    map.onMapChanged(() => {
      notifyFired = true;
    });

    // Calling markAllVisited should mark existing rooms visited AND generate the adjacent frontier rooms
    map.markAllVisited();

    assert.ok(notifyFired, 'Map change notification should fire');
    assert.ok(map.getTotalRoomsCount() > 1, 'Total rooms count should increase with frontier rooms generated');

    const initialTotal = map.getTotalRoomsCount();
    // Second reveal: should visit those frontier rooms and expand into the next depth layer
    map.markAllVisited();
    assert.ok(map.getDiscoveredRoomsCount() >= initialTotal, 'Previously generated rooms should now be discovered');
    assert.ok(map.getTotalRoomsCount() > initialTotal, 'Next frontier should be generated on subsequent reveal');
  });

  await t.test('DevManager master toggle: toggleEnabled() enables/disables dev mode without resetting configured modifiers', () => {
    dev.resetToDefaults();
    dev.enabled = true;

    // Configure multiple active dev modifiers
    dev.setHazardMode('frozen');
    dev.setGodMode(true);
    dev.setFlyMode(true);
    dev.setInfiniteJump(true);
    dev.setTimeScale(2.5);

    assert.equal(dev.enabled, true);
    assert.equal(dev.hasActiveModifiers(), true);
    assert.equal(dev.isDynamicHazardLethal(), false);
    assert.equal(dev.isDynamicHazardFrozen(), true);
    assert.equal(dev.isSpikeLethal(), false);

    // Toggle Dev Mode OFF (master switch)
    dev.toggleEnabled(false);

    assert.equal(dev.enabled, false);
    // Configured modifier settings must be preserved (not reset!)
    assert.equal(dev.hazardMode, 'frozen', 'Hazard mode setting should be preserved');
    assert.equal(dev.godMode, true, 'God mode setting should be preserved');
    assert.equal(dev.flyMode, true, 'Fly mode setting should be preserved');
    assert.equal(dev.infiniteJump, true, 'Infinite jump setting should be preserved');
    assert.equal(dev.timeScale, 2.5, 'Timescale setting should be preserved');
    assert.equal(dev.hasActiveModifiers(), true, 'hasActiveModifiers should still be true while suspended');

    // But physics/hazard checks must return vanilla/normal behavior while disabled
    assert.equal(dev.isDynamicHazardLethal(), true, 'Hazards should be lethal while dev mode is disabled');
    assert.equal(dev.isDynamicHazardFrozen(), false, 'Hazards should not be frozen while dev mode is disabled');
    assert.equal(dev.isSpikeLethal(), true, 'Spikes should be lethal while dev mode is disabled');

    // Toggle Dev Mode back ON
    dev.toggleEnabled(true);

    assert.equal(dev.enabled, true);
    assert.equal(dev.isDynamicHazardLethal(), false, 'Hazards should be neutralized again after re-enabling');
    assert.equal(dev.isDynamicHazardFrozen(), true, 'Hazards should be frozen again after re-enabling');
    assert.equal(dev.isSpikeLethal(), false, 'Spikes should be harmless again after re-enabling');
  });

  // Clean up dev manager state
  dev.resetToDefaults();
  dev.enabled = false;
});
