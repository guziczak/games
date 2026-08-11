export type GateDressingQuality = 'low' | 'medium' | 'high';

export interface GateDressingQualityProfile {
  readonly cylinderSegments: number;
  readonly minimumRustMarks: number;
  readonly maximumRustMarks: number;
  readonly minimumPlantBlades: number;
  readonly maximumPlantBlades: number;
  readonly minimumMineralGrowths: number;
  readonly maximumMineralGrowths: number;
  readonly plantScale: number;
  /** Simulation-X distance beyond which optional dressing is culled. */
  readonly detailDistance: number;
}

export interface GateRustMark {
  readonly upper: boolean;
  /** 0 = long run, 1 = broad bloom, 2 = peeling layered patch. */
  readonly silhouette: 0 | 1 | 2;
  readonly heightRatio: number;
  readonly angle: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  /** Multiplies the shared rust material through the instance colour. */
  readonly tone: number;
}

export type GateGrowthAnchor =
  | 'waterline'
  | 'lower-collar'
  | 'upper-collar'
  | 'lower-body'
  | 'upper-body';

export interface GateMineralGrowth {
  readonly anchor: GateGrowthAnchor;
  readonly angle: number;
  readonly heightRatio: number;
  readonly size: number;
  readonly stretch: number;
  readonly depth: number;
  readonly rotation: number;
}

export interface GatePlantBlade {
  readonly angle: number;
  readonly radius: number;
  readonly width: number;
  readonly height: number;
  readonly lean: number;
}

export interface GateDressing {
  readonly rustVariant: number;
  readonly bandVariant: number;
  readonly bandRotation: number;
  readonly wetBandRotation: number;
  readonly plantVariant: number;
  readonly rustMarks: readonly GateRustMark[];
  readonly mineralGrowths: readonly GateMineralGrowth[];
  readonly plantBlades: readonly GatePlantBlade[];
}

const QUALITY_PROFILES: Readonly<Record<GateDressingQuality, GateDressingQualityProfile>> = Object.freeze({
  low: Object.freeze({
    cylinderSegments: 10,
    minimumRustMarks: 3,
    maximumRustMarks: 4,
    minimumPlantBlades: 3,
    maximumPlantBlades: 4,
    minimumMineralGrowths: 3,
    maximumMineralGrowths: 4,
    plantScale: 0.92,
    detailDistance: 8.5,
  }),
  medium: Object.freeze({
    cylinderSegments: 14,
    minimumRustMarks: 4,
    maximumRustMarks: 6,
    minimumPlantBlades: 5,
    maximumPlantBlades: 6,
    minimumMineralGrowths: 5,
    maximumMineralGrowths: 6,
    plantScale: 1.18,
    detailDistance: 12.5,
  }),
  high: Object.freeze({
    cylinderSegments: 18,
    minimumRustMarks: 6,
    maximumRustMarks: 8,
    minimumPlantBlades: 5,
    maximumPlantBlades: 6,
    minimumMineralGrowths: 6,
    maximumMineralGrowths: 8,
    plantScale: 1.08,
    detailDistance: 16,
  }),
});

const mix32 = (value: number): number => {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
};

const hashGateId = (id: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return mix32(hash);
};

const sample = (seed: number, salt: number): number => (
  mix32(seed ^ Math.imul(salt + 1, 0x9e3779b1)) / 0x1_0000_0000
);

const sampleCount = (seed: number, salt: number, minimum: number, maximum: number): number => (
  minimum + Math.floor(sample(seed, salt) * (maximum - minimum + 1))
);

export function getGateDressingQualityProfile(
  quality: GateDressingQuality,
): Readonly<GateDressingQualityProfile> {
  return QUALITY_PROFILES[quality];
}

/**
 * Produces texture-free dressing that is stable for a gate id and quality.
 * The generated marks favour the camera-facing half of each cylinder while
 * plants remain clustered around the lower, waterline base.
 */
export function createGateDressing(id: string, quality: GateDressingQuality): Readonly<GateDressing> {
  const profile = getGateDressingQualityProfile(quality);
  const seed = hashGateId(id);
  const rustCount = sampleCount(
    seed,
    1,
    profile.minimumRustMarks,
    profile.maximumRustMarks,
  );
  const plantCount = sampleCount(
    seed,
    2,
    profile.minimumPlantBlades,
    profile.maximumPlantBlades,
  );
  const mineralCount = sampleCount(
    seed,
    3,
    profile.minimumMineralGrowths,
    profile.maximumMineralGrowths,
  );

  const rustMarks: GateRustMark[] = [];
  for (let index = 0; index < rustCount; index += 1) {
    // Most corrosion is readable on the leading half, with the occasional
    // side/back bloom preventing every gate from sharing one silhouette.
    const leadingMark = index < 2;
    const layeredCompanion = index >= 3 && index % 3 === 0;
    const previous = layeredCompanion ? rustMarks[index - 1] : undefined;
    const silhouette = (index < 2
      ? index === 0 ? 0 : 2
      : (index + Math.floor(sample(seed, 8) * 3)) % 3) as 0 | 1 | 2;
    const facingAngle = -Math.PI / 2 + (sample(seed, 20 + index * 7) - 0.5)
      * (leadingMark ? 0.58 : Math.PI * 1.45);
    const independentAngle = index === rustCount - 1 && sample(seed, 21 + index * 7) > 0.58
      ? facingAngle + Math.PI
      : facingAngle;
    const angle = previous
      ? previous.angle + (sample(seed, 21 + index * 7) - 0.5) * 0.16
      : independentAngle;
    const baseWidth = silhouette === 0
      ? 0.2 + sample(seed, 24 + index * 7) * 0.16
      : silhouette === 1
        ? 0.42 + sample(seed, 24 + index * 7) * 0.24
        : 0.3 + sample(seed, 24 + index * 7) * 0.22;
    const baseHeight = silhouette === 0
      ? 0.72 + sample(seed, 25 + index * 7) * 0.42
      : silhouette === 1
        ? 0.3 + sample(seed, 25 + index * 7) * 0.28
        : 0.48 + sample(seed, 25 + index * 7) * 0.34;
    rustMarks.push(Object.freeze({
      // The first pair guarantees one readable leading mark on each pipe;
      // remaining marks carry the per-gate asymmetry.
      upper: previous?.upper
        ?? (index === 1 ? true : index === 0 ? false : sample(seed, 22 + index * 7) > 0.52),
      silhouette,
      heightRatio: previous
        ? Math.max(0.12, Math.min(0.86, previous.heightRatio
          + (sample(seed, 23 + index * 7) - 0.5) * 0.13))
        : leadingMark
          ? 0.32 + sample(seed, 23 + index * 7) * 0.3
          : 0.12 + sample(seed, 23 + index * 7) * 0.74,
      angle,
      width: previous ? baseWidth * 0.62 : baseWidth,
      height: previous ? baseHeight * 0.66 : baseHeight,
      rotation: (sample(seed, 26 + index * 7) - 0.5)
        * (silhouette === 0 ? 0.28 : 0.9),
      tone: previous ? 0.5 + sample(seed, 27 + index * 7) * 0.14 : 0.74 + sample(seed, 27 + index * 7) * 0.24,
    }));
  }

  const mineralGrowths: GateMineralGrowth[] = [];
  for (let index = 0; index < mineralCount; index += 1) {
    let anchor: GateGrowthAnchor;
    if (index < 2) anchor = 'waterline';
    else if (index === 2) {
      anchor = sample(seed, 190) > 0.34 ? 'lower-collar' : 'waterline';
    } else if (index === 3 && sample(seed, 191) > 0.48) {
      anchor = 'upper-collar';
    } else {
      anchor = sample(seed, 192 + index) > 0.52 ? 'lower-body' : 'upper-body';
    }
    mineralGrowths.push(Object.freeze({
      anchor,
      angle: -Math.PI / 2 + (sample(seed, 200 + index * 6) - 0.5) * 1.7,
      heightRatio: 0.15 + sample(seed, 201 + index * 6) * 0.7,
      size: 0.075 + sample(seed, 202 + index * 6) * 0.075,
      stretch: 0.72 + sample(seed, 203 + index * 6) * 0.7,
      depth: 0.1 + sample(seed, 204 + index * 6) * 0.11,
      rotation: (sample(seed, 205 + index * 6) - 0.5) * Math.PI,
    }));
  }

  const plantBlades: GatePlantBlade[] = [];
  for (let index = 0; index < plantCount; index += 1) {
    const spread = plantCount <= 1 ? 0.5 : index / (plantCount - 1);
    plantBlades.push(Object.freeze({
      angle: -Math.PI / 2
        + (spread - 0.5) * 1.45
        + (sample(seed, 90 + index * 5) - 0.5) * 0.14,
      radius: 1.68 + sample(seed, 91 + index * 5) * 0.34,
      width: (0.2 + sample(seed, 92 + index * 5) * 0.14) * profile.plantScale,
      height: (0.78 + sample(seed, 93 + index * 5) * 0.46) * profile.plantScale,
      lean: (sample(seed, 94 + index * 5) - 0.5) * 0.48,
    }));
  }

  return Object.freeze({
    rustVariant: Math.floor(sample(seed, 4) * 3),
    bandVariant: Math.floor(sample(seed, 6) * 3),
    bandRotation: sample(seed, 7) * Math.PI * 2,
    wetBandRotation: sample(seed, 9) * Math.PI * 2,
    plantVariant: Math.floor(sample(seed, 5) * 2),
    rustMarks: Object.freeze(rustMarks),
    mineralGrowths: Object.freeze(mineralGrowths),
    plantBlades: Object.freeze(plantBlades),
  });
}
