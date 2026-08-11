import type { GameEvent, ModeAction } from '../simulation/GameEvents';
import type { GameState, ModeId, MutationModeId } from '../simulation/GameState';

interface Voice {
  readonly id: number;
  readonly gain: GainNode;
  readonly send: GainNode | null;
  readonly sources: Set<AudioScheduledSourceNode>;
  /** Every transient node, including envelopes, filters and panners. */
  readonly nodes: Set<AudioNode>;
  readonly priority: number;
  readonly terminal: boolean;
  timer: number | null;
  stopped: boolean;
}

interface AmbienceLayer {
  readonly wind: AudioBufferSourceNode;
  readonly windFilter: BiquadFilterNode;
  readonly windGain: GainNode;
  readonly windPan: StereoPannerNode | null;
  readonly water: AudioBufferSourceNode;
  readonly waterHighpass: BiquadFilterNode;
  readonly waterLowpass: BiquadFilterNode;
  readonly waterGain: GainNode;
  readonly waterPan: StereoPannerNode | null;
  readonly body: OscillatorNode;
  readonly bodyFilter: BiquadFilterNode;
  readonly bodyGain: GainNode;
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
  readonly endPan?: number;
}

interface NoiseOptions {
  readonly at?: number;
  readonly duration?: number;
  readonly gain?: number;
  readonly frequency?: number;
  readonly endFrequency?: number;
  readonly q?: number;
  readonly type?: BiquadFilterType;
  readonly pan?: number;
  readonly endPan?: number;
}

const SILENCE = 0.0001;
const MASTER_LEVEL = 0.46;
/** Public, testable mixer contract. Ambience never consumes transient voices. */
export const AUDIO_MIX_BUDGET = Object.freeze({
  ambienceSources: 3,
  maximumVoices: 11,
  waterLoopSeconds: 7.6,
});
const MAX_VOICES = AUDIO_MIX_BUDGET.maximumVoices;
const WATER_LOOP_SECONDS = AUDIO_MIX_BUDGET.waterLoopSeconds;

const MODE_AMBIENCE: Readonly<Record<ModeId, {
  readonly bodyFrequency: number;
  readonly bodyGain: number;
  readonly bodyType: OscillatorType;
  readonly bodyFilterFrequency: number;
  readonly bodyPulseRate: number;
  readonly bodyPulseDepth: number;
  readonly windFrequency: number;
  readonly waterGain: number;
  readonly waterFrequency: number;
}>> = Object.freeze({
  normal: { bodyFrequency: 112, bodyGain: 0.0045, bodyType: 'triangle', bodyFilterFrequency: 310, bodyPulseRate: 1.7, bodyPulseDepth: 0.08, windFrequency: 1_120, waterGain: 0.026, waterFrequency: 820 },
  frog: { bodyFrequency: 78, bodyGain: 0.0065, bodyType: 'sawtooth', bodyFilterFrequency: 235, bodyPulseRate: 2.6, bodyPulseDepth: 0.18, windFrequency: 760, waterGain: 0.031, waterFrequency: 610 },
  rubber: { bodyFrequency: 146, bodyGain: 0.006, bodyType: 'sine', bodyFilterFrequency: 470, bodyPulseRate: 3.8, bodyPulseDepth: 0.13, windFrequency: 1_380, waterGain: 0.024, waterFrequency: 980 },
  steel: { bodyFrequency: 55, bodyGain: 0.0085, bodyType: 'square', bodyFilterFrequency: 175, bodyPulseRate: 0.9, bodyPulseDepth: 0.1, windFrequency: 580, waterGain: 0.028, waterFrequency: 540 },
  ghost: { bodyFrequency: 188, bodyGain: 0.0055, bodyType: 'sine', bodyFilterFrequency: 760, bodyPulseRate: 1.3, bodyPulseDepth: 0.22, windFrequency: 1_760, waterGain: 0.016, waterFrequency: 1_160 },
  stork: { bodyFrequency: 224, bodyGain: 0.005, bodyType: 'triangle', bodyFilterFrequency: 620, bodyPulseRate: 2.2, bodyPulseDepth: 0.12, windFrequency: 1_540, waterGain: 0.021, waterFrequency: 1_020 },
});

/** Asset-free WebAudio soundscape. Every node belongs to a run, so restart,
 * pause and mute are deterministic and cannot leak audio from an old session. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private readonly voices = new Set<Voice>();
  private nextVoiceId = 1;
  private muted = false;
  private paused = false;
  private runActive = false;
  private noiseBuffer: AudioBuffer | null = null;
  private waterBuffer: AudioBuffer | null = null;
  private impulseBuffer: AudioBuffer | null = null;
  private ambience: AmbienceLayer | null = null;
  private lastAmbienceUpdateAt = -Infinity;
  private lastCueAt = new Map<string, number>();

  public async unlock(): Promise<boolean> {
    if (this.context?.state === 'closed') {
      this.clearMixerReferences();
      this.noiseBuffer = null;
      this.waterBuffer = null;
      this.impulseBuffer = null;
    }
    if (!this.context) {
      const AudioContextConstructor = globalThis.AudioContext
        ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return false;

      try {
        try {
          this.context = new AudioContextConstructor({ latencyHint: 'interactive' });
        } catch {
          // Older iOS WebKit exposes AudioContext but rejects constructor
          // options. Creating it without options still preserves gesture unlock.
          this.context = new AudioContextConstructor();
        }
        this.buildMixer(this.context);
      } catch {
        const failedContext = this.context as AudioContext | null;
        this.clearMixerReferences();
        this.noiseBuffer = null;
        this.waterBuffer = null;
        this.impulseBuffer = null;
        if (failedContext && failedContext.state !== 'closed') {
          try { await failedContext.close(); } catch { /* best-effort cleanup */ }
        }
        return false;
      }
    }

    if (this.context.state !== 'running' && this.context.state !== 'closed') {
      try {
        await this.context.resume();
      } catch {
        return false;
      }
    }
    if (this.runActive && !this.muted) this.startAmbience();
    return this.context.state === 'running';
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public needsUnlock(): boolean {
    return !this.muted && (!this.context || this.context.state !== 'running');
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopAllVoices();
      this.stopAmbience(0.025);
      if (this.context) this.rebuildReverb(this.context);
    }
    if (!this.context || !this.master) {
      if (!muted) void this.unlock();
      return;
    }
    this.target(this.master.gain, muted ? SILENCE : MASTER_LEVEL, 0.014);
    if (!muted) {
      void this.unlock().then(() => {
        if (this.runActive && !this.paused) this.startAmbience();
      });
    }
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Starts the quiet continuous flight bed for a new session. */
  public beginRun(): void {
    this.runActive = true;
    this.paused = false;
    this.lastAmbienceUpdateAt = -Infinity;
    if (this.ambienceBus) this.target(this.ambienceBus.gain, 1, 0.06);
    if (!this.muted) this.startAmbience();
  }

  /** Fades only the world bed. Terminal cues such as the duck flock survive. */
  public finishRun(): void {
    this.runActive = false;
    this.paused = false;
    this.stopAmbience(0.12);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.stopAllVoices();
      this.stopAmbience(0.04);
    } else if (!this.muted) {
      void this.unlock().then(() => this.startAmbience());
    }
    if (!this.ambienceBus) return;
    this.target(this.ambienceBus.gain, paused ? SILENCE : 1, paused ? 0.045 : 0.12);
  }

  /** Updates the low-level wind and body resonance. It is intentionally
   * throttled so a 120 Hz display does not build a giant automation queue. */
  public update(state: Readonly<GameState>): void {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.runActive || this.paused || this.muted) return;
    this.startAmbience();
    const ambience = this.ambience;
    if (!ambience || context.currentTime - this.lastAmbienceUpdateAt < 0.075) return;
    this.lastAmbienceUpdateAt = context.currentTime;

    const profile = MODE_AMBIENCE[state.mode.active];
    const altitude = Math.max(0, Math.min(1, state.player.y / 10));
    const waterProximity = 1 - altitude;
    const swell = 0.5 + Math.sin(state.clock.elapsed * 0.72) * 0.32
      + Math.sin(state.clock.elapsed * 1.93 + 0.8) * 0.18;
    const speedLift = Math.min(0.018, state.world.passedObstacles * 0.00035);
    const verticalLift = Math.min(0.022, Math.abs(state.player.vy) * 0.003);
    const modeLift = state.mode.active === 'stork' ? 0.012 : state.mode.active === 'ghost' ? 0.003 : 0;
    this.target(ambience.windGain.gain, 0.016 + altitude * 0.006 + speedLift + verticalLift + modeLift, 0.1);
    this.target(ambience.windFilter.frequency, profile.windFrequency + Math.abs(state.player.vy) * 85, 0.11);
    const waterLevel = profile.waterGain
      * (0.5 + waterProximity * 0.76)
      * (0.88 + Math.max(0, Math.min(1, swell)) * 0.18);
    this.target(ambience.waterGain.gain, waterLevel, 0.24);
    this.target(ambience.waterHighpass.frequency, 64 + altitude * 72, 0.28);
    this.target(
      ambience.waterLowpass.frequency,
      profile.waterFrequency + waterProximity * 440 + swell * 135,
      0.3,
    );
    const bodyPulse = 1 + Math.sin(state.clock.elapsed * profile.bodyPulseRate)
      * profile.bodyPulseDepth;
    try { ambience.body.type = profile.bodyType; } catch { /* old WebKit may reject live type changes */ }
    this.target(ambience.body.frequency, profile.bodyFrequency + Math.min(28, state.combo.links * 2.5), 0.16);
    this.target(ambience.bodyFilter.frequency, profile.bodyFilterFrequency, 0.22);
    this.target(ambience.bodyGain.gain, profile.bodyGain * bodyPulse, 0.18);
    if (ambience.windPan) this.target(ambience.windPan.pan, Math.max(-0.28, Math.min(0.28, state.player.vx * 0.045)), 0.14);
    if (ambience.waterPan) {
      this.target(
        ambience.waterPan.pan,
        Math.max(-0.2, Math.min(0.2, Math.sin(state.clock.elapsed * 0.41) * 0.14 - state.player.vx * 0.012)),
        0.32,
      );
    }
  }

  public handle(events: readonly GameEvent[], state?: Readonly<GameState>): void {
    if (this.muted || !this.context || this.context.state !== 'running') return;

    for (const event of events) {
      const entityPan = 'entityId' in event && typeof event.entityId === 'string'
        ? this.panForEntity(event.entityId, state)
        : 'obstacleId' in event && typeof event.obstacleId === 'string'
          ? this.panForEntity(event.obstacleId, state)
          : 'coinId' in event && typeof event.coinId === 'string'
            ? this.panForEntity(event.coinId, state)
            : 0;
      switch (event.type) {
        case 'flap':
          this.cue('flap', 0.052, () => this.playFlap());
          break;
        case 'obstacle-passed':
          this.cue('gate-pass', 0.075, () => this.playGatePass(entityPan));
          break;
        case 'coin-collected':
          this.cue('coin', 0.035, () => this.playCoin(entityPan));
          break;
        case 'near-miss':
          this.cue('near-miss', 0.14, () => this.playNearMiss(entityPan));
          break;
        case 'mutation-offered':
          this.playMutationOffer();
          break;
        case 'mutation-selected':
          this.cue('mutation-selected', 0.18, () => this.playMutationSelected(event.mode, event.lane));
          break;
        case 'mode-entered':
          this.playModeEntered(event.mode);
          break;
        case 'mode-exited':
          this.playModeExited(event.mode, event.reason);
          break;
        case 'mode-action':
          this.playModeAction(event.action);
          break;
        case 'collision':
          if (event.outcome === 'destroy') this.playSteelImpact(entityPan, false);
          else if (event.outcome === 'bounce') {
            this.playRubberBounce(entityPan, event.entityId === 'boundary-floor' ? 1 : 0.46);
          }
          else if (event.outcome === 'cling') this.playFrogCling(entityPan);
          else if (event.outcome === 'phase') {
            this.cue('ghost-pass', 0.09, () => this.playGhostPass(entityPan));
          }
          else if (event.outcome === 'shielded') this.playShield(entityPan);
          if (event.entityId === 'boundary-floor' && event.outcome !== 'bounce') {
            this.playWaterSplash(0, event.outcome === 'fatal' ? 0.7 : 1);
          }
          break;
        case 'combo-changed':
          if (event.links > 1) this.cue('combo', 0.065, () => this.playCombo(event.multiplier));
          break;
        case 'combo-expired':
          this.cue('combo-expired', 0.2, () => this.playComboExpired());
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
    this.runActive = false;
    this.paused = false;
    this.stopAllVoices();
    this.stopAmbience(0.008);
    if (this.context) this.rebuildReverb(this.context);
    this.lastCueAt.clear();
    this.lastAmbienceUpdateAt = -Infinity;
  }

  public destroy(): void {
    this.reset();
    const context = this.context;
    this.clearMixerReferences();
    this.noiseBuffer = null;
    this.waterBuffer = null;
    this.impulseBuffer = null;
    if (context && context.state !== 'closed') void context.close();
  }

  private buildMixer(context: AudioContext): void {
    this.master = context.createGain();
    this.sfxBus = context.createGain();
    this.ambienceBus = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.limiter = context.createDynamicsCompressor();
    this.master.gain.value = this.muted ? SILENCE : MASTER_LEVEL;
    this.sfxBus.gain.value = 1;
    this.ambienceBus.gain.value = 1;
    this.compressor.threshold.value = -19;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 3.5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.2;
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.08;
    this.sfxBus.connect(this.master);
    this.ambienceBus.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(context.destination);

    this.rebuildReverb(context);
  }

  /** Disconnecting the old convolver is the only reliable way to flush its
   * internal tail. This prevents a loud cue from one run bleeding into the
   * next run (or reappearing after a quick mute/unmute). */
  private rebuildReverb(context: AudioContext): void {
    try { this.reverb?.disconnect(); } catch { /* already disconnected */ }
    try { this.reverbGain?.disconnect(); } catch { /* already disconnected */ }
    this.reverb = null;
    this.reverbGain = null;
    const master = this.master;
    if (!master) return;
    try {
      this.reverb = context.createConvolver();
      this.impulseBuffer ??= this.createImpulse(context, 0.72, 2.8);
      this.reverb.buffer = this.impulseBuffer;
      this.reverbGain = context.createGain();
      this.reverbGain.gain.value = 0.21;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(master);
    } catch {
      this.reverb = null;
      this.reverbGain = null;
    }
  }

  private clearMixerReferences(): void {
    if (this.ambience) this.disconnectAmbience(this.ambience);
    for (const node of [
      this.reverb,
      this.reverbGain,
      this.sfxBus,
      this.ambienceBus,
      this.master,
      this.compressor,
      this.limiter,
    ]) {
      try { node?.disconnect(); } catch { /* already disconnected */ }
    }
    this.context = null;
    this.master = null;
    this.sfxBus = null;
    this.ambienceBus = null;
    this.compressor = null;
    this.limiter = null;
    this.reverb = null;
    this.reverbGain = null;
    this.ambience = null;
  }

  private createImpulse(context: AudioContext, duration: number, decay: number): AudioBuffer {
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const envelope = Math.pow(1 - index / length, decay);
        data[index] = (Math.random() * 2 - 1) * envelope;
      }
    }
    return buffer;
  }

  private getNoiseBuffer(): AudioBuffer | null {
    const context = this.context;
    if (!context) return null;
    if (!this.noiseBuffer) {
      const length = Math.floor(context.sampleRate * 2.2);
      this.noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }

  /** A long, low-correlated wash. The short white-noise buffer remains reserved
   * for wind and impacts, so the water never reveals their repeating grain. */
  private getWaterBuffer(): AudioBuffer | null {
    const context = this.context;
    if (!context) return null;
    if (this.waterBuffer) return this.waterBuffer;

    const length = Math.max(1, Math.floor(context.sampleRate * WATER_LOOP_SECONDS));
    this.waterBuffer = context.createBuffer(1, length, context.sampleRate);
    const data = this.waterBuffer.getChannelData(0);
    let wash = 0;
    let foam = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      wash = wash * 0.986 + white * 0.028;
      foam = foam * 0.61 + white * 0.39;
      const phase = index / length * Math.PI * 2;
      const swell = 0.72 + Math.sin(phase * 3 + 0.4) * 0.13
        + Math.sin(phase * 7 + 1.7) * 0.07;
      data[index] = Math.max(-1, Math.min(1, (wash * 0.82 + foam * 0.16) * swell));
    }

    // Join the random walk back to its beginning without a hard loop click.
    const seamLength = Math.min(Math.floor(context.sampleRate * 0.42), Math.floor(length / 4));
    for (let index = 0; index < seamLength; index += 1) {
      const progress = (index + 1) / seamLength;
      const smooth = progress * progress * (3 - 2 * progress);
      const tailIndex = length - seamLength + index;
      const tail = data[tailIndex] ?? 0;
      const mirroredStart = data[Math.max(0, seamLength - index - 1)] ?? 0;
      data[tailIndex] = tail * (1 - smooth) + mirroredStart * smooth;
    }
    return this.waterBuffer;
  }

  private startAmbience(): void {
    const context = this.context;
    const bus = this.ambienceBus;
    const buffer = this.getNoiseBuffer();
    const waterBuffer = this.getWaterBuffer();
    if (!context || !bus || !buffer || !waterBuffer || this.ambience || this.muted || this.paused || !this.runActive) return;

    const wind = context.createBufferSource();
    const windFilter = context.createBiquadFilter();
    const windGain = context.createGain();
    const windPan = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    wind.buffer = buffer;
    wind.loop = true;
    windFilter.type = 'bandpass';
    windFilter.frequency.value = MODE_AMBIENCE.normal.windFrequency;
    windFilter.Q.value = 0.55;
    windGain.gain.value = SILENCE;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    if (windPan) {
      windGain.connect(windPan);
      windPan.connect(bus);
    } else {
      windGain.connect(bus);
    }

    const water = context.createBufferSource();
    const waterHighpass = context.createBiquadFilter();
    const waterLowpass = context.createBiquadFilter();
    const waterGain = context.createGain();
    const waterPan = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    water.buffer = waterBuffer;
    water.loop = true;
    waterHighpass.type = 'highpass';
    waterHighpass.frequency.value = 92;
    waterHighpass.Q.value = 0.42;
    waterLowpass.type = 'lowpass';
    waterLowpass.frequency.value = MODE_AMBIENCE.normal.waterFrequency;
    waterLowpass.Q.value = 0.72;
    waterGain.gain.value = SILENCE;
    water.connect(waterHighpass);
    waterHighpass.connect(waterLowpass);
    waterLowpass.connect(waterGain);
    if (waterPan) {
      waterGain.connect(waterPan);
      waterPan.connect(bus);
    } else {
      waterGain.connect(bus);
    }

    const body = context.createOscillator();
    const bodyFilter = context.createBiquadFilter();
    const bodyGain = context.createGain();
    body.type = MODE_AMBIENCE.normal.bodyType;
    body.frequency.value = MODE_AMBIENCE.normal.bodyFrequency;
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.value = 310;
    bodyFilter.Q.value = 0.7;
    bodyGain.gain.value = SILENCE;
    body.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(bus);

    this.ambience = {
      wind,
      windFilter,
      windGain,
      windPan,
      water,
      waterHighpass,
      waterLowpass,
      waterGain,
      waterPan,
      body,
      bodyFilter,
      bodyGain,
      stopped: false,
    };
    wind.start(context.currentTime, Math.random() * 0.8);
    water.start(context.currentTime, Math.random() * Math.max(0.1, WATER_LOOP_SECONDS - 0.5));
    body.start(context.currentTime);
    this.target(windGain.gain, 0.018, 0.16);
    this.target(waterGain.gain, MODE_AMBIENCE.normal.waterGain, 0.32);
    this.target(bodyGain.gain, MODE_AMBIENCE.normal.bodyGain, 0.2);
  }

  private stopAmbience(fade: number): void {
    const ambience = this.ambience;
    if (!ambience || ambience.stopped) return;
    ambience.stopped = true;
    this.ambience = null;
    const now = this.context?.currentTime ?? 0;
    this.target(ambience.windGain.gain, SILENCE, Math.max(0.003, fade));
    this.target(ambience.waterGain.gain, SILENCE, Math.max(0.003, fade * 1.35));
    this.target(ambience.bodyGain.gain, SILENCE, Math.max(0.003, fade));
    const stopAt = now + Math.max(0.012, fade * 4 + 0.015);
    try { ambience.wind.stop(stopAt); } catch { /* already stopped */ }
    try { ambience.water.stop(stopAt); } catch { /* already stopped */ }
    try { ambience.body.stop(stopAt); } catch { /* already stopped */ }
    globalThis.setTimeout(() => this.disconnectAmbience(ambience), Math.ceil(Math.max(0.02, stopAt - now + 0.02) * 1_000));
  }

  private disconnectAmbience(ambience: AmbienceLayer): void {
    for (const node of [
      ambience.wind,
      ambience.windFilter,
      ambience.windGain,
      ambience.windPan,
      ambience.water,
      ambience.waterHighpass,
      ambience.waterLowpass,
      ambience.waterGain,
      ambience.waterPan,
      ambience.body,
      ambience.bodyFilter,
      ambience.bodyGain,
    ]) {
      try { node?.disconnect(); } catch { /* already disconnected */ }
    }
  }

  private target(parameter: AudioParam, value: number, timeConstant: number): void {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    try {
      parameter.cancelScheduledValues(now);
      parameter.setTargetAtTime(value, now, Math.max(0.002, timeConstant));
    } catch {
      parameter.value = value;
    }
  }

  private cue(key: string, cooldown: number, play: () => void): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    const previous = this.lastCueAt.get(key) ?? -Infinity;
    if (now - previous < cooldown) return;
    this.lastCueAt.set(key, now);
    play();
  }

  private createVoice(duration: number, priority = 1, terminal = false, space = 0.04): Voice | null {
    const context = this.context;
    const bus = this.sfxBus;
    if (!context || !bus || this.muted) return null;

    if (terminal) {
      this.stopAllVoices();
      this.stopAmbience(0.055);
      this.rebuildReverb(context);
    } else if ([...this.voices].some((voice) => voice.terminal)) return null;

    if (this.voices.size >= MAX_VOICES) {
      const victim = [...this.voices].sort((left, right) => left.priority - right.priority || left.id - right.id)[0];
      if (!victim || victim.priority > priority) return null;
      this.stopVoice(victim, 0.009);
    }

    const gain = context.createGain();
    gain.gain.value = 1;
    gain.connect(bus);
    let send: GainNode | null = null;
    if (this.reverb && space > 0) {
      send = context.createGain();
      send.gain.value = Math.max(0, Math.min(0.65, space));
      gain.connect(send);
      send.connect(this.reverb);
    }
    const voice: Voice = {
      id: this.nextVoiceId,
      gain,
      send,
      sources: new Set(),
      nodes: new Set(send ? [gain, send] : [gain]),
      priority,
      terminal,
      timer: null,
      stopped: false,
    };
    this.nextVoiceId += 1;
    this.voices.add(voice);
    voice.timer = globalThis.setTimeout(() => this.removeVoice(voice), Math.ceil((duration + 0.16) * 1000));
    return voice;
  }

  private stopAllVoices(): void {
    for (const voice of [...this.voices]) this.stopVoice(voice, 0.009);
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
      try { source.stop(now + fade + 0.004); } catch { /* already ended */ }
    }
    if (voice.timer !== null) globalThis.clearTimeout(voice.timer);
    voice.timer = globalThis.setTimeout(() => this.removeVoice(voice), Math.ceil((fade + 0.03) * 1000));
    this.voices.delete(voice);
  }

  private removeVoice(voice: Voice): void {
    if (voice.timer !== null) globalThis.clearTimeout(voice.timer);
    voice.timer = null;
    voice.sources.clear();
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
    voice.nodes.clear();
    this.voices.delete(voice);
  }

  private connectToVoice(
    voice: Voice,
    output: AudioNode,
    start: number,
    duration: number,
    pan?: number,
    endPan?: number,
  ): void {
    const context = this.context;
    if (!context || pan === undefined || typeof context.createStereoPanner !== 'function') {
      output.connect(voice.gain);
      return;
    }
    const panner = context.createStereoPanner();
    const first = Math.max(-1, Math.min(1, pan));
    const last = Math.max(-1, Math.min(1, endPan ?? first));
    try {
      panner.pan.setValueAtTime(first, start);
      if (last !== first) panner.pan.linearRampToValueAtTime(last, start + duration);
    } catch {
      panner.pan.value = last;
    }
    output.connect(panner);
    panner.connect(voice.gain);
    voice.nodes.add(panner);
  }

  private tone(voice: Voice, options: ToneOptions): void {
    const context = this.context;
    if (!context || voice.stopped) return;
    const at = context.currentTime + (options.at ?? 0);
    const duration = Math.max(0.025, options.duration ?? 0.14);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    voice.nodes.add(oscillator);
    voice.nodes.add(envelope);
    const level = Math.max(SILENCE, options.gain ?? 0.12);
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, options.frequency), at);
    if (options.endFrequency !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), at + duration);
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
      voice.nodes.add(filter);
    }
    this.connectToVoice(voice, output, at, duration, options.pan, options.endPan);
    oscillator.connect(envelope);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.018);
    voice.sources.add(oscillator);
  }

  private noise(voice: Voice, options: NoiseOptions): void {
    const context = this.context;
    const buffer = this.getNoiseBuffer();
    if (!context || !buffer || voice.stopped) return;
    const source = context.createBufferSource();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    voice.nodes.add(source);
    voice.nodes.add(filter);
    voice.nodes.add(envelope);
    const start = context.currentTime + (options.at ?? 0);
    const duration = Math.max(0.02, options.duration ?? 0.15);
    source.buffer = buffer;
    filter.type = options.type ?? 'bandpass';
    const startFrequency = Math.max(20, options.frequency ?? 1_000);
    filter.frequency.setValueAtTime(startFrequency, start);
    if (options.endFrequency !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.endFrequency),
        start + duration,
      );
    }
    filter.Q.value = options.q ?? 1.2;
    envelope.gain.setValueAtTime(SILENCE, start);
    envelope.gain.linearRampToValueAtTime(Math.max(SILENCE, options.gain ?? 0.05), start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    this.connectToVoice(voice, envelope, start, duration, options.pan, options.endPan);
    source.start(start, Math.random() * 1.4);
    source.stop(start + duration + 0.012);
    voice.sources.add(source);
  }

  private playFlap(): void {
    const voice = this.createVoice(0.42, 3, false, 0.025);
    if (!voice) return;
    // The deliberately cartoony pre-5431449 "kwak": thrust, bill-like boing,
    // tiny upward zip and a papery wing puff.
    this.tone(voice, { type: 'sawtooth', frequency: 150, endFrequency: 250, duration: 0.3, gain: 0.2, filter: { type: 'bandpass', frequency: 950, q: 2 } });
    this.tone(voice, { type: 'sine', frequency: 450, endFrequency: 275, duration: 0.2, gain: 0.245, filter: { type: 'bandpass', frequency: 1_500, q: 2.8 } });
    this.tone(voice, { type: 'sine', frequency: 300, endFrequency: 1_200, duration: 0.1, gain: 0.095 });
    this.noise(voice, { duration: 0.24, gain: 0.065, frequency: 820, q: 0.9 });
  }

  private playGatePass(pan: number): void {
    const voice = this.createVoice(0.44, 3, false, 0.14);
    if (!voice) return;
    const sweepFrom = Math.max(-0.9, Math.min(0.9, pan + 0.56));
    const sweepTo = Math.max(-0.9, Math.min(0.9, pan - 0.58));
    this.noise(voice, {
      duration: 0.34,
      gain: 0.046,
      frequency: 2_650,
      endFrequency: 720,
      q: 0.72,
      pan: sweepFrom,
      endPan: sweepTo,
    });
    this.noise(voice, {
      at: 0.055,
      duration: 0.25,
      gain: 0.018,
      frequency: 620,
      endFrequency: 1_850,
      q: 1.25,
      pan: sweepFrom * 0.7,
      endPan: sweepTo * 0.7,
    });
    this.tone(voice, { at: 0.04, type: 'sine', frequency: 360, endFrequency: 670, duration: 0.2, gain: 0.032, pan: sweepFrom, endPan: sweepTo });
  }

  private playCoin(pan: number): void {
    const voice = this.createVoice(0.29, 3, false, 0.12);
    if (!voice) return;
    this.tone(voice, { frequency: 880, duration: 0.095, gain: 0.105, pan });
    this.tone(voice, { at: 0.062, frequency: 1_320, duration: 0.13, gain: 0.1, pan });
    this.tone(voice, { at: 0.115, frequency: 1_760, duration: 0.11, gain: 0.04, pan });
  }

  private playNearMiss(pan: number): void {
    const voice = this.createVoice(0.34, 4, false, 0.16);
    if (!voice) return;
    this.noise(voice, { duration: 0.24, gain: 0.064, frequency: 1_750, q: 1, pan });
    this.tone(voice, { type: 'sine', frequency: 205, endFrequency: 720, duration: 0.23, gain: 0.052, pan });
  }

  private playMutationOffer(): void {
    const voice = this.createVoice(0.78, 6, false, 0.34);
    if (!voice) return;
    [262, 392, 523, 784].forEach((frequency, index) => {
      this.tone(voice, { at: index * 0.09, type: 'triangle', frequency, duration: 0.25, gain: 0.074, pan: index % 2 === 0 ? -0.22 : 0.22 });
    });
    this.noise(voice, { at: 0.07, duration: 0.46, gain: 0.028, frequency: 2_400, q: 0.7 });
  }

  private playMutationSelected(mode: MutationModeId, lane: 'upper' | 'lower'): void {
    const voice = this.createVoice(0.24, 5, false, 0.2);
    if (!voice) return;
    const root = mode === 'steel' ? 155 : mode === 'frog' ? 196 : mode === 'rubber' ? 294 : mode === 'ghost' ? 370 : 440;
    const verticalColour = lane === 'upper' ? 1.08 : 0.92;
    this.noise(voice, { duration: 0.12, gain: 0.026, frequency: 1_850 * verticalColour, q: 0.75 });
    this.tone(voice, { type: 'sine', frequency: root, endFrequency: root * 1.65, duration: 0.16, gain: 0.042 });
  }

  private playModeEntered(mode: MutationModeId): void {
    const voice = this.createVoice(0.86, 7, false, mode === 'ghost' ? 0.42 : 0.2);
    if (!voice) return;
    const motifs: Record<MutationModeId, readonly [number, number, OscillatorType]> = {
      frog: [185, 92, 'sawtooth'],
      rubber: [520, 150, 'triangle'],
      steel: [185, 74, 'triangle'],
      ghost: [310, 670, 'sine'],
      stork: [620, 1_180, 'triangle'],
    };
    const [start, end, type] = motifs[mode];
    const transformTone: ToneOptions = {
      type,
      frequency: start,
      endFrequency: end,
      duration: 0.45,
      gain: 0.135,
      ...(mode === 'frog' ? { filter: { type: 'lowpass' as const, frequency: 650, q: 1.8 } } : {}),
    };
    this.tone(voice, transformTone);
    this.tone(voice, { at: 0.18, type: 'sine', frequency: Math.max(45, end), endFrequency: Math.max(55, end * 1.52), duration: 0.35, gain: 0.066, pan: -0.18 });
    this.tone(voice, { at: 0.28, type: 'sine', frequency: Math.max(55, end * 1.25), endFrequency: Math.max(65, end * 1.9), duration: 0.28, gain: 0.048, pan: 0.18 });
    if (mode === 'steel') this.noise(voice, { duration: 0.095, gain: 0.11, frequency: 2_150, q: 1.8 });
    else if (mode === 'stork') this.noise(voice, { duration: 0.16, gain: 0.065, frequency: 1_720, q: 0.7 });
    else if (mode === 'ghost') this.noise(voice, { duration: 0.55, gain: 0.026, frequency: 1_480, q: 0.55 });
  }

  private playModeExited(mode: MutationModeId, reason: 'timer' | 'overheat' | 'replaced'): void {
    if (reason === 'overheat') {
      // The explicit steel-overheat action is emitted immediately before this
      // lifecycle event and owns the cue.
      return;
    }
    const voice = this.createVoice(0.38, 4, false, 0.18);
    if (!voice) return;
    const root = mode === 'ghost' ? 620 : mode === 'stork' ? 740 : mode === 'rubber' ? 430 : mode === 'frog' ? 310 : 220;
    this.tone(voice, { type: 'triangle', frequency: root, endFrequency: root * 0.55, duration: 0.27, gain: reason === 'replaced' ? 0.045 : 0.065 });
    if (reason === 'replaced') this.tone(voice, { at: 0.08, frequency: root * 1.35, duration: 0.15, gain: 0.035 });
  }

  private playModeAction(action: ModeAction): void {
    if (action === 'frog-cling' || action === 'rubber-bounce') {
      // Physical contact is represented by the paired collision event.
      return;
    }
    if (action === 'frog-launch') this.playFrogLaunch();
    else if (action === 'rubber-aim') this.cue('rubber-aim', 0.13, () => this.playRubberAim());
    else if (action === 'rubber-launch') this.playRubberLaunch();
    else if (action === 'steel-critical') this.cue('steel-critical', 0.32, () => this.playSteelCritical());
    else if (action === 'steel-overheat') this.playSteelOverheat();
    else if (action === 'steel-temper') this.playSteelTemper();
    else if (action === 'stork-lock' || action === 'stork-vault-start' || action === 'stork-vault-end') this.playStorkAction(action);
    else if (action === 'ghost-phase-start' || action === 'ghost-phase-end') this.playGhostPhase(action === 'ghost-phase-start');
  }

  private playFrogCling(pan: number): void {
    this.cue('frog-cling', 0.1, () => {
      const voice = this.createVoice(0.2, 4, false, 0.08);
      if (!voice) return;
      this.tone(voice, { type: 'sine', frequency: 126, endFrequency: 82, duration: 0.13, gain: 0.11, pan });
      this.noise(voice, { duration: 0.045, gain: 0.055, frequency: 540, q: 0.9, pan });
    });
  }

  private playFrogLaunch(): void {
    const voice = this.createVoice(0.34, 5, false, 0.1);
    if (!voice) return;
    this.tone(voice, { type: 'triangle', frequency: 150, endFrequency: 690, duration: 0.25, gain: 0.145 });
    this.tone(voice, { at: 0.03, type: 'sine', frequency: 92, endFrequency: 138, duration: 0.22, gain: 0.09 });
    this.noise(voice, { duration: 0.06, gain: 0.05, frequency: 620, q: 0.8 });
  }

  private playRubberAim(): void {
    const voice = this.createVoice(0.19, 2, false, 0.05);
    if (!voice) return;
    this.tone(voice, { type: 'triangle', frequency: 245, endFrequency: 285, duration: 0.15, gain: 0.038 });
  }

  private playRubberLaunch(): void {
    const voice = this.createVoice(0.31, 5, false, 0.08);
    if (!voice) return;
    this.noise(voice, { duration: 0.035, gain: 0.11, frequency: 2_700, q: 1.8 });
    this.tone(voice, { type: 'triangle', frequency: 760, endFrequency: 115, duration: 0.25, gain: 0.155 });
  }

  private playRubberBounce(pan: number, wetness = 0.46): void {
    this.cue('rubber-bounce', 0.085, () => {
      const voice = this.createVoice(0.4, 5, false, 0.1);
      if (!voice) return;
      this.tone(voice, { type: 'triangle', frequency: 620, endFrequency: 138, duration: 0.21, gain: 0.135, pan });
      this.tone(voice, { at: 0.04, type: 'sine', frequency: 110, endFrequency: 165, duration: 0.16, gain: 0.07, pan });
      this.noise(voice, { duration: 0.035, gain: 0.067, frequency: 2_300, q: 1.4, pan });
      this.addSplashLayers(voice, pan, wetness, 0.025);
    });
  }

  private playSteelImpact(pan: number, critical: boolean): void {
    this.cue('steel-impact', 0.085, () => {
      const voice = this.createVoice(0.78, 6, false, 0.3);
      if (!voice) return;
      this.noise(voice, { duration: 0.085, gain: critical ? 0.135 : 0.105, frequency: 2_100, q: 1.5, pan });
      this.tone(voice, { type: 'triangle', frequency: critical ? 145 : 176, endFrequency: 70, duration: 0.3, gain: 0.15, pan });
      this.tone(voice, { type: 'sine', frequency: 1_040, endFrequency: 860, duration: 0.4, gain: 0.043, pan: -pan });
      this.tone(voice, { at: 0.015, type: 'sine', frequency: 1_570, duration: 0.27, gain: 0.026, pan });
      // Wet, corroded pipe skin tears after the initial metal transient.
      this.noise(voice, { at: 0.065, duration: 0.56, gain: 0.041, frequency: 1_080, endFrequency: 390, q: 3.1, pan, endPan: pan * 0.35 });
      this.tone(voice, { at: 0.075, type: 'sawtooth', frequency: 286, endFrequency: 82, duration: 0.58, gain: 0.036, filter: { type: 'bandpass', frequency: 690, q: 4.2 }, pan, endPan: pan * 0.28 });
      this.tone(voice, { at: 0.11, type: 'sine', frequency: 1_460, endFrequency: 610, duration: 0.43, gain: 0.017, pan: -pan * 0.45 });
    });
  }

  private addSplashLayers(
    voice: Voice,
    pan: number,
    intensity: number,
    at = 0,
  ): void {
    const amount = Math.max(0.18, Math.min(1, intensity));
    this.noise(voice, {
      at,
      duration: 0.34,
      gain: 0.057 * amount,
      frequency: 1_250,
      endFrequency: 330,
      q: 0.52,
      type: 'lowpass',
      pan: pan - 0.08,
      endPan: pan + 0.1,
    });
    this.noise(voice, {
      at: at + 0.018,
      duration: 0.115,
      gain: 0.038 * amount,
      frequency: 3_100,
      endFrequency: 1_420,
      q: 0.86,
      pan: pan + 0.1,
      endPan: pan - 0.06,
    });
    this.tone(voice, {
      at: at + 0.012,
      type: 'sine',
      frequency: 96,
      endFrequency: 45,
      duration: 0.28,
      gain: 0.047 * amount,
      pan,
    });
  }

  private playWaterSplash(pan: number, intensity: number): void {
    this.cue('water-splash', 0.09, () => {
      const voice = this.createVoice(0.56, 5, false, 0.28);
      if (!voice) return;
      this.addSplashLayers(voice, pan, intensity);
      this.noise(voice, { at: 0.08, duration: 0.38, gain: 0.025 * intensity, frequency: 720, endFrequency: 210, q: 0.44, type: 'lowpass', pan });
    });
  }

  private playSteelCritical(): void {
    const voice = this.createVoice(0.34, 6, false, 0.12);
    if (!voice) return;
    this.tone(voice, { type: 'square', frequency: 196, duration: 0.08, gain: 0.05 });
    this.tone(voice, { at: 0.13, type: 'square', frequency: 196, duration: 0.08, gain: 0.045 });
  }

  private playSteelOverheat(): void {
    this.cue('steel-overheat', 0.3, () => {
      const voice = this.createVoice(0.7, 7, false, 0.25);
      if (!voice) return;
      this.noise(voice, { duration: 0.48, gain: 0.095, frequency: 1_280, q: 0.65 });
      this.tone(voice, { type: 'sawtooth', frequency: 250, endFrequency: 52, duration: 0.56, gain: 0.11, filter: { type: 'lowpass', frequency: 720, q: 0.8 } });
    });
  }

  private playSteelTemper(): void {
    const voice = this.createVoice(0.72, 7, false, 0.3);
    if (!voice) return;
    this.noise(voice, { duration: 0.18, gain: 0.09, frequency: 2_450, q: 2.2 });
    [330, 495, 660].forEach((frequency, index) => this.tone(voice, { at: 0.08 + index * 0.1, frequency, duration: 0.31, gain: 0.07 }));
  }

  private playShield(pan: number): void {
    const voice = this.createVoice(0.28, 5, false, 0.25);
    if (!voice) return;
    this.tone(voice, { type: 'sine', frequency: 310, endFrequency: 980, duration: 0.22, gain: 0.09, pan });
    this.noise(voice, { duration: 0.12, gain: 0.04, frequency: 2_600, q: 1.7, pan });
  }

  private playStorkAction(action: 'stork-lock' | 'stork-vault-start' | 'stork-vault-end'): void {
    const voice = this.createVoice(0.46, 6, false, 0.18);
    if (!voice) return;
    if (action === 'stork-lock') {
      this.tone(voice, { frequency: 710, endFrequency: 1_180, duration: 0.17, gain: 0.075, pan: -0.2 });
      this.tone(voice, { at: 0.095, frequency: 1_180, duration: 0.14, gain: 0.065, pan: 0.2 });
    } else if (action === 'stork-vault-start') {
      this.noise(voice, { duration: 0.12, gain: 0.088, frequency: 1_900, q: 0.72 });
      this.tone(voice, { type: 'triangle', frequency: 390, endFrequency: 1_050, duration: 0.28, gain: 0.115 });
    } else {
      this.noise(voice, { duration: 0.18, gain: 0.055, frequency: 1_450, q: 0.6 });
      this.tone(voice, { type: 'triangle', frequency: 1_020, endFrequency: 315, duration: 0.31, gain: 0.105 });
      this.tone(voice, { at: 0.11, frequency: 620, duration: 0.17, gain: 0.045 });
    }
  }

  private playGhostPhase(entering: boolean): void {
    const voice = this.createVoice(0.39, 5, false, 0.48);
    if (!voice) return;
    this.tone(voice, { type: 'sine', frequency: entering ? 290 : 660, endFrequency: entering ? 690 : 315, duration: 0.3, gain: 0.062, filter: { type: 'bandpass', frequency: 820, q: 1.2 }, pan: entering ? -0.2 : 0.2 });
    this.tone(voice, { at: 0.035, type: 'sine', frequency: entering ? 435 : 520, endFrequency: entering ? 830 : 250, duration: 0.28, gain: 0.033, pan: entering ? 0.2 : -0.2 });
    this.noise(voice, { duration: 0.29, gain: 0.024, frequency: 1_300, q: 0.5 });
  }

  private playGhostPass(pan: number): void {
    const voice = this.createVoice(0.48, 5, false, 0.42);
    if (!voice) return;
    this.noise(voice, {
      duration: 0.34,
      gain: 0.035,
      frequency: 1_720,
      q: 0.7,
      pan,
    });
    this.tone(voice, {
      type: 'sine',
      frequency: 270,
      endFrequency: 820,
      duration: 0.36,
      gain: 0.052,
      filter: { type: 'bandpass', frequency: 960, q: 1.1 },
      pan,
    });
    this.tone(voice, {
      at: 0.055,
      type: 'sine',
      frequency: 610,
      endFrequency: 245,
      duration: 0.31,
      gain: 0.026,
      pan: -pan * 0.55,
    });
  }

  private playCombo(multiplier: number): void {
    const voice = this.createVoice(0.25, 3, false, 0.16);
    if (!voice) return;
    const root = 500 * Math.min(1.65, 0.8 + multiplier * 0.18);
    this.tone(voice, { frequency: root, duration: 0.12, gain: 0.057, pan: -0.12 });
    this.tone(voice, { at: 0.06, frequency: root * 1.5, duration: 0.14, gain: 0.05, pan: 0.12 });
  }

  private playComboExpired(): void {
    const voice = this.createVoice(0.26, 2, false, 0.05);
    if (!voice) return;
    this.tone(voice, { type: 'triangle', frequency: 420, endFrequency: 235, duration: 0.2, gain: 0.032 });
  }

  private playGameOverFlock(): void {
    const voice = this.createVoice(5.6, 100, true, 0.2);
    if (!voice) return;
    voice.gain.gain.value = 0.76;
    const random = (minimum: number, maximum: number): number => minimum + Math.random() * (maximum - minimum);

    const quack = (
      offset: number,
      pitch = 1,
      duration = 0.2,
      gain = 0.42,
      pan = random(-0.86, 0.86),
      harmonic = false,
    ): number => {
      this.tone(voice, {
        at: offset,
        type: 'sawtooth',
        frequency: 336 * pitch,
        endFrequency: 168 * pitch,
        duration,
        gain,
        filter: { type: 'bandpass', frequency: 600 * pitch, q: 2 },
        pan,
      });
      if (harmonic) {
        this.tone(voice, {
          at: offset + 0.025,
          type: 'sine',
          frequency: 155 * pitch,
          endFrequency: 112 * pitch,
          duration: duration * 0.84,
          gain: gain * 0.24,
          pan,
        });
      }
      return offset + duration + 0.045;
    };

    const phrase = (
      offset: number,
      count: number,
      pitchRange: readonly [number, number],
      gainRange: readonly [number, number],
      pauseRange: readonly [number, number],
      panCentre: number,
    ): number => {
      let cursor = offset;
      for (let index = 0; index < count; index += 1) {
        cursor = quack(cursor, random(...pitchRange), random(0.14, 0.28), random(...gainRange), Math.max(-0.9, Math.min(0.9, panCentre + random(-0.24, 0.24))));
        if (index < count - 1) cursor += random(...pauseRange);
      }
      return cursor;
    };

    // Impact, one smug soloist, then two laughing groups answering each other.
    this.noise(voice, { duration: 0.1, gain: 0.085, frequency: 420, q: 0.75 });
    this.tone(voice, { type: 'triangle', frequency: 105, endFrequency: 55, duration: 0.28, gain: 0.12 });
    let cursor = quack(0.34, 0.78, 0.39, 0.43, -0.15, true) + 0.14;
    cursor = phrase(cursor, 3, [1.02, 1.38], [0.25, 0.37], [0.035, 0.095], -0.52) + 0.06;
    phrase(cursor - 0.05, 3, [0.72, 1.03], [0.27, 0.4], [0.05, 0.13], 0.5);
    cursor += 0.48;
    phrase(cursor, 4, [1.16, 1.58], [0.19, 0.29], [0.025, 0.07], -0.38);
    phrase(cursor + 0.18, 3, [0.62, 0.83], [0.25, 0.37], [0.04, 0.1], 0.42);
    for (let flapIndex = 0; flapIndex < 6; flapIndex += 1) {
      this.noise(voice, { at: 0.62 + flapIndex * 0.31, duration: 0.085, gain: 0.02, frequency: 880 + random(-160, 210), q: 0.65, pan: random(-0.7, 0.7) });
    }
    const finale = cursor + 1.05;
    phrase(finale, 3, [0.82, 1.42], [0.22, 0.34], [0.025, 0.075], -0.22);
    quack(finale + 0.82, 0.67, 0.55, 0.52, 0.25, true);
  }

  private panForEntity(entityId: string, state?: Readonly<GameState>): number {
    if (state) {
      const coin = state.world.coins.find((candidate) => candidate.id === entityId);
      const obstacle = state.world.obstacles.find((candidate) => candidate.id === entityId || candidate.id === coin?.obstacleId);
      const x = coin?.x ?? obstacle?.x;
      if (x !== undefined) return Math.max(-0.8, Math.min(0.8, (x - state.player.x) / 9));
    }
    let hash = 0;
    for (let index = 0; index < entityId.length; index += 1) hash = (hash * 31 + entityId.charCodeAt(index)) | 0;
    return ((Math.abs(hash) % 101) / 100 - 0.5) * 0.7;
  }
}
