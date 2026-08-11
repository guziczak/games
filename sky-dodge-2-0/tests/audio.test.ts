import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIO_MIX_BUDGET, AudioEngine } from '../src/audio/AudioEngine';
import type { GameEvent, ModeAction } from '../src/simulation/GameEvents';
import { createInitialGameState } from '../src/simulation/GameState';

class FakeAudioParam {
  value = 0;
  readonly automation: { readonly method: string; readonly value: number; readonly time: number | undefined }[] = [];

  cancelScheduledValues(time?: number): this { this.automation.push({ method: 'cancel', value: this.value, time }); return this; }
  setValueAtTime(value: number, time?: number): this { this.value = value; this.automation.push({ method: 'set', value, time }); return this; }
  linearRampToValueAtTime(value: number, time?: number): this { this.value = value; this.automation.push({ method: 'linear', value, time }); return this; }
  exponentialRampToValueAtTime(value: number, time?: number): this { this.value = value; this.automation.push({ method: 'exponential', value, time }); return this; }
  setTargetAtTime(value: number, time?: number): this { this.value = value; this.automation.push({ method: 'target', value, time }); return this; }
}

class FakeNode {
  connections = 0;
  connect<T>(destination: T): T { this.connections += 1; return destination; }
  disconnect(): void { this.connections = 0; }
}

class FakeGain extends FakeNode { readonly gain = new FakeAudioParam(); }
class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass';
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
}
class FakePanner extends FakeNode { readonly pan = new FakeAudioParam(); }
class FakeCompressor extends FakeNode {
  readonly threshold = new FakeAudioParam();
  readonly knee = new FakeAudioParam();
  readonly ratio = new FakeAudioParam();
  readonly attack = new FakeAudioParam();
  readonly release = new FakeAudioParam();
}
class FakeConvolver extends FakeNode { buffer: FakeBuffer | null = null; }

class FakeBuffer {
  readonly channels: Float32Array[];

  constructor(readonly numberOfChannels: number, readonly length: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    const data = this.channels[channel];
    if (!data) throw new RangeError('channel');
    return data;
  }
}

class FakeSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  loop = false;
  readonly frequency = new FakeAudioParam();
  type: OscillatorType = 'sine';
  started = 0;
  stopped = 0;
  readonly starts: { readonly when: number | undefined; readonly offset: number | undefined }[] = [];

  start(when?: number, offset?: number): void { this.started += 1; this.starts.push({ when, offset }); }
  stop(): void { this.stopped += 1; }
}

class FakeAudioContext {
  static latest: FakeAudioContext | null = null;
  readonly destination = new FakeNode();
  readonly sampleRate = 8_000;
  readonly sources: FakeSource[] = [];
  readonly nodes: FakeNode[] = [];
  readonly gains: FakeGain[] = [];
  readonly filters: FakeFilter[] = [];
  readonly panners: FakePanner[] = [];
  readonly buffers: FakeBuffer[] = [];
  currentTime = 1;
  state: AudioContextState = 'running';

  constructor() { FakeAudioContext.latest = this; }
  private remember<T extends FakeNode>(node: T): T { this.nodes.push(node); return node; }
  createGain(): FakeGain { const node = this.remember(new FakeGain()); this.gains.push(node); return node; }
  createDynamicsCompressor(): FakeCompressor { return this.remember(new FakeCompressor()); }
  createConvolver(): FakeConvolver { return this.remember(new FakeConvolver()); }
  createBuffer(channels: number, length: number): FakeBuffer { const buffer = new FakeBuffer(channels, length); this.buffers.push(buffer); return buffer; }
  createBiquadFilter(): FakeFilter { const node = this.remember(new FakeFilter()); this.filters.push(node); return node; }
  createStereoPanner(): FakePanner { const node = this.remember(new FakePanner()); this.panners.push(node); return node; }
  createBufferSource(): FakeSource { const source = this.remember(new FakeSource()); this.sources.push(source); return source; }
  createOscillator(): FakeSource { const source = this.remember(new FakeSource()); this.sources.push(source); return source; }
  async resume(): Promise<void> { this.state = 'running'; }
  async close(): Promise<void> { this.state = 'closed'; }
}

describe('AudioEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudioContext.latest = null;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps a bounded water, wind and form bed whose mix follows altitude and phenotype', async () => {
    const audio = new AudioEngine();
    expect(await audio.unlock()).toBe(true);
    const context = FakeAudioContext.latest;
    expect(context).not.toBeNull();
    if (!context) return;

    const state = createInitialGameState(9);
    audio.beginRun();
    audio.update(state);
    const ambienceSources = context.sources.filter((source) => source.started > 0);
    expect(ambienceSources).toHaveLength(AUDIO_MIX_BUDGET.ambienceSources);
    expect(ambienceSources.filter((source) => source.loop)).toHaveLength(2);
    const windBuffer = ambienceSources[0]?.buffer;
    const waterBuffer = ambienceSources[1]?.buffer;
    expect(windBuffer).not.toBeNull();
    expect(waterBuffer).not.toBeNull();
    expect(waterBuffer?.length ?? 0).toBeGreaterThan((windBuffer?.length ?? 0) * 3);
    expect(waterBuffer?.length).toBe(Math.floor(context.sampleRate * AUDIO_MIX_BUDGET.waterLoopSeconds));

    const waterGain = context.gains[5];
    const body = ambienceSources[2];
    expect(waterGain).toBeDefined();
    expect(body).toBeDefined();
    if (!waterGain || !body) return;
    state.player.y = 0.35;
    context.currentTime += 0.08;
    audio.update(state);
    const nearWaterLevel = waterGain.gain.value;
    state.player.y = 9.5;
    context.currentTime += 0.08;
    audio.update(state);
    expect(waterGain.gain.value).toBeLessThan(nearWaterLevel);

    state.mode.active = 'steel';
    context.currentTime += 0.08;
    audio.update(state);
    expect(body.type).toBe('square');
    expect(body.frequency.value).toBe(55);
    state.mode.active = 'ghost';
    context.currentTime += 0.08;
    audio.update(state);
    expect(body.type).toBe('sine');
    expect(body.frequency.value).toBe(188);

    audio.destroy();
    vi.runAllTimers();
    await Promise.resolve();
    expect(context.nodes.every((node) => node.connections === 0)).toBe(true);
  });

  it('renders a moving gate whistle, rusty break and wet bounce without assets', async () => {
    const audio = new AudioEngine();
    expect(await audio.unlock()).toBe(true);
    const context = FakeAudioContext.latest;
    if (!context) return;
    const state = createInitialGameState(21);

    const pannersBefore = context.panners.length;
    audio.handle([{ type: 'obstacle-passed', tick: 1, time: 1, obstacleId: 'gate-spatial' }], state);
    const whistlePanners = context.panners.slice(pannersBefore);
    expect(whistlePanners.length).toBeGreaterThanOrEqual(2);
    expect(whistlePanners.some((panner) => {
      const values = panner.pan.automation.map((entry) => entry.value);
      return values.length >= 2 && Math.max(...values) - Math.min(...values) > 0.7;
    })).toBe(true);

    context.currentTime += 0.2;
    const beforeBreak = context.sources.length;
    audio.handle([{ type: 'collision', tick: 2, time: 2, entityId: 'rusty-gate', outcome: 'destroy' }], state);
    expect(context.sources.length - beforeBreak).toBeGreaterThanOrEqual(7);
    const rustyFilters = context.filters.filter((filter) => filter.Q.value >= 3);
    expect(rustyFilters.length).toBeGreaterThanOrEqual(2);

    context.currentTime += 0.2;
    const beforeBounce = context.sources.length;
    audio.handle([{ type: 'collision', tick: 3, time: 3, entityId: 'boundary-floor', outcome: 'bounce' }], state);
    expect(context.sources.length - beforeBounce).toBeGreaterThanOrEqual(6);
    expect(context.filters.some((filter) => filter.type === 'lowpass' && filter.frequency.value <= 330)).toBe(true);

    audio.destroy();
    vi.runAllTimers();
    await Promise.resolve();
    expect(context.nodes.every((node) => node.connections === 0)).toBe(true);
  });

  it('owns ambient and cue nodes across mute, restart and game over', async () => {
    const audio = new AudioEngine();
    expect(await audio.unlock()).toBe(true);
    const context = FakeAudioContext.latest;
    expect(context).not.toBeNull();
    if (!context) return;
    expect(audio.needsUnlock()).toBe(false);
    context.state = 'suspended';
    expect(audio.needsUnlock()).toBe(true);
    expect(await audio.unlock()).toBe(true);
    expect(audio.needsUnlock()).toBe(false);

    const state = createInitialGameState(17);
    audio.beginRun();
    audio.update(state);
    expect(context.sources.filter((source) => source.started > 0)).toHaveLength(AUDIO_MIX_BUDGET.ambienceSources);
    audio.setPaused(true);
    expect(context.sources.slice(0, AUDIO_MIX_BUDGET.ambienceSources).every((source) => source.stopped > 0)).toBe(true);
    vi.advanceTimersByTime(250);
    audio.setPaused(false);
    await Promise.resolve();
    await Promise.resolve();
    audio.update(state);
    expect(context.sources.filter((source) => source.started > 0).length).toBeGreaterThanOrEqual(AUDIO_MIX_BUDGET.ambienceSources * 2);

    const actions: readonly ModeAction[] = [
      'frog-cling', 'frog-launch', 'rubber-aim', 'rubber-launch', 'rubber-bounce',
      'steel-critical', 'steel-overheat', 'steel-temper', 'ghost-phase-start',
      'ghost-phase-end', 'stork-lock', 'stork-vault-start', 'stork-vault-end',
    ];
    const actionEvents: GameEvent[] = actions.map((action) => ({
      type: 'mode-action', tick: 1, time: 1, mode: action.startsWith('frog') ? 'frog'
        : action.startsWith('rubber') ? 'rubber'
          : action.startsWith('steel') ? 'steel'
            : action.startsWith('ghost') ? 'ghost' : 'stork',
      action,
      entityId: 'gate-1',
    }));
    const events: GameEvent[] = [
      { type: 'flap', tick: 1, time: 1, mode: 'normal' },
      { type: 'obstacle-passed', tick: 1, time: 1, obstacleId: 'gate-1' },
      { type: 'coin-collected', tick: 1, time: 1, coinId: 'coin-1', obstacleId: 'gate-1' },
      { type: 'near-miss', tick: 1, time: 1, obstacleId: 'gate-1', clearance: 0.1 },
      { type: 'mutation-selected', tick: 1, time: 1, offerId: 'offer-1', mode: 'frog', lane: 'upper' },
      { type: 'mode-entered', tick: 1, time: 1, mode: 'frog', duration: 8 },
      ...actionEvents,
      { type: 'collision', tick: 1, time: 1, entityId: 'rusty-gate', outcome: 'destroy' },
      { type: 'collision', tick: 1, time: 1, entityId: 'boundary-floor', outcome: 'bounce' },
      { type: 'collision', tick: 1, time: 1, entityId: 'gate-2', outcome: 'phase' },
      { type: 'collision', tick: 1, time: 1, entityId: 'gate-1', outcome: 'shielded' },
      { type: 'combo-changed', tick: 1, time: 1, links: 3, multiplier: 1.5 },
      { type: 'combo-expired', tick: 1, time: 1 },
    ];
    audio.handle(events, state);
    expect(context.sources.filter((source) => source.started > 0).length).toBeGreaterThan(20);

    const beforeMute = context.sources.length;
    audio.setMuted(true);
    expect(context.sources.slice(0, beforeMute).every((source) => source.stopped > 0)).toBe(true);
    audio.setMuted(false);
    await Promise.resolve();
    expect(audio.isMuted()).toBe(false);

    const beforeFlock = context.sources.length;
    audio.handle([{ type: 'game-over', tick: 2, time: 2, reason: 'boundary' }], state);
    expect(context.sources.length).toBeGreaterThan(beforeMute);
    expect(context.sources.length - beforeFlock).toBeLessThanOrEqual(30);
    const afterFlock = context.sources.length;
    context.currentTime += 1;
    audio.handle([{ type: 'flap', tick: 3, time: 3, mode: 'normal' }], state);
    expect(context.sources).toHaveLength(afterFlock);
    audio.finishRun();
    audio.reset();
    expect(context.sources.every((source) => source.stopped > 0)).toBe(true);

    audio.destroy();
    vi.runAllTimers();
    await Promise.resolve();
    expect(context.state).toBe('closed');
    expect(context.nodes.every((node) => node.connections === 0)).toBe(true);
  });
});
