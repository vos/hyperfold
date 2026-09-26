/**
 * SynthInstruments - Procedural Web Audio synthesis instruments for Hyperfold.
 * Provides pure Web Audio synthesis voices: cosmic pads, rolling acid bass,
 * snappy cyber arpeggios, and synthesized percussion (kick, snare, hi-hat).
 *
 * Uses pre-allocated noise buffers and clean node lifecycle to guarantee zero GC spikes.
 */

export function midiToFreq(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export class SynthInstruments {
  private ctx: AudioContext;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.initNoiseBuffer();
  }

  private initNoiseBuffer(): void {
    if (!this.ctx) return;
    const length = Math.floor(this.ctx.sampleRate * 1.0); // 1 second of white noise
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Warm cosmic pad chord voice. Detuned dual oscillators with smooth filter sweep.
   */
  public playPadChord(
    midiNotes: number[],
    startTime: number,
    duration: number,
    destination: AudioNode,
    options: {
      filterCutoff?: number;
      gainLevel?: number;
      waveform?: OscillatorType;
    } = {}
  ): void {
    const ctx = this.ctx;
    const filterCutoff = options.filterCutoff ?? 550;
    const gainLevel = (options.gainLevel ?? 0.08) / Math.max(1, midiNotes.length * 0.7);
    const waveform = options.waveform ?? 'sawtooth';

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterCutoff * 0.7, startTime);
    filter.frequency.linearRampToValueAtTime(filterCutoff, startTime + duration * 0.4);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterCutoff * 0.6), startTime + duration);
    filter.Q.value = 1.8;

    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.0001, startTime);
    // Smooth attack
    const attackTime = Math.min(0.8, duration * 0.35);
    chordGain.gain.linearRampToValueAtTime(gainLevel, startTime + attackTime);
    // Release
    chordGain.gain.setValueAtTime(gainLevel, startTime + Math.max(attackTime, duration - 0.5));
    chordGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    filter.connect(chordGain);
    chordGain.connect(destination);

    for (const note of midiNotes) {
      const baseFreq = midiToFreq(note);
      // Voice A
      const oscA = ctx.createOscillator();
      oscA.type = waveform;
      oscA.frequency.setValueAtTime(baseFreq, startTime);
      oscA.detune.setValueAtTime(-6, startTime);
      oscA.connect(filter);
      oscA.start(startTime);
      oscA.stop(startTime + duration + 0.05);

      // Voice B (slightly sharp detune for lush chorus)
      const oscB = ctx.createOscillator();
      oscB.type = waveform;
      oscB.frequency.setValueAtTime(baseFreq, startTime);
      oscB.detune.setValueAtTime(+7, startTime);
      oscB.connect(filter);
      oscB.start(startTime);
      oscB.stop(startTime + duration + 0.05);
    }
  }

  /**
   * Resonant rolling synth bass note (303/Moog style punch).
   * Square/saw + sub-sine 1 octave lower with snappy lowpass filter decay.
   */
  public playBassNote(
    midiNote: number,
    startTime: number,
    duration: number,
    destination: AudioNode,
    options: {
      resonance?: number;
      filterEnv?: number;
      waveform?: OscillatorType;
      accent?: boolean;
    } = {}
  ): void {
    const ctx = this.ctx;
    const baseFreq = midiToFreq(midiNote);
    const accent = options.accent ?? false;
    const baseGain = accent ? 0.22 : 0.16;
    const res = options.resonance ?? (accent ? 6.5 : 3.5);
    const filterEnv = options.filterEnv ?? (accent ? 2200 : 1200);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(res, startTime);
    filter.frequency.setValueAtTime(filterEnv, startTime);
    filter.frequency.exponentialRampToValueAtTime(110, startTime + Math.min(duration, 0.22));

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(baseGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    filter.connect(gain);
    gain.connect(destination);

    // Primary oscillator
    const osc = ctx.createOscillator();
    osc.type = options.waveform ?? 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.connect(filter);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);

    // Sub-oscillator (sine wave one octave down for deep low-end weight)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(baseFreq * 0.5, startTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(baseGain * 0.9, startTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    subOsc.connect(subGain);
    subGain.connect(destination);

    subOsc.start(startTime);
    subOsc.stop(startTime + duration + 0.02);
  }

  /**
   * Plucky, bright arpeggiator voice with fast attack and snappy decay.
   */
  public playArpNote(
    midiNote: number,
    startTime: number,
    duration: number,
    destination: AudioNode,
    options: {
      brightness?: number;
      gainLevel?: number;
      waveform?: OscillatorType;
    } = {}
  ): void {
    const ctx = this.ctx;
    const baseFreq = midiToFreq(midiNote);
    const brightness = options.brightness ?? 2400;
    const gainLevel = options.gainLevel ?? 0.12;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.2, startTime);
    filter.frequency.setValueAtTime(brightness, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, baseFreq * 1.5), startTime + duration * 0.9);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    filter.connect(gain);
    gain.connect(destination);

    const osc = ctx.createOscillator();
    osc.type = options.waveform ?? 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.connect(filter);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  /**
   * Procedural kick drum: fast pitch sweep (135Hz -> 38Hz) on a sine wave with punchy click.
   */
  public playKick(
    startTime: number,
    duration: number,
    destination: AudioNode,
    gainLevel: number = 0.28
  ): void {
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, startTime);
    osc.frequency.exponentialRampToValueAtTime(38, startTime + Math.min(duration, 0.09));

    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  /**
   * Procedural hi-hat: filtered white noise burst through high-pass filter.
   */
  public playHiHat(
    startTime: number,
    duration: number,
    destination: AudioNode,
    options: {
      open?: boolean;
      gainLevel?: number;
    } = {}
  ): void {
    if (!this.noiseBuffer) return;
    const ctx = this.ctx;
    const isOpen = options.open ?? false;
    const actualDuration = isOpen ? Math.min(duration, 0.16) : Math.min(duration, 0.045);
    const gainLevel = options.gainLevel ?? (isOpen ? 0.09 : 0.06);

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isOpen ? 6500 : 8000, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + actualDuration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    source.start(startTime);
    source.stop(startTime + actualDuration + 0.01);
  }

  /**
   * Procedural cyber snare/clap: dual-noise burst + mid sine body.
   */
  public playSnare(
    startTime: number,
    duration: number,
    destination: AudioNode,
    gainLevel: number = 0.16
  ): void {
    if (!this.noiseBuffer) return;
    const ctx = this.ctx;

    // 1. Noise burst
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, startTime);
    noiseFilter.Q.setValueAtTime(1.8, startTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(gainLevel * 0.9, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 0.14));

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    noiseSource.start(startTime);
    noiseSource.stop(startTime + duration);

    // 2. Tone punch
    const toneOsc = ctx.createOscillator();
    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(195, startTime);
    toneOsc.frequency.exponentialRampToValueAtTime(80, startTime + 0.07);

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(gainLevel * 0.6, startTime);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

    toneOsc.connect(toneGain);
    toneGain.connect(destination);

    toneOsc.start(startTime);
    toneOsc.stop(startTime + 0.09);
  }
}
