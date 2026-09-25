import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { LevelLoader } = require('./dist-world/world/LevelLoader.js');

// Import editor serialization functions (ESM)
import { createEmptyWorld, parseWorldJson, exportWorldJson, cloneRoom, sanitizeLaserTurret, moveSector, copySector } from '../editor/src/utils/serialization.ts';
import { validateWorld } from '../editor/src/utils/validator.ts';
import { PRESET_WORLDS } from '../editor/src/utils/presets.ts';
import { getAdjacentSectors, getAdjacentCoords, getOppositeDirection } from '../editor/src/utils/navigation.ts';
import { TILE_DEFINITIONS, TILE_GLYPH_ORDER, TILE_HOTKEYS } from '../editor/src/utils/tileDefinitions.ts';

test('Editor & Game Engine Integration Verification', async (t) => {
  await t.test('createEmptyWorld produces valid world loadable by Hyperfold LevelLoader', () => {
    const blank = createEmptyWorld();
    const jsonStr = exportWorldJson(blank);
    
    // Hyperfold loader parse
    const result = WorldRegistry.loadWorldFromJsonString(jsonStr);
    assert.ok(result.map);
    assert.equal(result.map.getAllRooms().length, 1);
    assert.equal(result.title, 'Custom Hypercube World');
    assert.deepEqual(result.startingCoords, { x: 0, y: 0 });
  });

  await t.test('Mini world preset roundtrips cleanly and matches Hyperfold LevelLoader expectations', () => {
    const mini = PRESET_WORLDS.find((p) => p.id === 'mini')?.get();
    assert.ok(mini);
    assert.equal(mini.rooms.length, 3);

    // Diagnostics validation
    const issues = validateWorld(mini);
    const errors = issues.filter((i) => i.severity === 'error');
    assert.equal(errors.length, 0, `Expected 0 validation errors, got: ${JSON.stringify(errors)}`);

    // Export to JSON string
    const exportedJson = exportWorldJson(mini);

    // Load with game engine
    const { map, startingCoords } = WorldRegistry.loadWorldFromJsonString(exportedJson);
    assert.equal(map.getAllRooms().length, 3);
    assert.deepEqual(startingCoords, { x: 0, y: 0 });

    const room0 = map.getRoom(0, 0);
    assert.ok(room0);
    assert.equal(room0.collectibles.length, 3);
    assert.equal(room0.laserTurrets?.length, 1);

    const room1 = map.getRoom(1, 0);
    assert.ok(room1);
    assert.equal(room1.movingPlatforms?.length, 1);
    assert.equal(room1.laserTurrets?.length, 2);

    const room2 = map.getRoom(2, 0);
    assert.ok(room2);
    assert.equal(room2.laserBarriers?.length, 1);
  });

  await t.test('cloneRoom duplicates sector with new coordinates and distinct ID', () => {
    const blank = createEmptyWorld();
    const sourceRoom = blank.rooms[0];
    const cloned = cloneRoom(sourceRoom, [1, 0]);

    assert.equal(cloned.coords[0], 1);
    assert.equal(cloned.coords[1], 0);
    assert.equal(cloned.id, 'room_1_0');
    assert.notEqual(cloned.id, sourceRoom.id);
  });

  await t.test('validateWorld flags hazards on spawn point and invalid starting coords', () => {
    const world = createEmptyWorld();
    world.startingCoords = [99, 99]; // non-existent
    
    // Put spawn point in a solid block
    world.rooms[0].spawnPoint = [0, 0]; // row 0, col 0 is '#'
    
    const issues = validateWorld(world);
    const hasMissingStart = issues.some((i) => i.id === 'missing-starting-room');
    const hasSolidSpawn = issues.some((i) => i.id.startsWith('spawn-in-solid'));

    assert.ok(hasMissingStart, 'Should detect missing starting room');
    assert.ok(hasSolidSpawn, 'Should detect spawn in solid wall');
  });

  await t.test('all entity schema properties roundtrip cleanly through editor and engine', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];

    // Configure all schema properties on moving platform
    room.movingPlatforms = [
      {
        id: 'plat_schema_test',
        startX: 100,
        startY: 200,
        endX: 300,
        endY: 400,
        width: 120,
        height: 24,
        speed: 150,
        pauseTime: 0.8,
        initialProgress: 0.25,
        themeColor: '#ff00ff',
        oneWay: false,
      },
    ];

    // Configure all schema properties on laser barrier (including harmonic movement)
    room.laserBarriers = [
      {
        id: 'barrier_schema_test',
        startX1: 150,
        startY1: 300,
        startX2: 450,
        startY2: 300,
        endX1: 150,
        endY1: 500,
        endX2: 450,
        endY2: 500,
        speed: 90,
        pauseTime: 0.5,
        initialProgress: 0.5,
        activeDuration: 1.5,
        inactiveDuration: 2.5,
        warningDuration: 0.75,
        initialPhase: 0.33,
        themeColor: '#ff00aa',
        width: 6,
      },
    ];

    // Configure all schema properties on laser turret (including custom angle, projectile & beam fields)
    room.laserTurrets = [
      {
        id: 'turret_schema_test',
        x: 400,
        y: 200,
        direction: 'down',
        angle: 45,
        mode: 'beam',
        activeDuration: 3.0,
        inactiveDuration: 1.5,
        warningDuration: 0.5,
        initialPhase: 0.1,
        themeColor: '#00ffaa',
      },
      {
        id: 'turret_projectile_test',
        x: 200,
        y: 300,
        direction: 'right',
        angle: 0,
        mode: 'projectile',
        fireInterval: 1.2,
        fireOffset: 0.4,
        projectileSpeed: 380,
        projectileLength: 28,
        themeColor: '#ffbb00',
      },
    ];

    // Configure bounce pad custom velocities
    room.bounceProps = {
      '17,1': { vy: -1800, vx: 350 },
    };

    // Serialize and re-parse with editor
    const jsonStr = exportWorldJson(world);
    const parsedWorld = parseWorldJson(jsonStr);
    const pRoom = parsedWorld.rooms[0];

    assert.equal(pRoom.movingPlatforms?.[0].height, 24);
    assert.equal(pRoom.movingPlatforms?.[0].initialProgress, 0.25);
    assert.equal(pRoom.movingPlatforms?.[0].themeColor, '#ff00ff');
    assert.equal(pRoom.movingPlatforms?.[0].oneWay, false);

    assert.equal(pRoom.laserBarriers?.[0].endX1, 150);
    assert.equal(pRoom.laserBarriers?.[0].speed, 90);
    assert.equal(pRoom.laserBarriers?.[0].warningDuration, 0.75);
    assert.equal(pRoom.laserBarriers?.[0].initialPhase, 0.33);
    assert.equal(pRoom.laserBarriers?.[0].width, 6);

    assert.equal(pRoom.laserTurrets?.[0].angle, 45);
    assert.equal(pRoom.laserTurrets?.[0].inactiveDuration, 1.5);
    assert.equal(pRoom.laserTurrets?.[1].fireOffset, 0.4);
    assert.equal(pRoom.laserTurrets?.[1].projectileSpeed, 380);
    assert.equal(pRoom.laserTurrets?.[1].projectileLength, 28);

    assert.deepEqual(pRoom.bounceProps?.['17,1'], { vy: -1800, vx: 350 });

    // Load with game engine LevelLoader & WorldRegistry
    const engineResult = WorldRegistry.loadWorldFromJsonString(jsonStr);
    const engineRoom = engineResult.map.getRoom(0, 0);
    assert.ok(engineRoom);
    assert.equal(engineRoom.movingPlatforms?.[0].height, 24);
    assert.equal(engineRoom.laserBarriers?.[0].warningDuration, 0.75);
    assert.equal(engineRoom.laserTurrets?.[0].angle, 45);
    assert.equal(engineRoom.laserTurrets?.[1].projectileSpeed, 380);
  });

  await t.test('parseWorldJson imports demo world.json manifest by resolving external room files', () => {
    const demoWorldJsonPath = path.resolve('worlds/demo/world.json');
    const demoWorldJson = fs.readFileSync(demoWorldJsonPath, 'utf8');

    const world = parseWorldJson(demoWorldJson);
    assert.equal(world.id, 'demo');
    assert.equal(world.rooms.length, 10, 'Expected 10 rooms to be resolved from external room files');
    assert.deepEqual(world.startingCoords, [0, 0]);

    // Check specific rooms
    const genesis = world.rooms.find((r) => r.id === 'room_0_0');
    assert.ok(genesis, 'Genesis Core (room_0_0) must exist');
    assert.equal(genesis.title, 'Sector 0: Genesis Core');
    assert.equal(genesis.grid.length, 20);
    assert.notEqual(genesis.grid[18].trim(), '', 'Genesis floor must not be blank');

    const spire = world.rooms.find((r) => r.id === 'room_2_1');
    assert.ok(spire, 'The Spire (room_2_1) must exist');
    assert.deepEqual(spire.coords, [2, 1]);
    assert.ok(spire.movingPlatforms && spire.movingPlatforms.length > 0, 'The Spire must have moving platform');

    const crypt = world.rooms.find((r) => r.id === 'room_4_neg_1' || r.id === 'room_4_-1');
    assert.ok(crypt, 'Sub-Zero Crypt must exist');
    assert.deepEqual(crypt.coords, [4, -1]);

    // Ensure validateWorld passes
    const issues = validateWorld(world);
    const errors = issues.filter((i) => i.severity === 'error');
    assert.equal(errors.length, 0, `Expected 0 validation errors on imported demo world, got: ${JSON.stringify(errors)}`);
  });

  await t.test('parseWorldJson resolves custom external room files from externalRooms map', () => {
    const customManifest = JSON.stringify({
      id: 'custom_modular',
      title: 'Custom Modular World',
      startingCoords: [1, 2],
      rooms: [
        './rooms/custom_room_a.json',
        './rooms/custom_room_b.json',
      ],
    });

    const customRoomA = {
      id: 'custom_room_a',
      coords: [1, 2],
      title: 'Sector Alpha',
      themeColor: '#123456',
      accentColor: '#654321',
      exits: { left: false, right: true, up: false, down: false },
      grid: [
        '####################',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '####################',
        '####################',
      ],
    };

    const customRoomB = {
      id: 'custom_room_b',
      coords: [2, 2],
      title: 'Sector Beta',
      themeColor: '#aabbcc',
      accentColor: '#ddeeff',
      exits: { left: true, right: false, up: false, down: false },
      grid: [
        '####################',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '#                  #',
        '####################',
        '####################',
      ],
    };

    const externalRooms = {
      './rooms/custom_room_a.json': customRoomA,
      './rooms/custom_room_b.json': customRoomB,
    };

    const world = parseWorldJson(customManifest, externalRooms);
    assert.equal(world.rooms.length, 2);
    assert.equal(world.rooms[0].title, 'Sector Alpha');
    assert.equal(world.rooms[1].title, 'Sector Beta');
    assert.deepEqual(world.rooms[0].coords, [1, 2]);
    assert.deepEqual(world.rooms[1].coords, [2, 2]);
  });

  await t.test('parseWorldJson throws descriptive error when external room files are missing', () => {
    const unresolvableManifest = JSON.stringify({
      id: 'missing_world',
      title: 'Missing World',
      rooms: [
        './rooms/missing_alpha.json',
        './rooms/missing_beta.json',
      ],
    });

    assert.throws(
      () => parseWorldJson(unresolvableManifest),
      /references external room files that could not be resolved: \.\/rooms\/missing_alpha\.json, \.\/rooms\/missing_beta\.json/
    );
  });

  await t.test('Demo preset in PRESET_WORLDS loads 10 sectors cleanly and passes validation', () => {
    const demoPreset = PRESET_WORLDS.find((p) => p.id === 'demo');
    assert.ok(demoPreset, 'Demo preset must be registered in PRESET_WORLDS');

    const world = demoPreset.get();
    assert.equal(world.rooms.length, 10);
    assert.equal(world.title, 'Infinite Tesseract (10 Sectors)');

    const issues = validateWorld(world);
    const errors = issues.filter((i) => i.severity === 'error');
    assert.equal(errors.length, 0, `Expected 0 validation errors on demo preset, got: ${JSON.stringify(errors)}`);
  });

  await t.test('getAdjacentCoords and getOppositeDirection resolve directional invariants accurately', () => {
    assert.deepEqual(getAdjacentCoords([2, 0], 'up'), [2, 1]);
    assert.deepEqual(getAdjacentCoords([2, 0], 'down'), [2, -1]);
    assert.deepEqual(getAdjacentCoords([2, 0], 'left'), [1, 0]);
    assert.deepEqual(getAdjacentCoords([2, 0], 'right'), [3, 0]);

    assert.equal(getOppositeDirection('up'), 'down');
    assert.equal(getOppositeDirection('down'), 'up');
    assert.equal(getOppositeDirection('left'), 'right');
    assert.equal(getOppositeDirection('right'), 'left');
  });

  await t.test('getAdjacentSectors correctly identifies connected and adjacent sectors on the demo world', () => {
    const demoWorld = PRESET_WORLDS.find((p) => p.id === 'demo')?.get();
    assert.ok(demoWorld);

    // 1. Genesis Core (0, 0): Right connects to Neon Nexus (1, 0)
    const genesis = demoWorld.rooms.find((r) => r.id === 'room_0_0');
    assert.ok(genesis);
    const adjGenesis = getAdjacentSectors(genesis, demoWorld);

    assert.equal(adjGenesis.right.isConnected, true);
    assert.equal(adjGenesis.right.room?.id, 'room_1_0');
    assert.equal(adjGenesis.right.room?.title, 'Sector 1: Neon Nexus');
    assert.equal(adjGenesis.right.isTwoWay, true);

    assert.equal(adjGenesis.left.isConnected, false);
    assert.equal(adjGenesis.left.room, undefined);
    assert.equal(adjGenesis.up.isConnected, false);
    assert.equal(adjGenesis.down.isConnected, false);

    // 2. Quantum Junction (2, 0): Vertical connection up to The Spire (2, 1) and horizontal passages
    const junction = demoWorld.rooms.find((r) => r.id === 'room_2_0');
    assert.ok(junction);
    const adjJunction = getAdjacentSectors(junction, demoWorld);

    assert.equal(adjJunction.up.isConnected, true);
    assert.equal(adjJunction.up.room?.id, 'room_2_1');
    assert.equal(adjJunction.up.room?.title, 'Sector (2,1): The Spire');
    assert.equal(adjJunction.up.isTwoWay, true);

    assert.equal(adjJunction.left.isConnected, true);
    assert.equal(adjJunction.left.room?.id, 'room_1_0');

    assert.equal(adjJunction.right.isConnected, true);
    assert.equal(adjJunction.right.room?.id, 'room_3_0');

    // 3. The Spire (2, 1): Vertical chute connecting (2, 0) below and (2, 2) above
    const spire = demoWorld.rooms.find((r) => r.id === 'room_2_1');
    assert.ok(spire);
    const adjSpire = getAdjacentSectors(spire, demoWorld);

    assert.equal(adjSpire.down.isConnected, true);
    assert.equal(adjSpire.down.room?.id, 'room_2_0');
    assert.equal(adjSpire.up.isConnected, true);
    assert.equal(adjSpire.up.room?.id, 'room_2_2');
    assert.equal(adjSpire.up.room?.title, 'Sector (2,2): Starlight Zenith');

    // 4. Sub-Zero Crypt (4, -1): Under chasm of Gravity Well (4, 0)
    const crypt = demoWorld.rooms.find((r) => r.coords[0] === 4 && r.coords[1] === -1);
    assert.ok(crypt);
    const adjCrypt = getAdjacentSectors(crypt, demoWorld);
    assert.equal(adjCrypt.up.isConnected, true);
    assert.equal(adjCrypt.up.room?.id, 'room_4_0');
  });

  await t.test('Test in Game export messaging protocol parses and loads custom world into game engine', () => {
    const mini = PRESET_WORLDS.find((p) => p.id === 'mini')?.get();
    assert.ok(mini);
    const jsonStr = exportWorldJson(mini);

    // Simulate the message payload sent by ExportModal's Test in Game on default port 3000
    const messageEventData = {
      type: 'HYPERFOLD_LOAD_WORLD',
      json: jsonStr,
    };

    assert.equal(messageEventData.type, 'HYPERFOLD_LOAD_WORLD');
    assert.ok(typeof messageEventData.json === 'string');

    // Simulate game receiver: parses message and registers custom world
    const parsed = WorldRegistry.loadWorldFromJsonString(messageEventData.json);
    assert.equal(parsed.title, 'Mini Hypercube (3 Sectors)');
    assert.equal(parsed.map.getAllRooms().length, 3);

    const customId = `test_ingame_${Date.now()}`;
    WorldRegistry.registerWorld({
      id: customId,
      name: parsed.title,
      source: 'custom',
      load: () => WorldRegistry.loadWorldFromJsonString(messageEventData.json).map,
      startingCoords: parsed.startingCoords,
    });

    const registered = WorldRegistry.getWorld(customId);
    assert.ok(registered);
    assert.equal(registered.name, 'Mini Hypercube (3 Sectors)');
    const loadedMap = registered.load();
    assert.equal(loadedMap.getAllRooms().length, 3);
  });

  await t.test('Laser turret export strips mode-inapplicable parameters (beam mode strips fireInterval and projectileSpeed)', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];

    // Configure a beam turret with stray projectile properties (e.g. from mode toggle or default values)
    room.laserTurrets = [
      {
        id: 'turret_beam_with_stray_props',
        x: 300,
        y: 150,
        direction: 'down',
        mode: 'beam',
        activeDuration: 2.5,
        inactiveDuration: 1.5,
        warningDuration: 0.6,
        initialPhase: 0.2,
        autoTarget: true,
        targetRange: 350,
        // Stray projectile properties that should be omitted in beam mode:
        fireInterval: 1.8,
        projectileSpeed: 280,
        fireOffset: 0.5,
        projectileLength: 20,
      },
      {
        id: 'turret_projectile_with_stray_props',
        x: 400,
        y: 250,
        direction: 'right',
        mode: 'projectile',
        fireInterval: 2.0,
        projectileSpeed: 300,
        // Stray beam properties that should be omitted in projectile mode:
        activeDuration: 3.0,
        inactiveDuration: 2.0,
        warningDuration: 0.8,
        initialPhase: 0.1,
      },
      {
        id: 'turret_infinite_range',
        x: 500,
        y: 200,
        direction: 'up',
        mode: 'beam',
        autoTarget: true,
        // targetRange undefined (infinite range reset)
        targetRange: undefined,
      },
    ];

    const jsonStr = exportWorldJson(world);
    const parsedRaw = JSON.parse(jsonStr);
    const exportedTurrets = parsedRaw.rooms[0].laserTurrets;

    // Turret 0 (beam): must NOT have fireInterval, projectileSpeed, fireOffset, projectileLength
    assert.equal(exportedTurrets[0].id, 'turret_beam_with_stray_props');
    assert.equal(exportedTurrets[0].mode, 'beam');
    assert.equal(exportedTurrets[0].activeDuration, 2.5);
    assert.equal(exportedTurrets[0].autoTarget, true);
    assert.equal(exportedTurrets[0].targetRange, 350);
    assert.equal(exportedTurrets[0].fireInterval, undefined, 'Beam mode export must not include fireInterval');
    assert.equal(exportedTurrets[0].projectileSpeed, undefined, 'Beam mode export must not include projectileSpeed');
    assert.equal(exportedTurrets[0].fireOffset, undefined, 'Beam mode export must not include fireOffset');
    assert.equal(exportedTurrets[0].projectileLength, undefined, 'Beam mode export must not include projectileLength');

    // Turret 1 (projectile): must NOT have activeDuration, inactiveDuration, warningDuration, initialPhase
    assert.equal(exportedTurrets[1].id, 'turret_projectile_with_stray_props');
    assert.equal(exportedTurrets[1].mode, 'projectile');
    assert.equal(exportedTurrets[1].fireInterval, 2.0);
    assert.equal(exportedTurrets[1].projectileSpeed, 300);
    assert.equal(exportedTurrets[1].activeDuration, undefined, 'Projectile mode export must not include activeDuration');
    assert.equal(exportedTurrets[1].inactiveDuration, undefined, 'Projectile mode export must not include inactiveDuration');
    assert.equal(exportedTurrets[1].warningDuration, undefined, 'Projectile mode export must not include warningDuration');
    assert.equal(exportedTurrets[1].initialPhase, undefined, 'Projectile mode export must not include initialPhase');

    // Turret 2 (infinite range reset): targetRange must be omitted from export
    assert.equal(exportedTurrets[2].id, 'turret_infinite_range');
    assert.equal(exportedTurrets[2].autoTarget, true);
    assert.equal('targetRange' in exportedTurrets[2], false, 'Reset targetRange must not be in exported JSON');

    // Verify sanitizeLaserTurret function directly
    const sanitizedBeam = sanitizeLaserTurret({
      id: 'beam_test',
      x: 0,
      y: 0,
      mode: 'beam',
      fireInterval: 1.8,
      projectileSpeed: 280,
      activeDuration: 2.0,
    });
    assert.equal(sanitizedBeam.fireInterval, undefined);
    assert.equal(sanitizedBeam.projectileSpeed, undefined);
    assert.equal(sanitizedBeam.activeDuration, 2.0);

    // Verify game engine loads this cleanly
    const engineResult = WorldRegistry.loadWorldFromJsonString(jsonStr);
    const engineRoom = engineResult.map.getRoom(0, 0);
    assert.equal(engineRoom.laserTurrets?.length, 3);
  });

  await t.test('Number keyboard shortcuts 1-9 map to tile selection and not tools', () => {
    // 1-9 must map to the 9 palette tiles in order
    assert.equal(TILE_HOTKEYS['1'], '#', 'Key 1 should select Solid Block (#)');
    assert.equal(TILE_HOTKEYS['2'], '=', 'Key 2 should select One-Way Platform (=)');
    assert.equal(TILE_HOTKEYS['3'], '^', 'Key 3 should select Spike Up (^)');
    assert.equal(TILE_HOTKEYS['4'], 'v', 'Key 4 should select Spike Down (v)');
    assert.equal(TILE_HOTKEYS['5'], '<', 'Key 5 should select Spike Left (<)');
    assert.equal(TILE_HOTKEYS['6'], '>', 'Key 6 should select Spike Right (>)');
    assert.equal(TILE_HOTKEYS['7'], 'B', 'Key 7 should select Bounce Pad (B)');
    assert.equal(TILE_HOTKEYS['8'], 'C', 'Key 8 should select Crumble Block (C)');
    assert.equal(TILE_HOTKEYS['9'], 'G', 'Key 9 should select Hypercube Goal (G)');
    assert.equal(TILE_HOTKEYS['0'], ' ', 'Key 0 should select Empty Space ( )');

    // All mapped tiles must match TILE_GLYPH_ORDER
    for (let i = 1; i <= 9; i++) {
      const glyph = TILE_HOTKEYS[String(i)];
      assert.equal(glyph, TILE_GLYPH_ORDER[i - 1], `Key ${i} must match palette position ${i - 1}`);
      assert.ok(TILE_DEFINITIONS[glyph], `Glyph ${glyph} must have a valid definition`);
    }

    // Number keys must not be used for tool shortcuts (tools use letter keys: V, B, L, U, F, E, I)
    const toolShortcuts = {
      select: 'v',
      pencil: 'b',
      line: 'l',
      rect: 'u',
      fill: 'f',
      eraser: 'e',
      eyedropper: 'i',
    };
    for (const [tool, key] of Object.entries(toolShortcuts)) {
      assert.ok(!TILE_HOTKEYS[key], `Tool ${tool} shortcut '${key}' must not conflict with tile hotkeys`);
      assert.ok(!/^[1-9]$/.test(key), `Tool ${tool} shortcut '${key}' must not be a number 1-9`);
    }
  });

  await t.test('Laser barrier ghost platform endpoints (endX1, endY1, endX2, endY2) update correctly via drag handles', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];
    room.laserBarriers = [
      {
        id: 'laser_ghost_test',
        startX1: 100,
        startY1: 200,
        startX2: 100,
        startY2: 400,
        endX1: 300,
        endY1: 200,
        endX2: 300,
        endY2: 400,
        activeDuration: 2.0,
        inactiveDuration: 2.0,
      },
    ];

    // Simulate drag handle updates as performed in GridCanvas
    const barrier = room.laserBarriers[0];

    // Drag end handle 1 to (360, 220)
    const newEndX1 = 360;
    const newEndY1 = 220;
    barrier.endX1 = newEndX1;
    barrier.endY1 = newEndY1;

    // Drag end handle 2 to (360, 440)
    const newEndX2 = 360;
    const newEndY2 = 440;
    barrier.endX2 = newEndX2;
    barrier.endY2 = newEndY2;

    assert.equal(room.laserBarriers[0].endX1, 360);
    assert.equal(room.laserBarriers[0].endY1, 220);
    assert.equal(room.laserBarriers[0].endX2, 360);
    assert.equal(room.laserBarriers[0].endY2, 440);

    // Export and verify roundtrip
    const jsonStr = exportWorldJson(world);
    const parsed = parseWorldJson(jsonStr);
    assert.equal(parsed.rooms[0].laserBarriers?.[0].endX1, 360);
    assert.equal(parsed.rooms[0].laserBarriers?.[0].endY1, 220);
    assert.equal(parsed.rooms[0].laserBarriers?.[0].endX2, 360);
    assert.equal(parsed.rooms[0].laserBarriers?.[0].endY2, 440);

    // Ensure game engine loads and interpolates between start and new end endpoints
    const engineResult = WorldRegistry.loadWorldFromJsonString(jsonStr);
    const engineRoom = engineResult.map.getRoom(0, 0);
    assert.ok(engineRoom.laserBarriers);
    assert.equal(engineRoom.laserBarriers[0].endX1, 360);
    assert.equal(engineRoom.laserBarriers[0].endY1, 220);
    assert.equal(engineRoom.laserBarriers[0].endX2, 360);
    assert.equal(engineRoom.laserBarriers[0].endY2, 440);
  });

  await t.test('Always-active laser barriers roundtrip cleanly and pass world validation', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];
    room.laserBarriers = [
      {
        id: 'barrier_always_test',
        startX1: 100,
        startY1: 200,
        startX2: 300,
        startY2: 200,
        alwaysActive: true,
        inactiveDuration: 0,
      },
    ];

    // 1. Validator check
    const issues = validateWorld(world);
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    assert.equal(errors.length, 0, `Expected 0 errors, got: ${JSON.stringify(errors)}`);
    assert.equal(warnings.length, 0, `Expected 0 warnings, got: ${JSON.stringify(warnings)}`);

    // 2. Export & parse roundtrip
    const jsonStr = exportWorldJson(world);
    const parsedWorld = parseWorldJson(jsonStr);
    const pBarrier = parsedWorld.rooms[0].laserBarriers?.[0];
    assert.ok(pBarrier);
    assert.equal(pBarrier.alwaysActive, true);
    assert.equal(pBarrier.inactiveDuration, 0);

    // 3. Load with game engine LevelLoader & WorldRegistry
    const engineResult = WorldRegistry.loadWorldFromJsonString(jsonStr);
    const engineRoom = engineResult.map.getRoom(0, 0);
    assert.ok(engineRoom.laserBarriers);
    assert.equal(engineRoom.laserBarriers[0].alwaysActive, true);
    assert.equal(engineRoom.laserBarriers[0].inactiveDuration, 0);
  });

  await t.test('Opposite-side doorway blocked status correctly detects void, closed exits, and solid walls', () => {
    const world = createEmptyWorld();
    const roomA = world.rooms[0]; // [0, 0]
    roomA.exits = { right: true, up: false, down: false, left: false };

    // Helper implementing the same logic as GridCanvas getOppositeTileStatus
    const getOppositeTileStatus = (currentRoom, dir, index) => {
      const [rx, ry] = currentRoom.coords;
      let targetCoords;
      let oppDir;
      let oppR;
      let oppC;

      if (dir === 'left') {
        targetCoords = [rx - 1, ry];
        oppDir = 'right';
        oppR = index;
        oppC = 19;
      } else if (dir === 'right') {
        targetCoords = [rx + 1, ry];
        oppDir = 'left';
        oppR = index;
        oppC = 0;
      } else if (dir === 'up') {
        targetCoords = [rx, ry + 1];
        oppDir = 'down';
        oppR = 19;
        oppC = index;
      } else {
        targetCoords = [rx, ry - 1];
        oppDir = 'up';
        oppR = 0;
        oppC = index;
      }

      const neighbor = world.rooms.find(
        (r) => r.coords[0] === targetCoords[0] && r.coords[1] === targetCoords[1]
      );

      if (!neighbor) {
        return { isBlocked: true, reason: 'no_room' };
      }
      if (!neighbor.exits?.[oppDir]) {
        return { isBlocked: true, reason: 'no_exit' };
      }
      const neighborGlyph = neighbor.grid[oppR]?.[oppC] || ' ';
      if (neighborGlyph !== ' ') {
        return { isBlocked: true, reason: 'wall' };
      }
      return { isBlocked: false };
    };

    // 1. Target room [1, 0] does not exist yet -> reason: 'no_room'
    const statusNoRoom = getOppositeTileStatus(roomA, 'right', 10);
    assert.equal(statusNoRoom.isBlocked, true);
    assert.equal(statusNoRoom.reason, 'no_room');

    // 2. Create room B at [1, 0], but leave left exit closed -> reason: 'no_exit'
    const roomB = {
      ...JSON.parse(JSON.stringify(roomA)),
      id: 'room_1_0',
      coords: [1, 0],
      title: 'Sector East',
      exits: { left: false, right: false, up: false, down: false },
    };
    world.rooms.push(roomB);

    const statusNoExit = getOppositeTileStatus(roomA, 'right', 10);
    assert.equal(statusNoExit.isBlocked, true);
    assert.equal(statusNoExit.reason, 'no_exit');

    // 3. Open left exit in Room B, with row 5 open (' ') and row 10 blocked ('#')
    roomB.exits.left = true;
    const row5Chars = roomB.grid[5].split('');
    row5Chars[0] = ' ';
    roomB.grid[5] = row5Chars.join('');

    const row10Chars = roomB.grid[10].split('');
    row10Chars[0] = '#';
    roomB.grid[10] = row10Chars.join('');

    const statusWall = getOppositeTileStatus(roomA, 'right', 10);
    assert.equal(statusWall.isBlocked, true);
    assert.equal(statusWall.reason, 'wall');

    // Row 5 in room B is empty space (' ') -> should be passable (isBlocked: false)
    const statusOpen = getOppositeTileStatus(roomA, 'right', 5);
    assert.equal(statusOpen.isBlocked, false);

    // 4. Locked gate on both sides with open air -> passable (isBlocked: false)
    roomA.exits.up = { id: 'key_gate_1', label: 'Security Gate', color: '#ff00aa' };
    const roomC = {
      ...JSON.parse(JSON.stringify(roomA)),
      id: 'room_0_1',
      coords: [0, 1],
      title: 'Sector North',
      exits: { down: { id: 'key_gate_1', label: 'Security Gate', color: '#ff00aa' } },
    };
    // Ensure doorway threshold at row 19 in roomC is open space (' ')
    const row19Chars = roomC.grid[19].split('');
    row19Chars[8] = ' ';
    roomC.grid[19] = row19Chars.join('');
    world.rooms.push(roomC);

    const statusGateOpen = getOppositeTileStatus(roomA, 'up', 8);
    assert.equal(statusGateOpen.isBlocked, false);
  });

  await t.test('moveSector moves a sector to empty coordinates and updates startingCoords if it was starting room', () => {
    const world = createEmptyWorld();
    assert.deepEqual(world.startingCoords, [0, 0]);
    assert.equal(world.rooms[0].coords[0], 0);
    assert.equal(world.rooms[0].coords[1], 0);

    const moved = moveSector(world, world.rooms[0].id, [3, 4]);
    assert.equal(moved.rooms.length, 1);
    assert.deepEqual(moved.rooms[0].coords, [3, 4]);
    assert.deepEqual(moved.startingCoords, [3, 4], 'startingCoords must follow starting room to [3, 4]');
    // Original world remains unmutated
    assert.deepEqual(world.rooms[0].coords, [0, 0]);
  });

  await t.test('moveSector swaps positions of two sectors when one is dropped onto another', () => {
    const world = createEmptyWorld();
    const roomA = world.rooms[0]; // [0, 0] (starting room)
    const roomB = cloneRoom(roomA, [2, 1]);
    roomB.title = 'Sector Beta';
    world.rooms.push(roomB);

    assert.deepEqual(world.startingCoords, [0, 0]);

    // Drag roomA onto roomB's coordinates [2, 1]
    const swapped = moveSector(world, roomA.id, [2, 1]);
    assert.equal(swapped.rooms.length, 2);

    const swappedA = swapped.rooms.find((r) => r.id === roomA.id);
    const swappedB = swapped.rooms.find((r) => r.id === roomB.id);

    assert.ok(swappedA && swappedB);
    assert.deepEqual(swappedA.coords, [2, 1], 'Room A should have taken Room B coords');
    assert.deepEqual(swappedB.coords, [0, 0], 'Room B should have taken Room A coords');
    assert.deepEqual(swapped.startingCoords, [2, 1], 'startingCoords should follow Room A to [2, 1]');
  });

  await t.test('moveSector returns identical world when dropped on identical coordinates (no-op)', () => {
    const world = createEmptyWorld();
    const unchanged = moveSector(world, world.rooms[0].id, [0, 0]);
    assert.equal(unchanged, world);
  });

  await t.test('copySector clones sector to new coordinates with distinct ID and preserves original sector', () => {
    const world = createEmptyWorld();
    const sourceRoom = world.rooms[0];
    sourceRoom.title = 'Genesis Sector';

    const result = copySector(world, sourceRoom.id, [1, 2]);
    assert.ok(result);
    const { newWorld, newRoom } = result;

    assert.equal(newWorld.rooms.length, 2);
    assert.equal(newRoom.coords[0], 1);
    assert.equal(newRoom.coords[1], 2);
    assert.notEqual(newRoom.id, sourceRoom.id);
    assert.equal(newRoom.title, 'Genesis Sector (Copy)');

    // Ensure source room in newWorld still exists at [0, 0]
    const originalInNewWorld = newWorld.rooms.find((r) => r.id === sourceRoom.id);
    assert.ok(originalInNewWorld);
    assert.deepEqual(originalInNewWorld.coords, [0, 0]);
  });

  await t.test('copySector returns null when attempting to copy onto an already occupied slot', () => {
    const world = createEmptyWorld();
    const roomA = world.rooms[0]; // [0, 0]
    const roomB = cloneRoom(roomA, [1, 0]);
    world.rooms.push(roomB);

    // Attempt to copy roomA onto roomB's coordinate [1, 0]
    const result = copySector(world, roomA.id, [1, 0]);
    assert.equal(result, null, 'copySector should reject copying onto occupied slot');
  });

  await t.test('World validator and LevelLoader cleanly parse and validate worlds modified by moveSector and copySector', () => {
    let world = createEmptyWorld();
    // Copy sector 0 to [1, 0]
    const copyResult = copySector(world, world.rooms[0].id, [1, 0]);
    assert.ok(copyResult);
    world = copyResult.newWorld;

    // Move sector [1, 0] to [2, 0]
    world = moveSector(world, copyResult.newRoom.id, [2, 0]);

    // Validate with editor validator
    const issues = validateWorld(world);
    const errors = issues.filter((i) => i.severity === 'error');
    assert.equal(errors.length, 0, `Expected 0 validation errors, got: ${JSON.stringify(errors)}`);

    // Export to JSON string and load with game engine LevelLoader
    const exportedJson = exportWorldJson(world);
    const { map, startingCoords } = WorldRegistry.loadWorldFromJsonString(exportedJson);
    assert.equal(map.getAllRooms().length, 2);
    assert.ok(map.getRoom(0, 0));
    assert.ok(map.getRoom(2, 0));
    assert.equal(map.getRoom(1, 0), undefined);
    assert.deepEqual(startingCoords, { x: 0, y: 0 });
  });
});

