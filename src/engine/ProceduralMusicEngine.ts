import type { ScreenData } from '../world/ScreenData.ts';
import type { LevelMap } from '../world/LevelMap.ts';
import { SynthInstruments } from './SynthInstruments.ts';

export type ScaleMode = 'dorian' | 'aeolian' | 'phrygian' | 'harmonicMinor' | 'lydian' | 'mixolydian';

export interface SectorMusicalProfile {
  rootMidi: number;
  mode: ScaleMode;
  scaleIntervals: number[];
  chords: number[][]; // 4 chords, each an array of MIDI notes
  bpm: number;
  arpPattern: number[];
  bassGroove: 'rolling16' | 'offbeat8' | 'drone';
  hasKick: boolean;
  hasSnare: boolean;
  hasHat: boolean;
  hatDensity: 8 | 16;
  filterBrightness: number;
  bassResonance: number;
  themeColor: string;
}

const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class ProceduralMusicEngine {
  private ctx: AudioContext;
  private instruments: SynthInstruments;

  // Master music output bus
  private musicSubmasterGain: GainNode;
  private musicFilter: BiquadFilterNode;
  private destinationNode: AudioNode;

  // Separate track gain nodes for precise mixing
  private padGain: GainNode;
  private bassGain: GainNode;
  private arpGain: GainNode;
  private percGain: GainNode;

  // State
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private masterMusicVolume: number = 0.55;

  // Scheduler state (Chris Wilson "A Tale of Two Clocks" pattern)
  private lookaheadIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly LOOKAHEAD_MS: number = 25; // How frequently to check
  private readonly SCHEDULE_AHEAD_TIME: number = 0.12; // How far ahead to schedule (seconds)
  private nextTickTime: number = 0;
  private currentTick: number = 0; // 0..15 in a 4/4 measure (16th note resolution)
  private currentBar: number = 0; // 0..3 in a 4-bar progression

  // Active & Pending Musical Profiles
  private activeProfile: SectorMusicalProfile;
  private pendingProfile: SectorMusicalProfile | null = null;
  private lastSectorKey: string = '';

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destinationNode = destination;
    this.instruments = new SynthInstruments(ctx);

    // Build Music Signal Chain
    // Tracks -> TrackGains -> MusicSubmaster -> MusicFilter -> Destination
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicFilter.Q.value = 1.0;

    this.musicSubmasterGain = ctx.createGain();
    this.musicSubmasterGain.gain.value = this.isMuted ? 0 : this.masterMusicVolume;

    this.musicSubmasterGain.connect(this.musicFilter);
    this.musicFilter.connect(this.destinationNode);

    // Track sub-mix gains
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.85;
    this.padGain.connect(this.musicSubmasterGain);

    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0.75;
    this.bassGain.connect(this.musicSubmasterGain);

    this.arpGain = ctx.createGain();
    this.arpGain.gain.value = 0.65;
    this.arpGain.connect(this.musicSubmasterGain);

    this.percGain = ctx.createGain();
    this.percGain.gain.value = 0.75;
    this.percGain.connect(this.musicSubmasterGain);

    // Initial default profile (Genesis Core / Ambient Cyberpunk)
    this.activeProfile = this.createDefaultProfile();
  }

  private createDefaultProfile(): SectorMusicalProfile {
    const rootMidi = 50; // D3
    const mode: ScaleMode = 'dorian';
    const scale = SCALE_INTERVALS[mode];
    return {
      rootMidi,
      mode,
      scaleIntervals: scale,
      chords: this.buildChordProgression(rootMidi, scale, 'cyber'),
      bpm: 106,
      arpPattern: [0, 2, 4, 7, 4, 2, 0, -1],
      bassGroove: 'offbeat8',
      hasKick: true,
      hasSnare: false,
      hasHat: true,
      hatDensity: 8,
      filterBrightness: 2400,
      bassResonance: 3.5,
      themeColor: '#00ffff',
    };
  }

  /**
   * Builds a 4-chord progression based on root MIDI and scale intervals.
   */
  private buildChordProgression(rootMidi: number, scale: number[], flavor: string): number[][] {
    // scale intervals are semitones relative to root
    // Helper to get note at scale degree (0-indexed)
    const getScaleNote = (degree: number, octaveOffset: number = 0): number => {
      const oct = Math.floor(degree / scale.length) + octaveOffset;
      const degInScale = ((degree % scale.length) + scale.length) % scale.length;
      return rootMidi + scale[degInScale] + oct * 12;
    };

    // Construct triads/7ths for 4 bars
    let degrees: number[][];
    if (flavor === 'tense') {
      // i - bII - i - bVII
      degrees = [
        [0, 2, 4], // i
        [1, 3, 5], // bII
        [0, 2, 4], // i
        [6, 8, 10], // bVII
      ];
    } else if (flavor === 'dark') {
      // i - iv - v - i
      degrees = [
        [0, 2, 4], // i
        [3, 5, 7], // iv
        [4, 6, 8], // v
        [0, 2, 4], // i
      ];
    } else if (flavor === 'epic') {
      // i - VI - III - VII
      degrees = [
        [0, 2, 4], // i
        [5, 7, 9], // VI
        [2, 4, 6], // III
        [6, 8, 10], // VII
      ];
    } else {
      // 'cyber' / default: i - bVII - bVI - V (or i - VI - iv - v)
      degrees = [
        [0, 2, 4, 6], // i7
        [5, 7, 9],    // bVI
        [3, 5, 7],    // iv
        [6, 8, 10],   // bVII
      ];
    }

    return degrees.map(chordDegs => chordDegs.map(d => getScaleNote(d, 0)));
  }

  /**
   * Deterministically analyzes a sector's geometry, hazards, and theme to produce a musical profile.
   */
  public analyzeSector(room: ScreenData, levelMap?: LevelMap): SectorMusicalProfile {
    const coords = room.coords || { x: 0, y: 0 };
    const sectorKey = `${coords.x},${coords.y}:${room.themeColor || ''}:${room.id || ''}`;
    const hash = hashString(sectorKey);

    // Hazard calculation
    const turretCount = room.laserTurrets?.length ?? 0;
    const barrierCount = room.laserBarriers?.length ?? 0;
    const movingCount = room.movingPlatforms?.length ?? 0;
    const spikeCount = room.spikeProps ? Object.keys(room.spikeProps).length : 0;
    const portalCount = room.portals?.length ?? 0;

    let threatLevel = 0;
    if (levelMap && typeof (levelMap as unknown as { getThreatLevel?: (x: number, y: number) => number }).getThreatLevel === 'function') {
      threatLevel = (levelMap as unknown as { getThreatLevel: (x: number, y: number) => number }).getThreatLevel(coords.x, coords.y);
    }
    const hazardScore = turretCount * 2.2 + barrierCount * 1.6 + spikeCount * 0.12 + movingCount * 0.4 + portalCount * 0.3 + threatLevel * 1.5;

    // Root note selection: Pick from musically resonant cyberpunk roots
    // [D3 (50), E3 (52), F3 (53), G3 (55), A3 (57), C3 (48), Bb2 (46)]
    const rootOptions = [50, 52, 53, 55, 57, 48, 46];
    const rootMidi = rootOptions[hash % rootOptions.length];

    // Mode based on theme color / biome
    const theme = (room.themeColor || '#00ffff').toLowerCase();
    let mode: ScaleMode = 'dorian';
    let flavor = 'cyber';

    if (theme.includes('ff6600') || theme.includes('ff0055') || theme.includes('ff3300')) {
      // Solar / Fire -> Phrygian (tense, exotic)
      mode = 'phrygian';
      flavor = 'tense';
    } else if (theme.includes('39ff14') || theme.includes('00ff66') || theme.includes('lime')) {
      // Toxic / Overdrive -> Gritty Dorian / Harmonic Minor
      mode = 'harmonicMinor';
      flavor = 'dark';
    } else if (theme.includes('ff00aa') || theme.includes('9900ff') || theme.includes('purple')) {
      // Void / Singularity -> Aeolian / Harmonic Minor
      mode = 'harmonicMinor';
      flavor = 'epic';
    } else if (theme.includes('00ccff') || theme.includes('0088ff') || theme.includes('cryo')) {
      // Cryo / Ice -> Lydian / Dorian
      mode = (hash % 2 === 0) ? 'lydian' : 'dorian';
      flavor = 'cyber';
    } else {
      // Default Cyan / Matrix
      mode = 'dorian';
      flavor = (hazardScore > 3) ? 'tense' : 'cyber';
    }

    const scale = SCALE_INTERVALS[mode];
    const chords = this.buildChordProgression(rootMidi, scale, flavor);

    // BPM calculation: 96 BPM in peaceful sectors up to 126 BPM in intense combat sectors
    const bpm = Math.min(128, Math.max(96, 102 + Math.floor(hazardScore * 3.2)));

    // Arp patterns
    const arpPatterns = [
      [0, 2, 4, 7, 4, 2, 0, -1],
      [0, 4, 7, 11, 7, 4, 2, 0],
      [7, 4, 2, 0, 2, 4, 7, 9],
      [0, 7, 4, 7, 2, 7, 4, 7],
      [0, 2, 0, 4, 0, 7, 4, 2],
    ];
    const arpPattern = arpPatterns[(hash >> 3) % arpPatterns.length];

    // Rhythm and Percussion layers based on hazard score
    const hasKick = hazardScore > 0.5 || coords.x !== 0 || coords.y !== 0;
    const hasSnare = hazardScore >= 2.5;
    const hasHat = hazardScore > 0.2;
    const hatDensity: 8 | 16 = hazardScore >= 2.0 ? 16 : 8;

    let bassGroove: 'rolling16' | 'offbeat8' | 'drone' = 'offbeat8';
    if (hazardScore >= 3.0) {
      bassGroove = 'rolling16';
    } else if (hazardScore < 0.8 && coords.x === 0 && coords.y === 0) {
      bassGroove = 'drone';
    }

    const filterBrightness = 1800 + Math.min(1800, hazardScore * 350);
    const bassResonance = 3.0 + Math.min(4.5, hazardScore * 0.8);

    return {
      rootMidi,
      mode,
      scaleIntervals: scale,
      chords,
      bpm,
      arpPattern,
      bassGroove,
      hasKick,
      hasSnare,
      hasHat,
      hatDensity,
      filterBrightness,
      bassResonance,
      themeColor: room.themeColor || '#00ffff',
    };
  }

  /**
   * Adapts the soundtrack when the player enters a new sector.
   * If music is currently running, transitions seamlessly on the next measure boundary.
   */
  public updateSector(room: ScreenData, levelMap?: LevelMap): void {
    const coords = room.coords || { x: 0, y: 0 };
    const sectorKey = `${coords.x},${coords.y}:${room.themeColor || ''}:${room.id || ''}`;
    if (sectorKey === this.lastSectorKey) return;
    this.lastSectorKey = sectorKey;

    const newProfile = this.analyzeSector(room, levelMap);

    if (!this.isPlaying) {
      this.activeProfile = newProfile;
      this.start();
    } else {
      // Queue profile transition on bar boundary so rhythm remains locked in groove
      this.pendingProfile = newProfile;
    }
  }

  /**
   * Starts the generative lookahead scheduler.
   */
  public start(): void {
    if (this.isPlaying) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.currentTick = 0;
    this.currentBar = 0;
    // Set first tick slightly in the future to let audio buffer settle
    this.nextTickTime = this.ctx.currentTime + 0.05;

    this.lookaheadIntervalId = setInterval(() => {
      this.scheduler();
    }, this.LOOKAHEAD_MS);
  }

  /**
   * Stops music playback and cancels scheduled intervals.
   */
  public stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.lookaheadIntervalId !== null) {
      clearInterval(this.lookaheadIntervalId);
      this.lookaheadIntervalId = null;
    }
  }

  /**
   * Master Lookahead Scheduler. Schedules all notes in advance with microsecond precision.
   */
  private scheduler(): void {
    if (!this.isPlaying || !this.ctx) return;

    // While there are notes that need to be played within the lookahead window:
    while (this.nextTickTime < this.ctx.currentTime + this.SCHEDULE_AHEAD_TIME) {
      this.scheduleTick(this.currentTick, this.nextTickTime);
      this.advanceTick();
    }
  }

  /**
   * Advances the tick clock by one 16th note based on current BPM.
   */
  private advanceTick(): void {
    const secondsPerBeat = 60.0 / this.activeProfile.bpm;
    const secondsPer16th = secondsPerBeat * 0.25;
    this.nextTickTime += secondsPer16th;

    this.currentTick++;
    if (this.currentTick >= 16) {
      this.currentTick = 0;
      this.currentBar = (this.currentBar + 1) % 4;

      // Check if a new sector profile was queued at the bar boundary
      if (this.pendingProfile) {
        this.activeProfile = this.pendingProfile;
        this.pendingProfile = null;
      }
    }
  }

  /**
   * Schedules note events for a specific 16th-note tick.
   */
  private scheduleTick(tick: number, time: number): void {
    if (this.isMuted) return;

    const profile = this.activeProfile;
    const secondsPerBeat = 60.0 / profile.bpm;
    const sixteenthDuration = secondsPerBeat * 0.25;
    const barDuration = secondsPerBeat * 4.0;

    // 1. Cosmic Pad Chord (Trigger on Tick 0 of each bar)
    if (tick === 0) {
      const chordNotes = profile.chords[this.currentBar] || profile.chords[0];
      this.instruments.playPadChord(
        chordNotes,
        time,
        barDuration * 1.05,
        this.padGain,
        {
          filterCutoff: profile.filterBrightness * 0.35,
          gainLevel: 0.08,
          waveform: 'sawtooth',
        }
      );
    }

    // 2. Rolling Synth Bass
    this.scheduleBassTick(tick, time, profile, sixteenthDuration);

    // 3. Arpeggiator (16th note cyber sequence)
    this.scheduleArpTick(tick, time, profile, sixteenthDuration);

    // 4. Procedural Percussion (Kick, Snare, Hi-Hat)
    this.schedulePercussionTick(tick, time, profile, sixteenthDuration);
  }

  private scheduleBassTick(
    tick: number,
    time: number,
    profile: SectorMusicalProfile,
    sixteenthDuration: number
  ): void {
    const chordNotes = profile.chords[this.currentBar] || profile.chords[0];
    const rootBassNote = chordNotes[0] - 12; // 1 octave below chord root

    if (profile.bassGroove === 'rolling16') {
      // 16th note rolling bassline (classic synthwave drive)
      // Slight pitch variation on 7th or 15th tick
      let bassNote = rootBassNote;
      if (tick === 14 || tick === 15) {
        bassNote += profile.scaleIntervals[2] ?? 3;
      }
      const isAccent = tick === 0 || tick === 8 || tick === 12;
      this.instruments.playBassNote(
        bassNote,
        time,
        sixteenthDuration * 0.88,
        this.bassGain,
        {
          resonance: profile.bassResonance,
          filterEnv: isAccent ? 2200 : 1200,
          accent: isAccent,
        }
      );
    } else if (profile.bassGroove === 'offbeat8') {
      // 8th-note offbeat groove (ticks 2, 6, 10, 14) or syncopated
      if (tick % 4 === 2 || tick === 0) {
        this.instruments.playBassNote(
          rootBassNote,
          time,
          sixteenthDuration * 1.7,
          this.bassGain,
          {
            resonance: profile.bassResonance,
            filterEnv: 1400,
            accent: tick === 0,
          }
        );
      }
    } else {
      // 'drone': deep sustained bass hit on tick 0
      if (tick === 0) {
        this.instruments.playBassNote(
          rootBassNote,
          time,
          sixteenthDuration * 12.0,
          this.bassGain,
          {
            resonance: 2.5,
            filterEnv: 800,
            accent: false,
          }
        );
      }
    }
  }

  private scheduleArpTick(
    tick: number,
    time: number,
    profile: SectorMusicalProfile,
    sixteenthDuration: number
  ): void {
    const chordNotes = profile.chords[this.currentBar] || profile.chords[0];
    const pattern = profile.arpPattern;
    const patternIndex = tick % pattern.length;
    const degreeOffset = pattern[patternIndex];

    // If offset is -1, it's a musical rest
    if (degreeOffset === -1) return;

    // Pick note from chord or scale in octave +1
    const baseChordNote = chordNotes[degreeOffset % chordNotes.length];
    const arpNote = baseChordNote + 12 + Math.floor(degreeOffset / chordNotes.length) * 12;

    this.instruments.playArpNote(
      arpNote,
      time,
      sixteenthDuration * 0.8,
      this.arpGain,
      {
        brightness: profile.filterBrightness,
        gainLevel: 0.08,
      }
    );
  }

  private schedulePercussionTick(
    tick: number,
    time: number,
    profile: SectorMusicalProfile,
    sixteenthDuration: number
  ): void {
    // Kick Drum (ticks 0, 4, 8, 12 in 4/4)
    if (profile.hasKick && (tick === 0 || tick === 4 || tick === 8 || tick === 12)) {
      this.instruments.playKick(time, 0.12, this.percGain, 0.26);
    }

    // Snare / Clap (ticks 4, 12 - the backbeat)
    if (profile.hasSnare && (tick === 4 || tick === 12)) {
      this.instruments.playSnare(time, 0.16, this.percGain, 0.14);
    }

    // Hi-Hat
    if (profile.hasHat) {
      if (profile.hatDensity === 16) {
        // Every 16th note, open hat on offbeats
        const isOpen = tick % 4 === 2;
        this.instruments.playHiHat(time, sixteenthDuration, this.percGain, {
          open: isOpen,
          gainLevel: isOpen ? 0.08 : 0.045,
        });
      } else {
        // Every 8th note (ticks 0, 2, 4, 6, 8, 10, 12, 14)
        if (tick % 2 === 0) {
          const isOpen = tick % 4 === 2;
          this.instruments.playHiHat(time, sixteenthDuration * 1.5, this.percGain, {
            open: isOpen,
            gainLevel: isOpen ? 0.07 : 0.04,
          });
        }
      }
    }
  }

  /**
   * Resonant lowpass filter sweep triggered when the hypercube face rotates.
   */
  public triggerRotationSweep(duration: number = 0.5): void {
    if (!this.ctx || !this.musicFilter) return;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.cancelScheduledValues(t);
    this.musicFilter.frequency.setValueAtTime(this.musicFilter.frequency.value, t);
    // Sweep down to 400Hz and resonant back up to 20kHz
    this.musicFilter.frequency.exponentialRampToValueAtTime(400, t + duration * 0.45);
    this.musicFilter.frequency.exponentialRampToValueAtTime(20000, t + duration);
  }

  /**
   * Underwater / system breakdown filter choke when the player dies.
   */
  public triggerDeathChoke(): void {
    if (!this.ctx || !this.musicFilter) return;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.cancelScheduledValues(t);
    this.musicFilter.frequency.setValueAtTime(this.musicFilter.frequency.value, t);
    this.musicFilter.frequency.exponentialRampToValueAtTime(220, t + 0.08);

    // Duck volume slightly
    this.musicSubmasterGain.gain.cancelScheduledValues(t);
    this.musicSubmasterGain.gain.setValueAtTime(this.musicSubmasterGain.gain.value, t);
    this.musicSubmasterGain.gain.exponentialRampToValueAtTime(0.15, t + 0.1);
  }

  /**
   * Restores filter and volume upon player respawn.
   */
  public triggerRespawnRestore(): void {
    if (!this.ctx || !this.musicFilter) return;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.cancelScheduledValues(t);
    this.musicFilter.frequency.setValueAtTime(this.musicFilter.frequency.value, t);
    this.musicFilter.frequency.exponentialRampToValueAtTime(20000, t + 0.4);

    this.musicSubmasterGain.gain.cancelScheduledValues(t);
    this.musicSubmasterGain.gain.setValueAtTime(this.musicSubmasterGain.gain.value, t);
    const targetGain = this.isMuted ? 0 : this.masterMusicVolume;
    this.musicSubmasterGain.gain.linearRampToValueAtTime(targetGain, t + 0.35);
  }

  /**
   * Triumphant major scale modulation upon reaching the goal / win.
   */
  public triggerVictoryModulation(): void {
    if (!this.ctx) return;
    // Transpose active chords to bright major 7ths
    const majorIntervals = [0, 4, 7, 11]; // Major 7th
    const root = this.activeProfile.rootMidi;
    this.activeProfile.chords = [
      majorIntervals.map(i => root + i),
      majorIntervals.map(i => root + 5 + i), // IV
      majorIntervals.map(i => root + 7 + i), // V
      majorIntervals.map(i => root + i),
    ];
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicSubmasterGain.gain.cancelScheduledValues(t);
    this.musicSubmasterGain.gain.setValueAtTime(this.musicSubmasterGain.gain.value, t);
    this.musicSubmasterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : this.masterMusicVolume, t + 0.08);
  }

  public setMusicVolume(volume: number): void {
    this.masterMusicVolume = Math.max(0, Math.min(1, volume));
    if (!this.isMuted && this.ctx) {
      const t = this.ctx.currentTime;
      this.musicSubmasterGain.gain.cancelScheduledValues(t);
      this.musicSubmasterGain.gain.setValueAtTime(this.musicSubmasterGain.gain.value, t);
      this.musicSubmasterGain.gain.linearRampToValueAtTime(this.masterMusicVolume, t + 0.05);
    }
  }

  public getActiveProfile(): SectorMusicalProfile {
    return this.activeProfile;
  }
}
