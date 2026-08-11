import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../src/simulation/GameConfig';
import type { GameConfig } from '../src/simulation/GameConfig';
import { createInitialGameState, createInitialModeState } from '../src/simulation/GameState';
import type { GameState, MutationModeId, ObstacleState } from '../src/simulation/GameState';
import { Simulation, startMode, stepSimulation } from '../src/simulation/Simulation';

const TEST_CONFIG: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  player: {
    ...DEFAULT_GAME_CONFIG.player,
    gravity: 0,
  },
  obstacle: {
    ...DEFAULT_GAME_CONFIG.obstacle,
    firstSpawnDelay: 0.1,
    minGapCenter: 3.5,
    maxGapCenter: 6.5,
    maxCenterDelta: 0.5,
    coinChance: 0,
  },
  difficulty: DEFAULT_GAME_CONFIG.difficulty.map((tier) => ({
    ...tier,
    speed: 3,
    gapSize: 6,
    spawnInterval: 0.8,
    movingChance: 0,
    movingAmplitude: 0,
    movingFrequency: 0,
  })),
};

function makeObstacle(overrides: Partial<ObstacleState> = {}): ObstacleState {
  return {
    id: 'gate-test',
    x: 8,
    width: 0.9,
    baseGapCenter: 5,
    gapCenter: 5,
    gapSize: 3,
    motionAmplitude: 0,
    motionFrequency: 0,
    motionPhase: 0,
    passed: false,
    nearMissAwarded: false,
    destroyed: false,
    collisionResolved: false,
    frogCatapultAwarded: false,
    rubberRicochetAwarded: false,
    steelBreakAwarded: false,
    ghostPhaseAwarded: false,
    storkVaultAwarded: false,
    ...overrides,
  };
}

describe('Sky Dodge 2.0 simulation', () => {
  it('replays the same seed and inputs deterministically', () => {
    const first = new Simulation({ seed: 0xabc123, config: TEST_CONFIG });
    const second = new Simulation({ seed: 0xabc123, config: TEST_CONFIG });
    const firstEvents = [];
    const secondEvents = [];

    for (let frame = 0; frame < 900; frame += 1) {
      const input = frame % 75 === 0 ? [{ type: 'flap' } as const] : [];
      firstEvents.push(...first.step(1 / 60, input).events);
      secondEvents.push(...second.step(1 / 60, input).events);
    }

    expect(second.snapshot()).toEqual(first.snapshot());
    expect(secondEvents).toEqual(firstEvents);
  });

  it('buffers edge input until a fixed tick and is independent of frame chunking', () => {
    const halfFrames = new Simulation({ seed: 42, config: TEST_CONFIG });
    const wholeFrame = new Simulation({ seed: 42, config: TEST_CONFIG });
    const halfStep = TEST_CONFIG.fixedStep / 2;

    expect(halfFrames.step(halfStep, [{ type: 'flap' }]).events).toHaveLength(0);
    halfFrames.step(halfStep);
    wholeFrame.step(TEST_CONFIG.fixedStep, [{ type: 'flap' }]);
    expect(halfFrames.snapshot()).toEqual(wholeFrame.snapshot());

    for (let index = 0; index < 300; index += 1) {
      halfFrames.step(TEST_CONFIG.fixedStep * 2);
      wholeFrame.step(TEST_CONFIG.fixedStep);
      wholeFrame.step(TEST_CONFIG.fixedStep);
    }
    expect(halfFrames.snapshot()).toEqual(wholeFrame.snapshot());
  });

  it('awards pass and near-miss score at most once per obstacle', () => {
    const state = createInitialGameState(7, TEST_CONFIG);
    state.world.spawnTimer = 999;
    state.player.y = 5.62;
    state.world.obstacles.push(makeObstacle({
      x: state.player.x - TEST_CONFIG.player.radiusX - TEST_CONFIG.obstacle.width / 2 - 0.01,
      gapSize: 2,
    }));

    const first = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
    const second = stepSimulation(first.state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
    const allEvents = [...first.events, ...second.events];

    expect(allEvents.filter((event) => event.type === 'obstacle-passed')).toHaveLength(1);
    expect(allEvents.filter((event) => event.type === 'near-miss')).toHaveLength(1);
    expect(allEvents.filter((event) => event.type === 'score-awarded' && event.kind === 'obstacle-pass')).toHaveLength(1);
    expect(allEvents.filter((event) => event.type === 'score-awarded' && event.kind === 'near-miss')).toHaveLength(1);
    expect(second.state.score.total).toBe(175);
  });

  it('offers every mutation from the five-form shuffle bag within three forks', () => {
    let state: GameState = createInitialGameState(99, TEST_CONFIG);
    state.world.spawnTimer = 999;
    const seen = new Set<MutationModeId>();

    for (let offerIndex = 0; offerIndex < 3; offerIndex += 1) {
      state.dna.value = TEST_CONFIG.dna.maximum;
      const offered = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
      const offer = offered.state.dna.offer;
      expect(offer).not.toBeNull();
      if (!offer) throw new Error('Expected a mutation offer');
      expect(offer.upper).not.toBe(offer.lower);
      seen.add(offer.upper);
      seen.add(offer.lower);

      const selected = stepSimulation(
        offered.state,
        TEST_CONFIG.fixedStep,
        [{ type: 'select-mutation', lane: 'upper' }],
        TEST_CONFIG,
      );
      state = selected.state;
      state.mode = createInitialModeState(TEST_CONFIG);
      state.player.invulnerableTime = 0;
      state.world.spawnTimer = 999;
    }

    expect(seen).toEqual(new Set<MutationModeId>(['frog', 'rubber', 'steel', 'ghost', 'stork']));
  });

  it('keeps rubber and PIK state serializable and explicit', () => {
    const initial = createInitialGameState(5, TEST_CONFIG);
    const rubber = startMode(initial, 'rubber', TEST_CONFIG).state;
    const stork = startMode(rubber, 'stork', TEST_CONFIG).state;

    expect(rubber.mode.rubber).toMatchObject({ phase: 'idle', aim: { x: 0, y: 0 }, vx: 0 });
    expect(stork.mode.stork).toMatchObject({
      phase: 'idle',
      energy: TEST_CONFIG.modes.stork.maximumEnergy,
      uses: TEST_CONFIG.modes.stork.uses,
      lockedTargetId: null,
      aimBias: 0,
      cooldown: 0,
      phaseTime: 0,
    });
    expect(() => JSON.stringify(stork)).not.toThrow();
  });
});
