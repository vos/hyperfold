import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { LevelLoader } = require('./dist-world/world/LevelLoader.js');
const { LevelMap } = require('./dist-world/world/LevelMap.js');
const { TileType, FACE_SIZE, TILE_SIZE } = require('./dist-world/world/ScreenData.js');
const { Player } = require('./dist-world/entities/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');

// Import editor serialization & validation
import { createEmptyWorld, parseWorldJson, exportWorldJson, createEmptyRoom } from '../editor/src/utils/serialization.ts';
import { validateWorld } from '../editor/src/utils/validator.ts';

function createMockAudio() {
  let portalTeleportCount = 0;
  return {
    playDeath: () => {},
    playBounce: () => {},
    playLand: () => {},
    playJump: () => {},
    playDropThrough: () => {},
    playGateLocked: () => {},
    playKeyCollect: () => {},
    playGateOpen: () => {},
    playLaserWarning: () => {},
    playLaserHum: () => {},
    playLaserShoot: () => {},
    playPortalTeleport: () => { portalTeleportCount++; },
    get portalTeleportCount() { return portalTeleportCount; },
  };
}

function createMockParticles() {
  const sparks = [];
  const explosions = [];
  return {
    emitSparks: (x, y, count, color) => {
      sparks.push({ x, y, count, color });
    },
    emitPlayerExplosion: (x, y, color1, color2) => {
      explosions.push({ x, y, color1, color2 });
    },
    emitDust: () => {},
    emitLaserSparks: () => {},
    emitLaserCharge: () => {},
    emitLaserVaporize: () => {},
    emitLaserMuzzle: () => {},
    get sparks() { return sparks; },
    get explosions() { return explosions; },
  };
}

function createEmptyGrid() {
  const grid = [];
  for (let r = 0; r < 20; r++) {
    if (r === 0 || r === 19) {
      grid.push('####################');
    } else {
      grid.push('#                  #');
    }
  }
  return grid;
}

test('Quantum Teleportation Portals Verification', async (t) => {
  await t.test('Declarative Room Parsing: Portals array with all properties', () => {
    const roomJson = {
      id: 'room_portal_test',
      coords: [0, 0],
      title: 'Portal Testing Ground',
      themeColor: '#00ffff',
      accentColor: '#ff00aa',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        {
          id: 'portal_alpha',
          x: 100,
          y: 600,
          width: 48,
          height: 72,
          targetPortalId: 'portal_beta',
          themeColor: '#ff0077',
          label: 'Alpha Warp Gate',
        },
        {
          id: 'portal_beta',
          x: 600,
          y: 600,
          // width and height omitted to test defaults
          label: 'Beta Landing Zone',
        },
      ],
    };

    const screenData = LevelLoader.parseRoom(roomJson);
    assert.ok(screenData.portals);
    assert.equal(screenData.portals.length, 2);

    const alpha = screenData.portals[0];
    assert.equal(alpha.id, 'portal_alpha');
    assert.equal(alpha.x, 100);
    assert.equal(alpha.y, 600);
    assert.equal(alpha.width, 48);
    assert.equal(alpha.height, 72);
    assert.equal(alpha.targetPortalId, 'portal_beta');
    assert.equal(alpha.themeColor, '#ff0077');
    assert.equal(alpha.label, 'Alpha Warp Gate');

    const beta = screenData.portals[1];
    assert.equal(beta.id, 'portal_beta');
    assert.equal(beta.x, 600);
    assert.equal(beta.y, 600);
    assert.equal(beta.targetPortalId, undefined);
    assert.equal(beta.label, 'Beta Landing Zone');
  });

  await t.test('Demo World Feature Integration: Genesis Core (0,0) links to Starlight Zenith (2,2)', () => {
    const demoWorldDir = path.resolve('worlds/demo');
    const room0Path = path.join(demoWorldDir, 'rooms/room_0_0.json');
    const room2Path = path.join(demoWorldDir, 'rooms/room_2_2.json');

    assert.ok(fs.existsSync(room0Path), 'room_0_0.json should exist');
    assert.ok(fs.existsSync(room2Path), 'room_2_2.json should exist');

    const room0Data = JSON.parse(fs.readFileSync(room0Path, 'utf8'));
    const room2Data = JSON.parse(fs.readFileSync(room2Path, 'utf8'));

    assert.ok(room0Data.portals && room0Data.portals.length > 0, 'Sector (0,0) must contain portals');
    assert.ok(room2Data.portals && room2Data.portals.length > 0, 'Sector (2,2) must contain portals');

    const sourceIn0 = room0Data.portals.find((p) => p.id === 'portal_genesis_to_zenith');
    assert.ok(sourceIn0, 'Sector 0 must feature portal_genesis_to_zenith');
    assert.equal(sourceIn0.targetPortalId, 'portal_zenith_core');
    assert.equal(sourceIn0.label, 'Zenith Warp');

    const destIn2 = room2Data.portals.find((p) => p.id === 'portal_zenith_core');
    assert.ok(destIn2, 'Sector (2,2) must feature portal_zenith_core');
    assert.equal(destIn2.label, 'No Return');
    assert.equal(destIn2.targetPortalId, undefined, 'portal_zenith_core is a destination-only portal');

    // Load both rooms into LevelMap
    const map = new LevelMap();
    map.addRoom(LevelLoader.parseRoom(room0Data));
    map.addRoom(LevelLoader.parseRoom(room2Data));

    // Verify map lookups
    const foundSource = map.findPortal('portal_genesis_to_zenith');
    assert.ok(foundSource);
    assert.equal(foundSource.room.coords.x, 0);
    assert.equal(foundSource.room.coords.y, 0);

    const foundDest = map.findPortal('portal_zenith_core');
    assert.ok(foundDest);
    assert.equal(foundDest.room.coords.x, 2);
    assert.equal(foundDest.room.coords.y, 2);

    const destRoom = map.getDestinationRoomForPortal(sourceIn0);
    assert.ok(destRoom);
    assert.equal(destRoom.id, 'room_2_2');

    // Dynamic destination color reflection
    const reflectedColor = map.getDestinationColor(sourceIn0, foundSource.room);
    assert.equal(reflectedColor, '#ffe600', 'Portal vortex in room 0 reflects room 2_2 themeColor');
  });

  await t.test('Topology & N:1 Portals: Multiple source portals can target the same destination portal', () => {
    const map = new LevelMap();

    const roomA = LevelLoader.parseRoom({
      id: 'room_a',
      coords: [0, 0],
      title: 'Sector A',
      themeColor: '#00ffaa',
      accentColor: '#0088ff',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'source_1', x: 80, y: 640, targetPortalId: 'shared_hub' },
        { id: 'source_2', x: 680, y: 640, targetPortalId: 'shared_hub' },
      ],
    });

    const roomB = LevelLoader.parseRoom({
      id: 'room_b',
      coords: [1, 0],
      title: 'Hub Sector',
      themeColor: '#ff00aa',
      accentColor: '#ffffff',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'shared_hub', x: 400, y: 640 }, // Destination-only portal
      ],
    });

    map.addRoom(roomA);
    map.addRoom(roomB);

    assert.equal(map.getAllPortals().length, 3);

    const dest1 = map.getDestinationRoomForPortal(roomA.portals[0]);
    assert.equal(dest1?.id, 'room_b');

    const dest2 = map.getDestinationRoomForPortal(roomA.portals[1]);
    assert.equal(dest2?.id, 'room_b');

    // Destination-only portal has no outbound destination
    const destHub = map.getDestinationRoomForPortal(roomB.portals[0]);
    assert.equal(destHub, undefined);
  });

  await t.test('PhysicsEngine: Intra-room portal teleportation with velocity preservation', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const map = new LevelMap();

    const room = LevelLoader.parseRoom({
      id: 'room_intra',
      coords: [0, 0],
      title: 'Intra Warp Lab',
      themeColor: '#00ffff',
      accentColor: '#ff00aa',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'p_in', x: 80, y: 640, width: 44, height: 68, targetPortalId: 'p_out' },
        { id: 'p_out', x: 600, y: 300, width: 44, height: 68, targetPortalId: 'p_in' },
      ],
    });
    map.addRoom(room);

    const player = new Player(85, 650);
    player.vx = 220; // moving right
    player.vy = -350; // mid-air upward jump momentum

    // Run physics update with player overlapping p_in (holding jump to sustain upward velocity)
    const transition = physics.update(
      player,
      room,
      { left: false, right: false, up: false, down: false, jump: true, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      0.5,
      map
    );

    // Intra-room teleportation happens instantly without cube rotation
    assert.equal(transition, null);

    // Player should be relocated to p_out
    // Centered horizontally: 600 + 44/2 - 24/2 = 610
    // Aligned to bottom: 300 + 68 - 36 = 332
    assert.equal(player.x, 610);
    assert.equal(player.y, 332);

    // Kinematics: velocities preserved (with frame integration dt=0.016)
    assert.ok(Math.abs(player.vx - 220) < 15, `vx should be preserved, got ${player.vx}`);
    assert.ok(Math.abs(player.vy - (-350)) < 25, `vy should be preserved, got ${player.vy}`);

    // Emerged portal is disabled until player leaves its collision box
    assert.equal(player.disabledPortalId, 'p_out', 'Arrival portal should be disabled to prevent instant suck-back');

    // Audio triggered
    assert.equal(audio.portalTeleportCount, 1, 'Audio playPortalTeleport should be called');
  });

  await t.test('PhysicsEngine: Inter-sector portal teleportation returns TransitionEvent with preserved velocity', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const map = new LevelMap();

    const room0 = LevelLoader.parseRoom({
      id: 'room_0_0',
      coords: [0, 0],
      title: 'Sector 0',
      themeColor: '#00ffff',
      accentColor: '#0088ff',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'warp_to_zenith', x: 100, y: 640, width: 44, height: 68, targetPortalId: 'zenith_landing', label: 'Zenith Warp' },
      ],
    });

    const roomZenith = LevelLoader.parseRoom({
      id: 'room_2_2',
      coords: [2, 2],
      title: 'Sector (2,2) Zenith',
      themeColor: '#ffe600',
      accentColor: '#ff8800',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'zenith_landing', x: 556, y: 532, width: 44, height: 68, targetPortalId: 'warp_to_zenith', label: 'Genesis Return' },
      ],
    });

    map.addRoom(room0);
    map.addRoom(roomZenith);

    const player = new Player(105, 650);
    player.vx = 280;
    player.vy = -180;

    const transition = physics.update(
      player,
      room0,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      1.0,
      map
    );

    assert.ok(transition, 'Should return transition event');
    assert.equal(transition.isPortal, true);
    assert.equal(transition.destRoom.id, 'room_2_2');
    assert.equal(transition.sourcePortal.id, 'warp_to_zenith');
    assert.equal(transition.destPortal.id, 'zenith_landing');
    assert.deepEqual(transition.targetCoords, { x: 2, y: 2 });

    // Kinematics preservation
    assert.equal(transition.preserveVx, player.vx);
    assert.equal(transition.preserveVy, player.vy);
    assert.ok(Math.abs(transition.preserveVx - 280) < 15);
    assert.ok(Math.abs(transition.preserveVy - (-180)) < 25);

    // Target arrival coordinates (feet aligned with portal bottom)
    // 556 + 44/2 - 24/2 = 566
    // 532 + 68 - 36 = 564
    assert.equal(transition.entryX, 566);
    assert.equal(transition.entryY, 564);

    // Direction calculation: dx=2, dy=2 -> direction 'right'
    assert.equal(transition.direction, 'right');

    // Destination portal disabled on arrival to prevent instant rebound
    assert.equal(player.disabledPortalId, 'zenith_landing');
  });

  await t.test('Collision box exit disables arrival portal without arbitrary timer; prevents infinite rebound', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const map = new LevelMap();

    const gridWithFloor = createEmptyGrid();
    gridWithFloor[18] = '####################';

    const room = LevelLoader.parseRoom({
      id: 'room_rebound_test',
      coords: [0, 0],
      title: 'Loop Guard Room',
      themeColor: '#00ffff',
      accentColor: '#ff00aa',
      exits: { left: false, right: false, up: false, down: false },
      grid: gridWithFloor,
      portals: [
        { id: 'p1', x: 100, y: 652, width: 44, height: 68, targetPortalId: 'p2' },
        { id: 'p2', x: 200, y: 652, width: 44, height: 68, targetPortalId: 'p1' },
      ],
    });
    map.addRoom(room);

    // 1. Player steps into p1
    const player = new Player(105, 660);
    const transition = physics.update(
      player,
      room,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      1.0,
      map
    );

    // Player relocated to p2: x = 200 + 44/2 - 24/2 = 210, y = 652 + 68 - 36 = 684
    assert.equal(transition, null);
    assert.equal(player.x, 210);
    assert.equal(player.y, 684);
    assert.equal(audio.portalTeleportCount, 1);
    assert.equal(player.disabledPortalId, 'p2', 'p2 must be disabled while player is in its collision box');

    // 2. Player remains inside p2's collision box across multiple ticks (e.g. 5 seconds)
    // p2 must NOT suck the player back in!
    for (let i = 0; i < 60; i++) {
      physics.update(
        player,
        room,
        { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
        0.016,
        undefined,
        undefined,
        1.0 + i * 0.016,
        map
      );
    }

    assert.equal(player.disabledPortalId, 'p2', 'p2 should still be disabled because player never left its collision box');
    assert.equal(audio.portalTeleportCount, 1, 'Audio should NOT trigger again while staying inside portal');

    // 3. Player moves away from p2's collision box (p2 bounds: x: 200..244, y: 652..720)
    player.setPosition(320, 684); // Move well clear of p2
    physics.update(
      player,
      room,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      2.0,
      map
    );

    assert.equal(player.disabledPortalId, null, 'Moving away from portal must clear disabledPortalId');

    // 4. Player walks back into p2
    player.setPosition(210, 684);
    physics.update(
      player,
      room,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      2.016,
      map
    );

    // Now p2 triggers and teleports player back to p1!
    assert.equal(player.x, 110);
    assert.equal(player.y, 684);
    assert.equal(player.disabledPortalId, 'p1', 'p1 is now disabled on arrival');
    assert.equal(audio.portalTeleportCount, 2);
  });

  await t.test('Fluid portal jumping: player emerging from one portal can immediately enter another portal with zero delay', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const map = new LevelMap();

    // Portal chain: p1 -> p2, and right next to p2 is p3 -> p4
    const room = LevelLoader.parseRoom({
      id: 'room_chain_test',
      coords: [0, 0],
      title: 'Chain Portal Room',
      themeColor: '#00ffff',
      accentColor: '#ff00aa',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'p1', x: 100, y: 640, width: 44, height: 68, targetPortalId: 'p2' },
        { id: 'p2', x: 200, y: 640, width: 44, height: 68, targetPortalId: 'p1' },
        { id: 'p3', x: 260, y: 640, width: 44, height: 68, targetPortalId: 'p4' },
        { id: 'p4', x: 500, y: 640, width: 44, height: 68, targetPortalId: 'p3' },
      ],
    });
    map.addRoom(room);

    // Player enters p1
    const player = new Player(105, 650);
    physics.update(
      player,
      room,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      0.5,
      map
    );

    // Player arrives at p2; p2 is disabled, but p3 is NOT disabled
    assert.equal(player.x, 210);
    assert.equal(player.disabledPortalId, 'p2');
    assert.equal(audio.portalTeleportCount, 1);

    // Player with horizontal speed immediately enters p3 (x = 265, overlapping p3 at x: 260..304)
    player.setPosition(265, 672);
    physics.update(
      player,
      room,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      0.516,
      map
    );

    // Player is INSTANTLY teleported to p4 without any cooldown timer blocking it!
    assert.equal(player.x, 510);
    assert.equal(player.disabledPortalId, 'p4');
    assert.equal(audio.portalTeleportCount, 2, 'p3 should trigger immediately without timer delay');
  });

  await t.test('Editor Serialization: Portals roundtrip cleanly in export and import', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];
    room.portals = [
      {
        id: 'editor_p1',
        x: 120,
        y: 600,
        width: 44,
        height: 68,
        targetPortalId: 'editor_p2',
        themeColor: '#00ffaa',
        label: 'Sector Exit Gate',
      },
      {
        id: 'editor_p2',
        x: 500,
        y: 400,
        width: 44,
        height: 68,
        label: 'Sector Arrival Node',
      },
    ];

    const jsonStr = exportWorldJson(world);
    const parsedWorld = parseWorldJson(jsonStr);

    assert.ok(parsedWorld.rooms[0].portals);
    assert.equal(parsedWorld.rooms[0].portals.length, 2);
    assert.equal(parsedWorld.rooms[0].portals[0].id, 'editor_p1');
    assert.equal(parsedWorld.rooms[0].portals[0].targetPortalId, 'editor_p2');
    assert.equal(parsedWorld.rooms[0].portals[0].themeColor, '#00ffaa');
    assert.equal(parsedWorld.rooms[0].portals[0].label, 'Sector Exit Gate');
    assert.equal(parsedWorld.rooms[0].portals[1].id, 'editor_p2');
  });

  await t.test('Editor Validator: Flags duplicate portal IDs', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];
    room.portals = [
      { id: 'dup_portal', x: 100, y: 640 },
      { id: 'dup_portal', x: 400, y: 640 },
    ];

    const issues = validateWorld(world);
    const dupIssue = issues.find((i) => i.message.includes('Duplicate portal ID') && i.message.includes('dup_portal'));
    assert.ok(dupIssue, 'Validator should flag duplicate portal IDs');
    assert.equal(dupIssue.severity, 'error');
  });

  await t.test('Editor Validator: Flags missing or unresolved targetPortalId', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];
    room.portals = [
      { id: 'portal_orphan', x: 100, y: 640, targetPortalId: 'non_existent_portal' },
    ];

    const issues = validateWorld(world);
    const missingTarget = issues.find((i) => i.message.includes('non_existent_portal'));
    assert.ok(missingTarget, 'Validator should flag unresolved destination portal');
    assert.equal(missingTarget.severity, 'warning');
  });

  await t.test('Editor Validator: Flags self-targeting portal', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];
    room.portals = [
      { id: 'portal_self', x: 100, y: 640, targetPortalId: 'portal_self' },
    ];

    const issues = validateWorld(world);
    const selfIssue = issues.find((i) => i.message.includes('targets itself'));
    assert.ok(selfIssue, 'Validator should flag self-targeting portal');
    assert.equal(selfIssue.severity, 'warning');
  });

  await t.test('Editor Validator: Warns when portal is placed inside solid obstacle', () => {
    const world = createEmptyWorld();
    const room = world.rooms[0];
    // Put portal inside row 0 (which is solid '#')
    room.portals = [
      { id: 'portal_stuck', x: 40, y: 0, width: 40, height: 40 },
    ];

    const issues = validateWorld(world);
    const stuckIssue = issues.find((i) => i.message.includes('inside a Solid block'));
    assert.ok(stuckIssue, 'Validator should warn when portal center is placed inside a solid block');
    assert.equal(stuckIssue.severity, 'warning');
  });

  await t.test('Kinematics: Intra-room portal with reverseVelocity negates outbound vx and vy vector', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const map = new LevelMap();

    const room = LevelLoader.parseRoom({
      id: 'room_rev_intra',
      coords: [0, 0],
      title: 'Reverse Warp Chamber',
      themeColor: '#00ffff',
      accentColor: '#ff00aa',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'p_drop', x: 80, y: 640, width: 44, height: 68, targetPortalId: 'p_reverse_exit' },
        { id: 'p_reverse_exit', x: 500, y: 400, width: 44, height: 68, targetPortalId: 'p_drop', reverseVelocity: true },
      ],
    });
    map.addRoom(room);

    // Player falls into portal: moving right (vx = 250) and falling downwards (vy = 600)
    const player = new Player(85, 650);
    player.vx = 250;
    player.vy = 600;

    const transition = physics.update(
      player,
      room,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      0.5,
      map
    );

    assert.equal(transition, null, 'Intra-room warp should not trigger 3D tumble');

    // Emerging from p_reverse_exit:
    // vx should be negated: -250 (moving left)
    // vy should be negated: -600 (launched upwards!)
    assert.ok(player.vx < -200, `player.vx should be inverted to negative, got ${player.vx}`);
    assert.ok(player.vy < -500, `player.vy should be inverted to upward velocity, got ${player.vy}`);
    assert.equal(player.isBouncePropelled, true, 'Upward launch should enable isBouncePropelled to preserve launch arc');
    assert.equal(player.isGrounded, false, 'Player should be airborne after upward reverse launch');
  });

  await t.test('Kinematics: Inter-sector portal with reverseVelocity negates outbound preserveVx and preserveVy', () => {
    const audio = createMockAudio();
    const particles = createMockParticles();
    const physics = new PhysicsEngine(audio, particles);
    const map = new LevelMap();

    const roomA = LevelLoader.parseRoom({
      id: 'room_sec_a',
      coords: [0, 0],
      title: 'Sector A',
      themeColor: '#00ffff',
      accentColor: '#ff00aa',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'warp_to_b', x: 100, y: 640, width: 44, height: 68, targetPortalId: 'landing_in_b' },
      ],
    });

    const roomB = LevelLoader.parseRoom({
      id: 'room_sec_b',
      coords: [1, 0],
      title: 'Sector B',
      themeColor: '#ff00aa',
      accentColor: '#00ffff',
      exits: { left: false, right: false, up: false, down: false },
      grid: createEmptyGrid(),
      portals: [
        { id: 'landing_in_b', x: 400, y: 500, width: 44, height: 68, targetPortalId: 'warp_to_b', reverseVelocity: true },
      ],
    });

    map.addRoom(roomA);
    map.addRoom(roomB);

    // Player enters warp_to_b moving right (vx = 300) and falling downwards (vy = 450)
    const player = new Player(105, 650);
    player.vx = 300;
    player.vy = 450;

    const transition = physics.update(
      player,
      roomA,
      { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restart: false, restartJustPressed: false },
      0.016,
      undefined,
      undefined,
      0.5,
      map
    );

    assert.ok(transition, 'Should return inter-sector transition event');
    assert.equal(transition.destPortal.id, 'landing_in_b');
    assert.ok(transition.destPortal.reverseVelocity, 'Destination portal has reverseVelocity: true');

    // Negated vectors passed to TransitionEvent
    assert.ok(transition.preserveVx < -250, `preserveVx should be negated, got ${transition.preserveVx}`);
    assert.ok(transition.preserveVy < -400, `preserveVy should be negated (upward), got ${transition.preserveVy}`);
  });

  await t.test('Editor Serialization: reverseVelocity property roundtrips cleanly in export and import', () => {
    const world = createEmptyWorld();
    world.rooms[0].portals = [
      {
        id: 'rev_portal_1',
        x: 120,
        y: 600,
        width: 44,
        height: 68,
        targetPortalId: 'rev_portal_2',
        reverseVelocity: true,
      },
      {
        id: 'rev_portal_2',
        x: 480,
        y: 600,
        width: 44,
        height: 68,
        targetPortalId: 'rev_portal_1',
        reverseVelocity: false,
      },
    ];

    const jsonStr = exportWorldJson(world);
    const parsedWorld = parseWorldJson(jsonStr);

    assert.ok(parsedWorld.rooms[0].portals);
    assert.equal(parsedWorld.rooms[0].portals.length, 2);
    assert.equal(parsedWorld.rooms[0].portals[0].reverseVelocity, true);
    assert.equal(parsedWorld.rooms[0].portals[1].reverseVelocity, false);
  });
});
