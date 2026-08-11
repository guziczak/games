import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '../src/simulation/GameConfig';
import type { GameConfig } from '../src/simulation/GameConfig';
import type { GameEvent } from '../src/simulation/GameEvents';
import { createInitialGameState, createInitialModeState } from '../src/simulation/GameState';
import type { GameState, MutationModeId, ObstacleState } from '../src/simulation/GameState';
import { cloneGameState, Simulation, startMode, stepSimulation } from '../src/simulation/Simulation';

const TEST_CONFIG: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  player: {
    ...DEFAULT_GAME_CONFIG.player,
    gravity: 0,
    flapVelocity: 0,
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
    const completedHalf = halfFrames.step(halfStep);
    const completedWhole = wholeFrame.step(TEST_CONFIG.fixedStep, [{ type: 'flap' }]);
    expect(completedHalf.events).toEqual(completedWhole.events);
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

  it('keeps a frog attached to the moving gate for the full cling window and releases safely', () => {
    const source = startMode(createInitialGameState(17, TEST_CONFIG), 'frog', TEST_CONFIG).state;
    source.player.invulnerableTime = 0;
    source.player.y = 4.7;
    source.world.spawnTimer = 999;
    source.world.obstacles.push(makeObstacle({
      id: 'frog-anchor',
      x: source.player.x,
      gapCenter: 6,
      baseGapCenter: 6,
      gapSize: 2,
    }));

    let state = stepSimulation(source, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG).state;
    expect(state.mode.frog.phase).toBe('clinging');
    const initialOffset = state.mode.frog.clingOffsetX;

    for (let tick = 0; tick < 63; tick += 1) {
      state = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG).state;
      const gate = state.world.obstacles.find((obstacle) => obstacle.id === 'frog-anchor');
      expect(gate).toBeDefined();
      expect(state.mode.frog.phase).toBe('clinging');
      expect(state.player.x - (gate?.x ?? 0)).toBeCloseTo(initialOffset, 8);
      expect(state.player.x).toBeGreaterThan(TEST_CONFIG.player.radiusX);
      expect(state.player.x).toBeLessThan(TEST_CONFIG.world.width - TEST_CONFIG.player.radiusX);
    }

    for (let tick = 0; tick < 6 && state.mode.frog.phase !== 'airborne'; tick += 1) {
      state = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG).state;
    }
    expect(state.mode.frog.phase).toBe('airborne');
    expect(state.mode.frog.clingObstacleId).toBeNull();
    expect(state.player.vy).toBeGreaterThan(0);
    expect(state.player.x).not.toBe(TEST_CONFIG.player.startX);
    expect(state.status).toBe('running');
    const separated = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG).state;
    expect(separated.mode.frog.phase).toBe('airborne');
  });

  it('turns a charged frog release into a playable launch rather than a horizontal teleport', () => {
    const source = startMode(createInitialGameState(18, TEST_CONFIG), 'frog', TEST_CONFIG).state;
    source.player.invulnerableTime = 0;
    source.player.y = 4.7;
    source.world.spawnTimer = 999;
    source.world.obstacles.push(makeObstacle({
      id: 'frog-charge',
      x: source.player.x,
      gapCenter: 6,
      baseGapCenter: 6,
      gapSize: 2,
    }));

    let state = stepSimulation(source, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG).state;
    state = stepSimulation(state, TEST_CONFIG.fixedStep, [{ type: 'ability-start' }], TEST_CONFIG).state;
    for (let tick = 0; tick < 30; tick += 1) {
      state = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG).state;
    }
    const attachedX = state.player.x;
    const released = stepSimulation(
      state,
      TEST_CONFIG.fixedStep,
      [{ type: 'ability-release' }],
      TEST_CONFIG,
    );

    expect(released.state.mode.frog.phase).toBe('airborne');
    expect(released.state.player.vy).toBeGreaterThan(TEST_CONFIG.modes.frog.minLaunchVelocity);
    expect(released.state.player.x).toBeGreaterThan(attachedX);
    expect(released.state.player.x).toBeLessThan(TEST_CONFIG.player.startX);
    expect(released.state.score.style).toBe(TEST_CONFIG.scoring.frogCatapult);
    expect(released.events.some((event) => event.type === 'mode-action' && event.action === 'frog-launch')).toBe(true);
  });

  it('moves a mutation fork through the world and selects each physical lane exactly once', () => {
    const source = createInitialGameState(1234, TEST_CONFIG);
    source.world.spawnTimer = 999;
    source.dna.value = TEST_CONFIG.dna.maximum;
    const created = stepSimulation(source, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
    const offer = created.state.dna.offer;
    expect(offer).not.toBeNull();
    if (!offer) throw new Error('Expected mutation offer');

    const moved = stepSimulation(created.state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
    expect(moved.state.dna.offer?.x).toBeLessThan(offer.x);

    const flyThrough = (y: number): { state: GameState; events: GameEvent[] } => {
      let state = cloneGameState(created.state);
      state.player.y = y;
      const events: GameEvent[] = [];
      for (let tick = 0; tick < 400 && state.dna.offer; tick += 1) {
        const result = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
        state = result.state;
        events.push(...result.events);
      }
      for (let tick = 0; tick < 30; tick += 1) {
        const result = stepSimulation(state, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
        state = result.state;
        events.push(...result.events);
      }
      return { state, events };
    };

    const upper = flyThrough(offer.upperY);
    const lower = flyThrough(offer.lowerY);
    expect(upper.state.mode.active).toBe(offer.upper);
    expect(lower.state.mode.active).toBe(offer.lower);
    expect(upper.events.filter((event) => event.type === 'mutation-selected')).toHaveLength(1);
    expect(lower.events.filter((event) => event.type === 'mutation-selected')).toHaveLength(1);
    expect(upper.state.dna.offer).toBeNull();
    expect(lower.state.dna.offer).toBeNull();
  });

  it('executes real input and collision outcomes for all five forms', () => {
    const freshMode = (mode: MutationModeId): GameState => {
      const state = startMode(createInitialGameState(55, TEST_CONFIG), mode, TEST_CONFIG).state;
      state.player.invulnerableTime = 0;
      state.world.spawnTimer = 999;
      return state;
    };

    const frog = freshMode('frog');
    frog.player.y = 4.7;
    frog.world.obstacles.push(makeObstacle({ id: 'frog-hit', x: frog.player.x, gapCenter: 6, baseGapCenter: 6, gapSize: 2 }));
    const frogHit = stepSimulation(frog, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
    expect(frogHit.state.mode.frog.phase).toBe('clinging');
    expect(frogHit.events.some((event) => event.type === 'collision' && event.outcome === 'cling')).toBe(true);

    let rubber = freshMode('rubber');
    rubber = stepSimulation(rubber, TEST_CONFIG.fixedStep, [
      { type: 'ability-start' },
      { type: 'ability-aim', vector: { x: 0, y: 1 } },
    ], TEST_CONFIG).state;
    expect(rubber.mode.rubber.phase).toBe('aiming');
    rubber.world.obstacles.push(makeObstacle({ id: 'rubber-hit', x: rubber.player.x, gapCenter: 7, baseGapCenter: 7, gapSize: 2 }));
    const rubberHit = stepSimulation(rubber, TEST_CONFIG.fixedStep, [{ type: 'ability-release' }], TEST_CONFIG);
    expect(rubberHit.state.status).toBe('running');
    expect(rubberHit.state.mode.rubber.phase).toBe('flying');
    expect(rubberHit.events.some((event) => event.type === 'collision' && event.outcome === 'bounce')).toBe(true);
    expect(rubberHit.events.some((event) => event.type === 'mode-action' && event.action === 'rubber-launch')).toBe(true);

    const steel = freshMode('steel');
    steel.player.y = 4.7;
    steel.world.obstacles.push(makeObstacle({ id: 'steel-hit', x: steel.player.x, gapCenter: 7, baseGapCenter: 7, gapSize: 2 }));
    const steelHit = stepSimulation(steel, TEST_CONFIG.fixedStep, [{ type: 'flap' }], TEST_CONFIG);
    expect(steelHit.state.world.obstacles[0]?.destroyed).toBe(true);
    expect(steelHit.events.some((event) => event.type === 'collision' && event.outcome === 'destroy')).toBe(true);
    expect(steelHit.events.some((event) => event.type === 'flap' && event.mode === 'steel')).toBe(true);

    const ghost = freshMode('ghost');
    ghost.player.y = 4.7;
    ghost.world.obstacles.push(makeObstacle({ id: 'ghost-hit', x: ghost.player.x, gapCenter: 7, baseGapCenter: 7, gapSize: 2 }));
    const ghostHit = stepSimulation(ghost, TEST_CONFIG.fixedStep, [{ type: 'ability-start' }], TEST_CONFIG);
    expect(ghostHit.state.status).toBe('running');
    expect(ghostHit.state.mode.ghost.phase).toBe('phasing');
    expect(ghostHit.events.some((event) => event.type === 'collision' && event.outcome === 'phase')).toBe(true);

    let stork = freshMode('stork');
    stork.player.y = 4.7;
    stork.world.obstacles.push(makeObstacle({ id: 'stork-hit', x: 5.6, gapCenter: 7, baseGapCenter: 7, gapSize: 2 }));
    const lock = stepSimulation(stork, TEST_CONFIG.fixedStep, [{ type: 'ability-start' }], TEST_CONFIG);
    expect(lock.state.mode.stork.phase).toBe('aiming');
    expect(lock.state.mode.stork.lockedTargetId).toBe('stork-hit');
    stork = stepSimulation(lock.state, TEST_CONFIG.fixedStep, [
      { type: 'ability-aim', vector: { x: 0, y: -1 } },
      { type: 'ability-release' },
    ], TEST_CONFIG).state;
    const storkEvents: GameEvent[] = [];
    for (let tick = 0; tick < 40; tick += 1) {
      const result = stepSimulation(stork, TEST_CONFIG.fixedStep, undefined, TEST_CONFIG);
      stork = result.state;
      storkEvents.push(...result.events);
    }
    expect(stork.status).toBe('running');
    expect(stork.world.obstacles[0]?.storkVaultAwarded).toBe(true);
    expect(storkEvents.some((event) => event.type === 'collision' && event.outcome === 'vault')).toBe(true);
    expect(storkEvents.some((event) => event.type === 'score-awarded' && event.kind === 'stork-vault')).toBe(true);
  });

  it('keeps world cleanup bounded and reproduces the same run after fifty resets', () => {
    const resetConfig: GameConfig = {
      ...TEST_CONFIG,
      obstacle: { ...TEST_CONFIG.obstacle, coinChance: 1 },
      dna: {
        ...TEST_CONFIG.dna,
        initial: 0,
        maximum: 1_000_000,
        obstaclePass: 0,
        coin: 0,
        nearMiss: 0,
        maneuver: 0,
      },
    };
    const simulation = new Simulation({ seed: 8080, config: resetConfig });
    let referenceState: GameState | null = null;
    let referenceEvents: GameEvent[] | null = null;

    for (let run = 0; run < 50; run += 1) {
      if (run > 0) {
        const reset = simulation.reset(8080);
        expect(reset.world.obstacles).toHaveLength(0);
        expect(reset.world.coins).toHaveLength(0);
        expect(reset.clock).toEqual({ elapsed: 0, accumulator: 0, tick: 0 });
      }
      const events: GameEvent[] = [];
      for (let tick = 0; tick < 1_200; tick += 1) {
        events.push(...simulation.step(resetConfig.fixedStep).events);
      }
      const snapshot = simulation.snapshot();
      expect(snapshot.status).toBe('running');
      expect(snapshot.world.obstacles.length).toBeLessThanOrEqual(10);
      expect(snapshot.world.coins.length).toBeLessThanOrEqual(30);
      if (!referenceState || !referenceEvents) {
        referenceState = snapshot;
        referenceEvents = events;
      } else {
        expect(snapshot).toEqual(referenceState);
        expect(events).toEqual(referenceEvents);
      }
    }
  });
});
