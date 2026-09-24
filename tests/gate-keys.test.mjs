import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { LevelLoader } = require('./dist-world/world/LevelLoader.js');
const { LevelMap } = require('./dist-world/world/LevelMap.js');
const { ScreenData, TileType, FACE_SIZE, TILE_SIZE, GATE_KEY_PALETTE, getGateColor } = require('./dist-world/world/ScreenData.js');
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { Player } = require('./dist-world/entities/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');

function createMockAudio() {
  let deathCount = 0;
  let gateLockedCount = 0;
  return {
    playDeath: () => { deathCount++; },
    playBounce: () => {},
    playLand: () => {},
    playJump: () => {},
    playDropThrough: () => {},
    playGateLocked: () => { gateLockedCount++; },
    playKeyCollect: () => {},
    playGateOpen: () => {},
    get deathCount() { return deathCount; },
    get gateLockedCount() { return gateLockedCount; },
  };
}

function createMockParticles() {
  const sparks = [];
  return {
    emitSparks: (x, y, count, color) => {
      sparks.push({ x, y, count, color });
    },
    emitDust: () => {},
    emitLaserSparks: () => {},
    emitLaserCharge: () => {},
    emitLaserVaporize: () => {},
    emitLaserMuzzle: () => {},
    emitPlayerExplosion: () => {},
    sparks,
  };
}

test('Gate Keys, Locked Exits & Key Inventory Verification', async (t) => {
  await t.test('Deterministic Color Coding (getGateColor)', () => {
    // 1. Explicit color takes top priority
    assert.equal(getGateColor('key_alpha', '#123456'), '#123456');

    // 2. Keyword heuristic mapping
    assert.equal(getGateColor('key_gold_chamber'), '#ffe600');
    assert.equal(getGateColor('gate_yellow_citadel'), '#ffe600');
    assert.equal(getGateColor('key_cyan_pass'), '#00f0ff');
    assert.equal(getGateColor('gate_teal_vault'), '#00f0ff');
    assert.equal(getGateColor('key_magenta_core'), '#ff0077');
    assert.equal(getGateColor('gate_pink_barrier'), '#ff0077');
    assert.equal(getGateColor('key_emerald_spire'), '#00ff66');
    assert.equal(getGateColor('key_green_access'), '#00ff66');
    assert.equal(getGateColor('key_purple_rift'), '#b026ff');
    assert.equal(getGateColor('key_violet_conduit'), '#b026ff');
    assert.equal(getGateColor('key_orange_sub'), '#ff6600');
    assert.equal(getGateColor('key_blue_array'), '#0088ff');
    assert.equal(getGateColor('key_red_sanctum'), '#ff2244');

    // 3. Fallback deterministic hash mapping
    const colorA = getGateColor('arbitrary_key_id_999');
    const colorB = getGateColor('arbitrary_key_id_999');
    assert.equal(colorA, colorB, 'Hash color must be 100% deterministic');
    assert.ok(GATE_KEY_PALETTE.includes(colorA), 'Hash color must belong to GATE_KEY_PALETTE');

    // 4. Color equivalence between key and gate with matching ID
    const keyId = 'security_lock_delta_7';
    assert.equal(getGateColor(keyId), getGateColor(keyId), 'Key and matching gate have identical color');
  });

  await t.test('Declarative Room Parsing: Gate Keys & Locked Exits', () => {
    const rawRoom = {
      id: 'room_gate_test',
      coords: [1, 2],
      title: 'Gate Test Chamber',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      grid: Array.from({ length: 20 }, (_, r) =>
        r === 0 || r === 18 || r === 19 ? '#'.repeat(20) : '#' + ' '.repeat(18) + '#'
      ),
      exits: {
        left: false,
        right: {
          id: 'key_security_prime',
          label: 'Security Gate Prime',
          color: '#ff0077',
        },
        up: false,
        down: false,
      },
      collectibles: [
        {
          id: 'key_security_prime',
          type: 'key',
          label: 'Prime Access Keycard',
          color: '#ff0077',
          pos: [200, 300],
        },
      ],
    };

    const room = LevelLoader.parseRoom(rawRoom);

    // Verified gate attached directly in exits and gates lookup
    assert.ok(room.gates, 'Room must have gates lookup parsed');
    assert.ok(room.gates.right, 'Right exit must have gate configuration');
    assert.equal(room.gates.right.id, 'key_security_prime');
    assert.equal(room.gates.right.color, '#ff0077');
    assert.equal(room.gates.right.label, 'Security Gate Prime');

    // Verified exits.right preserves the gate object directly
    assert.equal(typeof room.exits.right, 'object', 'Gated exit is stored directly in exits');
    assert.equal((room.exits.right).id, 'key_security_prime');

    // Verified key collectible parsed
    assert.equal(room.collectibles.length, 1);
    const keyCol = room.collectibles[0];
    assert.equal(keyCol.id, 'key_security_prime');
    assert.equal(keyCol.type, 'key');
    assert.equal(keyCol.color, '#ff0077');
    assert.equal(keyCol.label, 'Prime Access Keycard');
    assert.equal(keyCol.x, 200);
    assert.equal(keyCol.y, 300);
  });

  await t.test('Declarative Room Parsing: Shorthand string syntax & closedExits alias', () => {
    const rawRoomShorthand = {
      id: 'room_shorthand',
      coords: [0, 0],
      title: 'Shorthand Test',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      grid: Array.from({ length: 20 }, () => '#'.repeat(20)),
      exits: {
        up: 'key_sky_gate',
      },
    };
    const roomA = LevelLoader.parseRoom(rawRoomShorthand);
    assert.ok(roomA.gates?.up);
    assert.equal(roomA.gates.up.id, 'key_sky_gate');
    assert.equal(typeof roomA.exits.up, 'object');
    assert.equal(roomA.exits.up.id, 'key_sky_gate');

    const rawRoomClosedExits = {
      id: 'room_closed_alias',
      coords: [0, 0],
      title: 'Closed Exits Alias Test',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      grid: Array.from({ length: 20 }, () => '#'.repeat(20)),
      exits: { down: true },
      closedExits: {
        down: { id: 'key_dungeon_depths' },
      },
    };
    const roomB = LevelLoader.parseRoom(rawRoomClosedExits);
    assert.ok(roomB.gates?.down);
    assert.equal(roomB.gates.down.id, 'key_dungeon_depths');
    assert.equal(typeof roomB.exits.down, 'object');
    assert.equal(roomB.exits.down.id, 'key_dungeon_depths');
  });

  await t.test('LevelMap Key Inventory and Exit Open State', () => {
    const levelMap = new LevelMap();

    const room = {
      id: 'room_alpha',
      coords: { x: 0, y: 0 },
      title: 'Alpha Sector',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      exits: { left: true, right: false, up: false, down: false },
      gates: {
        right: { id: 'key_beta_gate', color: '#00ff66' },
      },
      collectibles: [
        {
          id: 'key_beta_gate',
          type: 'key',
          x: 400,
          y: 400,
          color: '#00ff66',
          label: 'Beta Gate Key',
        },
      ],
    };
    levelMap.addRoom(room);

    // Initial state: key not collected
    assert.equal(levelMap.hasKey('key_beta_gate'), false);
    assert.equal(levelMap.isExitOpen(room, 'right'), false, 'Locked exit must be closed without key');
    assert.equal(levelMap.isExitOpen(room, 'left'), true, 'Un-gated open exit must be open');
    assert.equal(levelMap.getCollectedKeys().length, 0);

    // Collect the key
    levelMap.collectItem('key_beta_gate');
    assert.equal(levelMap.hasKey('key_beta_gate'), true);
    assert.equal(levelMap.isExitOpen(room, 'right'), true, 'Gated exit automatically opens once key is collected');

    // Check collected keys inventory
    const inventory = levelMap.getCollectedKeys();
    assert.equal(inventory.length, 1);
    assert.equal(inventory[0].id, 'key_beta_gate');
    assert.equal(inventory[0].color, '#00ff66');
    assert.equal(inventory[0].label, 'Beta Gate Key');
  });

  await t.test('Friendly Gate Key Label Resolution and Inventory Display', () => {
    const levelMap = new LevelMap();

    const room = {
      id: 'room_labels',
      coords: { x: 0, y: 0 },
      title: 'Label Test Sector',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      exits: {
        left: false,
        right: { id: 'key_gate_only', label: 'Quantum Firewall', color: '#ff0055' },
        up: false,
        down: false,
      },
      collectibles: [
        {
          id: 'key_with_col_label',
          type: 'key',
          x: 200,
          y: 200,
          label: 'Hyperfold Passkey',
        },
        {
          id: 'key_no_label',
          type: 'key',
          x: 400,
          y: 400,
        },
      ],
    };
    levelMap.addRoom(room);

    // 1. Label resolved from collectible
    assert.equal(levelMap.getKeyLabel('key_with_col_label'), 'Hyperfold Passkey');

    // 2. Label resolved from exit gate when collectible doesn't define one
    assert.equal(levelMap.getKeyLabel('key_gate_only'), 'Quantum Firewall');

    // 3. Fallback when neither has a label
    assert.equal(levelMap.getKeyLabel('key_no_label'), undefined);

    // 4. Collect keys and check inventory representation
    levelMap.collectItem('key_with_col_label');
    levelMap.collectItem('key_gate_only');
    levelMap.collectItem('key_no_label');

    const inventory = levelMap.getCollectedKeys();
    assert.equal(inventory.length, 3);

    const keyWithColLabel = inventory.find((k) => k.id === 'key_with_col_label');
    const keyGateOnly = inventory.find((k) => k.id === 'key_gate_only');
    const keyNoLabel = inventory.find((k) => k.id === 'key_no_label');

    assert.equal(keyWithColLabel?.label, 'Hyperfold Passkey');
    assert.equal(keyGateOnly?.label, 'Quantum Firewall');
    assert.equal(keyNoLabel?.label, undefined);

    // Check display text logic (label || id)
    assert.equal(keyWithColLabel.label || keyWithColLabel.id, 'Hyperfold Passkey');
    assert.equal(keyGateOnly.label || keyGateOnly.id, 'Quantum Firewall');
    assert.equal(keyNoLabel.label || keyNoLabel.id, 'key_no_label');

    // 5. getKeyItemLabel specifically checks collectible keys
    assert.equal(levelMap.getKeyItemLabel('key_with_col_label'), 'Hyperfold Passkey');
    assert.equal(levelMap.getKeyItemLabel('key_gate_only'), undefined);

    // 6. getRequiredKeyLabel prioritizes key collectible label over gate barrier label
    const roomWithBoth = {
      coords: { x: 99, y: 99 },
      themeColor: '#00ffcc',
      spawnPoint: { x: 100, y: 100 },
      tiles: [[0]],
      exits: {
        right: {
          id: 'key_multi_room',
          label: 'Forcefield Barrier Door',
        },
        left: false,
        up: false,
        down: false,
      },
      collectibles: [
        {
          id: 'key_multi_room',
          type: 'key',
          x: 200,
          y: 200,
          label: 'Master Access Card',
        },
      ],
    };
    levelMap.addRoom(roomWithBoth);
    assert.equal(levelMap.getKeyLabel('key_multi_room'), 'Master Access Card');
    assert.equal(levelMap.getRequiredKeyLabel(roomWithBoth.exits.right), 'Master Access Card');
  });

  await t.test('PhysicsEngine Boundary Enforcement: Blocked when Locked', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const levelMap = new LevelMap();
    physics.setLevelMap(levelMap);

    const room = {
      id: 'room_enforcement',
      coords: { x: 0, y: 0 },
      title: 'Enforcement Sector',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      exits: { left: false, right: false, up: false, down: false },
      gates: {
        right: { id: 'key_sigma_lock', color: '#ff0077', label: 'Sigma Barrier' },
      },
      collectibles: [],
    };
    levelMap.addRoom(room);

    const player = new Player(FACE_SIZE - 20, 600);
    player.vx = 200;

    let lockedCallbackFired = false;
    let lockedGateId = '';
    const onGateLocked = (gate, dir) => {
      lockedCallbackFired = true;
      lockedGateId = gate.id;
      assert.equal(dir, 'right');
    };

    // Run physics update pushing player past the right boundary
    const input = { left: false, right: true, jump: false, down: false };
    const transition = physics.update(
      player,
      room,
      input,
      0.05,
      undefined,
      undefined,
      1.0,
      levelMap,
      onGateLocked
    );

    // Blocked: transition must be null
    assert.equal(transition, null, 'Transition must be null when gate is locked');
    assert.equal(player.vx, 0, 'Horizontal velocity zeroed upon hitting barrier');
    assert.equal(player.x, FACE_SIZE - player.width, 'Player clamped to edge');
    assert.equal(lockedCallbackFired, true, 'onGateLocked callback must trigger');
    assert.equal(lockedGateId, 'key_sigma_lock');
    assert.ok(audio.gateLockedCount >= 1, 'playGateLocked audio must be played');
    assert.ok(particles.sparks.length >= 1, 'Gate sparks must be emitted');
    assert.equal(particles.sparks[0].color, '#ff0077', 'Sparks match gate color');
  });

  await t.test('PhysicsEngine Boundary Enforcement: Opens Automatically with Key', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const levelMap = new LevelMap();
    physics.setLevelMap(levelMap);

    const room = {
      id: 'room_enforcement_2',
      coords: { x: 0, y: 0 },
      title: 'Enforcement Sector 2',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      exits: { left: false, right: false, up: false, down: false },
      gates: {
        right: { id: 'key_sigma_lock', color: '#ff0077', label: 'Sigma Barrier' },
      },
      collectibles: [],
    };
    levelMap.addRoom(room);

    // Player collects the required key
    levelMap.collectItem('key_sigma_lock');

    const player = new Player(FACE_SIZE - 20, 600);
    player.vx = 200;

    const input = { left: false, right: true, jump: false, down: false };
    const transition = physics.update(
      player,
      room,
      input,
      0.05,
      undefined,
      undefined,
      1.0,
      levelMap
    );

    // Unlocked: transition must succeed
    assert.ok(transition, 'Transition must succeed when key is owned');
    assert.equal(transition.direction, 'right');
    assert.equal(transition.entryX, 4);
    assert.equal(transition.entryY, player.y);
  });

  await t.test('Sector Map getAdjacentUnexploredCoords respects Gate Keys', () => {
    const levelMap = new LevelMap();

    const roomA = {
      id: 'room_a',
      coords: { x: 0, y: 0 },
      title: 'Chamber A',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      exits: { left: false, right: false, up: false, down: false },
      gates: {
        right: { id: 'key_chamber_b' },
      },
      collectibles: [],
    };
    const roomB = {
      id: 'room_b',
      coords: { x: 1, y: 0 },
      title: 'Chamber B',
      themeColor: '#00e5ff',
      accentColor: '#0066ff',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      exits: { left: false, right: false, up: false, down: false },
      collectibles: [],
    };

    levelMap.addRoom(roomA);
    levelMap.addRoom(roomB);
    levelMap.markVisited(0, 0);

    // Without key, exit right is locked -> Chamber B is not in unexplored
    assert.equal(levelMap.getAdjacentUnexploredCoords().length, 0);

    // Collect the key -> exit right opens -> Chamber B is now unexplored candidate
    levelMap.collectItem('key_chamber_b');
    const unexplored = levelMap.getAdjacentUnexploredCoords();
    assert.equal(unexplored.length, 1);
    assert.equal(unexplored[0].x, 1);
    assert.equal(unexplored[0].y, 0);
    assert.equal(unexplored[0].fromDirection, 'right');
  });

  await t.test('Demo World Feature Integration: Warp Core Gate & Key', () => {
    const demoEntry = WorldRegistry.getWorld('demo');
    assert.ok(demoEntry, 'Demo world entry must exist');

    const levelMap = demoEntry.load();

    // 1. Sector (2, 2) Starlight Zenith contains the Warp Core Key
    const zenith = levelMap.getRoom(2, 2);
    assert.ok(zenith, 'Sector (2, 2) Starlight Zenith must exist');
    const warpKey = zenith.collectibles.find((c) => c.type === 'key' && c.id === 'key_warp_core');
    assert.ok(warpKey, 'Sector (2, 2) must contain key_warp_core');
    assert.equal(warpKey.color, '#ff0077', 'Key color is vibrant hot magenta');

    // 2. Sector (5, 0) Beyond Euclidean Space contains the locked right gate directly in exits
    const sector5 = levelMap.getRoom(5, 0);
    assert.ok(sector5, 'Sector (5, 0) must exist');
    assert.equal(typeof sector5.exits.right, 'object', 'Sector 5 right exit is gate object');
    assert.equal(sector5.exits.right.id, 'key_warp_core');
    assert.equal(sector5.exits.right.color, '#ff0077');
    assert.equal(sector5.exits.right.label, 'Warp Core Security Barrier');

    // Required key label must resolve to the collectible key's label ("Warp Core Key"), NOT the barrier's label ("Warp Core Security Barrier")
    assert.equal(warpKey.label, 'Warp Core Key');
    assert.equal(levelMap.getKeyLabel('key_warp_core'), 'Warp Core Key');
    assert.equal(levelMap.getRequiredKeyLabel(sector5.exits.right), 'Warp Core Key');

    // 3. Sector (6, 0) Prism Horizon contains the matching left gate directly in exits
    const sector6 = levelMap.getRoom(6, 0);
    assert.ok(sector6, 'Sector (6, 0) must exist');
    assert.equal(typeof sector6.exits.left, 'object', 'Sector 6 left exit is gate object');
    assert.equal(sector6.exits.left.id, 'key_warp_core');
    assert.equal(sector6.exits.left.color, '#ff0077');

    // 4. Color consistency across Key and Doors
    assert.equal(warpKey.color, sector5.exits.right.color);
    assert.equal(warpKey.color, sector6.exits.left.color);

    // 5. Progression flow: exit to Sector 6 closed until key collected
    assert.equal(levelMap.isExitOpen(sector5, 'right'), false);
    levelMap.collectItem('key_warp_core');
    assert.equal(levelMap.isExitOpen(sector5, 'right'), true);
    assert.equal(levelMap.isExitOpen(sector6, 'left'), true);

    const keys = levelMap.getCollectedKeys();
    assert.ok(keys.some((k) => k.id === 'key_warp_core'));
  });
});
