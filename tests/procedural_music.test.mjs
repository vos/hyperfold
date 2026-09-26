import assert from 'node:assert/strict';
import test from 'node:test';
import { midiToFreq } from '../src/engine/SynthInstruments.ts';
import { ProceduralMusicEngine } from '../src/engine/ProceduralMusicEngine.ts';

/**
 * Minimal Web Audio API Mock for Node.js unit testing.
 */
class MockAudioParam {
  constructor(defaultValue = 0) {
    this.value = defaultValue;
    this.scheduledValues = [];
  }

  setValueAtTime(value, time) {
    this.value = value;
    this.scheduledValues.push({ time, value, type: 'set' });
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.scheduledValues.push({ time, value, type: 'linear' });
  }

  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this.scheduledValues.push({ time, value, type: 'exponential' });
  }

  cancelScheduledValues(time) {
    this.scheduledValues = this.scheduledValues.filter((s) => s.time < time);
  }
}

class MockAudioNode {
  connect(dest) {
    return dest;
  }
  disconnect() {}
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1.0);
}

class MockBiquadFilterNode extends MockAudioNode {
  frequency = new MockAudioParam(20000);
  Q = new MockAudioParam(1.0);
  type = 'lowpass';
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam(-12);
  knee = new MockAudioParam(8);
  ratio = new MockAudioParam(4);
  attack = new MockAudioParam(0.003);
  release = new MockAudioParam(0.15);
}

class MockOscillatorNode extends MockAudioNode {
  type = 'sawtooth';
  frequency = new MockAudioParam(440);
  detune = new MockAudioParam(0);
  start(_time) {}
  stop(_time) {}
}

class MockBufferSourceNode extends MockAudioNode {
  buffer = null;
  start(_time) {}
  stop(_time) {}
}

class MockAudioContext {
  state = 'running';
  currentTime = 10.0;
  sampleRate = 44100;
  destination = new MockAudioNode();

  createGain() {
    return new MockGainNode();
  }

  createBiquadFilter() {
    return new MockBiquadFilterNode();
  }

  createDynamicsCompressor() {
    return new MockDynamicsCompressorNode();
  }

  createOscillator() {
    return new MockOscillatorNode();
  }

  createBufferSource() {
    return new MockBufferSourceNode();
  }

  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

test('Procedural Synth Background Music Verification', async (t) => {
  await t.test('midiToFreq accurately converts standard MIDI note numbers to Hz', () => {
    assert.equal(Math.round(midiToFreq(69)), 440, 'MIDI 69 (A4) should be 440 Hz');
    assert.equal(Math.round(midiToFreq(57)), 220, 'MIDI 57 (A3) should be 220 Hz');
    assert.equal(Math.round(midiToFreq(81)), 880, 'MIDI 81 (A5) should be 880 Hz');
    assert.equal(Math.round(midiToFreq(60) * 100) / 100, 261.63, 'MIDI 60 (Middle C) should be ~261.63 Hz');
  });

  await t.test('Sector analysis is deterministic given identical coordinates and theme', () => {
    const mockCtx = new MockAudioContext();
    const engine = new ProceduralMusicEngine(mockCtx, mockCtx.destination);

    const roomA = {
      id: 'sector_0_0',
      coords: { x: 0, y: 0 },
      title: 'Genesis Core',
      themeColor: '#00ffff',
      accentColor: '#0088ff',
      tiles: [],
      collectibles: [],
      exits: { left: false, right: true, up: false, down: false },
    };

    const roomB = {
      id: 'sector_0_0',
      coords: { x: 0, y: 0 },
      title: 'Genesis Core',
      themeColor: '#00ffff',
      accentColor: '#0088ff',
      tiles: [],
      collectibles: [],
      exits: { left: false, right: true, up: false, down: false },
    };

    const profileA = engine.analyzeSector(roomA);
    const profileB = engine.analyzeSector(roomB);

    assert.equal(profileA.rootMidi, profileB.rootMidi);
    assert.equal(profileA.mode, profileB.mode);
    assert.equal(profileA.bpm, profileB.bpm);
    assert.deepEqual(profileA.chords, profileB.chords);
    assert.deepEqual(profileA.arpPattern, profileB.arpPattern);
    assert.equal(profileA.bassGroove, profileB.bassGroove);
    assert.equal(profileA.hasKick, profileB.hasKick);
    assert.equal(profileA.hasSnare, profileB.hasSnare);
  });

  await t.test('Sector analysis produces distinct themes across different world coordinates', () => {
    const mockCtx = new MockAudioContext();
    const engine = new ProceduralMusicEngine(mockCtx, mockCtx.destination);

    const room1 = {
      id: 'sec_1',
      coords: { x: 1, y: 0 },
      title: 'Neon Walk',
      themeColor: '#00ffff',
      accentColor: '#0088ff',
      tiles: [],
      collectibles: [],
      exits: { left: true, right: true, up: false, down: false },
    };

    const room2 = {
      id: 'sec_2',
      coords: { x: 4, y: 5 },
      title: 'Far Reach',
      themeColor: '#ff00aa',
      accentColor: '#9900ff',
      tiles: [],
      collectibles: [],
      exits: { left: true, right: true, up: true, down: false },
    };

    const profile1 = engine.analyzeSector(room1);
    const profile2 = engine.analyzeSector(room2);

    assert.notEqual(
      `${profile1.rootMidi}-${profile1.mode}-${profile1.bpm}`,
      `${profile2.rootMidi}-${profile2.mode}-${profile2.bpm}`,
      'Different coordinates and themes must yield distinct musical profiles'
    );
  });

  await t.test('Theme color biome mapping assigns appropriate scale modes', () => {
    const mockCtx = new MockAudioContext();
    const engine = new ProceduralMusicEngine(mockCtx, mockCtx.destination);

    const solarRoom = {
      coords: { x: 2, y: 2 },
      themeColor: '#ff6600',
    };
    const toxicRoom = {
      coords: { x: 3, y: 1 },
      themeColor: '#39ff14',
    };
    const voidRoom = {
      coords: { x: 5, y: 5 },
      themeColor: '#ff00aa',
    };
    const cyanRoom = {
      coords: { x: 1, y: 1 },
      themeColor: '#00ffff',
    };

    assert.equal(engine.analyzeSector(solarRoom).mode, 'phrygian', 'Solar theme must map to tense Phrygian mode');
    assert.equal(engine.analyzeSector(toxicRoom).mode, 'harmonicMinor', 'Toxic theme must map to dark Harmonic Minor');
    assert.equal(engine.analyzeSector(voidRoom).mode, 'harmonicMinor', 'Void theme must map to mysterious Harmonic Minor');
    assert.equal(engine.analyzeSector(cyanRoom).mode, 'dorian', 'Cyan matrix theme must map to bright Dorian mode');
  });

  await t.test('Hazard density dynamically ramps BPM, activates kick/snare, and switches bass groove to rolling 16ths', () => {
    const mockCtx = new MockAudioContext();
    const engine = new ProceduralMusicEngine(mockCtx, mockCtx.destination);

    const safeRoom = {
      coords: { x: 0, y: 0 },
      themeColor: '#00ffff',
      laserTurrets: [],
      laserBarriers: [],
      movingPlatforms: [],
      spikeProps: {},
    };

    const dangerousRoom = {
      coords: { x: 3, y: 3 },
      themeColor: '#ff6600',
      laserTurrets: [{}, {}],
      laserBarriers: [{}],
      movingPlatforms: [{}],
      spikeProps: { '1,2': {}, '1,3': {}, '1,4': {} },
    };

    const safeProfile = engine.analyzeSector(safeRoom);
    const dangerProfile = engine.analyzeSector(dangerousRoom);

    assert.equal(safeProfile.hasSnare, false, 'Peaceful sector must not have intense snare backbeat');
    assert.equal(dangerProfile.hasSnare, true, 'High hazard sector must activate snare backbeat');
    assert.equal(dangerProfile.hasKick, true, 'High hazard sector must have driving kick');
    assert.equal(dangerProfile.bassGroove, 'rolling16', 'High hazard sector must engage rolling 16th bassline');
    assert.equal(dangerProfile.hatDensity, 16, 'High hazard sector must have 16th note high-energy hi-hats');
    assert.ok(dangerProfile.bpm > safeProfile.bpm, `BPM should increase with danger (got safe ${safeProfile.bpm}, danger ${dangerProfile.bpm})`);
  });

  await t.test('Audio reactivity: death choke, respawn restore, and rotation sweep modulate filter correctly', () => {
    const mockCtx = new MockAudioContext();
    const engine = new ProceduralMusicEngine(mockCtx, mockCtx.destination);

    // Trigger death choke
    engine.triggerDeathChoke();
    const filter = engine.musicFilter;
    assert.ok(filter.frequency.scheduledValues.some((v) => v.value === 220), 'Death choke must schedule lowpass filter choke to 220Hz');

    // Trigger respawn restore
    engine.triggerRespawnRestore();
    assert.ok(filter.frequency.scheduledValues.some((v) => v.value === 20000), 'Respawn restore must schedule filter open back to 20kHz');

    // Trigger rotation sweep
    engine.triggerRotationSweep(0.45);
    assert.ok(filter.frequency.scheduledValues.some((v) => v.value === 400), 'Rotation sweep must sweep filter down to 400Hz');
  });

  await t.test('Volume and mute controls smoothly adjust submaster gain without pops', () => {
    const mockCtx = new MockAudioContext();
    const engine = new ProceduralMusicEngine(mockCtx, mockCtx.destination);

    engine.setMuted(true);
    const submaster = engine.musicSubmasterGain;
    assert.ok(submaster.gain.scheduledValues.some((v) => v.value === 0), 'Muting must schedule gain to 0');

    engine.setMuted(false);
    assert.ok(submaster.gain.scheduledValues.some((v) => v.value > 0), 'Unmuting must schedule gain back above 0');

    engine.setMusicVolume(0.25);
    assert.ok(submaster.gain.scheduledValues.some((v) => v.value === 0.25), 'Volume adjustment must set music submaster gain');
  });

  await t.test('Scheduler starts and stops cleanly without leaking intervals', () => {
    const mockCtx = new MockAudioContext();
    const engine = new ProceduralMusicEngine(mockCtx, mockCtx.destination);

    engine.start();
    assert.equal(engine.isPlaying, true, 'Engine should be playing');
    assert.notEqual(engine.lookaheadIntervalId, null, 'Scheduler interval should be set');

    engine.stop();
    assert.equal(engine.isPlaying, false, 'Engine should not be playing after stop()');
    assert.equal(engine.lookaheadIntervalId, null, 'Scheduler interval should be cleared');
  });
});
