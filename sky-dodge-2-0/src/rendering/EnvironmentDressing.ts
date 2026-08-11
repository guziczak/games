import type { ModeId } from '../simulation/GameState';

export type EnvironmentQuality = 'low' | 'medium' | 'high';

export interface EnvironmentBudget {
  readonly reeds: number;
  readonly buoys: number;
  readonly islands: number;
  readonly wrecks: number;
  readonly birds: number;
}

export interface EnvironmentSeed {
  /** Normalized position along the looping distant course. */
  readonly u: number;
  /** Signed side of the collision-free flight corridor. */
  readonly side: -1 | 1;
  readonly lateral: number;
  readonly scale: number;
  readonly phase: number;
  readonly speed: number;
  readonly height: number;
}

export interface EnvironmentLayout {
  readonly reeds: readonly EnvironmentSeed[];
  readonly buoys: readonly EnvironmentSeed[];
  readonly islands: readonly EnvironmentSeed[];
  readonly wrecks: readonly EnvironmentSeed[];
  readonly birds: readonly EnvironmentSeed[];
}

export interface DuckReflectionInput {
  readonly playerY: number;
  readonly worldHeight: number;
  readonly mode: ModeId;
  readonly time: number;
  readonly reducedMotion: boolean;
}

export interface DuckReflectionPresentation {
  readonly opacity: number;
  readonly rippleOpacity: number;
  readonly scale: number;
  readonly rippleScale: number;
  readonly colour: number;
}

export interface CameraReactionInput {
  readonly mode: ModeId;
  readonly rubberPhase: 'idle' | 'aiming' | 'flying';
  readonly rubberPhaseTime: number;
  readonly aimX: number;
  readonly aimY: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly steelImpulse: number;
  readonly impulsePhase: number;
  readonly reducedMotion: boolean;
}

export interface CameraReaction {
  readonly fov: number;
  readonly roll: number;
  readonly lateralOffset: number;
  readonly verticalOffset: number;
}

export interface SceneMood {
  readonly background: number;
  readonly fog: number;
  readonly fogDensity: number;
  readonly ambientIntensity: number;
  readonly rimIntensity: number;
  readonly exposure: number;
}

const ENVIRONMENT_BUDGETS: Readonly<Record<EnvironmentQuality, EnvironmentBudget>> = Object.freeze({
  low: Object.freeze({ reeds: 18, buoys: 3, islands: 2, wrecks: 2, birds: 6 }),
  medium: Object.freeze({ reeds: 32, buoys: 5, islands: 4, wrecks: 3, birds: 10 }),
  high: Object.freeze({ reeds: 48, buoys: 7, islands: 6, wrecks: 4, birds: 14 }),
});

const REFLECTION_COLOURS: Readonly<Record<ModeId, number>> = Object.freeze({
  normal: 0xe0bb54,
  frog: 0x63c77d,
  rubber: 0xea6f89,
  steel: 0x9fbcca,
  ghost: 0x6fc7d6,
  stork: 0xda8b75,
});

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

const mix32 = (value: number): number => {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
};

const sample = (seed: number, salt: number): number => (
  mix32(seed ^ Math.imul(salt + 1, 0x9e3779b1)) / 0x1_0000_0000
);

function createSeeds(
  count: number,
  salt: number,
  lateralMinimum: number,
  lateralMaximum: number,
  scaleMinimum: number,
  scaleMaximum: number,
  heightMinimum: number,
  heightMaximum: number,
): readonly EnvironmentSeed[] {
  const seeds: EnvironmentSeed[] = [];
  for (let index = 0; index < count; index += 1) {
    const seed = mix32(Math.imul(index + 1, 0x85ebca6b) ^ salt);
    // Golden-ratio spacing avoids the obvious random clumps that can read as
    // an accidental obstacle wall on narrow screens.
    const u = (index * 0.61803398875 + sample(seed, 0)) % 1;
    seeds.push(Object.freeze({
      u,
      side: sample(seed, 1) < 0.5 ? -1 : 1,
      lateral: lateralMinimum + sample(seed, 2) * (lateralMaximum - lateralMinimum),
      scale: scaleMinimum + sample(seed, 3) * (scaleMaximum - scaleMinimum),
      phase: sample(seed, 4) * Math.PI * 2,
      speed: 0.006 + sample(seed, 5) * 0.012,
      height: heightMinimum + sample(seed, 6) * (heightMaximum - heightMinimum),
    }));
  }
  return Object.freeze(seeds);
}

export function getEnvironmentBudget(quality: EnvironmentQuality): Readonly<EnvironmentBudget> {
  return ENVIRONMENT_BUDGETS[quality];
}

/** Stable, asset-free scenery kept at least 2.15 world units off the rail. */
export function createEnvironmentLayout(quality: EnvironmentQuality): Readonly<EnvironmentLayout> {
  const budget = getEnvironmentBudget(quality);
  return Object.freeze({
    reeds: createSeeds(budget.reeds, 17, 2.15, 5.4, 0.72, 1.28, 0, 0),
    buoys: createSeeds(budget.buoys, 31, 2.65, 5.2, 0.7, 1.12, 0, 0),
    islands: createSeeds(budget.islands, 47, 4.1, 7.8, 0.75, 1.55, 0, 0),
    wrecks: createSeeds(budget.wrecks, 71, 3.5, 7.2, 0.72, 1.36, 0, 0),
    birds: createSeeds(budget.birds, 97, 3.8, 8.4, 0.56, 1.18, 2.4, 7.2),
  });
}

export function createDuckReflectionPresentation(
  input: Readonly<DuckReflectionInput>,
): DuckReflectionPresentation {
  const worldHeight = Math.max(0.001, input.worldHeight);
  const altitude = clamp(input.playerY / worldHeight, 0, 1);
  const closeness = 1 - altitude;
  const motionFactor = input.reducedMotion ? 0 : 1;
  const ripple = Math.sin(input.time * 2.7) * 0.045 * motionFactor;
  const ghostFactor = input.mode === 'ghost' ? 0.62 : 1;
  return Object.freeze({
    opacity: (0.018 + Math.pow(closeness, 1.55) * 0.125) * ghostFactor,
    rippleOpacity: (0.012 + Math.pow(closeness, 1.35) * 0.072) * ghostFactor,
    scale: 0.76 + altitude * 0.32,
    rippleScale: 0.92 + altitude * 0.28 + ripple,
    colour: REFLECTION_COLOURS[input.mode],
  });
}

/** Restrained camera deformation; all values are bounded for motion comfort. */
export function createCameraReaction(input: Readonly<CameraReactionInput>): CameraReaction {
  const motionFactor = input.reducedMotion ? 0.16 : 1;
  let lens = 0;
  let roll = 0;
  if (input.mode === 'rubber' && input.rubberPhase === 'aiming') {
    const aimMagnitude = clamp(Math.hypot(input.aimX, input.aimY), 0, 1);
    lens = aimMagnitude * 1.55;
    roll = clamp(input.aimY, -1, 1) * 0.014;
  } else if (input.mode === 'rubber' && input.rubberPhase === 'flying') {
    const launchDecay = Math.exp(-Math.max(0, input.rubberPhaseTime) * 3.6);
    const speed = clamp((Math.hypot(input.velocityX, input.velocityY) - 3) / 8, 0, 1);
    lens = speed * launchDecay * 2.05;
    roll = clamp(-input.velocityY / 10, -1, 1) * launchDecay * 0.016;
  }

  const impulse = clamp(input.steelImpulse, 0, 1);
  const shake = Math.sin(input.impulsePhase * 37) * impulse;
  return Object.freeze({
    fov: 40 + lens * motionFactor,
    roll: clamp((roll + shake * 0.006) * motionFactor, -0.02, 0.02),
    lateralOffset: clamp(shake * 0.075 * motionFactor, -0.075, 0.075),
    verticalOffset: clamp(Math.cos(input.impulsePhase * 31) * impulse * 0.035 * motionFactor, -0.035, 0.035),
  });
}

export function createSceneMood(mode: ModeId, ghostPhasing: boolean): SceneMood {
  if (mode !== 'ghost') {
    return Object.freeze({
      background: 0x112b4c,
      fog: 0x17354e,
      fogDensity: 0.0185,
      ambientIntensity: 0.42,
      rimIntensity: 1.65,
      exposure: 1.22,
    });
  }
  return Object.freeze({
    background: ghostPhasing ? 0x1c3442 : 0x183244,
    fog: ghostPhasing ? 0x35505b : 0x2c4b5c,
    fogDensity: ghostPhasing ? 0.021 : 0.0198,
    ambientIntensity: ghostPhasing ? 0.31 : 0.35,
    rimIntensity: ghostPhasing ? 1.28 : 1.42,
    exposure: ghostPhasing ? 1.12 : 1.16,
  });
}

export function quadraticBezier(start: number, control: number, end: number, t: number): number {
  const progress = clamp(t, 0, 1);
  const inverse = 1 - progress;
  return inverse * inverse * start + 2 * inverse * progress * control + progress * progress * end;
}
