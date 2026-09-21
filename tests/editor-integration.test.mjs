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
});
