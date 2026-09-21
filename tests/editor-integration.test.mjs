import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { LevelLoader } = require('./dist-world/world/LevelLoader.js');

// Import editor serialization functions (ESM)
import { createEmptyWorld, parseWorldJson, exportWorldJson, cloneRoom } from '../editor/src/utils/serialization.ts';
import { validateWorld } from '../editor/src/utils/validator.ts';
import { PRESET_WORLDS } from '../editor/src/utils/presets.ts';

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
});
