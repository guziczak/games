import { DEFAULT_GAME_CONFIG, getDifficultyTier } from './GameConfig';
import type { GameConfig } from './GameConfig';
import type { GameEvent, ModeAction, ScoreKind } from './GameEvents';
import { createInitialGameState, createInitialModeState } from './GameState';
import type {
  GameState,
  ModeId,
  MutationModeId,
  ObstacleState,
} from './GameState';
import { normalizeSimulationInput } from './InputActions';
import type { InputAction, SimulationInput } from './InputActions';
import { nextRandom, randomRange, shuffleSeeded } from './SeededRandom';

export interface SimulationStep {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export interface SimulationOptions {
  readonly seed?: number;
  readonly config?: GameConfig;
  readonly state?: GameState;
}

export interface ModeDefinition {
  readonly id: ModeId;
  readonly duration: number;
  readonly inputPolicy: 'flap' | 'cling-charge' | 'slingshot' | 'flap-and-phase' | 'flap-and-pik';
  readonly collisionPolicy: 'fatal' | 'cling' | 'bounce' | 'destroy' | 'phase' | 'vault';
}

const MUTATION_MODES: readonly MutationModeId[] = Object.freeze([
  'frog',
  'rubber',
  'steel',
  'ghost',
  'stork',
]);

export function createModeDefinitions(
  config: GameConfig = DEFAULT_GAME_CONFIG,
): Readonly<Record<ModeId, ModeDefinition>> {
  return Object.freeze({
    normal: Object.freeze({ id: 'normal', duration: 0, inputPolicy: 'flap', collisionPolicy: 'fatal' }),
    frog: Object.freeze({ id: 'frog', duration: config.modes.frog.duration, inputPolicy: 'cling-charge', collisionPolicy: 'cling' }),
    rubber: Object.freeze({ id: 'rubber', duration: config.modes.rubber.duration, inputPolicy: 'slingshot', collisionPolicy: 'bounce' }),
    steel: Object.freeze({ id: 'steel', duration: config.modes.steel.duration, inputPolicy: 'flap', collisionPolicy: 'destroy' }),
    ghost: Object.freeze({ id: 'ghost', duration: config.modes.ghost.duration, inputPolicy: 'flap-and-phase', collisionPolicy: 'phase' }),
    stork: Object.freeze({ id: 'stork', duration: config.modes.stork.duration, inputPolicy: 'flap-and-pik', collisionPolicy: 'vault' }),
  });
}

export const MODE_DEFINITIONS = createModeDefinitions();

function cloneAction(action: InputAction): InputAction {
  return action.type === 'ability-aim'
    ? { type: 'ability-aim', vector: { x: action.vector.x, y: action.vector.y } }
    : { ...action };
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    clock: { ...state.clock },
    player: {
      ...state.player,
      collisionGraceEntityIds: [...state.player.collisionGraceEntityIds],
      frogReleaseGraceEntityIds: [...state.player.frogReleaseGraceEntityIds],
    },
    world: {
      ...state.world,
      obstacles: state.world.obstacles.map((obstacle) => ({ ...obstacle })),
      coins: state.world.coins.map((coin) => ({ ...coin })),
    },
    score: { ...state.score },
    combo: { ...state.combo },
    dna: {
      ...state.dna,
      offerBag: [...state.dna.offerBag],
      offer: state.dna.offer ? { ...state.dna.offer } : null,
      lastOffered: [...state.dna.lastOffered],
    },
    mode: {
      ...state.mode,
      frog: { ...state.mode.frog },
      rubber: {
        ...state.mode.rubber,
        aim: { ...state.mode.rubber.aim },
      },
      steel: { ...state.mode.steel },
      ghost: { ...state.mode.ghost },
      stork: { ...state.mode.stork },
    },
    pendingInput: state.pendingInput.map(cloneAction),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothStep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function stamp(state: GameState): { tick: number; time: number } {
  return { tick: state.clock.tick, time: state.clock.elapsed };
}

function allocateId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.world.nextEntityId}`;
  state.world.nextEntityId += 1;
  return id;
}

function sample(state: GameState): number {
  const result = nextRandom(state.rngState);
  state.rngState = result.state;
  return result.value;
}

function sampleRange(state: GameState, minimum: number, maximum: number): number {
  const result = randomRange(state.rngState, minimum, maximum);
  state.rngState = result.state;
  return result.value;
}

function recalculateTotal(state: GameState): void {
  state.score.total = state.score.base + state.score.style;
}

function hasCollisionGrace(state: GameState, entityId: string): boolean {
  return state.player.collisionGraceEntityIds.includes(entityId);
}

function grantCollisionGrace(state: GameState, entityId: string): void {
  if (!hasCollisionGrace(state, entityId)) state.player.collisionGraceEntityIds.push(entityId);
}

function revokeCollisionGrace(state: GameState, entityId: string): void {
  const index = state.player.collisionGraceEntityIds.indexOf(entityId);
  if (index >= 0) state.player.collisionGraceEntityIds.splice(index, 1);
  const frogIndex = state.player.frogReleaseGraceEntityIds.indexOf(entityId);
  if (frogIndex >= 0) state.player.frogReleaseGraceEntityIds.splice(frogIndex, 1);
}

function grantFrogReleaseGrace(state: GameState, entityId: string): void {
  if (entityId.startsWith('boundary-')) return;
  grantCollisionGrace(state, entityId);
  if (!state.player.frogReleaseGraceEntityIds.includes(entityId)) {
    state.player.frogReleaseGraceEntityIds.push(entityId);
  }
}

function awardBase(
  state: GameState,
  events: GameEvent[],
  kind: ScoreKind,
  entityId: string,
  points: number,
): void {
  state.score.base += points;
  recalculateTotal(state);
  events.push({
    ...stamp(state),
    type: 'score-awarded',
    kind,
    entityId,
    basePoints: points,
    awardedPoints: points,
    multiplier: 1,
  });
}

function comboMultiplier(links: number, config: GameConfig): number {
  let multiplier = 1;
  for (const tier of config.combo.tiers) {
    if (links < tier.minimumLinks) break;
    multiplier = tier.multiplier;
  }
  return multiplier;
}

function addComboLink(state: GameState, events: GameEvent[], config: GameConfig): number {
  const continuing = state.combo.links > 0 && state.clock.elapsed <= state.combo.expiresAt;
  state.combo.links = continuing ? state.combo.links + 1 : 1;
  state.combo.expiresAt = state.clock.elapsed + config.combo.window;
  state.combo.multiplier = comboMultiplier(state.combo.links, config);
  state.combo.bestLinks = Math.max(state.combo.bestLinks, state.combo.links);
  state.combo.bestMultiplier = Math.max(state.combo.bestMultiplier, state.combo.multiplier);
  events.push({
    ...stamp(state),
    type: 'combo-changed',
    links: state.combo.links,
    multiplier: state.combo.multiplier,
  });
  return state.combo.multiplier;
}

function awardStyle(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
  kind: ScoreKind,
  entityId: string,
  basePoints: number,
): void {
  const multiplier = addComboLink(state, events, config);
  const awardedPoints = Math.round(basePoints * multiplier);
  state.score.style += awardedPoints;
  recalculateTotal(state);
  events.push({
    ...stamp(state),
    type: 'score-awarded',
    kind,
    entityId,
    basePoints,
    awardedPoints,
    multiplier,
  });
}

function updateComboExpiry(state: GameState, events: GameEvent[]): void {
  if (state.combo.links === 0 || state.clock.elapsed <= state.combo.expiresAt) return;
  state.combo.links = 0;
  state.combo.multiplier = 1;
  state.combo.expiresAt = 0;
  events.push({ ...stamp(state), type: 'combo-expired' });
}

function gainDna(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
  rawDelta: number,
): void {
  if (rawDelta <= 0 || state.dna.offer) return;
  const inMode = state.mode.active !== 'normal';
  const multiplier = inMode ? config.dna.activeModeGainMultiplier : 1;
  const cap = inMode ? config.dna.activeModeCap : config.dna.maximum;
  const previous = state.dna.value;
  state.dna.value = clamp(previous + rawDelta * multiplier, 0, cap);
  const delta = state.dna.value - previous;
  if (delta > 0) {
    events.push({ ...stamp(state), type: 'dna-changed', value: state.dna.value, delta });
  }
}

function refillOfferBag(state: GameState): void {
  const shuffled = shuffleSeeded(state.rngState, MUTATION_MODES);
  state.rngState = shuffled.state;
  const additions = shuffled.values;
  const tail = state.dna.offerBag[state.dna.offerBag.length - 1];
  if (tail && additions[0] === tail && additions.length > 1) {
    const first = additions[0] as MutationModeId;
    additions[0] = additions[1] as MutationModeId;
    additions[1] = first;
  }
  state.dna.offerBag.push(...additions);
}

function createMutationOffer(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
): void {
  if (state.dna.offer || state.mode.active !== 'normal' || state.dna.value < config.dna.maximum) return;
  while (state.dna.offerBag.length < 2) refillOfferBag(state);
  const upper = state.dna.offerBag.shift();
  const lower = state.dna.offerBag.shift();
  if (!upper || !lower) throw new Error('Mutation offer bag could not provide two modes');

  const offer = {
    id: allocateId(state, 'offer'),
    x: config.world.width + config.dna.offerSpawnLead,
    upperY: config.dna.offerUpperY,
    lowerY: config.dna.offerLowerY,
    upper,
    lower,
  };
  state.dna.offer = offer;
  state.dna.lastOffered = [upper, lower];
  state.dna.offersCreated += 1;
  state.world.spawnTimer = Math.max(state.world.spawnTimer, 2.5);
  events.push({
    ...stamp(state),
    type: 'mutation-offered',
    offerId: offer.id,
    upper,
    lower,
  });
}

function modeDuration(mode: MutationModeId, config: GameConfig): number {
  return config.modes[mode].duration;
}

function emitModeAction(
  state: GameState,
  events: GameEvent[],
  mode: MutationModeId,
  action: ModeAction,
  entityId?: string,
): void {
  events.push({ ...stamp(state), type: 'mode-action', mode, action, ...(entityId ? { entityId } : {}) });
}

function resetModeRuntime(state: GameState, config: GameConfig): void {
  state.mode = createInitialModeState(config);
}

function exitModeMutable(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
  reason: 'timer' | 'overheat' | 'replaced',
): void {
  const current = state.mode.active;
  if (current === 'normal') return;

  if (current === 'ghost' && state.mode.ghost.phase === 'phasing') {
    stopGhostPhase(state, events, config);
  }
  if (current === 'frog') {
    const surfaceId = state.mode.frog.releasedObstacleId ?? state.mode.frog.clingObstacleId;
    if (surfaceId) grantFrogReleaseGrace(state, surfaceId);
  }
  if (current === 'steel'
    && reason === 'timer'
    && state.mode.steel.heat >= config.modes.steel.criticalHeat
    && state.mode.steel.heat < config.modes.steel.maximumHeat) {
    const temperId = `steel-temper-${state.clock.tick}`;
    emitModeAction(state, events, 'steel', 'steel-temper', temperId);
    awardStyle(state, events, config, 'steel-temper', temperId, config.scoring.steelTemper);
  }
  events.push({ ...stamp(state), type: 'mode-exited', mode: current, reason });
  const grace = current === 'ghost'
    ? config.modes.ghost.materializeGrace
    : reason === 'overheat'
      ? config.modes.steel.overheatGrace
      : 0.15;
  state.player.invulnerableTime = Math.max(state.player.invulnerableTime, grace);
  state.player.floorRecoveryAvailable = false;
  resetModeRuntime(state, config);
}

function enterModeMutable(
  state: GameState,
  events: GameEvent[],
  mode: MutationModeId,
  config: GameConfig,
): void {
  if (state.mode.active !== 'normal') exitModeMutable(state, events, config, 'replaced');
  const clean = createInitialModeState(config);
  clean.active = mode;
  clean.remaining = modeDuration(mode, config);
  state.mode = clean;
  state.player.floorRecoveryAvailable = mode === 'stork';
  state.player.vx = 0;
  state.player.invulnerableTime = Math.max(state.player.invulnerableTime, 0.25);
  events.push({
    ...stamp(state),
    type: 'mode-entered',
    mode,
    duration: state.mode.remaining,
  });
}

export function startMode(
  source: GameState,
  mode: MutationModeId,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): SimulationStep {
  const state = cloneGameState(source);
  const events: GameEvent[] = [];
  enterModeMutable(state, events, mode, config);
  return { state, events };
}

function selectMutation(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
  lane: 'upper' | 'lower',
): void {
  const offer = state.dna.offer;
  if (!offer) return;
  const mode = lane === 'upper' ? offer.upper : offer.lower;
  events.push({ ...stamp(state), type: 'mutation-selected', offerId: offer.id, mode, lane });
  state.dna.offer = null;
  const previousDna = state.dna.value;
  state.dna.value = 0;
  events.push({ ...stamp(state), type: 'dna-changed', value: 0, delta: -previousDna });
  enterModeMutable(state, events, mode, config);
}

function nearestStorkTarget(state: GameState, config: GameConfig): ObstacleState | null {
  const speed = getDifficultyTier(state.world.passedObstacles, config).speed;
  const maximumDistance = speed * config.modes.stork.lockLeadTime + config.obstacle.width;
  let nearest: ObstacleState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const obstacle of state.world.obstacles) {
    if (obstacle.destroyed || obstacle.passed) continue;
    const distance = obstacle.x - state.player.x;
    if (distance < 0 || distance > maximumDistance || distance >= nearestDistance) continue;
    nearest = obstacle;
    nearestDistance = distance;
  }
  return nearest;
}

function updateStorkVaultTarget(state: GameState, config: GameConfig): void {
  const stork = state.mode.stork;
  const target = stork.lockedTargetId
    ? state.world.obstacles.find((obstacle) => obstacle.id === stork.lockedTargetId)
    : undefined;
  if (!target) return;
  const safeHalfGap = Math.max(0, target.gapSize / 2 - config.player.radiusY - 0.08);
  stork.vaultTargetY = clamp(
    target.gapCenter + stork.aimBias * safeHalfGap,
    config.player.radiusY,
    config.world.height - config.player.radiusY,
  );
}

function startStorkAim(state: GameState, events: GameEvent[], config: GameConfig): void {
  const stork = state.mode.stork;
  if (stork.phase !== 'idle' || stork.cooldown > 0 || stork.uses <= 0 || stork.energy < config.modes.stork.useEnergy) return;
  const target = nearestStorkTarget(state, config);
  if (!target) return;
  stork.phase = 'aiming';
  stork.phaseTime = 0;
  stork.lockedTargetId = target.id;
  stork.vaultStartY = state.player.y;
  updateStorkVaultTarget(state, config);
  emitModeAction(state, events, 'stork', 'stork-lock', target.id);
}

function releaseStorkVault(state: GameState, events: GameEvent[], config: GameConfig): void {
  const stork = state.mode.stork;
  // Releasing a pointer after an automatic/late commit is a normal input
  // sequence on touch screens. Once the vault has started, later release
  // edges must not cancel the committed move or detach it from its target.
  if (stork.phase !== 'aiming') return;
  if (!stork.lockedTargetId) {
    stork.phase = 'idle';
    stork.lockedTargetId = null;
    stork.phaseTime = 0;
    return;
  }
  const target = state.world.obstacles.find((obstacle) => obstacle.id === stork.lockedTargetId);
  if (!target || target.destroyed || target.passed) {
    stork.phase = 'idle';
    stork.lockedTargetId = null;
    stork.phaseTime = 0;
    return;
  }
  stork.phase = 'vaulting';
  stork.phaseTime = 0;
  stork.floorContactLatched = false;
  stork.vaultStartY = state.player.y;
  updateStorkVaultTarget(state, config);
  stork.uses -= 1;
  stork.energy = Math.max(0, stork.energy - config.modes.stork.useEnergy);
  target.storkVaultCommitted = true;
  grantCollisionGrace(state, target.id);
  emitModeAction(state, events, 'stork', 'stork-vault-start', target.id);
}

function launchRubber(state: GameState, events: GameEvent[], config: GameConfig): void {
  const rubber = state.mode.rubber;
  if (rubber.phase !== 'aiming') return;
  const magnitude = clamp(Math.hypot(rubber.aim.x, rubber.aim.y), 0, 1);
  if (magnitude < 0.05) {
    // A quick tap must remain useful on a phone. It is a small elastic hop,
    // while an actual drag keeps the full two-dimensional slingshot.
    rubber.phase = 'flying';
    rubber.aim = { x: 0, y: 0 };
    rubber.aimTime = 0;
    rubber.phaseTime = 0;
    rubber.vx = 0;
    state.player.vx = 0;
    state.player.vy = config.player.flapVelocity;
    events.push({ ...stamp(state), type: 'flap', mode: 'rubber' });
    emitModeAction(state, events, 'rubber', 'rubber-launch');
    return;
  }
  const speed = config.modes.rubber.minLaunchSpeed
    + (config.modes.rubber.maxLaunchSpeed - config.modes.rubber.minLaunchSpeed) * magnitude;
  const unitX = rubber.aim.x / magnitude;
  const unitY = rubber.aim.y / magnitude;
  rubber.phase = 'flying';
  rubber.phaseTime = 0;
  rubber.aimTime = 0;
  rubber.vx = -unitX * speed;
  state.player.vx = rubber.vx;
  state.player.vy = -unitY * speed;
  emitModeAction(state, events, 'rubber', 'rubber-launch');
}

function launchFrog(state: GameState, events: GameEvent[], config: GameConfig): void {
  const frog = state.mode.frog;
  if (frog.phase !== 'clinging' && frog.phase !== 'charging') return;
  const amount = clamp(frog.charge / config.modes.frog.maxCharge, 0, 1);
  const speed = config.modes.frog.minLaunchVelocity
    + (config.modes.frog.maxLaunchVelocity - config.modes.frog.minLaunchVelocity) * amount;
  const obstacleId = frog.clingObstacleId;
  const normalX = frog.surfaceNormalX;
  const normalY = frog.surfaceNormalY;
  const liftBias = normalY === 0
    ? config.player.flapVelocity * 0.75
    : config.player.flapVelocity * 0.25;
  state.player.vx = normalX * speed;
  state.player.vy = clamp(
    normalY * speed + liftBias,
    config.player.minVelocityY,
    config.player.maxVelocityY,
  );
  frog.phase = 'airborne';
  frog.releasedObstacleId = obstacleId;
  frog.clingObstacleId = null;
  frog.clingOffsetX = 0;
  frog.surfaceNormalX = 0;
  frog.surfaceNormalY = 0;
  frog.charge = 0;
  frog.phaseTime = 0;
  emitModeAction(state, events, 'frog', 'frog-launch', obstacleId ?? undefined);

  if (obstacleId) {
    const obstacle = state.world.obstacles.find((candidate) => candidate.id === obstacleId);
    if (obstacle && !obstacle.frogCatapultAwarded) {
      obstacle.frogCatapultAwarded = true;
      awardStyle(state, events, config, 'frog-catapult', obstacle.id, config.scoring.frogCatapult);
      gainDna(state, events, config, config.dna.maneuver);
    }
  }
}

function stopGhostPhase(state: GameState, events: GameEvent[], config: GameConfig): void {
  if (state.mode.ghost.phase !== 'phasing') return;
  state.mode.ghost.phase = 'material';
  state.mode.ghost.phaseTime = 0;
  const overlappingObstacles = state.world.obstacles.filter(
    (obstacle) => !obstacle.destroyed && playerOverlapsObstacle(state, obstacle, config),
  );
  if (overlappingObstacles.length > 0) {
    for (const obstacle of overlappingObstacles) grantCollisionGrace(state, obstacle.id);
    state.player.invulnerableTime = Math.max(
      state.player.invulnerableTime,
      config.modes.ghost.materializeGrace,
    );
  }
  emitModeAction(state, events, 'ghost', 'ghost-phase-end');
}

function processInput(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
  actions: readonly InputAction[],
): void {
  for (const action of actions) {
    if (state.status !== 'running') return;
    if (action.type === 'select-mutation') {
      selectMutation(state, events, config, action.lane);
      continue;
    }

    const activeMode = state.mode.active;
    if (action.type === 'flap') {
      if (activeMode === 'frog' && (state.mode.frog.phase === 'clinging' || state.mode.frog.phase === 'charging')) {
        launchFrog(state, events, config);
      } else if (activeMode !== 'rubber' || state.mode.rubber.phase !== 'aiming') {
        if (activeMode === 'stork') state.mode.stork.floorContactLatched = false;
        state.player.vy = config.player.flapVelocity;
        events.push({ ...stamp(state), type: 'flap', mode: activeMode });
      }
      continue;
    }

    if (action.type === 'ability-start') {
      if (activeMode === 'frog' && state.mode.frog.phase === 'clinging') {
        state.mode.frog.phase = 'charging';
        state.mode.frog.charge = 0;
      } else if (activeMode === 'rubber' && state.mode.rubber.phase !== 'aiming') {
        state.mode.rubber.phase = 'aiming';
        state.mode.rubber.aim = { x: 0, y: 0 };
        state.mode.rubber.aimTime = 0;
        state.mode.rubber.phaseTime = 0;
        state.player.vx = 0;
        state.player.vy = 0;
        emitModeAction(state, events, 'rubber', 'rubber-aim');
      } else if (activeMode === 'ghost'
        && state.mode.ghost.phase === 'material'
        && state.mode.ghost.energy >= config.modes.ghost.minimumPhaseEnergy) {
        state.mode.ghost.phase = 'phasing';
        state.mode.ghost.phaseTime = 0;
        emitModeAction(state, events, 'ghost', 'ghost-phase-start');
      } else if (activeMode === 'stork') {
        startStorkAim(state, events, config);
      }
      continue;
    }

    if (action.type === 'ability-aim') {
      if (activeMode === 'rubber' && state.mode.rubber.phase === 'aiming') {
        const length = Math.hypot(action.vector.x, action.vector.y);
        const scale = length > 1 ? 1 / length : 1;
        state.mode.rubber.aim = {
          x: action.vector.x * scale,
          y: action.vector.y * scale,
        };
      } else if (activeMode === 'stork' && state.mode.stork.phase === 'aiming') {
        state.mode.stork.aimBias = clamp(action.vector.y, -1, 1);
        updateStorkVaultTarget(state, config);
      }
      continue;
    }

    if (action.type === 'ability-release') {
      if (activeMode === 'frog') launchFrog(state, events, config);
      else if (activeMode === 'rubber') launchRubber(state, events, config);
      else if (activeMode === 'ghost') stopGhostPhase(state, events, config);
      else if (activeMode === 'stork') releaseStorkVault(state, events, config);
      continue;
    }

    if (action.type === 'ability-cancel') {
      if (activeMode === 'frog' && state.mode.frog.phase === 'charging') {
        state.mode.frog.phase = 'clinging';
        state.mode.frog.charge = 0;
      } else if (activeMode === 'rubber' && state.mode.rubber.phase === 'aiming') {
        state.mode.rubber.phase = 'idle';
        state.mode.rubber.aim = { x: 0, y: 0 };
        state.mode.rubber.aimTime = 0;
      } else if (activeMode === 'ghost') {
        stopGhostPhase(state, events, config);
      } else if (activeMode === 'stork' && state.mode.stork.phase === 'aiming') {
        state.mode.stork.phase = 'idle';
        state.mode.stork.lockedTargetId = null;
        state.mode.stork.phaseTime = 0;
      }
    }
  }
}

function updateActiveMode(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
  dt: number,
): void {
  const active = state.mode.active;
  if (active === 'normal') return;
  state.mode.remaining = Math.max(0, state.mode.remaining - dt);

  if (active === 'frog') {
    const frog = state.mode.frog;
    frog.phaseTime += dt;
    if (frog.phase === 'charging') frog.charge = Math.min(config.modes.frog.maxCharge, frog.charge + dt);
    if ((frog.phase === 'clinging' || frog.phase === 'charging') && frog.phaseTime >= config.modes.frog.maxClingTime) {
      launchFrog(state, events, config);
    }
  } else if (active === 'rubber') {
    const rubber = state.mode.rubber;
    rubber.phaseTime += dt;
    rubber.vx = state.player.vx;
    if (rubber.phase === 'aiming') {
      rubber.aimTime += dt;
      if (rubber.aimTime >= config.modes.rubber.maxAimTime) launchRubber(state, events, config);
    }
  } else if (active === 'steel') {
    const steel = state.mode.steel;
    steel.timeSinceImpact += dt;
    if (steel.timeSinceImpact >= config.modes.steel.coolingDelay && steel.heat > 0) {
      steel.heat = Math.max(0, steel.heat - config.modes.steel.passiveCooling * dt);
    }
    refreshSteelCriticalState(state, events, config);
  } else if (active === 'ghost') {
    const ghost = state.mode.ghost;
    ghost.phaseTime += dt;
    if (ghost.phase === 'phasing') {
      ghost.energy = Math.max(0, ghost.energy - config.modes.ghost.phaseDrain * dt);
      if (ghost.energy <= 0) stopGhostPhase(state, events, config);
    } else {
      ghost.energy = Math.min(config.modes.ghost.maximumEnergy, ghost.energy + config.modes.ghost.recharge * dt);
    }
  } else if (active === 'stork') {
    const stork = state.mode.stork;
    stork.cooldown = Math.max(0, stork.cooldown - dt);
    stork.phaseTime += dt;
    if (stork.phase === 'aiming') {
      updateStorkVaultTarget(state, config);
      if (stork.phaseTime >= config.modes.stork.maximumAimTime) {
        releaseStorkVault(state, events, config);
      }
    } else if (stork.phase === 'vaulting') {
      const progress = smoothStep(stork.phaseTime / config.modes.stork.vaultDuration);
      state.player.y = stork.vaultStartY + (stork.vaultTargetY - stork.vaultStartY) * progress;
      state.player.vy = 0;
      if (stork.phaseTime >= config.modes.stork.vaultDuration) {
        const targetId = stork.lockedTargetId;
        emitModeAction(state, events, 'stork', 'stork-vault-end', targetId ?? undefined);
        stork.phase = 'idle';
        stork.phaseTime = 0;
        stork.cooldown = config.modes.stork.cooldown;
        stork.lockedTargetId = null;
      }
    }
  }

  if (state.mode.remaining <= 0) {
    if (active === 'ghost' && state.mode.ghost.phase === 'phasing') {
      stopGhostPhase(state, events, config);
    }
    const committedActionStillRunning = (active === 'frog'
      && (state.mode.frog.phase === 'clinging' || state.mode.frog.phase === 'charging'))
      || (active === 'rubber' && state.mode.rubber.phase === 'aiming')
      || (active === 'stork'
        && (state.mode.stork.phase === 'aiming' || state.mode.stork.phase === 'vaulting'));
    if (!committedActionStillRunning) exitModeMutable(state, events, config, 'timer');
  }
}

function worldTimeScale(state: GameState, config: GameConfig): number {
  if (state.mode.active === 'frog'
    && (state.mode.frog.phase === 'clinging' || state.mode.frog.phase === 'charging')) {
    return config.modes.frog.worldScaleWhileClinging;
  }
  if (state.mode.active === 'rubber' && state.mode.rubber.phase === 'aiming') {
    return config.modes.rubber.worldScaleWhileAiming;
  }
  if (state.mode.active === 'stork' && state.mode.stork.phase === 'aiming') {
    return config.modes.stork.aimWorldScale;
  }
  return 1;
}

function updatePlayerPhysics(state: GameState, config: GameConfig, dt: number): void {
  const frogAnchored = state.mode.active === 'frog'
    && (state.mode.frog.phase === 'clinging' || state.mode.frog.phase === 'charging');
  const rubberAiming = state.mode.active === 'rubber' && state.mode.rubber.phase === 'aiming';
  const storkVaulting = state.mode.active === 'stork' && state.mode.stork.phase === 'vaulting';
  if (frogAnchored || rubberAiming || storkVaulting) return;

  const gravityMultiplier = state.mode.active === 'steel' ? config.modes.steel.gravityMultiplier : 1;
  state.player.vy = clamp(
    state.player.vy + config.player.gravity * gravityMultiplier * dt,
    config.player.minVelocityY,
    config.player.maxVelocityY,
  );
  state.player.y += state.player.vy * dt;

  if (state.mode.active === 'rubber' && state.mode.rubber.phase === 'flying') {
    state.player.x += state.player.vx * dt;
    state.mode.rubber.vx = state.player.vx;
  } else {
    const distanceToRail = config.player.startX - state.player.x;
    if (Math.abs(distanceToRail) <= 0.002 && Math.abs(state.player.vx) <= 0.02) {
      state.player.x = config.player.startX;
      state.player.vx = 0;
    } else {
      const targetVelocity = clamp(
        distanceToRail * config.player.horizontalRecovery,
        -config.player.maxHorizontalRecoverySpeed,
        config.player.maxHorizontalRecoverySpeed,
      );
      const recoveryBlend = 1 - Math.exp(-config.player.horizontalRecovery * dt);
      state.player.vx += (targetVelocity - state.player.vx) * recoveryBlend;
      const maximumVelocity = state.mode.active === 'frog'
        ? config.modes.frog.maxLaunchVelocity
        : config.player.maxHorizontalRecoverySpeed;
      state.player.vx = clamp(state.player.vx, -maximumVelocity, maximumVelocity);
      const previousDistance = distanceToRail;
      state.player.x += state.player.vx * dt;
      const nextDistance = config.player.startX - state.player.x;
      if (previousDistance !== 0
        && Math.sign(previousDistance) !== Math.sign(nextDistance)
        && Math.abs(state.player.vx) < 0.5) {
        state.player.x = config.player.startX;
        state.player.vx = 0;
      }
    }
  }
}

function failRun(
  state: GameState,
  events: GameEvent[],
  reason: 'boundary' | 'obstacle',
  entityId?: string,
): void {
  if (state.status === 'dead') return;
  state.status = 'dead';
  state.pendingInput = [];
  events.push({ ...stamp(state), type: 'game-over', reason, ...(entityId ? { entityId } : {}) });
}

function refreshSteelCriticalState(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
): void {
  if (state.mode.active !== 'steel') return;
  const steel = state.mode.steel;
  const isCritical = steel.heat >= config.modes.steel.criticalHeat;
  if (isCritical && !steel.critical) emitModeAction(state, events, 'steel', 'steel-critical');
  steel.critical = isCritical;
}

function triggerSteelOverheat(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
  entityId: string,
): boolean {
  if (state.mode.active !== 'steel' || state.mode.steel.heat < config.modes.steel.maximumHeat) return false;
  state.mode.steel.overheated = true;
  emitModeAction(state, events, 'steel', 'steel-overheat', entityId);
  exitModeMutable(state, events, config, 'overheat');
  return true;
}

function resolveBoundaryCollision(state: GameState, events: GameEvent[], config: GameConfig): void {
  const minimumX = config.player.radiusX;
  const maximumX = config.world.width - config.player.radiusX;
  const left = state.player.x < minimumX;
  const right = state.player.x > maximumX;
  if (left || right) {
    const entityId = left ? 'boundary-left' : 'boundary-right';
    state.player.x = left ? minimumX : maximumX;
    if (state.mode.active === 'rubber') {
      if (state.mode.rubber.phase === 'aiming') {
        state.mode.rubber.phase = 'flying';
        state.mode.rubber.aim = { x: 0, y: 0 };
        state.mode.rubber.aimTime = 0;
        state.mode.rubber.phaseTime = 0;
      }
      state.player.vx = (left ? 1 : -1)
        * Math.abs(state.player.vx)
        * config.modes.rubber.restitution;
      state.mode.rubber.vx = state.player.vx;
      events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'bounce' });
      emitModeAction(state, events, 'rubber', 'rubber-bounce', entityId);
    }
  }

  const minimumY = config.player.radiusY;
  const maximumY = config.world.height - config.player.radiusY;
  const below = state.player.y < minimumY;
  const above = state.player.y > maximumY;
  if (!below && !above) return;
  const entityId = below ? 'boundary-floor' : 'boundary-ceiling';
  const normalY: -1 | 1 = below ? 1 : -1;
  state.player.y = below ? minimumY : maximumY;

  if (state.mode.active === 'frog') {
    const frog = state.mode.frog;
    if (frog.releasedObstacleId === entityId) return;
    frog.phase = 'clinging';
    frog.clingObstacleId = entityId;
    frog.clingOffsetX = 0;
    frog.surfaceNormalX = 0;
    frog.surfaceNormalY = normalY;
    frog.charge = 0;
    frog.phaseTime = 0;
    state.player.vy = 0;
    events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'cling' });
    emitModeAction(state, events, 'frog', 'frog-cling', entityId);
    return;
  }

  if (state.mode.active === 'rubber') {
    if (state.mode.rubber.phase === 'aiming') {
      state.mode.rubber.phase = 'flying';
      state.mode.rubber.aim = { x: 0, y: 0 };
      state.mode.rubber.aimTime = 0;
      state.mode.rubber.phaseTime = 0;
    }
    const normalVelocity = state.player.vy * normalY;
    if (normalVelocity < 0) {
      state.player.vy -= (1 + config.modes.rubber.restitution) * normalVelocity * normalY;
    }
    state.player.vx *= config.modes.rubber.tangentialDamping;
    state.mode.rubber.vx = state.player.vx;
    events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'bounce' });
    emitModeAction(state, events, 'rubber', 'rubber-bounce', entityId);
    return;
  }

  if (state.mode.active === 'steel') {
    const steel = state.mode.steel;
    state.player.vy = normalY * Math.max(2.5, Math.abs(state.player.vy) * 0.45);
    steel.heat = Math.min(config.modes.steel.maximumHeat, steel.heat + config.modes.steel.boundaryHeat);
    steel.timeSinceImpact = 0;
    events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'destroy' });
    refreshSteelCriticalState(state, events, config);
    triggerSteelOverheat(state, events, config, entityId);
    return;
  }

  if (below && state.mode.active === 'stork') {
    if (state.player.floorRecoveryAvailable) {
      state.player.floorRecoveryAvailable = false;
      state.mode.stork.floorContactLatched = true;
      state.player.vy = config.player.floorRecoveryVelocity;
      events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'shielded' });
      return;
    }
    events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'fatal' });
    failRun(state, events, 'boundary', entityId);
    return;
  }

  if (state.player.invulnerableTime > 0 || (state.mode.active === 'ghost' && state.mode.ghost.phase === 'phasing') || (state.mode.active === 'stork' && state.mode.stork.phase === 'vaulting')) {
    state.player.vy = normalY * Math.max(1, Math.abs(state.player.vy) * 0.25);
    events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'shielded' });
    return;
  }

  events.push({ ...stamp(state), type: 'collision', entityId, outcome: 'fatal' });
  failRun(state, events, 'boundary', entityId);
}

function spawnObstacle(state: GameState, events: GameEvent[], config: GameConfig): void {
  const tier = getDifficultyTier(state.world.passedObstacles, config);
  const legalMinimum = Math.max(config.obstacle.minGapCenter, tier.gapSize / 2 + config.player.radiusY + 0.08);
  const legalMaximum = Math.min(config.obstacle.maxGapCenter, config.world.height - tier.gapSize / 2 - config.player.radiusY - 0.08);
  const minimum = Math.max(legalMinimum, state.world.lastGapCenter - config.obstacle.maxCenterDelta);
  const maximum = Math.min(legalMaximum, state.world.lastGapCenter + config.obstacle.maxCenterDelta);
  const gapCenter = sampleRange(state, minimum, maximum);
  const moving = sample(state) < tier.movingChance;
  const obstacle: ObstacleState = {
    id: allocateId(state, 'gate'),
    x: config.world.width + config.obstacle.spawnLead,
    width: config.obstacle.width,
    baseGapCenter: gapCenter,
    gapCenter,
    gapSize: tier.gapSize,
    motionAmplitude: moving ? tier.movingAmplitude : 0,
    motionFrequency: moving ? tier.movingFrequency : 0,
    motionPhase: sampleRange(state, 0, Math.PI * 2),
    passed: false,
    nearMissAwarded: false,
    destroyed: false,
    collisionResolved: false,
    frogCatapultAwarded: false,
    rubberRicochetAwarded: false,
    steelBreakAwarded: false,
    ghostPhaseAwarded: false,
    storkVaultCommitted: false,
    storkVaultAwarded: false,
  };
  state.world.obstacles.push(obstacle);
  state.world.lastGapCenter = gapCenter;
  events.push({ ...stamp(state), type: 'obstacle-spawned', obstacleId: obstacle.id });

  if (sample(state) < config.obstacle.coinChance) {
    const half = (config.obstacle.coinCount - 1) / 2;
    for (let index = 0; index < config.obstacle.coinCount; index += 1) {
      const coin = {
        id: allocateId(state, 'coin'),
        obstacleId: obstacle.id,
        x: obstacle.x - 1.1 + (index - half) * config.obstacle.coinSpacing,
        y: obstacle.gapCenter + Math.sin(index * Math.PI / Math.max(1, config.obstacle.coinCount - 1)) * 0.28,
        radius: config.obstacle.coinRadius,
        collected: false,
      };
      state.world.coins.push(coin);
      events.push({ ...stamp(state), type: 'coin-spawned', coinId: coin.id, obstacleId: obstacle.id });
    }
  }
}

function updateWorld(state: GameState, events: GameEvent[], config: GameConfig, dt: number): void {
  const tier = getDifficultyTier(state.world.passedObstacles, config);
  const scale = worldTimeScale(state, config);
  const worldDt = dt * scale;
  const distance = tier.speed * worldDt;

  for (const obstacle of state.world.obstacles) {
    obstacle.x -= distance;
    if (obstacle.motionAmplitude > 0) {
      const animated = obstacle.baseGapCenter
        + Math.sin(state.clock.elapsed * Math.PI * 2 * obstacle.motionFrequency + obstacle.motionPhase) * obstacle.motionAmplitude;
      const halfGap = obstacle.gapSize / 2;
      obstacle.gapCenter = clamp(animated, halfGap + 0.45, config.world.height - halfGap - 0.45);
    }
  }
  for (const coin of state.world.coins) coin.x -= distance;
  if (state.dna.offer) state.dna.offer.x -= distance;

  if (!state.dna.offer) {
    state.world.spawnTimer -= worldDt;
    while (state.world.spawnTimer <= 0) {
      spawnObstacle(state, events, config);
      state.world.spawnTimer += getDifficultyTier(state.world.passedObstacles, config).spawnInterval;
    }
  }
}

function playerOverlapsObstacle(state: GameState, obstacle: ObstacleState, config: GameConfig): boolean {
  const playerLeft = state.player.x - config.player.radiusX;
  const playerRight = state.player.x + config.player.radiusX;
  const obstacleLeft = obstacle.x - obstacle.width / 2;
  const obstacleRight = obstacle.x + obstacle.width / 2;
  if (playerRight <= obstacleLeft || playerLeft >= obstacleRight) return false;
  const playerBottom = state.player.y - config.player.radiusY;
  const playerTop = state.player.y + config.player.radiusY;
  const gapBottom = obstacle.gapCenter - obstacle.gapSize / 2;
  const gapTop = obstacle.gapCenter + obstacle.gapSize / 2;
  return playerBottom < gapBottom || playerTop > gapTop;
}

/** Keep an attached frog on the same physical point of the scrolling gate. */
function updateFrogAnchorAfterWorld(
  state: GameState,
  events: GameEvent[],
  config: GameConfig,
): void {
  if (state.mode.active !== 'frog') return;
  const frog = state.mode.frog;
  if ((frog.phase !== 'clinging' && frog.phase !== 'charging') || !frog.clingObstacleId) return;
  if (frog.clingObstacleId.startsWith('boundary-')) return;

  const obstacle = state.world.obstacles.find((candidate) => candidate.id === frog.clingObstacleId);
  if (!obstacle || obstacle.destroyed) {
    launchFrog(state, events, config);
    return;
  }

  const desiredX = obstacle.x + frog.clingOffsetX;
  const safeInset = config.player.radiusX + 0.08;
  const minimumX = safeInset;
  const maximumX = config.world.width - safeInset;
  if (desiredX < minimumX || desiredX > maximumX) {
    state.player.x = clamp(desiredX, minimumX, maximumX);
    launchFrog(state, events, config);
    return;
  }

  const previousX = state.player.x;
  state.player.x = desiredX;
  state.player.vx = (desiredX - previousX) / config.fixedStep;
  const gapBottom = obstacle.gapCenter - obstacle.gapSize / 2;
  const gapTop = obstacle.gapCenter + obstacle.gapSize / 2;
  if (frog.surfaceNormalX !== 0
    && state.player.y - config.player.radiusY >= gapBottom
    && state.player.y + config.player.radiusY <= gapTop) {
    launchFrog(state, events, config);
  } else if (frog.surfaceNormalY > 0) {
    state.player.y = gapBottom + config.player.radiusY;
  } else if (frog.surfaceNormalY < 0) {
    state.player.y = gapTop - config.player.radiusY;
  }
}

function clearReleasedFrogSurface(state: GameState, config: GameConfig): void {
  if (state.mode.active !== 'frog' || !state.mode.frog.releasedObstacleId) return;
  const released = state.mode.frog.releasedObstacleId;
  if (released === 'boundary-floor') {
    if (state.player.y - config.player.radiusY > 0.04) state.mode.frog.releasedObstacleId = null;
    return;
  }
  if (released === 'boundary-ceiling') {
    if (state.player.y + config.player.radiusY < config.world.height - 0.04) state.mode.frog.releasedObstacleId = null;
    return;
  }
  const obstacle = state.world.obstacles.find((candidate) => candidate.id === released);
  if (!obstacle || !playerOverlapsObstacle(state, obstacle, config)) state.mode.frog.releasedObstacleId = null;
}

interface ObstacleContact {
  readonly normalX: -1 | 0 | 1;
  readonly normalY: -1 | 0 | 1;
  readonly separatedX: number;
  readonly separatedY: number;
  readonly impactSpeed: number;
  readonly surfaceVelocityX: number;
  readonly surfaceVelocityY: number;
}

function animatedGapCenterAtTime(
  obstacle: ObstacleState,
  config: GameConfig,
  time: number,
): number {
  if (obstacle.motionAmplitude <= 0 || obstacle.motionFrequency <= 0) {
    return obstacle.baseGapCenter;
  }
  const animated = obstacle.baseGapCenter
    + Math.sin(time * Math.PI * 2 * obstacle.motionFrequency + obstacle.motionPhase)
      * obstacle.motionAmplitude;
  const halfGap = obstacle.gapSize / 2;
  return clamp(animated, halfGap + 0.45, config.world.height - halfGap - 0.45);
}

function obstacleSurfaceVelocityY(
  state: GameState,
  obstacle: ObstacleState,
  config: GameConfig,
): number {
  if (obstacle.motionAmplitude <= 0 || obstacle.motionFrequency <= 0) return 0;
  const previousGapCenter = animatedGapCenterAtTime(
    obstacle,
    config,
    Math.max(0, state.clock.elapsed - config.fixedStep),
  );
  return (obstacle.gapCenter - previousGapCenter) / config.fixedStep;
}

function obstacleContact(
  state: GameState,
  obstacle: ObstacleState,
  config: GameConfig,
): ObstacleContact {
  const playerLeft = state.player.x - config.player.radiusX;
  const playerRight = state.player.x + config.player.radiusX;
  const playerBottom = state.player.y - config.player.radiusY;
  const playerTop = state.player.y + config.player.radiusY;
  const obstacleLeft = obstacle.x - obstacle.width / 2;
  const obstacleRight = obstacle.x + obstacle.width / 2;
  const gapBottom = obstacle.gapCenter - obstacle.gapSize / 2;
  const gapTop = obstacle.gapCenter + obstacle.gapSize / 2;
  const fromLeft = state.player.x <= obstacle.x;
  const horizontalPenetration = fromLeft
    ? playerRight - obstacleLeft
    : obstacleRight - playerLeft;
  const lowerCollision = state.player.y < obstacle.gapCenter;
  const verticalPenetration = lowerCollision
    ? gapBottom - playerBottom
    : playerTop - gapTop;
  const surfaceVelocityX = -getDifficultyTier(state.world.passedObstacles, config).speed
    * worldTimeScale(state, config);
  const surfaceVelocityY = obstacleSurfaceVelocityY(state, obstacle, config);

  if (horizontalPenetration <= verticalPenetration) {
    const normalX: -1 | 1 = fromLeft ? -1 : 1;
    return {
      normalX,
      normalY: 0,
      separatedX: fromLeft
        ? obstacleLeft - config.player.radiusX
        : obstacleRight + config.player.radiusX,
      separatedY: state.player.y,
      impactSpeed: Math.max(0, -(state.player.vx - surfaceVelocityX) * normalX),
      surfaceVelocityX,
      surfaceVelocityY,
    };
  }

  const normalY: -1 | 1 = lowerCollision ? 1 : -1;
  return {
    normalX: 0,
    normalY,
    separatedX: state.player.x,
    separatedY: lowerCollision
      ? gapBottom + config.player.radiusY
      : gapTop - config.player.radiusY,
    impactSpeed: Math.max(0, -(state.player.vy - surfaceVelocityY) * normalY),
    surfaceVelocityX,
    surfaceVelocityY,
  };
}

function resolveObstacleCollision(
  state: GameState,
  obstacle: ObstacleState,
  events: GameEvent[],
  config: GameConfig,
): void {
  if (state.mode.active === 'frog') {
    const frog = state.mode.frog;
    if (frog.releasedObstacleId === obstacle.id || frog.clingObstacleId === obstacle.id) return;
    const contact = obstacleContact(state, obstacle, config);
    frog.phase = 'clinging';
    frog.clingObstacleId = obstacle.id;
    frog.surfaceNormalX = contact.normalX;
    frog.surfaceNormalY = contact.normalY;
    frog.charge = 0;
    frog.phaseTime = 0;
    state.player.x = contact.separatedX;
    state.player.y = contact.separatedY;
    frog.clingOffsetX = state.player.x - obstacle.x;
    state.player.vx = 0;
    state.player.vy = 0;
    events.push({ ...stamp(state), type: 'collision', entityId: obstacle.id, outcome: 'cling' });
    emitModeAction(state, events, 'frog', 'frog-cling', obstacle.id);
    return;
  }

  if (state.mode.active === 'rubber') {
    const rubber = state.mode.rubber;
    const launchedImpact = rubber.phase === 'flying';
    const contact = obstacleContact(state, obstacle, config);
    if (rubber.phase === 'aiming') {
      rubber.phase = 'flying';
      rubber.aim = { x: 0, y: 0 };
      rubber.aimTime = 0;
      rubber.phaseTime = 0;
    }
    state.player.x = contact.separatedX;
    state.player.y = contact.separatedY;
    if (contact.normalX !== 0) {
      const relativeVelocity = state.player.vx - contact.surfaceVelocityX;
      const normalVelocity = relativeVelocity * contact.normalX;
      const reflectedRelativeVelocity = normalVelocity < 0
        ? relativeVelocity - (1 + config.modes.rubber.restitution) * normalVelocity * contact.normalX
        : relativeVelocity;
      state.player.vx = contact.surfaceVelocityX + reflectedRelativeVelocity;
      state.player.vy *= config.modes.rubber.tangentialDamping;
    } else {
      const relativeVelocity = state.player.vy - contact.surfaceVelocityY;
      const normalVelocity = relativeVelocity * contact.normalY;
      if (normalVelocity < 0) {
        const reflectedRelativeVelocity = relativeVelocity
          - (1 + config.modes.rubber.restitution)
          * normalVelocity
          * contact.normalY;
        state.player.vy = contact.surfaceVelocityY + reflectedRelativeVelocity;
      }
      state.player.vx *= config.modes.rubber.tangentialDamping;
    }
    state.player.vx = clamp(
      state.player.vx,
      -config.modes.rubber.maxLaunchSpeed,
      config.modes.rubber.maxLaunchSpeed,
    );
    rubber.vx = state.player.vx;
    events.push({ ...stamp(state), type: 'collision', entityId: obstacle.id, outcome: 'bounce' });
    emitModeAction(state, events, 'rubber', 'rubber-bounce', obstacle.id);
    if (launchedImpact
      && contact.impactSpeed >= config.modes.rubber.minimumScoredImpactSpeed
      && !obstacle.rubberRicochetAwarded
      && rubber.scoredBounces < config.modes.rubber.maxScoredBounces) {
      obstacle.rubberRicochetAwarded = true;
      rubber.scoredBounces += 1;
      awardStyle(state, events, config, 'rubber-ricochet', obstacle.id, config.scoring.rubberRicochet);
      gainDna(state, events, config, config.dna.maneuver);
    }
    return;
  }

  if (state.mode.active === 'steel') {
    obstacle.destroyed = true;
    events.push({ ...stamp(state), type: 'collision', entityId: obstacle.id, outcome: 'destroy' });
    if (!obstacle.steelBreakAwarded) {
      obstacle.steelBreakAwarded = true;
      awardStyle(state, events, config, 'steel-break', obstacle.id, config.scoring.steelBreak);
      gainDna(state, events, config, config.dna.maneuver);
    }
    const steel = state.mode.steel;
    steel.heat = Math.min(config.modes.steel.maximumHeat, steel.heat + config.modes.steel.obstacleHeat);
    steel.timeSinceImpact = 0;
    refreshSteelCriticalState(state, events, config);
    triggerSteelOverheat(state, events, config, obstacle.id);
    return;
  }

  if (state.mode.active === 'ghost' && state.mode.ghost.phase === 'phasing') {
    if (!hasCollisionGrace(state, obstacle.id)) {
      grantCollisionGrace(state, obstacle.id);
      events.push({ ...stamp(state), type: 'collision', entityId: obstacle.id, outcome: 'phase' });
    }
    if (!obstacle.ghostPhaseAwarded) {
      obstacle.ghostPhaseAwarded = true;
      awardStyle(state, events, config, 'ghost-phase', obstacle.id, config.scoring.ghostPhase);
      gainDna(state, events, config, config.dna.maneuver);
    }
    return;
  }

  if (state.mode.active === 'stork'
    && state.mode.stork.phase === 'aiming'
    && state.mode.stork.lockedTargetId === obstacle.id) {
    // A late but valid PIK cannot become a trap just because the gate reaches
    // the bird during the short aiming window. Commit the already locked move.
    releaseStorkVault(state, events, config);
  }

  if (state.mode.active === 'stork'
    && state.mode.stork.phase === 'vaulting'
    && state.mode.stork.lockedTargetId === obstacle.id) {
    grantCollisionGrace(state, obstacle.id);
    if (!obstacle.collisionResolved) {
      obstacle.collisionResolved = true;
      events.push({ ...stamp(state), type: 'collision', entityId: obstacle.id, outcome: 'vault' });
    }
    return;
  }

  if (hasCollisionGrace(state, obstacle.id)) {
    return;
  }

  // Entry and expiry protection must never suppress a form's own collision
  // mechanic; it is consulted only if no active ability handled the contact.
  if (state.player.invulnerableTime > 0) {
    if (!obstacle.collisionResolved) {
      obstacle.collisionResolved = true;
      events.push({ ...stamp(state), type: 'collision', entityId: obstacle.id, outcome: 'shielded' });
    }
    return;
  }

  if (!obstacle.collisionResolved) {
    obstacle.collisionResolved = true;
    events.push({ ...stamp(state), type: 'collision', entityId: obstacle.id, outcome: 'fatal' });
  }
  failRun(state, events, 'obstacle', obstacle.id);
}

function collectCoins(state: GameState, events: GameEvent[], config: GameConfig): void {
  for (const coin of state.world.coins) {
    if (coin.collected) continue;
    const reachX = config.player.radiusX + coin.radius;
    const reachY = config.player.radiusY + coin.radius;
    if (Math.abs(state.player.x - coin.x) > reachX || Math.abs(state.player.y - coin.y) > reachY) continue;
    coin.collected = true;
    state.score.coins += 1;
    awardBase(state, events, 'coin', coin.id, config.scoring.coin);
    gainDna(state, events, config, config.dna.coin);
    events.push({ ...stamp(state), type: 'coin-collected', coinId: coin.id, obstacleId: coin.obstacleId });
  }
}

function processObstacleInteractions(state: GameState, events: GameEvent[], config: GameConfig): void {
  clearReleasedFrogSurface(state, config);
  for (const obstacle of state.world.obstacles) {
    if (obstacle.destroyed) continue;
    const overlapping = playerOverlapsObstacle(state, obstacle, config);
    if (!overlapping) {
      obstacle.collisionResolved = false;
      if (state.player.frogReleaseGraceEntityIds.includes(obstacle.id)) {
        revokeCollisionGrace(state, obstacle.id);
      }
      continue;
    }
    resolveObstacleCollision(state, obstacle, events, config);
    if (state.status === 'dead') return;
  }
}

function processPassedObstacles(state: GameState, events: GameEvent[], config: GameConfig): void {
  const playerLeft = state.player.x - config.player.radiusX;
  for (const obstacle of state.world.obstacles) {
    if (obstacle.passed || obstacle.x + obstacle.width / 2 >= playerLeft) continue;
    obstacle.passed = true;
    state.world.passedObstacles += 1;
    awardBase(state, events, 'obstacle-pass', obstacle.id, config.scoring.obstaclePass);
    gainDna(state, events, config, config.dna.obstaclePass);
    events.push({ ...stamp(state), type: 'obstacle-passed', obstacleId: obstacle.id });

    if (obstacle.storkVaultCommitted && !obstacle.storkVaultAwarded) {
      obstacle.storkVaultAwarded = true;
      awardStyle(state, events, config, 'stork-vault', obstacle.id, config.scoring.storkVault);
      gainDna(state, events, config, config.dna.maneuver);
    }
    revokeCollisionGrace(state, obstacle.id);

    if (state.mode.active === 'steel' && !obstacle.destroyed) {
      const steel = state.mode.steel;
      steel.heat = Math.max(0, steel.heat - config.modes.steel.cleanPassCooling);
      steel.critical = steel.heat >= config.modes.steel.criticalHeat;
    }

    if (!obstacle.destroyed) {
      const gapBottom = obstacle.gapCenter - obstacle.gapSize / 2;
      const gapTop = obstacle.gapCenter + obstacle.gapSize / 2;
      const bottomClearance = state.player.y - config.player.radiusY - gapBottom;
      const topClearance = gapTop - (state.player.y + config.player.radiusY);
      const clearance = Math.min(bottomClearance, topClearance);
      if (!obstacle.nearMissAwarded && clearance >= 0 && clearance <= config.obstacle.nearMissMargin) {
        obstacle.nearMissAwarded = true;
        awardStyle(state, events, config, 'near-miss', obstacle.id, config.scoring.nearMiss);
        gainDna(state, events, config, config.dna.nearMiss);
        events.push({ ...stamp(state), type: 'near-miss', obstacleId: obstacle.id, clearance });
      }
    }
  }
}

function updateMutationOffer(state: GameState, events: GameEvent[], config: GameConfig): void {
  const offer = state.dna.offer;
  if (!offer || offer.x > state.player.x) return;
  const upperDistance = Math.abs(state.player.y - offer.upperY);
  const lowerDistance = Math.abs(state.player.y - offer.lowerY);
  selectMutation(state, events, config, upperDistance <= lowerDistance ? 'upper' : 'lower');
}

function cleanupWorld(state: GameState, config: GameConfig): void {
  const leftLimit = -config.world.cleanupMargin;
  state.world.obstacles = state.world.obstacles.filter(
    (obstacle) => obstacle.x + obstacle.width / 2 >= leftLimit,
  );
  state.world.coins = state.world.coins.filter(
    (coin) => !coin.collected && coin.x + coin.radius >= leftLimit,
  );
  const liveObstacleIds = new Set(state.world.obstacles.map((obstacle) => obstacle.id));
  state.player.collisionGraceEntityIds = state.player.collisionGraceEntityIds.filter(
    (entityId) => liveObstacleIds.has(entityId),
  );
  state.player.frogReleaseGraceEntityIds = state.player.frogReleaseGraceEntityIds.filter(
    (entityId) => liveObstacleIds.has(entityId),
  );
}

function tick(state: GameState, events: GameEvent[], config: GameConfig, actions: readonly InputAction[]): void {
  state.clock.tick += 1;
  state.clock.elapsed += config.fixedStep;
  state.player.invulnerableTime = Math.max(0, state.player.invulnerableTime - config.fixedStep);
  updateComboExpiry(state, events);
  processInput(state, events, config, actions);
  if (state.status !== 'running') return;

  updateActiveMode(state, events, config, config.fixedStep);
  updatePlayerPhysics(state, config, config.fixedStep);
  resolveBoundaryCollision(state, events, config);
  if (state.status !== 'running') return;

  updateWorld(state, events, config, config.fixedStep);
  updateFrogAnchorAfterWorld(state, events, config);
  collectCoins(state, events, config);
  processObstacleInteractions(state, events, config);
  if (state.status !== 'running') return;
  processPassedObstacles(state, events, config);
  updateMutationOffer(state, events, config);
  createMutationOffer(state, events, config);
  cleanupWorld(state, config);
}

export function stepSimulation(
  source: GameState,
  dtSeconds: number,
  input?: SimulationInput | readonly InputAction[],
  config: GameConfig = DEFAULT_GAME_CONFIG,
): SimulationStep {
  if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
    throw new RangeError('dtSeconds must be a finite non-negative number');
  }
  if (config.fixedStep <= 0 || !Number.isFinite(config.fixedStep)) {
    throw new RangeError('GameConfig.fixedStep must be a positive finite number');
  }

  const state = cloneGameState(source);
  const events: GameEvent[] = [];
  if (state.status !== 'running') return { state, events };

  state.pendingInput.push(...normalizeSimulationInput(input).map(cloneAction));
  state.clock.accumulator += Math.min(dtSeconds, config.maxFrameDelta);
  let subSteps = 0;
  while (state.clock.accumulator + Number.EPSILON >= config.fixedStep && subSteps < config.maxSubSteps) {
    state.clock.accumulator = Math.max(0, state.clock.accumulator - config.fixedStep);
    const actions = subSteps === 0 ? state.pendingInput.splice(0) : [];
    tick(state, events, config, actions);
    subSteps += 1;
    if (state.status !== 'running') {
      state.clock.accumulator = 0;
      break;
    }
  }

  if (subSteps >= config.maxSubSteps && state.clock.accumulator >= config.fixedStep) {
    state.clock.accumulator %= config.fixedStep;
  }
  return { state, events };
}

export class Simulation {
  readonly config: GameConfig;
  private currentState: GameState;

  constructor(options: SimulationOptions = {}) {
    this.config = options.config ?? DEFAULT_GAME_CONFIG;
    this.currentState = options.state
      ? cloneGameState(options.state)
      : createInitialGameState(options.seed ?? 1, this.config);
  }

  get state(): Readonly<GameState> {
    return this.currentState;
  }

  snapshot(): GameState {
    return cloneGameState(this.currentState);
  }

  step(dtSeconds: number, input?: SimulationInput | readonly InputAction[]): SimulationStep {
    const result = stepSimulation(this.currentState, dtSeconds, input, this.config);
    this.currentState = result.state;
    return result;
  }

  startMode(mode: MutationModeId): SimulationStep {
    const result = startMode(this.currentState, mode, this.config);
    this.currentState = result.state;
    return result;
  }

  reset(seed = this.currentState.seed): GameState {
    this.currentState = createInitialGameState(seed, this.config);
    return this.currentState;
  }
}
