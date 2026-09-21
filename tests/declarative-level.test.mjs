import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { LevelLoader } = require('./dist-world/LevelLoader.js');
const { TileType, ROWS, COLS } = require('./dist-world/ScreenData.js');

const singleFilePath = path.resolve('src/world/data/demo-all-in-one.json');
const modularDir = path.resolve('src/world/data/demo');
const manifestPath = path.join(modularDir, 'world.json');

test('Declarative Level Loading & Validation', async (t) => {
  const singleFileJson = JSON.parse(fs.readFileSync(singleFilePath, 'utf8'));
  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const modularRoomsJson = manifestJson.rooms.map((relPath) =>
    JSON.parse(fs.readFileSync(path.join(modularDir, relPath), 'utf8'))
  );

  await t.test('Loads single-file 3-room world bundle correctly', () => {
    const map = LevelLoader.loadWorld(singleFileJson);
    assert.equal(map.getTotalRoomsCount(), 3, 'Expected 3 rooms in single-file example world');

    const alpha = map.getRoom(0, 0);
    assert.ok(alpha, 'Alpha room (0,0) must exist');
    assert.equal(alpha.title, 'Sector 0: Neon Bastion');
    assert.equal(alpha.tiles.length, ROWS);
    assert.equal(alpha.tiles[0].length, COLS);

    const hazard = map.getRoom(1, 0);
    assert.ok(hazard, 'Hazard room (1,0) must exist');
    assert.equal(hazard.title, 'Sector 1: Kinetic Crucible');
    assert.ok(hazard.laserTurrets?.length, 'Hazard room must have laser turret');

    const goal = map.getRoom(2, 0);
    assert.ok(goal, 'Goal room (2,0) must exist');
    assert.equal(goal.title, 'Sector 2: Singularity Sanctum');
    assert.equal(goal.tiles[6][14], TileType.GOAL, 'Goal tile must exist at row 6 col 14');
  });

  await t.test('Loads modular 10-room world folder correctly', () => {
    const map = LevelLoader.loadWorld(manifestJson, modularRoomsJson);
    assert.equal(map.getTotalRoomsCount(), 10, 'Expected 10 rooms in modular world');

    const spire = map.getRoom(2, 1);
    assert.ok(spire, 'The Spire (2,1) must exist');
    assert.equal(spire.title, 'Sector (2,1): The Spire');

    const crypt = map.getRoom(4, -1);
    assert.ok(crypt, 'Sub-Zero Crypt (4,-1) must exist');
    assert.equal(crypt.title, 'Sector (4,-1): Sub-Zero Crypt');
  });

  await t.test('LevelLoader produces identical room data whether loaded via manifest or inlined', () => {
    // Wrap modular rooms in an all-in-one manifest object
    const syntheticSingle = {
      ...manifestJson,
      rooms: modularRoomsJson,
    };
    const mapSynthetic = LevelLoader.loadWorld(syntheticSingle);
    const mapModular = LevelLoader.loadWorld(manifestJson, modularRoomsJson);

    const roomsSynthetic = mapSynthetic.getAllRooms();
    const roomsModular = mapModular.getAllRooms();
    assert.equal(roomsSynthetic.length, roomsModular.length);

    for (const roomS of roomsSynthetic) {
      const roomM = mapModular.getRoom(roomS.coords.x, roomS.coords.y);
      assert.ok(roomM, `Room (${roomS.coords.x}, ${roomS.coords.y}) missing in modular map`);
      assert.equal(roomS.id, roomM.id);
      assert.equal(roomS.title, roomM.title);
      assert.equal(roomS.subtitle, roomM.subtitle);
      assert.equal(roomS.themeColor, roomM.themeColor);
      assert.deepEqual(roomS.exits, roomM.exits);
      assert.deepEqual(roomS.spawnPoint, roomM.spawnPoint);
      assert.deepEqual(roomS.tiles, roomM.tiles);
      assert.deepEqual(roomS.collectibles, roomM.collectibles);
      assert.deepEqual(roomS.bounceProps, roomM.bounceProps);
      assert.deepEqual(roomS.spikeProps, roomM.spikeProps);
      assert.deepEqual(roomS.movingPlatforms, roomM.movingPlatforms);
      assert.deepEqual(roomS.laserBarriers, roomM.laserBarriers);
      assert.deepEqual(roomS.laserTurrets, roomM.laserTurrets);
    }
  });

  await t.test('Glyph parsing translates directional spikes and specialized blocks accurately', () => {
    const dummyRoom = {
      id: 'room_test',
      coords: [99, 99],
      title: 'Test Room',
      themeColor: '#ffffff',
      accentColor: '#000000',
      exits: { left: false, right: false, up: false, down: false },
      grid: [
        '#=^v<>BCG.          ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '####################',
      ],
    };

    const parsed = LevelLoader.parseRoom(dummyRoom);
    assert.equal(parsed.tiles[0][0], TileType.SOLID);
    assert.equal(parsed.tiles[0][1], TileType.ONE_WAY);
    assert.equal(parsed.tiles[0][2], TileType.SPIKE);
    assert.equal(parsed.spikeProps?.['0,2']?.direction, 'up');
    assert.equal(parsed.tiles[0][3], TileType.SPIKE);
    assert.equal(parsed.spikeProps?.['0,3']?.direction, 'down');
    assert.equal(parsed.tiles[0][4], TileType.SPIKE);
    assert.equal(parsed.spikeProps?.['0,4']?.direction, 'left');
    assert.equal(parsed.tiles[0][5], TileType.SPIKE);
    assert.equal(parsed.spikeProps?.['0,5']?.direction, 'right');
    assert.equal(parsed.tiles[0][6], TileType.BOUNCE);
    assert.equal(parsed.tiles[0][7], TileType.CRUMBLE);
    assert.equal(parsed.tiles[0][8], TileType.GOAL);
    assert.equal(parsed.tiles[0][9], TileType.EMPTY);
  });

  await t.test('Rejects invalid grid dimensions and illegal glyphs', () => {
    assert.throws(
      () => {
        LevelLoader.parseRoom({
          id: 'bad_row_count',
          coords: [0, 0],
          title: 'Bad',
          themeColor: '#000',
          accentColor: '#fff',
          exits: { left: false, right: false, up: false, down: false },
          grid: ['####################'], // only 1 row
        });
      },
      /must contain exactly 20 rows/
    );

    const badColGrid = new Array(20).fill('####################');
    badColGrid[0] = '###'; // only 3 cols
    assert.throws(
      () => {
        LevelLoader.parseRoom({
          id: 'bad_col_count',
          coords: [0, 0],
          title: 'Bad',
          themeColor: '#000',
          accentColor: '#fff',
          exits: { left: false, right: false, up: false, down: false },
          grid: badColGrid,
        });
      },
      /must contain exactly 20 characters/
    );

    const illegalGlyphGrid = new Array(20).fill('                    ');
    illegalGlyphGrid[0] = 'Z                   '; // Z is illegal
    assert.throws(
      () => {
        LevelLoader.parseRoom({
          id: 'bad_glyph',
          coords: [0, 0],
          title: 'Bad',
          themeColor: '#000',
          accentColor: '#fff',
          exits: { left: false, right: false, up: false, down: false },
          grid: illegalGlyphGrid,
        });
      },
      /unrecognized tile glyph 'Z'/
    );
  });
});

