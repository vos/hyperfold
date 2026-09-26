import assert from 'node:assert/strict';
import test from 'node:test';

// Import from canonical shared module
import {
  ROOM_SIZE,
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  TOTAL_TILES,
  TileType,
  TILE_DEFINITIONS,
  TILE_GLYPH_ORDER,
  TILE_HOTKEYS,
  glyphToTileType,
  tileTypeToGlyph,
  getGlyphSpikeDirection,
  DEFAULT_MOVING_PLATFORM,
  DEFAULT_LASER_BARRIER,
  DEFAULT_LASER_TURRET,
  DEFAULT_PORTAL,
  DEFAULT_BOUNCE_PAD,
  computePlatformState,
  computeBarrierState,
  getBaseFiringAngle,
  sanitizeLaserTurret,
  GATE_KEY_PALETTE,
  getGateColor,
  isGatedExit,
  getAdjacentCoords,
  getOppositeDirection,
  getPortalBounds,
  getPortalCenter,
} from '../shared/index.ts';

// Import from game engine ScreenData (re-exported)
import {
  ROOM_SIZE as GAME_ROOM_SIZE,
  TILE_SIZE as GAME_TILE_SIZE,
  GRID_COLS as GAME_GRID_COLS,
  GRID_ROWS as GAME_GRID_ROWS,
  getGateColor as gameGetGateColor,
} from '../src/world/ScreenData.ts';

// Import from editor world types (re-exported)
import {
  ROOM_SIZE as EDITOR_ROOM_SIZE,
  TILE_SIZE as EDITOR_TILE_SIZE,
  GRID_COLS as EDITOR_GRID_COLS,
  GRID_ROWS as EDITOR_GRID_ROWS,
  getGateColor as editorGetGateColor,
  getBaseFiringAngle as editorGetBaseFiringAngle,
} from '../editor/src/types/world.ts';

test('Single Source of Truth: Shared Entity & Type Definitions Verification', async (t) => {
  await t.test('Canonical spatial and grid constants are unified across game and editor', () => {
    assert.equal(ROOM_SIZE, 800);
    assert.equal(TILE_SIZE, 40);
    assert.equal(GRID_COLS, 20);
    assert.equal(GRID_ROWS, 20);
    assert.equal(TOTAL_TILES, 400);

    // Game engine uses identical values
    assert.equal(GAME_ROOM_SIZE, ROOM_SIZE);
    assert.equal(GAME_TILE_SIZE, TILE_SIZE);
    assert.equal(GAME_GRID_COLS, GRID_COLS);
    assert.equal(GAME_GRID_ROWS, GRID_ROWS);

    // Editor uses identical values
    assert.equal(EDITOR_ROOM_SIZE, ROOM_SIZE);
    assert.equal(EDITOR_TILE_SIZE, TILE_SIZE);
    assert.equal(EDITOR_GRID_COLS, GRID_COLS);
    assert.equal(EDITOR_GRID_ROWS, GRID_ROWS);
  });

  await t.test('Canonical entity defaults are centralized and complete', () => {
    // Moving platform
    assert.equal(DEFAULT_MOVING_PLATFORM.width, 80);
    assert.equal(DEFAULT_MOVING_PLATFORM.height, 16);
    assert.equal(DEFAULT_MOVING_PLATFORM.speed, 120);
    assert.equal(DEFAULT_MOVING_PLATFORM.pauseTime, 0.4);
    assert.equal(DEFAULT_MOVING_PLATFORM.oneWay, true);

    // Laser barrier
    assert.equal(DEFAULT_LASER_BARRIER.width, 4);
    assert.equal(DEFAULT_LASER_BARRIER.activeDuration, 2.0);
    assert.equal(DEFAULT_LASER_BARRIER.inactiveDuration, 2.0);
    assert.equal(DEFAULT_LASER_BARRIER.warningDuration, 0.6);
    assert.equal(DEFAULT_LASER_BARRIER.themeColor, '#ff0055');

    // Laser turret
    assert.equal(DEFAULT_LASER_TURRET.mode, 'projectile');
    assert.equal(DEFAULT_LASER_TURRET.fireInterval, 2.0);
    assert.equal(DEFAULT_LASER_TURRET.projectileSpeed, 320);
    assert.equal(DEFAULT_LASER_TURRET.projectileLength, 20);

    // Portal
    assert.equal(DEFAULT_PORTAL.width, 44);
    assert.equal(DEFAULT_PORTAL.height, 68);
    assert.equal(DEFAULT_PORTAL.themeColor, '#b026ff');

    // Bounce pad
    assert.equal(DEFAULT_BOUNCE_PAD.vy, -1400);
  });

  await t.test('Gate key palette and getGateColor are identical between game and editor', () => {
    assert.equal(GATE_KEY_PALETTE.length, 8);

    // Keyword heuristics
    assert.equal(getGateColor('golden_vault'), '#ffe600');
    assert.equal(getGateColor('security_cyan'), '#00f0ff');
    assert.equal(getGateColor('ruby_key'), '#ff2244');
    assert.equal(getGateColor('emerald_pass'), '#00ff66');
    assert.equal(getGateColor('purple_prism'), '#b026ff');
    assert.equal(getGateColor('orange_door'), '#ff6600');
    assert.equal(getGateColor('blue_lock'), '#0088ff');
    assert.equal(getGateColor('magenta_laser'), '#ff0077');

    // Explicit color override
    assert.equal(getGateColor('any_id', '#123456'), '#123456');

    // Game engine resolver matches shared resolver
    assert.equal(gameGetGateColor('security_cyan'), getGateColor('security_cyan'));
    assert.equal(gameGetGateColor('any_arbitrary_key'), getGateColor('any_arbitrary_key'));

    // Editor resolver matches shared resolver
    assert.equal(editorGetGateColor('security_cyan'), getGateColor('security_cyan'));
    assert.equal(editorGetGateColor('any_arbitrary_key'), getGateColor('any_arbitrary_key'));
  });

  await t.test('Turret base firing angle calculation is identical between game and editor', () => {
    assert.equal(getBaseFiringAngle({ direction: 'right' }), 0);
    assert.equal(getBaseFiringAngle({ direction: 'down' }), Math.PI * 0.5);
    assert.equal(getBaseFiringAngle({ direction: 'left' }), Math.PI);
    assert.equal(getBaseFiringAngle({ direction: 'up' }), -Math.PI * 0.5);

    // Explicit angle takes precedence
    assert.equal(getBaseFiringAngle({ angle: 45 }), (45 * Math.PI) / 180);
    assert.equal(getBaseFiringAngle({ angle: 90, direction: 'left' }), (90 * Math.PI) / 180);

    // Editor re-export yields identical angles
    assert.equal(editorGetBaseFiringAngle({ direction: 'down' }), Math.PI * 0.5);
    assert.equal(editorGetBaseFiringAngle({ angle: 30 }), (30 * Math.PI) / 180);
  });

  await t.test('sanitizeLaserTurret cleans mode-specific fields correctly', () => {
    const rawBeamTurret = {
      id: 't_beam',
      x: 100,
      y: 200,
      mode: 'beam',
      activeDuration: 3.0,
      inactiveDuration: 1.0,
      warningDuration: 0.5,
      fireInterval: 1.5,     // Should be stripped
      projectileSpeed: 400,  // Should be stripped
    };

    const sanitizedBeam = sanitizeLaserTurret(rawBeamTurret);
    assert.equal(sanitizedBeam.mode, 'beam');
    assert.equal(sanitizedBeam.activeDuration, 3.0);
    assert.equal(sanitizedBeam.warningDuration, 0.5);
    assert.equal(sanitizedBeam.fireInterval, undefined);
    assert.equal(sanitizedBeam.projectileSpeed, undefined);

    const rawProjTurret = {
      id: 't_proj',
      x: 100,
      y: 200,
      mode: 'projectile',
      fireInterval: 1.5,
      projectileSpeed: 400,
      activeDuration: 3.0,   // Should be stripped
      warningDuration: 0.5,  // Should be stripped
    };

    const sanitizedProj = sanitizeLaserTurret(rawProjTurret);
    assert.equal(sanitizedProj.mode, 'projectile');
    assert.equal(sanitizedProj.fireInterval, 1.5);
    assert.equal(sanitizedProj.projectileSpeed, 400);
    assert.equal(sanitizedProj.activeDuration, undefined);
    assert.equal(sanitizedProj.warningDuration, undefined);
  });

  await t.test('Kinematic solvers compute accurate movement states', () => {
    // Moving platform: start to end and pause
    const platConfig = {
      id: 'p1',
      startX: 100,
      startY: 100,
      endX: 300,
      endY: 100,
      width: 80,
      speed: 100, // 200px distance -> 2.0s travel duration
      pauseTime: 0.5,
      initialProgress: 0,
    };

    const startState = computePlatformState(platConfig, 0);
    assert.equal(startState.x, 100);
    assert.equal(startState.progress, 0);

    const halfwayState = computePlatformState(platConfig, 1.0);
    assert.ok(halfwayState.x > 180 && halfwayState.x < 220); // Midpoint easing
    assert.ok(halfwayState.vx > 0);

    // End dwell
    const endState = computePlatformState(platConfig, 2.2);
    assert.equal(endState.x, 300);
    assert.equal(endState.vx, 0);
    assert.equal(endState.progress, 1);

    // Laser barrier: cyclic timing
    const barrierConfig = {
      id: 'b1',
      startX1: 100,
      startY1: 100,
      startX2: 300,
      startY2: 100,
      activeDuration: 2.0,
      inactiveDuration: 2.0,
      warningDuration: 0.5,
    };

    const activeState = computeBarrierState(barrierConfig, 0.5);
    assert.equal(activeState.state, 'ACTIVE');
    assert.equal(activeState.isActive, true);

    const inactiveState = computeBarrierState(barrierConfig, 2.5);
    assert.equal(inactiveState.state, 'INACTIVE');
    assert.equal(inactiveState.isActive, false);

    const warningState = computeBarrierState(barrierConfig, 3.8); // 4.0 - 0.5 = 3.5 -> in warning
    assert.equal(warningState.state, 'WARNING');
    assert.equal(warningState.isActive, false);
    assert.ok(warningState.chargeProgress > 0 && warningState.chargeProgress <= 1);
  });

  await t.test('Tile converters and glyph mappings roundtrip accurately', () => {
    assert.equal(glyphToTileType('#'), TileType.SOLID);
    assert.equal(glyphToTileType('='), TileType.ONE_WAY);
    assert.equal(glyphToTileType('B'), TileType.BOUNCE);
    assert.equal(glyphToTileType('C'), TileType.CRUMBLE);
    assert.equal(glyphToTileType('G'), TileType.GOAL);
    assert.equal(glyphToTileType(' '), TileType.EMPTY);
    assert.equal(glyphToTileType('^'), TileType.SPIKE);

    assert.equal(tileTypeToGlyph(TileType.SOLID), '#');
    assert.equal(tileTypeToGlyph(TileType.ONE_WAY), '=');
    assert.equal(tileTypeToGlyph(TileType.BOUNCE), 'B');
    assert.equal(tileTypeToGlyph(TileType.CRUMBLE), 'C');
    assert.equal(tileTypeToGlyph(TileType.GOAL), 'G');
    assert.equal(tileTypeToGlyph(TileType.EMPTY), ' ');

    // Directional spikes
    assert.equal(tileTypeToGlyph(TileType.SPIKE, 'up'), '^');
    assert.equal(tileTypeToGlyph(TileType.SPIKE, 'down'), 'v');
    assert.equal(tileTypeToGlyph(TileType.SPIKE, 'left'), '<');
    assert.equal(tileTypeToGlyph(TileType.SPIKE, 'right'), '>');

    assert.equal(getGlyphSpikeDirection('^'), 'up');
    assert.equal(getGlyphSpikeDirection('v'), 'down');
    assert.equal(getGlyphSpikeDirection('<'), 'left');
    assert.equal(getGlyphSpikeDirection('>'), 'right');
    assert.equal(getGlyphSpikeDirection('#'), undefined);

    // TILE_DEFINITIONS registry coverage
    assert.equal(TILE_GLYPH_ORDER.length, 10);
    for (const glyph of TILE_GLYPH_ORDER) {
      assert.ok(TILE_DEFINITIONS[glyph], `Missing tile definition for glyph ${glyph}`);
      assert.ok(TILE_DEFINITIONS[glyph].name);
      assert.ok(TILE_DEFINITIONS[glyph].color);
      assert.ok(TILE_DEFINITIONS[glyph].category);
    }
  });

  await t.test('Portal bounds and center calculation helpers work accurately', () => {
    const portal = {
      id: 'p_test',
      x: 100,
      y: 200,
    };

    const bounds = getPortalBounds(portal);
    assert.equal(bounds.width, 44);
    assert.equal(bounds.height, 68);
    assert.equal(bounds.x, 100);
    assert.equal(bounds.y, 200);

    const center = getPortalCenter(portal);
    assert.equal(center.x, 122);
    assert.equal(center.y, 234);
  });

  await t.test('Navigation coordinate and direction math functions resolve correctly', () => {
    assert.deepEqual(getAdjacentCoords([5, 5], 'up'), [5, 6]);
    assert.deepEqual(getAdjacentCoords([5, 5], 'down'), [5, 4]);
    assert.deepEqual(getAdjacentCoords([5, 5], 'left'), [4, 5]);
    assert.deepEqual(getAdjacentCoords([5, 5], 'right'), [6, 5]);

    assert.equal(getOppositeDirection('up'), 'down');
    assert.equal(getOppositeDirection('down'), 'up');
    assert.equal(getOppositeDirection('left'), 'right');
    assert.equal(getOppositeDirection('right'), 'left');
  });

  await t.test('Exit gate helpers identify gated exits correctly', () => {
    assert.equal(isGatedExit(true), false);
    assert.equal(isGatedExit(false), false);
    assert.equal(isGatedExit(undefined), false);
    assert.equal(isGatedExit({ id: 'gate_alpha' }), true);
  });
});
