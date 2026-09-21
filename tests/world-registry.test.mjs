import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WorldRegistry } = require('./dist-world/world/WorldRegistry.js');
const { TileType } = require('./dist-world/world/ScreenData.js');

test('WorldRegistry & Dynamic World Loading', async (t) => {
  await t.test('Pre-registers demo and mini worlds', () => {
    const worlds = WorldRegistry.getAvailableWorlds();
    assert.ok(worlds.length >= 2, 'Expected at least 2 registered worlds');

    const demo = WorldRegistry.getWorld('demo');
    assert.ok(demo, 'World "demo" must be registered');
    assert.equal(demo.name, 'Infinite Tesseract (10 Sectors)');

    const mini = WorldRegistry.getWorld('mini');
    assert.ok(mini, 'World "mini" must be registered');
    assert.equal(mini.name, 'Mini Hypercube (3 Sectors)');
  });

  await t.test('Loads built-in worlds through the registry', () => {
    const demo = WorldRegistry.getWorld('demo');
    assert.ok(demo, 'Demo world must exist');
    const demoMap = demo.load();
    assert.equal(demoMap.getTotalRoomsCount(), 10, 'Demo world has 10 rooms');

    const mini = WorldRegistry.getWorld('mini');
    assert.ok(mini, 'Mini world must exist');
    const miniMap = mini.load();
    assert.equal(miniMap.getTotalRoomsCount(), 3, 'Mini world has 3 rooms');
    assert.ok(miniMap.getRoom(2, 0)?.tiles.some((row) => row.includes(TileType.GOAL)));
  });

  await t.test('Parses custom world bundle JSON string', () => {
    const customWorld = JSON.stringify({
      id: 'custom_expedition',
      title: 'Custom Test Expedition',
      startingCoords: [1, 1],
      rooms: [
        {
          id: 'room_1_1',
          coords: [1, 1],
          title: 'Sector (1,1)',
          themeColor: '#ff00aa',
          accentColor: '#00ffff',
          exits: { left: false, right: false, up: false, down: false },
          grid: new Array(20).fill('####################'),
        },
      ],
    });

    const result = WorldRegistry.loadWorldFromJsonString(customWorld);
    assert.equal(result.title, 'Custom Test Expedition');
    assert.deepEqual(result.startingCoords, { x: 1, y: 1 });
    assert.equal(result.map.getTotalRoomsCount(), 1);
    assert.ok(result.map.getRoom(1, 1));
  });

  await t.test('Parses standalone single room JSON string into a 1-room LevelMap', () => {
    const singleRoom = JSON.stringify({
      id: 'room_solo',
      coords: [5, 5],
      title: 'Solo Chamber',
      themeColor: '#00ff88',
      accentColor: '#ff0055',
      exits: { left: false, right: false, up: false, down: false },
      grid: new Array(20).fill('####################'),
    });

    const result = WorldRegistry.loadWorldFromJsonString(singleRoom);
    assert.equal(result.title, 'Solo Chamber');
    assert.deepEqual(result.startingCoords, { x: 5, y: 5 });
    assert.equal(result.map.getTotalRoomsCount(), 1);
    assert.ok(result.map.getRoom(5, 5));
  });

  await t.test('PhysicsEngine caches do not leak entities across worlds (e.g. invisible beam laser bug)', () => {
    const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');
    const dummyAudio = { playDeath: () => {}, playLaserShoot: () => {}, playLaserImpact: () => {}, playLaserWarning: () => {}, playLaserHum: () => {} };
    const dummyParticles = { emitLaserSparks: () => {}, emitLaserCharge: () => {}, emitLaserMuzzle: () => {} };
    const physics = new PhysicsEngine(dummyAudio, dummyParticles);

    const demoMap = WorldRegistry.getWorld('demo').load();
    const demoRoom0 = demoMap.getRoom(0, 0);
    const demoTurrets = physics.getTurretsForRoom(demoRoom0);
    assert.equal(demoTurrets.length, 1);
    assert.equal(demoTurrets[0].config.x, 760);
    assert.equal(demoTurrets[0].config.mode, 'beam');

    // Switch to mini world
    const miniMap = WorldRegistry.getWorld('mini').load();
    const miniRoom0 = miniMap.getRoom(0, 0);

    // Ensure physics retrieves mini's pulse turret and NOT demo's beam turret
    const miniTurrets = physics.getTurretsForRoom(miniRoom0);
    assert.equal(miniTurrets.length, 1);
    assert.equal(miniTurrets[0].config.x, 400);
    assert.equal(miniTurrets[0].config.y, 160);
    assert.equal(miniTurrets[0].config.mode, 'projectile');

    // Test clearAllRoomsCache
    physics.clearAllRoomsCache();
    const freshTurrets = physics.getTurretsForRoom(miniRoom0);
    assert.equal(freshTurrets.length, 1);
    assert.equal(freshTurrets[0].config.x, 400);
  });
});
