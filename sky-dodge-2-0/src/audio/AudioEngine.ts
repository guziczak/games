import type { GameEvent } from '../simulation/GameEvents';
import type { MutationModeId } from '../simulation/GameState';

interface Voice {
  readonly id: number;
  readonly gain: GainNode;
  readonly sources: Set<AudioScheduledSourceNode>;
  readonly priority: number;
  readonly terminal: boolean;
  timer: number | null;
  stopped: boolean;
}

interface ToneOptions {
  readonly at?: number;
  readonly duration?: number;
  readonly gain?: number;
  readonly type?: OscillatorType;
  readonly frequency: number;
  readonly endFrequency?: number;
  readonly filter?: { readonly type: BiquadFilterType; readonly frequency: number; readonly q?: number };
  readonly pan?: number;
}

const SILENCE = 0.0001;
const MAX_VOICES = 9;

/** Procedural, asset-free sound engine. It owns every scheduled source so a
 * restart can always silence the previous run immediately. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private readonly voices = new Set<Voice>();
  private nextVoiceId = 1;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;
  private lastCueAt = new Map<string, number>();

  public async unlock(): Promise<boolean> {
    if (!this.context) {
      const AudioContextConstructor = globalThis.AudioContext
        ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return false;

      try {
        this.context = new AudioContextConstructor({ latencyHint: 'interactive' });
        this.master = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.master.gain.value = this.muted ? 0 : 0.48;
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 14;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.18;
        this.master.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      } catch {
        this.context = null;
        this.master = null;
        this.compressor = null;
        return false;
      }
    }

    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        return false;
      }
    }
    return this.context.state === 'running';
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopAll();
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.48, now, 0.012);
    if (!muted) void this.unlock();
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public handle(events: readonly GameEvent[]): void {
    if (this.muted || !this.context || this.context.state === 'closed') return;

    for (const event of events) {
      switch (event.type) {
        case 'flap':
          this.cue('flap', 0.055, () => this.playFlap());
          break;
        case 'coin-collected':
          this.cue('coin', 0.035, () => this.playCoin());
          break;
        case 'near-miss':
          this.cue('near-miss', 0.16, () => this.playNearMiss());
          break;
        case 'mutation-offered':
          this.playMutationOffer();
          break;
        case 'mode-entered':
          this.playModeEntered(event.mode);
          break;
        case 'mode-action':
          this.playModeAction(event.action);
          break;
        case 'collision':
          if (event.outcome === 'destroy') this.playSteelImpact();
          else if (event.outcome === 'bounce') this.playRubberBounce();
          break;
        case 'combo-changed':
          if (event.links > 1) this.cue('combo', 0.07, () => this.playCombo(event.multiplier));
          break;
        case 'game-over':
          this.playGameOverFlock();
          break;
        default:
          break;
      }
    }
  }

  public reset(): void {
    this.stopAll();
    this.lastCueAt.clear();
  }

  public destroy(): void {
    this.reset();
    const context = this.context;
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
    if (context && context.state !== 'closed') void context.close();
  }

  private cue(key: string, cooldown: number, play: () => void): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    const previous = this.lastCueAt.get(key) ?? -Infinity;
    if (now - previous < cooldown) return;
    this.lastCueAt.set(key, now);
    play();
  }

  private createVoice(duration: number, priority = 1, terminal = false): Voice | null {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.muted) return null;

    if (terminal) this.stopAll();
    else {
      const terminalVoice = [...this.voices].find((voice) => voice.terminal);
      if (terminalVoice) this.stopVoice(terminalVoice, 0.01);
    }

    if (this.voices.size >= MAX_VOICES) {
      const victim = [...this.voices].sort((left, right) => left.priority - right.priority)[0];
      if (!victim || victim.priority > priority) return null;
      this.stopVoice(victim, 0.008);
    }

    const gain = context.createGain();
    gain.gain.value = 1;
    gain.connect(master);
    const voice: Voice = {
      id: this.nextVoiceId,
      gain,
      sources: new Set(),
      priority,
      terminal,
      timer: null,
      stopped: false,
    };
    this.nextVoiceId += 1;
    this.voices.add(voice);
    voice.timer = globalThis.setTimeout(() => this.removeVoice(voice), Math.ceil((duration + 0.12) * 1000));
    return voice;
  }

  private stopAll(): void {
    for (const voice of [...this.voices]) this.stopVoice(voice, 0.008);
    this.voices.clear();
  }

  private stopVoice(voice: Voice, fade: number): void {
    if (voice.stopped) return;
    voice.stopped = true;
    const now = this.context?.currentTime ?? 0;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(SILENCE, voice.gain.gain.value), now);
      voice.gain.gain.exponentialRampToValueAtTime(SILENCE, now + Math.max(0.001, fade));
    } catch {
      voice.gain.gain.value = 0;
    }
    for (const source of voice.sources) {
      try {
        source.stop(now + fade + 0.003);
      } catch {
        // A source that ended naturally is already harmless.
      }
    }
    if (voice.timer !== null) globalThis.clearTimeout(voice.timer);
    voice.timer = globalThis.setTimeout(() => this.removeVoice(voice), Math.ceil((fade + 0.025) * 1000));
    this.voices.delete(voice);
  }

  private removeVoice(voice: Voice): void {
    if (voice.timer !== null) globalThis.clearTimeout(voice.timer);
    voice.timer = null;
    voice.sources.clear();
    voice.gain.disconnect();
    this.voices.delete(voice);
  }

  private tone(voice: Voice, options: ToneOptions): void {
    const context = this.context;
    if (!context || voice.stopped) return;
    const at = context.currentTime + (options.at ?? 0);
    const duration = Math.max(0.025, options.duration ?? 0.14);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const level = Math.max(SILENCE, options.gain ?? 0.12);
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, options.frequency), at);
    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), at + duration);
    }
    envelope.gain.setValueAtTime(SILENCE, at);
    envelope.gain.linearRampToValueAtTime(level, at + Math.min(0.009, duration * 0.25));
    envelope.gain.exponentialRampToValueAtTime(SILENCE, at + duration);

    let output: AudioNode = envelope;
    if (options.filter) {
      const filter = context.createBiquadFilter();
      filter.type = options.filter.type;
      filter.frequency.value = options.filter.frequency;
      filter.Q.value = options.filter.q ?? 0.8;
      envelope.connect(filter);
      output = filter;
    }
    if (options.pan !== undefined && typeof context.createStereoPanner === 'function') {
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, options.pan));
      output.connect(panner);
      panner.connect(voice.gain);
    } else {
      output.connect(voice.gain);
    }
    oscillator.connect(envelope);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.015);
    voice.sources.add(oscillator);
  }

  private noise(voice: Voice, at: number, duration: number, gain: number, frequency: number): void {
    const context = this.context;
    if (!context || voice.stopped) return;
    if (!this.noiseBuffer) {
      const length = Math.floor(context.sampleRate * 0.65);
      this.noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    const start = context.currentTime + at;
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.2;
    envelope.gain.setValueAtTime(SILENCE, start);
    envelope.gain.linearRampToValueAtTime(gain, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(voice.gain);
    source.start(start, Math.random() * 0.25);
    source.stop(start + duration + 0.01);
    voice.sources.add(source);
  }

  private playFlap(): void {
    const voice = this.createVoice(0.2, 2);
    if (!voice) return;
    // The short nasal "kwak" deliberately keeps the identity of the classic.
    this.tone(voice, { type: 'sawtooth', frequency: 360, endFrequency: 230, duration: 0.14, gain: 0.14, filter: { type: 'bandpass', frequency: 710, q: 2.4 } });
    this.tone(voice, { at: 0.025, type: 'triangle', frequency: 180, endFrequency: 420, duration: 0.13, gain: 0.055 });
    this.noise(voice, 0, 0.045, 0.035, 1400);
  }

  private playCoin(): void {
    const voice = this.createVoice(0.25, 2);
    if (!voice) return;
    this.tone(voice, { frequency: 880, duration: 0.11, gain: 0.11 });
    this.tone(voice, { at: 0.065, frequency: 1320, duration: 0.14, gain: 0.105 });
  }

  private playNearMiss(): void {
    const voice = this.createVoice(0.3, 3);
    if (!voice) return;
    this.noise(voice, 0, 0.22, 0.07, 1700);
    this.tone(voice, { type: 'sine', frequency: 220, endFrequency: 690, duration: 0.22, gain: 0.055, pan: 0.55 });
  }

  private playMutationOffer(): void {
    const voice = this.createVoice(0.72, 5);
    if (!voice) return;
    [262, 392, 523, 784].forEach((frequency, index) => {
      this.tone(voice, { at: index * 0.095, type: 'triangle', frequency, duration: 0.24, gain: 0.08 });
    });
    this.noise(voice, 0.08, 0.45, 0.035, 2400);
  }

  private playModeEntered(mode: MutationModeId): void {
    const voice = this.createVoice(0.72, 6);
    if (!voice) return;
    const motifs: Record<MutationModeId, readonly [number, number, OscillatorType]> = {
      frog: [185, 92, 'sawtooth'],
      rubber: [520, 150, 'triangle'],
      steel: [185, 112, 'triangle'],
      ghost: [330, 510, 'sine'],
      stork: [720, 1120, 'triangle'],
    };
    const [start, end, type] = motifs[mode];
    this.tone(voice, { type, frequency: start, endFrequency: end, duration: 0.42, gain: 0.15, filter: mode === 'frog' ? { type: 'lowpass', frequency: 650, q: 1.8 } : undefined });
    this.tone(voice, { at: 0.23, type: 'sine', frequency: end, endFrequency: end * 1.45, duration: 0.27, gain: 0.07 });
    if (mode === 'steel' || mode === 'stork') this.noise(voice, 0, 0.08, 0.1, mode === 'steel' ? 2200 : 1700);
  }

  private playModeAction(action: GameEvent & { type: 'mode-action' }['action']): void {
    if (action === 'rubber-bounce') this.playRubberBounce();
    else if (action === 'steel-critical' || action === 'steel-overheat') this.playSteelImpact();
    else if (action === 'stork-lock' || action === 'stork-vault-start' || action === 'stork-vault-end') this.playStorkAction(action);
    else if (action === 'frog-launch') this.playFrogLaunch();
    else if (action === 'ghost-phase-start' || action === 'ghost-phase-end') this.playGhostPhase(action === 'ghost-phase-start');
  }

  private playFrogLaunch(): void {
    const voice = this.createVoice(0.28, 4);
    if (!voice) return;
    this.tone(voice, { type: 'triangle', frequency: 175, endFrequency: 650, duration: 0.23, gain: 0.15 });
    this.noise(voice, 0, 0.05, 0.055, 620);
  }

  private playRubberBounce(): void {
    this.cue('rubber-bounce', 0.09, () => {
      const voice = this.createVoice(0.24, 4);
      if (!voice) return;
      this.tone(voice, { type: 'triangle', frequency: 590, endFrequency: 145, duration: 0.2, gain: 0.14 });
      this.noise(voice, 0, 0.03, 0.075, 2300);
    });
  }

  private playSteelImpact(): void {
    this.cue('steel', 0.1, () => {
      const voice = this.createVoice(0.36, 5);
      if (!voice) return;
      this.noise(voice, 0, 0.075, 0.12, 2100);
      this.tone(voice, { type: 'triangle', frequency: 170, endFrequency: 88, duration: 0.28, gain: 0.17 });
      this.tone(voice, { type: 'sine', frequency: 1040, duration: 0.3, gain: 0.05 });
    });
  }

  private playStorkAction(action: 'stork-lock' | 'stork-vault-start' | 'stork-vault-end'): void {
    const voice = this.createVoice(0.38, 5);
    if (!voice) return;
    if (action === 'stork-lock') {
      this.tone(voice, { frequency: 760, endFrequency: 1180, duration: 0.18, gain: 0.08 });
      this.tone(voice, { at: 0.1, frequency: 1180, duration: 0.12, gain: 0.065 });
    } else if (action === 'stork-vault-start') {
      this.noise(voice, 0, 0.1, 0.09, 1900);
      this.tone(voice, { type: 'triangle', frequency: 430, endFrequency: 980, duration: 0.25, gain: 0.12 });
    } else {
      this.tone(voice, { type: 'triangle', frequency: 980, endFrequency: 310, duration: 0.3, gain: 0.12 });
    }
  }

  private playGhostPhase(entering: boolean): void {
    const voice = this.createVoice(0.28, 3);
    if (!voice) return;
    this.tone(voice, { type: 'sine', frequency: entering ? 340 : 620, endFrequency: entering ? 620 : 340, duration: 0.24, gain: 0.07, filter: { type: 'bandpass', frequency: 820, q: 1.2 } });
    this.noise(voice, 0, 0.2, 0.025, 1300);
  }

  private playCombo(multiplier: number): void {
    const voice = this.createVoice(0.22, 2);
    if (!voice) return;
    const root = 520 * Math.min(1.55, 0.8 + multiplier * 0.18);
    this.tone(voice, { frequency: root, duration: 0.12, gain: 0.06 });
    this.tone(voice, { at: 0.065, frequency: root * 1.5, duration: 0.13, gain: 0.05 });
  }

  private playGameOverFlock(): void {
    const voice = this.createVoice(6.8, 100, true);
    const context = this.context;
    if (!voice || !context) return;
    voice.gain.gain.value = 0.82;
    const random = (minimum: number, maximum: number): number => minimum + Math.random() * (maximum - minimum);

    const quack = (offset: number, pitch = 1, duration = 0.2, gain = 0.45): number => {
      this.tone(voice, {
        at: offset,
        type: 'sawtooth',
        frequency: 336 * pitch,
        endFrequency: 168 * pitch,
        duration,
        gain,
        filter: { type: 'bandpass', frequency: 600 * pitch, q: 2 },
        pan: random(-0.85, 0.85),
      });
      return offset + duration + 0.05;
    };

    const sequence = (
      offset: number,
      count: number,
      pitchRange: readonly [number, number],
      gainRange: readonly [number, number],
      pauseRange: readonly [number, number],
    ): number => {
      let cursor = offset;
      for (let index = 0; index < count; index += 1) {
        cursor = quack(cursor, random(...pitchRange), random(0.15, 0.3), random(...gainRange));
        if (index < count - 1) cursor += random(...pauseRange);
      }
      return cursor;
    };

    let cursor = quack(0, 0.8, 0.4, 0.42) + 0.2;
    cursor = sequence(cursor, 5, [1, 1.4], [0.26, 0.42], [0.05, 0.12]) + 0.1;
    sequence(cursor - 0.1, 4, [0.7, 1.1], [0.28, 0.44], [0.06, 0.15]);
    sequence(cursor + 0.15, 6, [0.9, 1.2], [0.22, 0.36], [0.04, 0.1]);
    cursor += 0.3;
    sequence(cursor + 0.1, 7, [1.2, 1.6], [0.2, 0.31], [0.03, 0.08]);
    sequence(cursor + 0.25, 5, [0.6, 0.8], [0.26, 0.4], [0.05, 0.1]);
    for (let flapIndex = 0; flapIndex < 12; flapIndex += 1) {
      this.noise(voice, 0.3 + flapIndex * 0.2, 0.09, 0.025, 900 + random(-180, 180));
    }
    cursor += 0.5;
    for (let flock = 0; flock < 3; flock += 1) {
      sequence(cursor + random(0, 0.2), 3 + Math.floor(random(0, 4)), [0.7, 1.55], [0.2, 0.38], [0.02, 0.07]);
    }
    quack(cursor + 0.9, 0.7, 0.55, 0.58);
  }
}
