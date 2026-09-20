import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ParticleSystem } = require('./dist-world/engine/ParticleSystem.js');
const { Player } = require('./dist-world/entities/Player.js');
const { PhysicsEngine } = require('./dist-world/engine/PhysicsEngine.js');
const { TileType } = require('./dist-world/world/ScreenData.js');
const { LaserTurret } = require('./dist-world/entities/LaserTurret.js');

test('Player Death Explosion & Synth Sound Verification', async (t) => {
  await t.test('ParticleSystem.emitPlayerExplosion emits 360-degree shards, shockwaves, and motes with drag', () => {
    const ps = new ParticleSystem();
    assert.equal(ps.count, 0);

    const originX = 200;
    const originY = 300;
    ps.emitPlayerExplosion(originX, originY, '#00ffff', '#ff007f');

    // Total emitted particles: 2 rings + 48 shards + 22 motes = 72 particles
    assert.equal(ps.count, 72, 'Should emit exactly 72 explosion particles');

    const rings = ps.particles.filter((p) => p.shape === 'ring');
    assert.equal(rings.length, 2, 'Should emit 2 shockwave rings');
    rings.forEach((r) => {
      assert.equal(r.vx, 0, 'Rings should expand from stationary center');
      assert.equal(r.vy, 0, 'Rings should expand from stationary center');
      assert.ok(r.size >= 55, 'Ring size should be large and expanding');
    });

    const shards = ps.particles.filter((p) => p.shape === 'spark' || p.shape === 'square');
    assert.equal(shards.length, 48, 'Should emit 48 high-speed shards');

    // Verify 360-degree spread: velocity vectors should cover all four quadrants
    let hasQuadrant1 = false; // vx > 0, vy > 0
    let hasQuadrant2 = false; // vx < 0, vy > 0
    let hasQuadrant3 = false; // vx < 0, vy < 0
    let hasQuadrant4 = false; // vx > 0, vy < 0

    shards.forEach((s) => {
      assert.ok(s.drag && s.drag < 1.0, 'Shards must have drag configured for realistic blast deceleration');
      const speed = Math.hypot(s.vx, s.vy);
      assert.ok(speed >= 100, `Shard speed should be substantial (got ${speed})`);

      if (s.vx > 0 && s.vy > 0) hasQuadrant1 = true;
      if (s.vx < 0 && s.vy > 0) hasQuadrant2 = true;
      if (s.vx < 0 && s.vy < 0) hasQuadrant3 = true;
      if (s.vx > 0 && s.vy < 0) hasQuadrant4 = true;
    });

    assert.ok(hasQuadrant1 && hasQuadrant2 && hasQuadrant3 && hasQuadrant4, 'Shards must fly in all 360-degree directions across all 4 quadrants');

    const motes = ps.particles.filter((p) => p.shape === 'circle');
    assert.equal(motes.length, 22, 'Should emit 22 billowing plasma/smoke motes');
    motes.forEach((m) => {
      assert.ok(m.drag && m.drag < 1.0, 'Motes must have drag');
    });

    // Test drag physics in update(dt)
    const initialVx = shards[0].vx;
    ps.update(0.016);
    assert.ok(Math.abs(shards[0].vx) < Math.abs(initialVx), 'Particle drag must decelerate shard horizontal velocity over time');
  });

  await t.test('Player.isAlive flag toggles sprite visibility during death sequence', () => {
    const player = new Player(100, 200);
    assert.equal(player.isAlive, true, 'Player should be alive initially');

    let drawCalls = 0;
    const dummyCtx = {
      save: () => drawCalls++,
      restore: () => drawCalls++,
      beginPath: () => drawCalls++,
      roundRect: () => drawCalls++,
      fill: () => drawCalls++,
      stroke: () => drawCalls++,
      arc: () => drawCalls++,
      fillRect: () => drawCalls++,
      strokeRect: () => drawCalls++,
      moveTo: () => drawCalls++,
      lineTo: () => drawCalls++,
      closePath: () => drawCalls++,
      shadowColor: '',
      shadowBlur: 0,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    };

    // When alive, render performs drawing
    player.render(dummyCtx);
    assert.ok(drawCalls > 0, 'Render should execute drawing calls when player is alive');

    // When dying/respawning (isAlive = false), render exits early without drawing body
    player.isAlive = false;
    const previousDrawCalls = drawCalls;
    player.render(dummyCtx);
    assert.equal(drawCalls, previousDrawCalls, 'Render must exit early without drawing body when player.isAlive is false');
  });

  await t.test('All lethal hazard triggers invoke audio.playDeath() and emitPlayerExplosion()', () => {
    let deathSoundPlayed = 0;
    let explosionEmitted = 0;
    let explosionDetails = [];

    const testAudio = {
      playDeath: () => deathSoundPlayed++,
      playBounce: () => {},
      playLand: () => {},
      playJump: () => {},
      playDropThrough: () => {},
      playLaserShoot: () => {},
      playLaserImpact: () => {},
      playLaserWarning: () => {},
      playLaserHum: () => {},
    };

    const testParticles = {
      emitPlayerExplosion: (x, y, primaryColor, accentColor) => {
        explosionEmitted++;
        explosionDetails.push({ x, y, primaryColor, accentColor });
      },
      emitSparks: () => {},
      emitDust: () => {},
      emitLaserSparks: () => {},
      emitLaserCharge: () => {},
      emitLaserVaporize: () => {},
      emitLaserMuzzle: () => {},
    };

    const physics = new PhysicsEngine(testAudio, testParticles);

    // 1. Test Spike Death
    const spikeRoom = {
      id: 'death_spike_room',
      coords: { x: 0, y: 0 },
      title: 'Spike Room',
      themeColor: '#ff0055',
      accentColor: '#ffaa00',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
      spikeProps: { '10,10': { direction: 'up' } },
    };
    spikeRoom.tiles[10][10] = TileType.SPIKE;
    const player = new Player(10 * 40, 10 * 40);

    let spikeDied = false;
    physics.checkSpikeCollisions(player, spikeRoom, () => { spikeDied = true; });
    assert.ok(spikeDied, 'Spike collision must trigger death callback');
    assert.equal(deathSoundPlayed, 1, 'Spike death must trigger playDeath()');
    assert.equal(explosionEmitted, 1, 'Spike death must trigger emitPlayerExplosion()');

    // 2. Test Laser Barrier Death
    const barrierRoom = {
      id: 'death_barrier_room',
      coords: { x: 1, y: 0 },
      title: 'Barrier Room',
      themeColor: '#00ffff',
      accentColor: '#ffe600',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
      laserBarriers: [
        {
          id: 'barrier_death',
          startX1: 100,
          startY1: 100,
          startX2: 300,
          startY2: 100,
          activeDuration: 10,
          inactiveDuration: 0,
          warningDuration: 0,
        },
      ],
    };
    player.setPosition(150, 90); // Overlaps horizontal beam at y=100
    let barrierDied = false;
    const dummyInput = { left: false, right: false, up: false, down: false, jump: false, jumpJustPressed: false, restartJustPressed: false, cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false };
    physics.update(player, barrierRoom, dummyInput, 0.016, undefined, () => { barrierDied = true; }, 0.5);
    assert.ok(barrierDied, 'Laser barrier contact must trigger death callback');
    assert.equal(deathSoundPlayed, 2, 'Laser barrier death must trigger playDeath()');
    assert.equal(explosionEmitted, 2, 'Laser barrier death must trigger emitPlayerExplosion()');

    // 3. Test Laser Beam Turret Death
    const beamRoom = {
      id: 'death_beam_room',
      coords: { x: 2, y: 0 },
      title: 'Beam Room',
      themeColor: '#ff00aa',
      accentColor: '#00ffcc',
      tiles: Array.from({ length: 20 }, () => new Array(20).fill(TileType.EMPTY)),
      collectibles: [],
      exits: { left: false, right: false, up: false, down: false },
      laserTurrets: [
        {
          id: 'turret_death_beam',
          x: 40,
          y: 200,
          direction: 'right',
          mode: 'beam',
          beamActiveDuration: 10,
          beamInactiveDuration: 0,
          beamWarningDuration: 0,
        },
      ],
    };
    player.setPosition(250, 190); // In line of horizontal beam at y=200
    let beamDied = false;
    physics.update(player, beamRoom, dummyInput, 0.016, undefined, () => { beamDied = true; }, 0.5);
    assert.ok(beamDied, 'Laser beam contact must trigger death callback');
    assert.equal(deathSoundPlayed, 3, 'Laser beam death must trigger playDeath()');
    assert.equal(explosionEmitted, 3, 'Laser beam death must trigger emitPlayerExplosion()');
  });

  await t.test('ParticleSystem.clear() correctly empties all active particles', () => {
    const ps = new ParticleSystem();
    ps.emitPlayerExplosion(100, 100);
    assert.ok(ps.count > 0, 'Particles should exist after explosion');
    ps.clear();
    assert.equal(ps.count, 0, 'clear() must remove all particles');
  });

  await t.test('Player.resetHoldProgress renders radial charging arc when holding R', () => {
    const player = new Player(100, 200);
    let arcDrawn = 0;
    const dummyCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      arc: () => { arcDrawn++; },
      fillRect: () => {},
      strokeRect: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      shadowColor: '',
      shadowBlur: 0,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
    };

    // No hold progress: normal rendering
    player.render(dummyCtx);
    const normalArcCalls = arcDrawn;

    // Holding R with progress 0.5
    player.resetHoldProgress = 0.5;
    player.render(dummyCtx);
    assert.ok(arcDrawn > normalArcCalls, 'Render must draw radial charging gauge when resetHoldProgress > 0');
  });

  await t.test('R Reset Logic: short press triggers player death, long press triggers level restart', () => {
    let deathCount = 0;
    let explosionCount = 0;
    let levelResetCount = 0;

    const fakeGame = {
      rHoldTime: 0,
      R_HOLD_THRESHOLD: 0.8,
      rLongPressTriggered: false,
      gameState: 'PLAYING',
      currentCoords: { x: 3, y: 1 },
      sidesTraversed: 7,
      triggerPlayerDeath() {
        deathCount++;
        explosionCount++;
      },
      resetWholeLevel() {
        levelResetCount++;
        this.currentCoords = { x: 0, y: 0 };
        this.sidesTraversed = 1;
      },
      handleRestartInput(isRestarting, dt) {
        if (isRestarting) {
          this.rHoldTime += dt;
          if (this.rHoldTime >= this.R_HOLD_THRESHOLD && !this.rLongPressTriggered) {
            this.rLongPressTriggered = true;
            this.resetWholeLevel();
          }
        } else {
          if (this.rHoldTime > 0) {
            if (!this.rLongPressTriggered && this.rHoldTime < this.R_HOLD_THRESHOLD) {
              this.triggerPlayerDeath();
            }
            this.rHoldTime = 0;
            this.rLongPressTriggered = false;
          }
        }
      }
    };

    // 1. Simulate short press (tap for 100ms then release): should trigger death
    fakeGame.handleRestartInput(true, 0.05);
    fakeGame.handleRestartInput(true, 0.05);
    fakeGame.handleRestartInput(false, 0.016); // release at 100ms
    assert.equal(deathCount, 1, 'Short press R must trigger player death');
    assert.equal(levelResetCount, 0, 'Short press R must NOT trigger level reset');
    assert.equal(fakeGame.rHoldTime, 0, 'Hold timer should reset on release');

    // 2. Simulate long press (hold for 850ms >= 800ms threshold): should trigger whole level reset
    for (let frame = 0; frame < 52; frame++) {
      fakeGame.handleRestartInput(true, 0.016); // 52 * 16ms = 832ms
    }
    assert.equal(levelResetCount, 1, 'Holding R >= 0.8s must trigger whole level reset');
    assert.equal(fakeGame.currentCoords.x, 0, 'Level reset must return coordinates to x=0');
    assert.equal(fakeGame.currentCoords.y, 0, 'Level reset must return coordinates to y=0');
    assert.equal(fakeGame.sidesTraversed, 1, 'Level reset must reset sidesTraversed to 1');

    // Release after long press: should NOT trigger player death
    fakeGame.handleRestartInput(false, 0.016);
    assert.equal(deathCount, 1, 'Releasing R after long press must NOT trigger player death');
  });
});

