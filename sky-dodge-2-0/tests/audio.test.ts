import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../src/audio/AudioEngine';
import type { GameEvent, ModeAction } from '../src/simulation/GameEvents';
import { createInitialGameState } from '../src/simulation/GameState';

class FakeAudioParam {
  value = 0;

  cancelScheduledValues(): this { return this; }
  setValueAtTime(value: number): this { this.value = value; return this; }
  linearRampToValueAtTime(value: number): this { this.value = value; return this; }
  exponentialRampToValueAtTime(value: number): this { this.value = value; return this; }
  setTargetAtTime(value: number): this { this.value = value; return this; }
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

  constructor(readonly numberOfChannels: number, length: number) {
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

  start(): void { this.started += 1; }
  stop(): void { this.stopped += 1; }
}

class FakeAudioContext {
  static latest: FakeAudioContext | null = null;
  readonly destination = new FakeNode();
  readonly sampleRate = 8_000;
  readonly sources: FakeSource[] = [];
  currentTime = 1;
  state: AudioContextState = 'running';

  constructor() { FakeAudioContext.latest = this; }
  createGain(): FakeGain { return new FakeGain(); }
  createDynamicsCompressor(): FakeCompressor { return new FakeCompressor(); }
  createConvolver(): FakeConvolver { return new FakeConvolver(); }
  createBuffer(channels: number, length: number): FakeBuffer { return new FakeBuffer(channels, length); }
  createBiquadFilter(): FakeFilter { return new FakeFilter(); }
  createStereoPanner(): FakePanner { return new FakePanner(); }
  createBufferSource(): FakeSource { const source = new FakeSource(); this.sources.push(source); return source; }
  createOscillator(): FakeSource { const source = new FakeSource(); this.sources.push(source); return source; }
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

  it('owns ambient and cue nodes across mute, restart and game over', async () => {
    const audio = new AudioEngine();
    expect(await audio.unlock()).toBe(true);
    const context = FakeAudioContext.latest;
    expect(context).not.toBeNull();
    if (!context) return;

    const state = createInitialGameState(17);
    audio.beginRun();
    audio.update(state);
    expect(context.sources.filter((source) => source.started > 0)).toHaveLength(2);
    audio.setPaused(true);
    expect(context.sources.slice(0, 2).every((source) => source.stopped > 0)).toBe(true);
    vi.advanceTimersByTime(250);
    audio.setPaused(false);
    await Promise.resolve();
    await Promise.resolve();
    audio.update(state);
    expect(context.sources.filter((source) => source.started > 0).length).toBeGreaterThanOrEqual(4);

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
    await Promise.resolve();
    expect(context.state).toBe('closed');
  });
});
