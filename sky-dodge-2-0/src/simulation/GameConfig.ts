export interface DifficultyTier {
  readonly minPassed: number;
  readonly speed: number;
  readonly gapSize: number;
  readonly spawnInterval: number;
  readonly movingChance: number;
  readonly movingAmplitude: number;
  readonly movingFrequency: number;
}

export interface GameConfig {
  readonly fixedStep: number;
  readonly maxFrameDelta: number;
  readonly maxSubSteps: number;
  readonly world: {
    readonly width: number;
    readonly height: number;
    readonly cleanupMargin: number;
  };
  readonly player: {
    readonly startX: number;
    readonly startY: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly gravity: number;
    readonly flapVelocity: number;
    readonly minVelocityY: number;
    readonly maxVelocityY: number;
    readonly horizontalRecovery: number;
    readonly maxHorizontalRecoverySpeed: number;
    readonly floorRecoveryVelocity: number;
  };
  readonly obstacle: {
    readonly width: number;
    readonly spawnLead: number;
    readonly firstSpawnDelay: number;
    /** Number of real, deterministic gates kept scheduled beyond the active course. */
    readonly lookAheadCount: number;
    readonly minGapCenter: number;
    readonly maxGapCenter: number;
    readonly maxCenterDelta: number;
    readonly nearMissMargin: number;
    readonly coinChance: number;
    readonly coinCount: number;
    readonly coinRadius: number;
    readonly coinSpacing: number;
  };
  readonly scoring: {
    readonly obstaclePass: number;
    readonly coin: number;
    readonly nearMiss: number;
    readonly frogCatapult: number;
    readonly rubberRicochet: number;
    readonly steelBreak: number;
    readonly steelTemper: number;
    readonly ghostPhase: number;
    readonly storkVault: number;
  };
  readonly combo: {
    readonly window: number;
    readonly tiers: readonly {
      readonly minimumLinks: number;
      readonly multiplier: number;
    }[];
  };
  readonly dna: {
    readonly initial: number;
    readonly maximum: number;
    readonly obstaclePass: number;
    readonly coin: number;
    readonly nearMiss: number;
    readonly maneuver: number;
    readonly activeModeGainMultiplier: number;
    readonly activeModeCap: number;
    readonly offerSpawnLead: number;
    readonly offerUpperY: number;
    readonly offerLowerY: number;
  };
  readonly modes: {
    readonly frog: {
      readonly duration: number;
      readonly maxCharge: number;
      readonly maxClingTime: number;
      readonly minLaunchVelocity: number;
      readonly maxLaunchVelocity: number;
      readonly worldScaleWhileClinging: number;
    };
    readonly rubber: {
      readonly duration: number;
      readonly maxAimTime: number;
      readonly minLaunchSpeed: number;
      readonly maxLaunchSpeed: number;
      readonly restitution: number;
      readonly tangentialDamping: number;
      readonly minimumScoredImpactSpeed: number;
      readonly worldScaleWhileAiming: number;
      readonly maxScoredBounces: number;
    };
    readonly steel: {
      readonly duration: number;
      readonly gravityMultiplier: number;
      readonly obstacleHeat: number;
      readonly boundaryHeat: number;
      readonly cleanPassCooling: number;
      readonly passiveCooling: number;
      readonly coolingDelay: number;
      readonly criticalHeat: number;
      readonly maximumHeat: number;
      readonly overheatGrace: number;
    };
    readonly ghost: {
      readonly duration: number;
      readonly maximumEnergy: number;
      readonly minimumPhaseEnergy: number;
      readonly phaseDrain: number;
      readonly recharge: number;
      readonly materializeGrace: number;
    };
    readonly stork: {
      readonly duration: number;
      readonly uses: number;
      readonly maximumEnergy: number;
      readonly useEnergy: number;
      readonly lockLeadTime: number;
      readonly maximumAimTime: number;
      readonly aimWorldScale: number;
      readonly vaultDuration: number;
      readonly cooldown: number;
    };
  };
  readonly difficulty: readonly DifficultyTier[];
}

export const DEFAULT_GAME_CONFIG: GameConfig = Object.freeze({
  fixedStep: 1 / 60,
  maxFrameDelta: 0.25,
  maxSubSteps: 15,
  world: Object.freeze({
    width: 16,
    height: 10,
    cleanupMargin: 2,
  }),
  player: Object.freeze({
    startX: 4.2,
    startY: 5,
    radiusX: 0.32,
    radiusY: 0.28,
    gravity: -15,
    flapVelocity: 6,
    minVelocityY: -9,
    maxVelocityY: 7,
    horizontalRecovery: 8,
    maxHorizontalRecoverySpeed: 4.5,
    floorRecoveryVelocity: 3.4,
  }),
  obstacle: Object.freeze({
    width: 0.9,
    spawnLead: 1.5,
    firstSpawnDelay: 1.6,
    lookAheadCount: 3,
    minGapCenter: 1.85,
    maxGapCenter: 8.15,
    maxCenterDelta: 1.8,
    nearMissMargin: 0.24,
    coinChance: 0.65,
    coinCount: 3,
    coinRadius: 0.18,
    coinSpacing: 0.55,
  }),
  scoring: Object.freeze({
    obstaclePass: 100,
    coin: 20,
    nearMiss: 75,
    frogCatapult: 150,
    rubberRicochet: 175,
    steelBreak: 100,
    steelTemper: 250,
    ghostPhase: 125,
    storkVault: 200,
  }),
  combo: Object.freeze({
    window: 3.25,
    tiers: Object.freeze([
      Object.freeze({ minimumLinks: 1, multiplier: 1 }),
      Object.freeze({ minimumLinks: 2, multiplier: 1.5 }),
      Object.freeze({ minimumLinks: 4, multiplier: 2 }),
      Object.freeze({ minimumLinks: 6, multiplier: 2.5 }),
    ]),
  }),
  dna: Object.freeze({
    initial: 25,
    maximum: 100,
    obstaclePass: 12,
    coin: 3,
    nearMiss: 8,
    maneuver: 10,
    activeModeGainMultiplier: 0.5,
    activeModeCap: 50,
    offerSpawnLead: 1.5,
    offerUpperY: 6.8,
    offerLowerY: 3.2,
  }),
  modes: Object.freeze({
    frog: Object.freeze({
      duration: 9,
      maxCharge: 0.9,
      maxClingTime: 1.1,
      minLaunchVelocity: 5,
      maxLaunchVelocity: 9,
      // The gate must remain under the frog for the complete charge window.
      // A gentle crawl preserves motion without recreating the classic bug in
      // which scrolling carried a clinging frog out of the viewport.
      worldScaleWhileClinging: 0.15,
    }),
    rubber: Object.freeze({
      duration: 8,
      maxAimTime: 0.8,
      minLaunchSpeed: 6,
      maxLaunchSpeed: 11,
      restitution: 0.82,
      tangentialDamping: 0.9,
      minimumScoredImpactSpeed: 4,
      worldScaleWhileAiming: 0.25,
      maxScoredBounces: 3,
    }),
    steel: Object.freeze({
      duration: 7,
      gravityMultiplier: 1.2,
      obstacleHeat: 40,
      boundaryHeat: 20,
      cleanPassCooling: 20,
      passiveCooling: 10,
      coolingDelay: 0.6,
      criticalHeat: 70,
      maximumHeat: 100,
      overheatGrace: 0.6,
    }),
    ghost: Object.freeze({
      duration: 7,
      maximumEnergy: 100,
      minimumPhaseEnergy: 10,
      phaseDrain: 45,
      recharge: 25,
      materializeGrace: 0.25,
    }),
    stork: Object.freeze({
      duration: 9,
      uses: 3,
      maximumEnergy: 100,
      useEnergy: 100 / 3,
      lockLeadTime: 1.1,
      maximumAimTime: 0.7,
      aimWorldScale: 0.55,
      vaultDuration: 0.5,
      cooldown: 0.8,
    }),
  }),
  difficulty: Object.freeze([
    Object.freeze({ minPassed: 0, speed: 4.8, gapSize: 3.35, spawnInterval: 2.35, movingChance: 0, movingAmplitude: 0, movingFrequency: 0 }),
    Object.freeze({ minPassed: 10, speed: 5.4, gapSize: 3.05, spawnInterval: 2.2, movingChance: 0.12, movingAmplitude: 0.3, movingFrequency: 0.4 }),
    Object.freeze({ minPassed: 25, speed: 6.1, gapSize: 2.8, spawnInterval: 2.05, movingChance: 0.22, movingAmplitude: 0.38, movingFrequency: 0.45 }),
    Object.freeze({ minPassed: 50, speed: 6.8, gapSize: 2.65, spawnInterval: 1.95, movingChance: 0.3, movingAmplitude: 0.45, movingFrequency: 0.5 }),
  ]),
});

export function getDifficultyTier(
  passed: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): DifficultyTier {
  let result = config.difficulty[0];
  if (!result) throw new Error('GameConfig.difficulty must contain at least one tier');

  for (const tier of config.difficulty) {
    if (passed < tier.minPassed) break;
    result = tier;
  }
  return result;
}
