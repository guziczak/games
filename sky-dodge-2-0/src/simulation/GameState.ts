import type { GameConfig } from './GameConfig';
import { DEFAULT_GAME_CONFIG, getDifficultyTier } from './GameConfig';
import type { InputAction } from './InputActions';
import { normalizeSeed } from './SeededRandom';

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type ModeId = 'normal' | 'frog' | 'rubber' | 'steel' | 'ghost' | 'stork';
export type MutationModeId = Exclude<ModeId, 'normal'>;
export type GameStatus = 'running' | 'dead';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  invulnerableTime: number;
  floorRecoveryAvailable: boolean;
  collisionGraceEntityIds: string[];
  frogReleaseGraceEntityIds: string[];
}

export interface ObstacleState {
  id: string;
  x: number;
  width: number;
  baseGapCenter: number;
  gapCenter: number;
  gapSize: number;
  motionAmplitude: number;
  motionFrequency: number;
  motionPhase: number;
  passed: boolean;
  nearMissAwarded: boolean;
  destroyed: boolean;
  collisionResolved: boolean;
  frogCatapultAwarded: boolean;
  rubberRicochetAwarded: boolean;
  steelBreakAwarded: boolean;
  ghostPhaseAwarded: boolean;
  storkVaultCommitted: boolean;
  storkVaultAwarded: boolean;
}

export interface CoinState {
  id: string;
  obstacleId: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface FrogModeState {
  phase: 'airborne' | 'clinging' | 'charging';
  clingObstacleId: string | null;
  clingOffsetX: number;
  releasedObstacleId: string | null;
  surfaceNormalX: -1 | 0 | 1;
  surfaceNormalY: -1 | 0 | 1;
  charge: number;
  phaseTime: number;
}

export interface RubberModeState {
  phase: 'idle' | 'aiming' | 'flying';
  aim: { x: number; y: number };
  vx: number;
  aimTime: number;
  phaseTime: number;
  scoredBounces: number;
}

export interface SteelModeState {
  heat: number;
  critical: boolean;
  overheated: boolean;
  timeSinceImpact: number;
}

export interface GhostModeState {
  phase: 'material' | 'phasing';
  energy: number;
  phaseTime: number;
}

export interface StorkModeState {
  phase: 'idle' | 'aiming' | 'vaulting';
  energy: number;
  uses: number;
  lockedTargetId: string | null;
  aimBias: number;
  cooldown: number;
  phaseTime: number;
  vaultStartY: number;
  vaultTargetY: number;
  floorContactLatched: boolean;
}

export interface ModeRuntimeState {
  active: ModeId;
  remaining: number;
  frog: FrogModeState;
  rubber: RubberModeState;
  steel: SteelModeState;
  ghost: GhostModeState;
  stork: StorkModeState;
}

export interface ComboState {
  links: number;
  multiplier: number;
  expiresAt: number;
  bestLinks: number;
  bestMultiplier: number;
}

export interface ScoreState {
  base: number;
  style: number;
  total: number;
  coins: number;
}

export interface MutationOffer {
  id: string;
  x: number;
  upperY: number;
  lowerY: number;
  upper: MutationModeId;
  lower: MutationModeId;
}

export interface DnaState {
  value: number;
  offerBag: MutationModeId[];
  offer: MutationOffer | null;
  offersCreated: number;
  lastOffered: MutationModeId[];
}

export interface WorldState {
  obstacles: ObstacleState[];
  coins: CoinState[];
  spawnTimer: number;
  lastGapCenter: number;
  passedObstacles: number;
  nextEntityId: number;
}

export interface ClockState {
  elapsed: number;
  accumulator: number;
  tick: number;
}

export interface GameState {
  status: GameStatus;
  seed: number;
  rngState: number;
  clock: ClockState;
  player: PlayerState;
  world: WorldState;
  score: ScoreState;
  combo: ComboState;
  dna: DnaState;
  mode: ModeRuntimeState;
  pendingInput: InputAction[];
}

export function createInitialModeState(config: GameConfig = DEFAULT_GAME_CONFIG): ModeRuntimeState {
  return {
    active: 'normal',
    remaining: 0,
    frog: {
      phase: 'airborne',
      clingObstacleId: null,
      clingOffsetX: 0,
      releasedObstacleId: null,
      surfaceNormalX: 0,
      surfaceNormalY: 0,
      charge: 0,
      phaseTime: 0,
    },
    rubber: {
      phase: 'idle',
      aim: { x: 0, y: 0 },
      vx: 0,
      aimTime: 0,
      phaseTime: 0,
      scoredBounces: 0,
    },
    steel: {
      heat: 0,
      critical: false,
      overheated: false,
      timeSinceImpact: config.modes.steel.coolingDelay,
    },
    ghost: {
      phase: 'material',
      energy: config.modes.ghost.maximumEnergy,
      phaseTime: 0,
    },
    stork: {
      phase: 'idle',
      energy: config.modes.stork.maximumEnergy,
      uses: config.modes.stork.uses,
      lockedTargetId: null,
      aimBias: 0,
      cooldown: 0,
      phaseTime: 0,
      vaultStartY: 0,
      vaultTargetY: 0,
      floorContactLatched: false,
    },
  };
}

export function createInitialGameState(
  seed = 1,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): GameState {
  const normalizedSeed = normalizeSeed(seed);
  const firstTier = getDifficultyTier(0, config);
  return {
    status: 'running',
    seed: normalizedSeed,
    rngState: normalizedSeed,
    clock: { elapsed: 0, accumulator: 0, tick: 0 },
    player: {
      x: config.player.startX,
      y: config.player.startY,
      vx: 0,
      vy: 0,
      invulnerableTime: 0,
      floorRecoveryAvailable: false,
      collisionGraceEntityIds: [],
      frogReleaseGraceEntityIds: [],
    },
    world: {
      obstacles: [],
      coins: [],
      spawnTimer: Math.min(config.obstacle.firstSpawnDelay, firstTier.spawnInterval),
      lastGapCenter: config.player.startY,
      passedObstacles: 0,
      nextEntityId: 1,
    },
    score: { base: 0, style: 0, total: 0, coins: 0 },
    combo: {
      links: 0,
      multiplier: 1,
      expiresAt: 0,
      bestLinks: 0,
      bestMultiplier: 1,
    },
    dna: {
      value: config.dna.initial,
      offerBag: [],
      offer: null,
      offersCreated: 0,
      lastOffered: [],
    },
    mode: createInitialModeState(config),
    pendingInput: [],
  };
}
