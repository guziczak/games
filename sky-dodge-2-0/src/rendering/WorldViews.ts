import * as THREE from 'three';

import { DEFAULT_GAME_CONFIG, getDifficultyTier } from '../simulation/GameConfig';
import type { GameEvent } from '../simulation/GameEvents';
import type { GameState, MutationModeId, ObstacleState } from '../simulation/GameState';
import {
  createGateDressing,
  getGateDressingQualityProfile,
} from './GateDressing';
import type { GateDressing, GateDressingQualityProfile } from './GateDressing';
import {
  createEnvironmentLayout,
  quadraticBezier,
} from './EnvironmentDressing';
import type { EnvironmentLayout } from './EnvironmentDressing';
import { WaterSurface } from './WaterSurface';

export type RenderQuality = 'low' | 'medium' | 'high';

export interface WorldProjection {
  readonly viewWidth: number;
  readonly viewHeight: number;
  readonly xScale: number;
  /** World-space length and yaw of one simulation-X unit along the flight rail. */
  readonly pathScale: number;
  readonly pathYaw: number;
  readonly mapX: (simulationX: number) => number;
  readonly mapY: (simulationY: number) => number;
  readonly depthAt: (simulationX: number) => number;
}

export interface CoinRenderPoseInput {
  readonly simulationX: number;
  readonly simulationY: number;
  readonly radius: number;
  readonly time: number;
  /**
   * Render-only anticipation in the inclusive 0..1 range. The renderer does
   * not infer a pickup hitbox here, so a future curved/magnetic collector can
   * feed its own normalized proximity without moving the coin's true centre.
   */
  readonly normalizedProximity: number;
  /** Stable per-coin phase in radians. */
  readonly phase: number;
}

export interface CoinRenderPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Outer radius of the opaque, depth-writing coin. */
  readonly solidRadius: number;
  /** Outer radius of the soft, depth-tested readability halo. */
  readonly haloRadius: number;
  readonly yaw: number;
  readonly tilt: number;
  readonly trailLength: number;
  readonly trailWidth: number;
}

interface QualityBudget {
  readonly maximumGates: number;
  readonly maximumCoins: number;
  readonly clouds: number;
  readonly debris: number;
  readonly laneLights: number;
}

interface AmbientSeed {
  readonly u: number;
  readonly v: number;
  readonly depth: number;
  readonly scale: number;
  readonly speed: number;
  readonly spin: number;
}

const QUALITY_BUDGET: Readonly<Record<RenderQuality, QualityBudget>> = Object.freeze({
  low: Object.freeze({ maximumGates: 9, maximumCoins: 30, clouds: 10, debris: 5, laneLights: 12 }),
  medium: Object.freeze({ maximumGates: 12, maximumCoins: 42, clouds: 18, debris: 9, laneLights: 18 }),
  high: Object.freeze({ maximumGates: 14, maximumCoins: 54, clouds: 28, debris: 14, laneLights: 24 }),
});

const MODE_COLOURS: Readonly<Record<MutationModeId, number>> = Object.freeze({
  frog: 0x64e27a,
  rubber: 0xff6077,
  steel: 0xb8d4df,
  ghost: 0x80f2ff,
  stork: 0xf06455,
});

const COLLISION_AHEAD_COLOUR = new THREE.Color(0x35d8f2);
const COLLISION_NEAR_COLOUR = new THREE.Color(0xff8a24);
const COLLISION_CONTACT_COLOUR = new THREE.Color(0xffe48a);
const COLLISION_BEHIND_COLOUR = new THREE.Color(0x718aa8);

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

const positiveModulo = (value: number, modulus: number): number => (
  ((value % modulus) + modulus) % modulus
);

function smoothstep01(value: number): number {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function hashPhase(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x100000000 * Math.PI * 2;
}

/**
 * Converts simulation coin truth into a rail-aligned visual pose. Its centre
 * is deliberately an exact projection: only aura/trail emphasis may react to
 * proximity, never x/y/z or the opaque coin radius.
 */
export function createCoinRenderPose(
  projection: WorldProjection,
  input: Readonly<CoinRenderPoseInput>,
): CoinRenderPose {
  const radius = Math.max(0, Number.isFinite(input.radius) ? input.radius : 0);
  const proximity = smoothstep01(input.normalizedProximity);
  const phase = Number.isFinite(input.phase) ? input.phase : 0;
  const time = Number.isFinite(input.time) ? input.time : 0;
  const pulse = Math.sin(time * 5.4 + phase) * 0.045;

  return Object.freeze({
    x: projection.mapX(input.simulationX),
    y: projection.mapY(input.simulationY),
    z: projection.depthAt(input.simulationX),
    solidRadius: radius,
    // Keep the old long-distance readability around a physically sized solid
    // coin. The halo grows near the player instead of lying about collision.
    haloRadius: radius * (1.78 + pulse + proximity * 0.34),
    // A restrained rail-local wobble reads as a spin but never turns the coin
    // into an unrelated edge-on sliver at the cinematic chase-camera angle.
    yaw: projection.pathYaw + Math.sin(time * 3.15 + phase) * 0.3,
    tilt: Math.sin(time * 2.35 + phase * 0.7) * 0.08,
    trailLength: projection.pathScale * (0.38 + proximity * 0.34),
    trailWidth: radius * (0.1 + proximity * 0.08),
  });
}

export function createWorldProjection(aspect: number): WorldProjection {
  const safeAspect = clamp(Number.isFinite(aspect) ? aspect : 1, 0.38, 2.5);
  const viewHeight = DEFAULT_GAME_CONFIG.world.height + 1.2;
  const viewWidth = viewHeight * safeAspect;
  const xScale = Math.max(
    viewWidth / DEFAULT_GAME_CONFIG.world.width,
    clamp(viewHeight * 0.06, 0.58, 0.72),
  );
  const playerAnchor = -viewWidth * 0.24;
  const halfHeight = DEFAULT_GAME_CONFIG.world.height / 2;
  const depthSlope = -0.43;
  const pathScale = Math.hypot(xScale, depthSlope);
  const pathYaw = Math.atan2(xScale, depthSlope);

  return Object.freeze({
    viewWidth,
    viewHeight,
    xScale,
    pathScale,
    pathYaw,
    mapX: (simulationX: number): number => (
      playerAnchor + (simulationX - DEFAULT_GAME_CONFIG.player.startX) * xScale
    ),
    mapY: (simulationY: number): number => simulationY - halfHeight,
    depthAt: (simulationX: number): number => clamp(
      (simulationX - DEFAULT_GAME_CONFIG.player.startX) * depthSlope,
      // Keep the course genuinely longitudinal. The previous shallow clamp
      // collapsed every distant gate onto one backdrop plane, erasing depth.
      -64,
      1.55,
    ),
  });
}

function worldTimeScale(state: Readonly<GameState>): number {
  if (
    state.mode.active === 'frog'
    && (state.mode.frog.phase === 'clinging' || state.mode.frog.phase === 'charging')
  ) return DEFAULT_GAME_CONFIG.modes.frog.worldScaleWhileClinging;
  if (state.mode.active === 'rubber' && state.mode.rubber.phase === 'aiming') {
    return DEFAULT_GAME_CONFIG.modes.rubber.worldScaleWhileAiming;
  }
  if (state.mode.active === 'stork' && state.mode.stork.phase === 'aiming') {
    return DEFAULT_GAME_CONFIG.modes.stork.aimWorldScale;
  }
  return 1;
}

function interpolatedWorldX(
  state: Readonly<GameState>,
  x: number,
  alpha: number,
): number {
  const tier = getDifficultyTier(state.world.passedObstacles);
  return x - tier.speed
    * worldTimeScale(state)
    * DEFAULT_GAME_CONFIG.fixedStep
    * clamp(alpha, 0, 1);
}

function interpolatedObstacleX(
  state: Readonly<GameState>,
  obstacle: Readonly<ObstacleState>,
  alpha: number,
): number {
  if (obstacle.active) return interpolatedWorldX(state, obstacle.x, alpha);
  if (state.dna.offer) return obstacle.x;
  const spawnX = DEFAULT_GAME_CONFIG.world.width + DEFAULT_GAME_CONFIG.obstacle.spawnLead;
  const remaining = Math.max(DEFAULT_GAME_CONFIG.fixedStep, obstacle.activationDelay);
  const velocity = (obstacle.x - spawnX) / remaining;
  return obstacle.x - velocity * DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
}

type GateTransitPhase = 'ahead' | 'contact' | 'behind';

class GateView {
  readonly root = new THREE.Group();
  id: string | null = null;
  seenRevision = -1;

  private readonly lowerColumn: THREE.Mesh;
  private readonly upperColumn: THREE.Mesh;
  private readonly lowerFace: THREE.Mesh;
  private readonly upperFace: THREE.Mesh;
  private readonly lowerBackFace: THREE.Mesh;
  private readonly upperBackFace: THREE.Mesh;
  private readonly lowerRim: THREE.Mesh;
  private readonly upperRim: THREE.Mesh;
  private readonly lowerConduit: THREE.Mesh;
  private readonly upperConduit: THREE.Mesh;
  private readonly lowerNode: THREE.Mesh;
  private readonly upperNode: THREE.Mesh;
  private readonly lowerLock: THREE.Mesh;
  private readonly upperLock: THREE.Mesh;
  private readonly lowerCollisionEdge: THREE.Mesh;
  private readonly upperCollisionEdge: THREE.Mesh;
  private readonly safeGapPane: THREE.Mesh;
  private readonly rivets: THREE.InstancedMesh;
  private readonly rustMarks: THREE.InstancedMesh;
  private readonly rustBands: THREE.InstancedMesh;
  private readonly algaeBand: THREE.Mesh;
  private readonly mineralGrowths: THREE.InstancedMesh;
  private readonly plants: THREE.InstancedMesh;
  private readonly rustMaterials: readonly THREE.Material[];
  private readonly plantMaterials: readonly THREE.Material[];
  private readonly dressingQuality: RenderQuality;
  private readonly collisionMaterial: THREE.MeshBasicMaterial;
  private readonly paneMaterial: THREE.MeshBasicMaterial;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly twistQuaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private readonly surfaceNormal = new THREE.Vector3();
  private readonly geometryNormal = new THREE.Vector3(0, 0, 1);
  private readonly verticalAxis = new THREE.Vector3(0, 1, 0);
  private readonly plantEuler = new THREE.Euler();
  private readonly focusColour = new THREE.Color();
  private readonly instanceColour = new THREE.Color();
  private dressing: Readonly<GateDressing> | null = null;

  constructor(
    columnGeometry: THREE.BufferGeometry,
    detailGeometry: THREE.BufferGeometry,
    nodeGeometry: THREE.BufferGeometry,
    lockGeometry: THREE.BufferGeometry,
    rustGeometry: THREE.BufferGeometry,
    rustBandGeometry: THREE.BufferGeometry,
    mineralGeometry: THREE.BufferGeometry,
    wetBandGeometry: THREE.BufferGeometry,
    plantGeometry: THREE.BufferGeometry,
    columnMaterial: THREE.Material,
    faceMaterial: THREE.Material,
    backFaceMaterial: THREE.Material,
    detailMaterial: THREE.Material,
    nodeMaterial: THREE.Material,
    lockMaterial: THREE.Material,
    collisionMaterial: THREE.MeshBasicMaterial,
    paneMaterial: THREE.MeshBasicMaterial,
    rustMaterials: readonly THREE.Material[],
    plantMaterials: readonly THREE.Material[],
    algaeMaterial: THREE.Material,
    mineralMaterial: THREE.Material,
    dressingProfile: Readonly<GateDressingQualityProfile>,
    dressingQuality: RenderQuality,
  ) {
    this.root.name = 'gate-view';
    this.root.visible = false;

    this.lowerColumn = new THREE.Mesh(columnGeometry, columnMaterial);
    this.lowerColumn.name = 'gate-lower-cylinder';
    this.upperColumn = new THREE.Mesh(columnGeometry, columnMaterial);
    this.upperColumn.name = 'gate-upper-cylinder';
    this.lowerFace = new THREE.Mesh(columnGeometry, faceMaterial);
    this.upperFace = new THREE.Mesh(columnGeometry, faceMaterial);
    this.lowerBackFace = new THREE.Mesh(columnGeometry, backFaceMaterial);
    this.upperBackFace = new THREE.Mesh(columnGeometry, backFaceMaterial);
    this.lowerRim = new THREE.Mesh(columnGeometry, detailMaterial);
    this.lowerRim.name = 'gate-lower-gap-collar';
    this.upperRim = new THREE.Mesh(columnGeometry, detailMaterial);
    this.upperRim.name = 'gate-upper-gap-collar';
    this.lowerConduit = new THREE.Mesh(columnGeometry, nodeMaterial);
    this.upperConduit = new THREE.Mesh(columnGeometry, nodeMaterial);
    this.lowerNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    this.upperNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    this.lowerLock = new THREE.Mesh(lockGeometry, lockMaterial);
    this.upperLock = new THREE.Mesh(lockGeometry, lockMaterial);
    this.collisionMaterial = collisionMaterial;
    this.paneMaterial = paneMaterial;
    this.lowerCollisionEdge = new THREE.Mesh(columnGeometry, collisionMaterial);
    this.upperCollisionEdge = new THREE.Mesh(columnGeometry, collisionMaterial);
    this.safeGapPane = new THREE.Mesh(columnGeometry, paneMaterial);
    this.lowerCollisionEdge.renderOrder = 12;
    this.upperCollisionEdge.renderOrder = 12;
    this.safeGapPane.renderOrder = 7;
    this.rivets = new THREE.InstancedMesh(detailGeometry, detailMaterial, 8);
    this.rivets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rivets.count = 8;
    this.rustMaterials = rustMaterials;
    this.plantMaterials = plantMaterials;
    this.dressingQuality = dressingQuality;
    this.rustMarks = new THREE.InstancedMesh(
      rustGeometry,
      rustMaterials[0] ?? detailMaterial,
      dressingProfile.maximumRustMarks,
    );
    this.rustMarks.name = 'gate-rust-marks';
    this.rustMarks.count = 0;
    this.rustMarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rustMarks.frustumCulled = false;
    this.rustBands = new THREE.InstancedMesh(
      rustBandGeometry,
      rustMaterials[0] ?? detailMaterial,
      2,
    );
    this.rustBands.name = 'gate-rust-bands';
    this.rustBands.count = 0;
    this.rustBands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rustBands.frustumCulled = false;
    this.algaeBand = new THREE.Mesh(wetBandGeometry, algaeMaterial);
    this.algaeBand.name = 'gate-algae-waterline-band';
    this.algaeBand.visible = false;
    this.mineralGrowths = new THREE.InstancedMesh(
      mineralGeometry,
      mineralMaterial,
      dressingProfile.maximumMineralGrowths,
    );
    this.mineralGrowths.name = 'gate-mineral-barnacles';
    this.mineralGrowths.count = 0;
    this.mineralGrowths.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mineralGrowths.frustumCulled = false;
    this.plants = new THREE.InstancedMesh(
      plantGeometry,
      plantMaterials[0] ?? detailMaterial,
      dressingProfile.maximumPlantBlades,
    );
    this.plants.name = 'gate-water-plants';
    this.plants.count = 0;
    this.plants.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.plants.frustumCulled = false;

    this.lowerLock.visible = false;
    this.upperLock.visible = false;
    this.lowerCollisionEdge.visible = false;
    this.upperCollisionEdge.visible = false;
    this.safeGapPane.visible = false;
    this.root.add(
      this.lowerColumn,
      this.upperColumn,
      this.lowerFace,
      this.upperFace,
      this.lowerBackFace,
      this.upperBackFace,
      this.lowerRim,
      this.upperRim,
      this.lowerConduit,
      this.upperConduit,
      this.lowerNode,
      this.upperNode,
      this.lowerLock,
      this.upperLock,
      this.safeGapPane,
      this.lowerCollisionEdge,
      this.upperCollisionEdge,
      this.rivets,
      this.rustMarks,
      this.rustBands,
      this.algaeBand,
      this.mineralGrowths,
      this.plants,
    );
  }

  update(
    obstacle: Readonly<ObstacleState>,
    visualX: number,
    projection: WorldProjection,
    locked: boolean,
    focusStrength: number,
    transitPhase: GateTransitPhase,
    time: number,
    showDressing: boolean,
    reducedMotion: boolean,
  ): void {
    const gapBottom = clamp(obstacle.gapCenter - obstacle.gapSize / 2, 0, DEFAULT_GAME_CONFIG.world.height);
    const gapTop = clamp(obstacle.gapCenter + obstacle.gapSize / 2, 0, DEFAULT_GAME_CONFIG.world.height);
    const lowerHeight = gapBottom;
    const upperHeight = DEFAULT_GAME_CONFIG.world.height - gapTop;
    const pathDepth = Math.max(0.42, obstacle.width * projection.pathScale);
    const crossWidth = clamp(0.9 + pathDepth * 0.22, 0.96, 1.18);
    const rimHeight = 0.24;
    const leadingZ = -pathDepth * 0.51;

    this.root.visible = true;
    this.root.userData.obstacleId = obstacle.id;
    this.root.position.set(projection.mapX(visualX), 0, projection.depthAt(visualX));
    this.root.rotation.y = projection.pathYaw
      + Math.sin(time * 0.8 + obstacle.motionPhase) * 0.012;

    this.lowerColumn.visible = lowerHeight > 0.01;
    this.lowerColumn.position.set(0, projection.mapY(lowerHeight / 2), 0);
    this.lowerColumn.scale.set(crossWidth, Math.max(0.001, lowerHeight), pathDepth);

    this.upperColumn.visible = upperHeight > 0.01;
    this.upperColumn.position.set(0, projection.mapY(gapTop + upperHeight / 2), 0);
    this.upperColumn.scale.set(crossWidth, Math.max(0.001, upperHeight), pathDepth);

    // The old broad front/back plates flattened the silhouette. Keep these
    // pooled meshes disabled: corrosion now supplies readable surface breakup.
    this.lowerFace.visible = false;
    this.upperFace.visible = false;
    this.lowerBackFace.visible = false;
    this.upperBackFace.visible = false;

    this.lowerRim.position.set(0, projection.mapY(gapBottom) - rimHeight / 2, 0.08);
    this.lowerRim.scale.set(crossWidth * 1.34, rimHeight, pathDepth * 1.18);
    this.upperRim.position.set(0, projection.mapY(gapTop) + rimHeight / 2, 0.08);
    this.upperRim.scale.set(crossWidth * 1.34, rimHeight, pathDepth * 1.18);

    this.lowerConduit.visible = lowerHeight > 0.32;
    this.lowerConduit.position.set(-crossWidth * 0.28, projection.mapY(lowerHeight / 2), leadingZ - 0.04);
    this.lowerConduit.scale.set(0.035, Math.max(0.02, lowerHeight - 0.42), 0.035);
    this.upperConduit.visible = upperHeight > 0.32;
    this.upperConduit.position.set(-crossWidth * 0.28, projection.mapY(gapTop + upperHeight / 2), leadingZ - 0.04);
    this.upperConduit.scale.set(0.035, Math.max(0.02, upperHeight - 0.42), 0.035);

    this.lowerNode.position.set(0, projection.mapY(gapBottom) + 0.14, leadingZ - 0.055);
    this.upperNode.position.set(0, projection.mapY(gapTop) - 0.14, leadingZ - 0.055);
    const nodePulse = 0.88 + Math.sin(time * 5 + obstacle.motionPhase) * 0.12;
    this.lowerNode.scale.setScalar(nodePulse);
    this.upperNode.scale.setScalar(nodePulse);

    this.lowerLock.visible = locked;
    this.upperLock.visible = locked;
    this.lowerLock.position.copy(this.lowerNode.position);
    this.upperLock.position.copy(this.upperNode.position);
    if (locked) {
      const lockPulse = 1 + Math.sin(time * 9) * 0.1;
      this.lowerLock.scale.setScalar(lockPulse);
      this.upperLock.scale.setScalar(lockPulse);
      this.lowerLock.rotation.z = time * 1.5;
      this.upperLock.rotation.z = -time * 1.5;
    }

    const focused = focusStrength > 0.001;
    this.lowerCollisionEdge.visible = focused;
    this.upperCollisionEdge.visible = focused;
    this.safeGapPane.visible = focused;
    if (focused) {
      if (transitPhase === 'contact') this.focusColour.copy(COLLISION_CONTACT_COLOUR);
      else if (transitPhase === 'behind') this.focusColour.copy(COLLISION_BEHIND_COLOUR);
      else this.focusColour.copy(COLLISION_AHEAD_COLOUR).lerp(COLLISION_NEAR_COLOUR, focusStrength);
      const pulse = 1 + Math.sin(time * (7 + focusStrength * 7)) * 0.08 * focusStrength;
      this.collisionMaterial.color.copy(this.focusColour);
      this.collisionMaterial.opacity = 0.38 + focusStrength * 0.55;
      this.paneMaterial.color.copy(this.focusColour);
      this.paneMaterial.opacity = 0.018 + focusStrength * 0.055;
      this.lowerCollisionEdge.position.set(0, projection.mapY(gapBottom), leadingZ - 0.075);
      this.lowerCollisionEdge.scale.set(crossWidth * 1.5 * pulse, 0.055, 0.035);
      this.upperCollisionEdge.position.set(0, projection.mapY(gapTop), leadingZ - 0.075);
      this.upperCollisionEdge.scale.set(crossWidth * 1.5 * pulse, 0.055, 0.035);
      this.safeGapPane.position.set(0, projection.mapY(obstacle.gapCenter), leadingZ - 0.055);
      this.safeGapPane.scale.set(crossWidth * 1.28, Math.max(0.02, obstacle.gapSize - 0.08), 0.018);
    }

    for (let index = 0; index < 8; index += 1) {
      const upper = index >= 4;
      const localIndex = index % 4;
      const height = upper ? upperHeight : lowerHeight;
      const baseY = upper ? gapTop : 0;
      const y = baseY + (localIndex + 0.5) * height / 4;
      this.position.set(
        (localIndex % 2 === 0 ? -1 : 1) * crossWidth * 0.3,
        projection.mapY(y),
        leadingZ - 0.035,
      );
      this.scale.setScalar(0.055);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.rivets.setMatrixAt(index, this.matrix);
    }
    this.rivets.instanceMatrix.needsUpdate = true;
    this.updateDressing(
      obstacle.id,
      projection,
      lowerHeight,
      upperHeight,
      gapTop,
      crossWidth,
      pathDepth,
      showDressing,
      time,
      reducedMotion,
    );
  }

  private updateDressing(
    obstacleId: string,
    projection: WorldProjection,
    lowerHeight: number,
    upperHeight: number,
    gapTop: number,
    crossWidth: number,
    pathDepth: number,
    visible: boolean,
    time: number,
    reducedMotion: boolean,
  ): void {
    if (!this.dressing) this.dressing = createGateDressing(obstacleId, this.dressingQuality);
    const dressing = this.dressing;
    this.rustMarks.visible = visible;
    this.rustBands.visible = visible;
    this.algaeBand.visible = visible && lowerHeight > 0.28;
    this.mineralGrowths.visible = visible;
    this.plants.visible = visible && lowerHeight > 0.2;
    if (!visible) return;

    const rustMaterial = this.rustMaterials[dressing.rustVariant];
    if (rustMaterial) {
      this.rustMarks.material = rustMaterial;
      this.rustBands.material = rustMaterial;
    }
    const plantMaterial = this.plantMaterials[dressing.plantVariant];
    if (plantMaterial) this.plants.material = plantMaterial;

    const halfWidth = crossWidth * 0.5;
    const halfDepth = pathDepth * 0.5;

    const algaeHeight = Math.min(0.34, Math.max(0, lowerHeight - 0.24));
    this.algaeBand.position.set(0, projection.mapY(-0.035 + algaeHeight / 2), 0);
    this.algaeBand.rotation.y = dressing.wetBandRotation;
    this.algaeBand.scale.set(crossWidth * 1.075, algaeHeight, pathDepth * 1.075);

    const flangeBands = dressing.bandVariant === 1;
    const bandHeight = flangeBands ? 0.075 : 0.11 + dressing.bandVariant * 0.02;
    this.rustBands.count = 2;
    for (let index = 0; index < 2; index += 1) {
      const upper = index === 1;
      const columnHeight = upper ? upperHeight : lowerHeight;
      const baseY = upper ? gapTop : 0;
      let localY: number;
      if (flangeBands) {
        localY = upper ? 0.055 : columnHeight - 0.055;
      } else if (dressing.bandVariant === 0) {
        localY = upper ? Math.min(0.28, columnHeight * 0.22) : Math.min(0.3, columnHeight * 0.24);
      } else {
        localY = columnHeight * (upper ? 0.42 : 0.58);
      }
      localY = clamp(localY, bandHeight / 2 + 0.025, columnHeight - bandHeight / 2 - 0.025);
      this.position.set(0, projection.mapY(baseY + localY), 0);
      this.quaternion.setFromAxisAngle(
        this.verticalAxis,
        dressing.bandRotation + index * 1.37,
      );
      const bandScale = flangeBands ? 1.315 : 1.045;
      const depthScale = flangeBands ? 1.16 : 1.045;
      const visibilityScale = columnHeight > bandHeight + 0.08 ? 1 : 0;
      this.scale.set(
        crossWidth * bandScale * visibilityScale,
        bandHeight * visibilityScale,
        pathDepth * depthScale * visibilityScale,
      );
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.rustBands.setMatrixAt(index, this.matrix);
    }
    this.rustBands.instanceMatrix.needsUpdate = true;

    this.rustMarks.count = dressing.rustMarks.length;
    for (let index = 0; index < dressing.rustMarks.length; index += 1) {
      const mark = dressing.rustMarks[index];
      if (!mark) continue;
      const columnHeight = mark.upper ? upperHeight : lowerHeight;
      const baseY = mark.upper ? gapTop : 0;
      const angleCos = Math.cos(mark.angle);
      const angleSin = Math.sin(mark.angle);
      this.surfaceNormal.set(
        angleCos / Math.max(0.001, halfWidth),
        0,
        angleSin / Math.max(0.001, halfDepth),
      ).normalize();
      const verticalInset = Math.min(0.12, columnHeight * 0.2);
      const usableHeight = Math.max(0, columnHeight - verticalInset * 2);
      this.position.set(
        halfWidth * angleCos + this.surfaceNormal.x * 0.012,
        projection.mapY(baseY + verticalInset + usableHeight * mark.heightRatio),
        halfDepth * angleSin + this.surfaceNormal.z * 0.012,
      );
      this.quaternion.setFromUnitVectors(this.geometryNormal, this.surfaceNormal);
      this.twistQuaternion.setFromAxisAngle(this.surfaceNormal, mark.rotation);
      this.quaternion.premultiply(this.twistQuaternion);
      const markScale = columnHeight > 0.12 ? Math.min(1, columnHeight / 0.46) : 0;
      const silhouetteWidth = mark.silhouette === 0 ? 0.82 : mark.silhouette === 1 ? 1.08 : 0.94;
      const silhouetteHeight = mark.silhouette === 0 ? 1.16 : mark.silhouette === 1 ? 0.82 : 1;
      this.scale.set(
        mark.width * silhouetteWidth * markScale,
        mark.height * silhouetteHeight * markScale,
        1,
      );
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.rustMarks.setMatrixAt(index, this.matrix);
      const warmBias = mark.silhouette === 1 ? 0.08 : 0;
      this.instanceColour.setRGB(
        Math.min(1, mark.tone + warmBias),
        mark.tone * (mark.silhouette === 2 ? 0.68 : 0.78),
        mark.tone * 0.6,
      );
      this.rustMarks.setColorAt(index, this.instanceColour);
    }
    this.rustMarks.instanceMatrix.needsUpdate = true;
    if (this.rustMarks.instanceColor) this.rustMarks.instanceColor.needsUpdate = true;

    this.mineralGrowths.count = dressing.mineralGrowths.length;
    for (let index = 0; index < dressing.mineralGrowths.length; index += 1) {
      const growth = dressing.mineralGrowths[index];
      if (!growth) continue;
      const upper = growth.anchor === 'upper-collar' || growth.anchor === 'upper-body';
      const collar = growth.anchor === 'lower-collar' || growth.anchor === 'upper-collar';
      const waterline = growth.anchor === 'waterline';
      const columnHeight = upper ? upperHeight : lowerHeight;
      const baseY = upper ? gapTop : 0;
      let localY: number;
      if (waterline) localY = 0.1 + growth.heightRatio * 0.2;
      else if (growth.anchor === 'lower-collar') localY = columnHeight - 0.13;
      else if (growth.anchor === 'upper-collar') localY = 0.13;
      else localY = 0.2 + growth.heightRatio * Math.max(0, columnHeight - 0.4);

      const growthHalfWidth = collar ? crossWidth * 0.665 : halfWidth;
      const growthHalfDepth = collar ? pathDepth * 0.585 : halfDepth;
      const angleCos = Math.cos(growth.angle);
      const angleSin = Math.sin(growth.angle);
      this.surfaceNormal.set(
        angleCos / Math.max(0.001, growthHalfWidth),
        0,
        angleSin / Math.max(0.001, growthHalfDepth),
      ).normalize();
      this.position.set(
        growthHalfWidth * angleCos + this.surfaceNormal.x * growth.depth * 0.2,
        projection.mapY(baseY + localY),
        growthHalfDepth * angleSin + this.surfaceNormal.z * growth.depth * 0.2,
      );
      this.quaternion.setFromUnitVectors(this.geometryNormal, this.surfaceNormal);
      this.twistQuaternion.setFromAxisAngle(this.surfaceNormal, growth.rotation);
      this.quaternion.premultiply(this.twistQuaternion);
      const verticalExtent = growth.size * Math.max(1, growth.stretch) * 0.55;
      const staysOutsideGap = upper
        ? localY - verticalExtent > 0.025
        : localY + verticalExtent < columnHeight - 0.025;
      const gapClear = staysOutsideGap && (waterline
        ? lowerHeight > 0.38
        : columnHeight > (collar ? 0.28 : 0.44));
      const growthScale = gapClear ? 1 : 0;
      this.scale.set(
        growth.size * growthScale,
        growth.size * growth.stretch * growthScale,
        growth.depth * growthScale,
      );
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.mineralGrowths.setMatrixAt(index, this.matrix);
    }
    this.mineralGrowths.instanceMatrix.needsUpdate = true;

    this.plants.count = dressing.plantBlades.length;
    const gateSwayPhase = hashPhase(obstacleId);
    const qualityAmplitude = this.dressingQuality === 'low'
      ? 0.035
      : this.dressingQuality === 'medium'
        ? 0.062
        : 0.078;
    const current = reducedMotion ? 0 : Math.sin(time * 0.74 + gateSwayPhase) * 0.026;
    for (let index = 0; index < dressing.plantBlades.length; index += 1) {
      const blade = dressing.plantBlades[index];
      if (!blade) continue;
      const plantBaseHeight = 0.12;
      const bladeHeight = Math.max(
        0,
        Math.min(blade.height, lowerHeight - plantBaseHeight - 0.2),
      );
      this.position.set(
        halfWidth * blade.radius * Math.cos(blade.angle),
        projection.mapY(plantBaseHeight),
        halfDepth * blade.radius * Math.sin(blade.angle),
      );
      // Camera-facing crossed cards keep every blade readable from the flight
      // camera; their positions still alternate around both sides of the pipe.
      const crossedYaw = index % 2 === 0 ? -0.22 : 0.22;
      const sway = reducedMotion
        ? 0
        : Math.sin(time * 1.28 + gateSwayPhase + index * 1.73) * qualityAmplitude;
      // A tiny shared current component keeps neighbouring blades coherent;
      // the per-blade phase stops the cluster behaving like a rigid fan.
      this.plantEuler.set(sway * 0.35, crossedYaw, blade.lean + sway + current);
      this.quaternion.setFromEuler(this.plantEuler);
      this.scale.set(blade.width, bladeHeight, 1);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.plants.setMatrixAt(index, this.matrix);
    }
    this.plants.instanceMatrix.needsUpdate = true;
  }

  release(): void {
    this.id = null;
    this.seenRevision = -1;
    this.root.visible = false;
    delete this.root.userData.obstacleId;
    this.lowerLock.visible = false;
    this.upperLock.visible = false;
    this.lowerCollisionEdge.visible = false;
    this.upperCollisionEdge.visible = false;
    this.safeGapPane.visible = false;
    this.rustMarks.visible = false;
    this.rustMarks.count = 0;
    this.rustBands.visible = false;
    this.rustBands.count = 0;
    this.algaeBand.visible = false;
    this.mineralGrowths.visible = false;
    this.mineralGrowths.count = 0;
    this.plants.visible = false;
    this.plants.count = 0;
    this.dressing = null;
  }
}

class PortalLane {
  readonly root = new THREE.Group();
  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly innerRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private readonly veil: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly icons: Readonly<Record<MutationModeId, THREE.Mesh>>;

  constructor(
    ringGeometry: THREE.TorusGeometry,
    veilGeometry: THREE.CircleGeometry,
    iconGeometries: Readonly<Record<MutationModeId, THREE.BufferGeometry>>,
    trackMaterial: <T extends THREE.Material>(material: T) => T,
  ) {
    const ringMaterial = trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.1,
      roughness: 0.26,
      metalness: 0.28,
      transparent: true,
      opacity: 0.88,
    }));
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    const innerMaterial = trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.innerRing = new THREE.Mesh(ringGeometry, innerMaterial);
    this.innerRing.scale.setScalar(0.74);
    const veilMaterial = trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }));
    this.veil = new THREE.Mesh(veilGeometry, veilMaterial);
    this.veil.position.z = -0.035;
    this.root.add(this.veil, this.ring, this.innerRing);

    const icons = {} as Record<MutationModeId, THREE.Mesh>;
    for (const mode of Object.keys(MODE_COLOURS) as MutationModeId[]) {
      const material = trackMaterial(new THREE.MeshStandardMaterial({
        color: MODE_COLOURS[mode],
        emissive: MODE_COLOURS[mode],
        emissiveIntensity: 0.62,
        roughness: mode === 'steel' ? 0.2 : 0.58,
        metalness: mode === 'steel' ? 0.82 : 0.04,
        transparent: mode === 'ghost',
        opacity: mode === 'ghost' ? 0.58 : 1,
      }));
      const icon = new THREE.Mesh(iconGeometries[mode], material);
      icon.visible = false;
      icon.position.z = 0.08;
      icons[mode] = icon;
      this.root.add(icon);
    }
    this.icons = icons;
  }

  update(
    mode: MutationModeId,
    x: number,
    y: number,
    z: number,
    frameYaw: number,
    time: number,
  ): void {
    this.root.position.set(x, y, z);
    this.root.rotation.y = frameYaw + Math.sin(time * 1.4) * 0.025;
    const pulse = 0.92 + Math.sin(time * 5.5) * 0.06;
    this.root.scale.setScalar(pulse);
    this.ring.rotation.z = time * 0.7;
    this.innerRing.rotation.z = -time * 1.15;
    this.ring.material.color.setHex(MODE_COLOURS[mode]);
    this.ring.material.emissive.setHex(MODE_COLOURS[mode]);
    this.innerRing.material.color.setHex(MODE_COLOURS[mode]);
    this.veil.material.color.setHex(MODE_COLOURS[mode]);
    for (const candidate of Object.keys(this.icons) as MutationModeId[]) {
      this.icons[candidate].visible = candidate === mode;
    }
    this.icons[mode].rotation.y = time * 1.8;
    this.icons[mode].rotation.z = mode === 'stork' ? -Math.PI / 2 : 0;
  }
}

class PortalView {
  readonly root = new THREE.Group();
  private readonly upper: PortalLane;
  private readonly lower: PortalLane;

  constructor(
    ringGeometry: THREE.TorusGeometry,
    veilGeometry: THREE.CircleGeometry,
    iconGeometries: Readonly<Record<MutationModeId, THREE.BufferGeometry>>,
    trackMaterial: <T extends THREE.Material>(material: T) => T,
  ) {
    this.root.name = 'mutation-portals';
    this.root.visible = false;
    this.upper = new PortalLane(ringGeometry, veilGeometry, iconGeometries, trackMaterial);
    this.lower = new PortalLane(ringGeometry, veilGeometry, iconGeometries, trackMaterial);
    this.root.add(this.upper.root, this.lower.root);
  }

  update(state: Readonly<GameState>, projection: WorldProjection, visualX: number, time: number): void {
    const offer = state.dna.offer;
    if (!offer) {
      this.root.visible = false;
      return;
    }
    this.root.visible = true;
    const x = projection.mapX(visualX);
    const z = projection.depthAt(visualX);
    this.upper.update(offer.upper, x, projection.mapY(offer.upperY), z, projection.pathYaw, time);
    this.lower.update(offer.lower, x, projection.mapY(offer.lowerY), z, projection.pathYaw, time);
  }

  reset(): void {
    this.root.visible = false;
  }
}

/** Owns pooled obstacle/collectible views plus the procedural world dressing. */
export class WorldViews {
  private readonly root = new THREE.Group();
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly budget: QualityBudget;
  private readonly gateDressingProfile: Readonly<GateDressingQualityProfile>;
  private readonly gatePool: GateView[] = [];
  private readonly freeGates: GateView[] = [];
  private readonly gatesById = new Map<string, GateView>();
  private readonly coinRings: THREE.InstancedMesh;
  private readonly coinCores: THREE.InstancedMesh;
  private readonly coinHalos: THREE.InstancedMesh;
  private readonly coinTrails: THREE.InstancedMesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly debris: THREE.InstancedMesh;
  private readonly distantReeds: THREE.InstancedMesh;
  private readonly distantBuoys: THREE.InstancedMesh;
  private readonly distantIslands: THREE.InstancedMesh;
  private readonly distantWreckHulls: THREE.InstancedMesh;
  private readonly distantWreckMasts: THREE.InstancedMesh;
  private readonly distantBirds: THREE.InstancedMesh;
  private readonly laneLights: THREE.InstancedMesh;
  private readonly flightRailCore: THREE.Mesh;
  private readonly flightRailGlow: THREE.Mesh;
  private readonly railTicks: THREE.InstancedMesh;
  private readonly playerProjectionMarker: THREE.Mesh;
  private readonly playerAltitudeGuide: THREE.Mesh;
  private readonly playerHitboxReticle: THREE.Mesh;
  private readonly water: WaterSurface;
  private readonly sun: THREE.Group;
  private readonly portal: PortalView;
  private readonly targetMarker: THREE.Group;
  private readonly targetRing: THREE.Mesh;
  private readonly targetOuterRing: THREE.Mesh;
  private readonly storkAimPath: THREE.InstancedMesh;
  private readonly storkVaultTrail: THREE.InstancedMesh;
  private readonly ambientSeeds: readonly AmbientSeed[];
  private readonly debrisSeeds: readonly AmbientSeed[];
  private readonly environmentLayout: Readonly<EnvironmentLayout>;
  private readonly dummy = new THREE.Object3D();
  private readonly lastEntityPositions = new Map<string, THREE.Vector3>();
  private revision = 0;
  private destroyed = false;

  constructor(parent: THREE.Object3D, quality: RenderQuality) {
    this.root.name = 'world-views';
    this.budget = QUALITY_BUDGET[quality];
    this.gateDressingProfile = getGateDressingQualityProfile(quality);
    parent.add(this.root);

    const skyGeometry = this.trackGeometry(new THREE.SphereGeometry(42, 28, 16));
    const skyMaterial = this.trackMaterial(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColour: { value: new THREE.Color(0x1b6f9e) },
        middleColour: { value: new THREE.Color(0x193456) },
        bottomColour: { value: new THREE.Color(0x140f2b) },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColour;
        uniform vec3 middleColour;
        uniform vec3 bottomColour;
        varying vec3 vDirection;
        void main() {
          float horizon = smoothstep(-0.35, 0.25, vDirection.y);
          vec3 lower = mix(bottomColour, middleColour, smoothstep(-0.85, -0.05, vDirection.y));
          vec3 colour = mix(lower, topColour, horizon);
          gl_FragColor = vec4(colour, 1.0);
        }
      `,
    }));
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = 'procedural-sky';
    sky.frustumCulled = false;
    this.root.add(sky);

    this.water = new WaterSurface(this.root, quality);

    this.environmentLayout = createEnvironmentLayout(quality);
    const reedGeometry = this.trackGeometry(new THREE.PlaneGeometry(1, 1, 1, 2));
    reedGeometry.translate(0, 0.5, 0);
    const reedPositions = reedGeometry.getAttribute('position');
    for (let index = 0; index < reedPositions.count; index += 1) {
      const y = reedPositions.getY(index);
      reedPositions.setX(index, reedPositions.getX(index) * (1 - y * 0.72));
      reedPositions.setZ(index, Math.sin(y * Math.PI) * 0.08);
    }
    reedPositions.needsUpdate = true;
    reedGeometry.computeVertexNormals();
    const buoyGeometry = this.trackGeometry(new THREE.CylinderGeometry(0.16, 0.25, 0.68, 8));
    const islandGeometry = this.trackGeometry(new THREE.DodecahedronGeometry(1, 0));
    const wreckHullGeometry = this.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const wreckMastGeometry = this.trackGeometry(new THREE.CylinderGeometry(0.035, 0.055, 1, 6));
    const birdGeometry = this.trackGeometry(new THREE.BufferGeometry());
    birdGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, -0.54, 0.16, 0, -0.1, 0.025, 0,
      0, 0, 0, 0.54, 0.16, 0, 0.1, 0.025, 0,
    ], 3));

    const reedMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x326e4d,
      emissive: 0x071d15,
      emissiveIntensity: 0.24,
      roughness: 0.96,
      side: THREE.DoubleSide,
    }));
    const buoyMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xc66a3f,
      emissive: 0x361108,
      emissiveIntensity: 0.22,
      roughness: 0.76,
      metalness: 0.16,
    }));
    const islandMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x385646,
      roughness: 0.98,
      metalness: 0.02,
    }));
    const wreckMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x31505a,
      emissive: 0x07161b,
      emissiveIntensity: 0.2,
      roughness: 0.88,
      metalness: 0.26,
    }));
    const birdMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x26384b,
      transparent: true,
      opacity: 0.54,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    }));

    this.distantReeds = new THREE.InstancedMesh(
      reedGeometry,
      reedMaterial,
      this.environmentLayout.reeds.length,
    );
    this.distantBuoys = new THREE.InstancedMesh(
      buoyGeometry,
      buoyMaterial,
      this.environmentLayout.buoys.length,
    );
    this.distantIslands = new THREE.InstancedMesh(
      islandGeometry,
      islandMaterial,
      this.environmentLayout.islands.length,
    );
    this.distantWreckHulls = new THREE.InstancedMesh(
      wreckHullGeometry,
      wreckMaterial,
      this.environmentLayout.wrecks.length,
    );
    this.distantWreckMasts = new THREE.InstancedMesh(
      wreckMastGeometry,
      wreckMaterial,
      this.environmentLayout.wrecks.length,
    );
    this.distantBirds = new THREE.InstancedMesh(
      birdGeometry,
      birdMaterial,
      this.environmentLayout.birds.length,
    );
    const environmentMeshes: readonly [THREE.InstancedMesh, string][] = [
      [this.distantReeds, 'distant-water-reeds'],
      [this.distantBuoys, 'distant-water-buoys'],
      [this.distantIslands, 'distant-water-islands'],
      [this.distantWreckHulls, 'distant-submerged-wreck-hulls'],
      [this.distantWreckMasts, 'distant-submerged-wreck-masts'],
      [this.distantBirds, 'distant-water-birds'],
    ];
    for (const [mesh, name] of environmentMeshes) {
      mesh.name = name;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
    }
    this.root.add(
      this.distantIslands,
      this.distantWreckHulls,
      this.distantWreckMasts,
      this.distantReeds,
      this.distantBuoys,
      this.distantBirds,
    );

    const laneLightGeometry = this.trackGeometry(new THREE.SphereGeometry(0.065, 8, 6));
    const laneLightMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x61e7ff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.laneLights = new THREE.InstancedMesh(
      laneLightGeometry,
      laneLightMaterial,
      this.budget.laneLights,
    );
    this.laneLights.count = this.budget.laneLights;
    this.laneLights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.laneLights.frustumCulled = false;
    this.root.add(this.laneLights);

    const railGeometry = this.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const railCoreMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x6cecff,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    }));
    const railGlowMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x1cc8ed,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.flightRailGlow = new THREE.Mesh(railGeometry, railGlowMaterial);
    this.flightRailGlow.name = 'flight-rail-glow';
    this.flightRailCore = new THREE.Mesh(railGeometry, railCoreMaterial);
    this.flightRailCore.name = 'flight-rail-core';
    this.flightRailGlow.renderOrder = 3;
    this.flightRailCore.renderOrder = 4;
    this.root.add(this.flightRailGlow, this.flightRailCore);

    const tickGeometry = this.trackGeometry(new THREE.BoxGeometry(0.72, 0.022, 0.045));
    const tickMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x8bf5ff,
      transparent: true,
      opacity: 0.43,
      depthWrite: false,
    }));
    this.railTicks = new THREE.InstancedMesh(tickGeometry, tickMaterial, this.budget.laneLights);
    this.railTicks.count = this.budget.laneLights;
    this.railTicks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.railTicks.frustumCulled = false;
    this.root.add(this.railTicks);

    const projectionGeometry = this.trackGeometry(new THREE.TorusGeometry(0.24, 0.028, 7, 28));
    const projectionMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x92f7ff,
      transparent: true,
      opacity: 0.82,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.playerProjectionMarker = new THREE.Mesh(projectionGeometry, projectionMaterial);
    this.playerProjectionMarker.name = 'player-rail-projection';
    this.playerProjectionMarker.rotation.x = Math.PI / 2;
    this.playerProjectionMarker.renderOrder = 14;
    this.root.add(this.playerProjectionMarker);

    const altitudeMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x77e8f5,
      transparent: true,
      opacity: 0.24,
      depthTest: false,
      depthWrite: false,
    }));
    this.playerAltitudeGuide = new THREE.Mesh(railGeometry, altitudeMaterial);
    this.playerAltitudeGuide.name = 'player-altitude-tether';
    this.playerAltitudeGuide.renderOrder = 13;
    this.root.add(this.playerAltitudeGuide);

    const reticleGeometry = this.trackGeometry(new THREE.TorusGeometry(1, 0.032, 7, 36));
    const reticleMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xb8fbff,
      transparent: true,
      opacity: 0.44,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.playerHitboxReticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
    this.playerHitboxReticle.name = 'player-collision-reticle';
    this.playerHitboxReticle.renderOrder = 15;
    this.root.add(this.playerHitboxReticle);

    const sunCoreGeometry = this.trackGeometry(new THREE.SphereGeometry(0.72, 18, 12));
    const sunHaloGeometry = this.trackGeometry(new THREE.SphereGeometry(1.08, 16, 10));
    const sunCoreMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xffd37c,
      fog: false,
    }));
    const sunHaloMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xff9f55,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    }));
    this.sun = new THREE.Group();
    this.sun.name = 'distant-sun';
    this.sun.add(
      new THREE.Mesh(sunCoreGeometry, sunCoreMaterial),
      new THREE.Mesh(sunHaloGeometry, sunHaloMaterial),
    );
    this.root.add(this.sun);

    const cloudGeometry = this.trackGeometry(new THREE.SphereGeometry(1, 10, 7));
    const cloudMaterial = this.trackMaterial(new THREE.MeshLambertMaterial({
      color: 0xbde8ef,
      transparent: true,
      opacity: quality === 'low' ? 0.15 : 0.2,
      depthWrite: false,
    }));
    this.clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, this.budget.clouds);
    this.clouds.count = this.budget.clouds;
    this.clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.clouds.frustumCulled = false;
    this.root.add(this.clouds);

    const debrisGeometry = this.trackGeometry(new THREE.TetrahedronGeometry(0.12, 0));
    const debrisMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x9ab5bd,
      roughness: 0.56,
      metalness: 0.42,
      transparent: true,
      opacity: 0.44,
    }));
    this.debris = new THREE.InstancedMesh(debrisGeometry, debrisMaterial, this.budget.debris);
    this.debris.count = this.budget.debris;
    this.debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debris.frustumCulled = false;
    this.root.add(this.debris);

    const gateGeometry = this.trackGeometry(new THREE.CylinderGeometry(
      0.5,
      0.5,
      1,
      this.gateDressingProfile.cylinderSegments,
      1,
      false,
    ));
    const rivetGeometry = this.trackGeometry(new THREE.SphereGeometry(1, 7, 5));
    const nodeGeometry = this.trackGeometry(new THREE.OctahedronGeometry(0.14, 1));
    const lockGeometry = this.trackGeometry(new THREE.TorusGeometry(0.18, 0.02, 6, 24));
    const createRaggedSleeve = (
      topAmplitude: number,
      bottomAmplitude: number,
      phase: number,
    ): THREE.CylinderGeometry => {
      const geometry = this.trackGeometry(new THREE.CylinderGeometry(
        0.5,
        0.5,
        1,
        this.gateDressingProfile.cylinderSegments,
        1,
        true,
      ));
      const positions = geometry.getAttribute('position');
      for (let index = 0; index < positions.count; index += 1) {
        const x = positions.getX(index);
        const y = positions.getY(index);
        const z = positions.getZ(index);
        const angle = Math.atan2(z, x);
        if (y > 0.25) {
          const roughTop = Math.sin(angle * 3 + phase) * topAmplitude
            + Math.sin(angle * 7 - phase * 0.7) * topAmplitude * 0.38;
          positions.setY(index, 0.5 + roughTop);
        } else if (y < -0.25) {
          const roughBottom = Math.sin(angle * 4 - phase) * bottomAmplitude
            + Math.cos(angle * 9 + phase) * bottomAmplitude * 0.3;
          positions.setY(index, -0.5 + roughBottom);
        }
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      return geometry;
    };
    const rustBandGeometry = createRaggedSleeve(0.14, 0.1, 0.7);
    const wetBandGeometry = createRaggedSleeve(0.22, 0.045, 2.1);
    const rustGeometry = this.trackGeometry(new THREE.BufferGeometry());
    const rustOutline: readonly (readonly [number, number])[] = [
      [-0.24, 0.5],
      [-0.04, 0.45],
      [0.14, 0.5],
      [0.3, 0.36],
      [0.2, 0.23],
      [0.37, 0.11],
      [0.2, -0.03],
      [0.17, -0.24],
      [0.04, -0.18],
      [-0.03, -0.5],
      [-0.18, -0.33],
      [-0.14, -0.16],
      [-0.36, -0.05],
      [-0.21, 0.12],
      [-0.37, 0.25],
      [-0.18, 0.34],
    ];
    const rustVertices: number[] = [];
    for (let index = 0; index < rustOutline.length; index += 1) {
      const current = rustOutline[index];
      const next = rustOutline[(index + 1) % rustOutline.length];
      if (!current || !next) continue;
      rustVertices.push(0, 0, 0, current[0], current[1], 0, next[0], next[1], 0);
    }
    rustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rustVertices, 3));
    rustGeometry.computeVertexNormals();
    const mineralGeometry = this.trackGeometry(new THREE.ConeGeometry(0.5, 1, 6, 1, false));
    mineralGeometry.rotateX(Math.PI / 2);
    const plantGeometry = this.trackGeometry(new THREE.PlaneGeometry(1, 1, 1, 2));
    plantGeometry.translate(0, 0.5, 0);
    const plantPositions = plantGeometry.getAttribute('position');
    for (let index = 0; index < plantPositions.count; index += 1) {
      const y = plantPositions.getY(index);
      const taper = 1 - y * 0.78;
      plantPositions.setX(index, plantPositions.getX(index) * taper);
      plantPositions.setZ(index, Math.sin(y * Math.PI) * 0.12);
    }
    plantPositions.needsUpdate = true;
    plantGeometry.computeVertexNormals();
    const gateMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x446f70,
      roughness: 0.7,
      metalness: 0.38,
    }));
    const gateDetailMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x8aa6a0,
      roughness: 0.48,
      metalness: 0.62,
    }));
    const gateFaceMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x4c8580,
      emissive: 0x092d2a,
      emissiveIntensity: 0.3,
      roughness: 0.58,
      metalness: 0.48,
    }));
    const gateBackMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x183743,
      emissive: 0x06151d,
      emissiveIntensity: 0.26,
      roughness: 0.68,
      metalness: 0.42,
    }));
    const rustMaterials: readonly THREE.Material[] = [
      this.trackMaterial(new THREE.MeshStandardMaterial({
        color: 0x653426,
        roughness: 0.9,
        metalness: 0.07,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })),
      this.trackMaterial(new THREE.MeshStandardMaterial({
        color: 0x7d432d,
        roughness: 0.87,
        metalness: 0.06,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })),
      this.trackMaterial(new THREE.MeshStandardMaterial({
        color: 0x492b26,
        roughness: 0.96,
        metalness: 0.04,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })),
    ];
    const plantMaterials: readonly THREE.Material[] = [
      this.trackMaterial(new THREE.MeshStandardMaterial({
        color: 0x3fa66c,
        emissive: 0x0c2418,
        emissiveIntensity: 0.32,
        roughness: 0.94,
        metalness: 0,
        side: THREE.DoubleSide,
      })),
      this.trackMaterial(new THREE.MeshStandardMaterial({
        color: 0x6d9c52,
        emissive: 0x20230d,
        emissiveIntensity: 0.28,
        roughness: 0.98,
        metalness: 0,
        side: THREE.DoubleSide,
      })),
    ];
    const algaeMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x123c37,
      emissive: 0x061a16,
      emissiveIntensity: 0.18,
      roughness: 0.3,
      metalness: 0.12,
    }));
    const mineralMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xc5b88f,
      emissive: 0x2a2112,
      emissiveIntensity: 0.12,
      roughness: 0.84,
      metalness: 0.02,
    }));
    const nodeMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xffa629,
      emissive: 0xff720b,
      emissiveIntensity: 1.25,
      roughness: 0.25,
      metalness: 0.38,
    }));
    const lockMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x79f7ff,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const collisionMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x64efff,
      transparent: true,
      opacity: 0.75,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const safePaneMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x64efff,
      transparent: true,
      opacity: 0.04,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }));

    const makeGate = (): GateView => {
      const view = new GateView(
        gateGeometry,
        rivetGeometry,
        nodeGeometry,
        lockGeometry,
        rustGeometry,
        rustBandGeometry,
        mineralGeometry,
        wetBandGeometry,
        plantGeometry,
        gateMaterial,
        gateFaceMaterial,
        gateBackMaterial,
        gateDetailMaterial,
        nodeMaterial,
        lockMaterial,
        collisionMaterial,
        safePaneMaterial,
        rustMaterials,
        plantMaterials,
        algaeMaterial,
        mineralMaterial,
        this.gateDressingProfile,
        quality,
      );
      this.gatePool.push(view);
      this.root.add(view.root);
      return view;
    };
    for (let index = 0; index < this.budget.maximumGates; index += 1) {
      const view = makeGate();
      this.freeGates.push(view);
    }

    // The opaque geometry is normalized to an exact outer radius of one. Its
    // instance scale can therefore equal CoinState.radius without making a
    // visible near miss look like a collection.
    const coinRingGeometry = this.trackGeometry(new THREE.TorusGeometry(0.79, 0.21, 8, 24));
    const coinCoreGeometry = this.trackGeometry(new THREE.CylinderGeometry(0.57, 0.57, 0.16, 18));
    coinCoreGeometry.rotateX(Math.PI / 2);
    const coinHaloGeometry = this.trackGeometry(new THREE.TorusGeometry(0.9, 0.1, 7, 28));
    const coinTrailGeometry = this.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const coinRingMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xffce4a,
      emissive: 0xff9b16,
      emissiveIntensity: 0.58,
      roughness: 0.24,
      metalness: 0.72,
      depthTest: true,
      depthWrite: true,
    }));
    const coinCoreMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xfff0a2,
      roughness: 0.34,
      metalness: 0.48,
      depthTest: true,
      depthWrite: true,
    }));
    const coinHaloMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xffc64c,
      transparent: true,
      opacity: 0.24,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const coinTrailMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xffb632,
      transparent: true,
      opacity: 0.28,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.coinRings = new THREE.InstancedMesh(
      coinRingGeometry,
      coinRingMaterial,
      this.budget.maximumCoins,
    );
    this.coinCores = new THREE.InstancedMesh(
      coinCoreGeometry,
      coinCoreMaterial,
      this.budget.maximumCoins,
    );
    this.coinHalos = new THREE.InstancedMesh(
      coinHaloGeometry,
      coinHaloMaterial,
      this.budget.maximumCoins,
    );
    this.coinTrails = new THREE.InstancedMesh(
      coinTrailGeometry,
      coinTrailMaterial,
      this.budget.maximumCoins,
    );
    this.coinRings.name = 'coin-solid-rings';
    this.coinCores.name = 'coin-solid-cores';
    this.coinHalos.name = 'coin-readability-halos';
    this.coinTrails.name = 'coin-rail-trails';
    this.coinRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinCores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinHalos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinTrails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinRings.count = 0;
    this.coinCores.count = 0;
    this.coinHalos.count = 0;
    this.coinTrails.count = 0;
    // Dynamic InstancedMesh bounds are not recomputed after every matrix edit.
    // Disabling object-level culling prevents a stale first-spawn bound from
    // dropping a whole coin chain while fragment depth-testing still handles
    // correct pipe/water occlusion.
    this.coinRings.frustumCulled = false;
    this.coinCores.frustumCulled = false;
    this.coinHalos.frustumCulled = false;
    this.coinTrails.frustumCulled = false;
    this.root.add(this.coinTrails, this.coinHalos, this.coinRings, this.coinCores);

    const portalRing = this.trackGeometry(new THREE.TorusGeometry(0.62, 0.075, 10, 40));
    const portalVeil = this.trackGeometry(new THREE.CircleGeometry(0.54, 32));
    const frogIcon = this.trackGeometry(new THREE.SphereGeometry(0.3, 12, 8));
    frogIcon.scale(1, 0.72, 1);
    const rubberIcon = this.trackGeometry(new THREE.TorusKnotGeometry(0.2, 0.07, 36, 6));
    const steelIcon = this.trackGeometry(new THREE.OctahedronGeometry(0.34, 1));
    const ghostIcon = this.trackGeometry(new THREE.ConeGeometry(0.3, 0.58, 10, 1, true));
    ghostIcon.rotateZ(Math.PI);
    const storkIcon = this.trackGeometry(new THREE.ConeGeometry(0.17, 0.72, 5));
    const iconGeometries: Readonly<Record<MutationModeId, THREE.BufferGeometry>> = {
      frog: frogIcon,
      rubber: rubberIcon,
      steel: steelIcon,
      ghost: ghostIcon,
      stork: storkIcon,
    };
    this.portal = new PortalView(
      portalRing,
      portalVeil,
      iconGeometries,
      <T extends THREE.Material>(material: T): T => this.trackMaterial(material),
    );
    this.root.add(this.portal.root);

    const targetMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x7af8ff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const targetGeometry = this.trackGeometry(new THREE.TorusGeometry(0.27, 0.03, 8, 32));
    const targetOuterGeometry = this.trackGeometry(new THREE.TorusGeometry(0.39, 0.018, 6, 36));
    this.targetMarker = new THREE.Group();
    this.targetMarker.name = 'stork-target-marker';
    this.targetMarker.visible = false;
    this.targetRing = new THREE.Mesh(targetGeometry, targetMaterial);
    this.targetRing.name = 'stork-target-ring';
    this.targetOuterRing = new THREE.Mesh(targetOuterGeometry, targetMaterial);
    this.targetOuterRing.name = 'stork-target-outer-ring';
    this.targetMarker.add(this.targetRing);
    const crossGeometry = this.trackGeometry(new THREE.BoxGeometry(0.54, 0.022, 0.022));
    const horizontal = new THREE.Mesh(crossGeometry, targetMaterial);
    const vertical = new THREE.Mesh(crossGeometry, targetMaterial);
    vertical.rotation.z = Math.PI / 2;
    this.targetMarker.add(this.targetOuterRing, horizontal, vertical);
    this.root.add(this.targetMarker);

    const aimPathGeometry = this.trackGeometry(new THREE.SphereGeometry(0.052, 7, 5));
    const aimPathMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xffd87d,
      transparent: true,
      opacity: 0.84,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const vaultTrailMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xff9a72,
      transparent: true,
      opacity: 0.62,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.storkAimPath = new THREE.InstancedMesh(aimPathGeometry, aimPathMaterial, 12);
    this.storkAimPath.name = 'stork-bezier-aim-path';
    this.storkAimPath.count = 0;
    this.storkAimPath.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.storkAimPath.frustumCulled = false;
    this.storkVaultTrail = new THREE.InstancedMesh(aimPathGeometry, vaultTrailMaterial, 8);
    this.storkVaultTrail.name = 'stork-world-vault-trail';
    this.storkVaultTrail.count = 0;
    this.storkVaultTrail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.storkVaultTrail.frustumCulled = false;
    this.root.add(this.storkAimPath, this.storkVaultTrail);

    this.ambientSeeds = this.createSeeds(this.budget.clouds, 17);
    this.debrisSeeds = this.createSeeds(this.budget.debris, 53);
  }

  update(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    reducedMotion: boolean,
    events: readonly GameEvent[] = [],
    cameraPosition?: Readonly<THREE.Vector3>,
  ): void {
    if (this.destroyed) return;
    this.revision += 1;
    const time = state.clock.elapsed + DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
    const ambientTime = reducedMotion ? 0 : time;
    this.updateHorizonDressing(projection);
    this.water.update(state, projection, time, reducedMotion, events, cameraPosition);
    this.updateFlightRail(state, projection, alpha, time);
    this.updateAmbient(projection, ambientTime, reducedMotion);
    this.updateEnvironment(projection, ambientTime, reducedMotion);
    this.updateGates(state, projection, alpha, time, reducedMotion);
    this.updateCoins(state, projection, alpha, time);
    const offerX = state.dna.offer
      ? interpolatedWorldX(state, state.dna.offer.x, alpha)
      : 0;
    this.portal.update(state, projection, offerX, time);
    this.updateStorkTarget(state, projection, alpha, time);
  }

  positionForEntity(
    entityId: string,
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    target: THREE.Vector3,
  ): THREE.Vector3 {
    const obstacle = state.world.obstacles.find((candidate) => candidate.id === entityId);
    if (obstacle) {
      const x = interpolatedObstacleX(state, obstacle, alpha);
      target.set(projection.mapX(x), projection.mapY(obstacle.gapCenter), projection.depthAt(x));
      return target;
    }
    const coin = state.world.coins.find((candidate) => candidate.id === entityId);
    if (coin) {
      const x = interpolatedWorldX(state, coin.x, alpha);
      target.set(projection.mapX(x), projection.mapY(coin.y), projection.depthAt(x));
      return target;
    }
    const remembered = this.lastEntityPositions.get(entityId);
    if (remembered) return target.copy(remembered);

    const playerX = state.player.x + state.player.vx * DEFAULT_GAME_CONFIG.fixedStep * alpha;
    const playerY = state.player.y + state.player.vy * DEFAULT_GAME_CONFIG.fixedStep * alpha;
    target.set(projection.mapX(playerX), projection.mapY(playerY), projection.depthAt(playerX));
    return target;
  }

  reset(): void {
    if (this.destroyed) return;
    for (const view of this.gatePool) view.release();
    this.freeGates.length = 0;
    this.freeGates.push(...this.gatePool);
    this.gatesById.clear();
    this.lastEntityPositions.clear();
    this.coinRings.count = 0;
    this.coinCores.count = 0;
    this.coinHalos.count = 0;
    this.coinTrails.count = 0;
    this.water.reset();
    this.portal.reset();
    this.targetMarker.visible = false;
    this.storkAimPath.count = 0;
    this.storkVaultTrail.count = 0;
    this.revision = 0;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.water.destroy();
    this.root.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear();
    this.materials.clear();
    this.gatesById.clear();
    this.freeGates.length = 0;
    this.gatePool.length = 0;
    this.lastEntityPositions.clear();
  }

  private updateHorizonDressing(projection: WorldProjection): void {
    this.sun.position.set(
      projection.viewWidth * 0.32,
      projection.viewHeight * 0.28,
      -17,
    );
  }

  private updateFlightRail(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    time: number,
  ): void {
    const railStart = DEFAULT_GAME_CONFIG.player.startX - 2.2;
    const farthestGateX = state.world.obstacles.reduce(
      (maximum, obstacle) => obstacle.destroyed ? maximum : Math.max(maximum, obstacle.x),
      DEFAULT_GAME_CONFIG.world.width + DEFAULT_GAME_CONFIG.obstacle.spawnLead,
    );
    const railEnd = Math.max(DEFAULT_GAME_CONFIG.world.width + 1.2, farthestGateX + 1.6);
    const startX = projection.mapX(railStart);
    const startZ = projection.depthAt(railStart);
    const endX = projection.mapX(railEnd);
    const endZ = projection.depthAt(railEnd);
    const railLength = Math.hypot(endX - startX, endZ - startZ);
    const railY = projection.mapY(0) + 0.12;

    const railCenterX = (startX + endX) / 2;
    const railCenterZ = (startZ + endZ) / 2;
    this.flightRailGlow.position.set(railCenterX, railY, railCenterZ);
    this.flightRailCore.position.set(railCenterX, railY, railCenterZ);
    this.flightRailGlow.rotation.y = projection.pathYaw;
    this.flightRailCore.rotation.y = projection.pathYaw;
    this.flightRailGlow.scale.set(0.34, 0.018, railLength);
    this.flightRailCore.scale.set(0.055, 0.026, railLength);

    const tickCount = this.budget.laneLights;
    for (let index = 0; index < tickCount; index += 1) {
      const progress = tickCount <= 1 ? 0 : index / (tickCount - 1);
      const simulationX = railStart + (railEnd - railStart) * progress;
      this.dummy.position.set(
        projection.mapX(simulationX),
        railY + 0.012,
        projection.depthAt(simulationX),
      );
      this.dummy.rotation.set(0, projection.pathYaw, 0);
      const emphasis = index % 3 === 0 ? 1.22 : 0.72;
      this.dummy.scale.set(emphasis, 1, 1);
      this.dummy.updateMatrix();
      this.railTicks.setMatrixAt(index, this.dummy.matrix);
    }
    this.railTicks.instanceMatrix.needsUpdate = true;

    const stepAhead = DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
    const playerX = clamp(
      state.player.x + state.player.vx * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.width,
    );
    const playerY = clamp(
      state.player.y + state.player.vy * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.height,
    );
    const worldX = projection.mapX(playerX);
    const worldY = projection.mapY(playerY);
    const worldZ = projection.depthAt(playerX);
    const markerPulse = 0.92 + Math.sin(time * 7) * 0.08;

    this.playerProjectionMarker.position.set(worldX, railY + 0.035, worldZ);
    this.playerProjectionMarker.scale.setScalar(markerPulse);

    const tetherHeight = Math.max(0.02, worldY - railY);
    this.playerAltitudeGuide.position.set(worldX, railY + tetherHeight / 2, worldZ);
    this.playerAltitudeGuide.scale.set(0.018, tetherHeight, 0.018);

    this.playerHitboxReticle.position.set(worldX, worldY, worldZ);
    this.playerHitboxReticle.rotation.set(0, projection.pathYaw - Math.PI / 2, 0);
    this.playerHitboxReticle.scale.set(
      DEFAULT_GAME_CONFIG.player.radiusX * projection.pathScale * 1.06,
      DEFAULT_GAME_CONFIG.player.radiusY * 1.06,
      1,
    );
  }

  private updateGates(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    time: number,
    reducedMotion: boolean,
  ): void {
    const playerVisualX = state.player.x
      + state.player.vx * DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
    let focusedId: string | null = null;
    let focusedDelta = Number.POSITIVE_INFINITY;
    let nearestDressedId: string | null = null;
    let nearestDressedDelta = Number.POSITIVE_INFINITY;
    for (const obstacle of state.world.obstacles) {
      if (obstacle.destroyed) continue;
      const visualX = interpolatedObstacleX(state, obstacle, alpha);
      const delta = visualX - playerVisualX;
      if (delta >= -obstacle.width * 0.72 && delta < nearestDressedDelta) {
        nearestDressedId = obstacle.id;
        nearestDressedDelta = delta;
      }
      if (!obstacle.active) continue;
      if (delta < -obstacle.width * 0.72 || delta >= focusedDelta) continue;
      focusedId = obstacle.id;
      focusedDelta = delta;
    }

    for (const obstacle of state.world.obstacles) {
      if (obstacle.destroyed) continue;
      let view = this.gatesById.get(obstacle.id);
      if (!view) {
        view = this.acquireGate();
        if (!view) continue;
        view.id = obstacle.id;
        this.gatesById.set(obstacle.id, view);
      }
      view.seenRevision = this.revision;
      const visualX = interpolatedObstacleX(state, obstacle, alpha);
      const locked = state.mode.active === 'stork'
        && state.mode.stork.lockedTargetId === obstacle.id;
      const delta = visualX - playerVisualX;
      const halfWidth = obstacle.width * 0.5;
      const transitPhase: GateTransitPhase = delta > halfWidth
        ? 'ahead'
        : delta < -halfWidth
          ? 'behind'
          : 'contact';
      const focused = obstacle.id === focusedId;
      const focusStrength = focused
        ? clamp(1 - Math.max(0, delta - halfWidth) / 5.4, 0.16, 1)
        : 0;
      view.update(
        obstacle,
        visualX,
        projection,
        locked,
        focusStrength,
        transitPhase,
        time,
        obstacle.id === nearestDressedId
          || Math.abs(delta) <= this.gateDressingProfile.detailDistance,
        reducedMotion,
      );
      this.rememberEntity(
        obstacle.id,
        projection.mapX(visualX),
        projection.mapY(obstacle.gapCenter),
        projection.depthAt(visualX),
      );
    }

    for (const [id, view] of this.gatesById) {
      if (view.seenRevision === this.revision) continue;
      this.gatesById.delete(id);
      view.release();
      this.freeGates.push(view);
    }
  }

  private updateCoins(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    time: number,
  ): void {
    const stepAhead = DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
    const playerVisualX = clamp(
      state.player.x + state.player.vx * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.width,
    );
    const playerVisualY = clamp(
      state.player.y + state.player.vy * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.height,
    );
    const pathForwardX = Math.sin(projection.pathYaw);
    const pathForwardZ = Math.cos(projection.pathYaw);
    let count = 0;
    for (const coin of state.world.coins) {
      if (coin.collected || count >= this.budget.maximumCoins) continue;
      const visualX = interpolatedWorldX(state, coin.x, alpha);
      // This broad approach cue is deliberately independent of collection
      // outcome. It can later be replaced by a normalized curved-pickup or
      // magnet value without changing createCoinRenderPose or spatial truth.
      const visualDistance = Math.hypot(
        (visualX - playerVisualX) * projection.pathScale,
        coin.y - playerVisualY,
      );
      const normalizedProximity = 1 - clamp(visualDistance / 2.2, 0, 1);
      const pose = createCoinRenderPose(projection, {
        simulationX: visualX,
        simulationY: coin.y,
        radius: coin.radius,
        time,
        normalizedProximity,
        phase: hashPhase(coin.id),
      });

      this.dummy.position.set(pose.x, pose.y, pose.z);
      this.dummy.rotation.set(pose.tilt, pose.yaw, 0);
      this.dummy.scale.setScalar(pose.solidRadius);
      this.dummy.updateMatrix();
      this.coinRings.setMatrixAt(count, this.dummy.matrix);
      this.coinCores.setMatrixAt(count, this.dummy.matrix);

      this.dummy.position.set(pose.x, pose.y, pose.z);
      this.dummy.rotation.set(0, projection.pathYaw, 0);
      this.dummy.scale.setScalar(pose.haloRadius);
      this.dummy.updateMatrix();
      this.coinHalos.setMatrixAt(count, this.dummy.matrix);

      this.dummy.position.set(
        pose.x - pathForwardX * pose.trailLength * 0.5,
        pose.y,
        pose.z - pathForwardZ * pose.trailLength * 0.5,
      );
      this.dummy.rotation.set(0, projection.pathYaw, 0);
      this.dummy.scale.set(pose.trailWidth, pose.trailWidth, pose.trailLength);
      this.dummy.updateMatrix();
      this.coinTrails.setMatrixAt(count, this.dummy.matrix);

      this.rememberEntity(coin.id, pose.x, pose.y, pose.z);
      count += 1;
    }
    this.coinRings.count = count;
    this.coinCores.count = count;
    this.coinHalos.count = count;
    this.coinTrails.count = count;
    this.coinRings.instanceMatrix.needsUpdate = true;
    this.coinCores.instanceMatrix.needsUpdate = true;
    this.coinHalos.instanceMatrix.needsUpdate = true;
    this.coinTrails.instanceMatrix.needsUpdate = true;
  }

  private updateAmbient(
    projection: WorldProjection,
    time: number,
    reducedMotion: boolean,
  ): void {
    const cloudSpan = projection.viewWidth + 8;
    for (let index = 0; index < this.ambientSeeds.length; index += 1) {
      const seed = this.ambientSeeds[index];
      if (!seed) continue;
      const travel = reducedMotion ? 0 : time * seed.speed;
      this.dummy.position.set(
        positiveModulo(seed.u * cloudSpan - travel + cloudSpan / 2, cloudSpan) - cloudSpan / 2,
        -projection.viewHeight * 0.18 + seed.v * projection.viewHeight * 0.72,
        -4.5 - seed.depth * 5,
      );
      this.dummy.rotation.set(0, seed.spin + time * 0.015, seed.spin * 0.35);
      this.dummy.scale.set(seed.scale * 1.8, seed.scale * 0.5, seed.scale * 0.75);
      this.dummy.updateMatrix();
      this.clouds.setMatrixAt(index, this.dummy.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;

    const debrisSpan = projection.viewWidth + 5;
    for (let index = 0; index < this.debrisSeeds.length; index += 1) {
      const seed = this.debrisSeeds[index];
      if (!seed) continue;
      const travel = reducedMotion ? 0 : time * seed.speed * 2.4;
      this.dummy.position.set(
        positiveModulo(seed.u * debrisSpan - travel + debrisSpan / 2, debrisSpan) - debrisSpan / 2,
        -projection.viewHeight * 0.36 + seed.v * projection.viewHeight * 0.82,
        -0.8 - seed.depth * 3.8,
      );
      this.dummy.rotation.set(time * seed.spin, time * seed.spin * 0.7, seed.spin);
      this.dummy.scale.setScalar(0.45 + seed.scale * 0.5);
      this.dummy.updateMatrix();
      this.debris.setMatrixAt(index, this.dummy.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;

    const pairs = Math.max(1, Math.floor(this.budget.laneLights / 2));
    for (let index = 0; index < this.budget.laneLights; index += 1) {
      const pair = Math.floor(index / 2);
      const side = index % 2 === 0 ? -1 : 1;
      const travel = reducedMotion ? 0 : time * 0.055;
      const progress = positiveModulo(pair / pairs - travel, 1);
      const simulationX = DEFAULT_GAME_CONFIG.player.startX
        + progress * (DEFAULT_GAME_CONFIG.world.width - DEFAULT_GAME_CONFIG.player.startX + 1.4);
      const depth = projection.depthAt(simulationX);
      const separation = 0.34 + progress * 0.52;
      this.dummy.position.set(
        projection.mapX(simulationX) + Math.cos(projection.pathYaw) * side * separation,
        projection.mapY(0) + 0.045,
        depth - Math.sin(projection.pathYaw) * side * separation,
      );
      const size = 0.72 + (1 - progress) * 0.42;
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(size);
      this.dummy.updateMatrix();
      this.laneLights.setMatrixAt(index, this.dummy.matrix);
    }
    this.laneLights.instanceMatrix.needsUpdate = true;
  }

  private updateEnvironment(
    projection: WorldProjection,
    time: number,
    reducedMotion: boolean,
  ): void {
    const simulationStart = DEFAULT_GAME_CONFIG.player.startX - 3.2;
    const simulationSpan = DEFAULT_GAME_CONFIG.world.width
      - DEFAULT_GAME_CONFIG.player.startX
      + 8.4;
    const sideX = Math.cos(projection.pathYaw);
    const sideZ = -Math.sin(projection.pathYaw);
    const waterY = projection.mapY(0) - 0.035;

    for (let index = 0; index < this.environmentLayout.reeds.length; index += 1) {
      const seed = this.environmentLayout.reeds[index];
      if (!seed) continue;
      const travel = reducedMotion ? 0 : time * seed.speed;
      const simulationX = simulationStart
        + positiveModulo(seed.u - travel, 1) * simulationSpan;
      const lateral = seed.side * seed.lateral;
      const sway = reducedMotion ? 0 : Math.sin(time * 1.12 + seed.phase) * 0.09;
      this.dummy.position.set(
        projection.mapX(simulationX) + sideX * lateral,
        waterY,
        projection.depthAt(simulationX) + sideZ * lateral,
      );
      this.dummy.rotation.set(sway * 0.24, projection.pathYaw + seed.phase * 0.08, sway);
      this.dummy.scale.set(0.16 * seed.scale, 0.62 * seed.scale, 1);
      this.dummy.updateMatrix();
      this.distantReeds.setMatrixAt(index, this.dummy.matrix);
    }
    this.distantReeds.instanceMatrix.needsUpdate = true;

    for (let index = 0; index < this.environmentLayout.buoys.length; index += 1) {
      const seed = this.environmentLayout.buoys[index];
      if (!seed) continue;
      const travel = reducedMotion ? 0 : time * seed.speed * 0.82;
      const simulationX = simulationStart
        + positiveModulo(seed.u - travel, 1) * simulationSpan;
      const lateral = seed.side * seed.lateral;
      const bob = reducedMotion ? 0 : Math.sin(time * 1.34 + seed.phase) * 0.028;
      this.dummy.position.set(
        projection.mapX(simulationX) + sideX * lateral,
        waterY + 0.23 * seed.scale + bob,
        projection.depthAt(simulationX) + sideZ * lateral,
      );
      this.dummy.rotation.set(0.025 * Math.sin(seed.phase), seed.phase, 0.035 * Math.cos(time + seed.phase));
      this.dummy.scale.setScalar(seed.scale);
      this.dummy.updateMatrix();
      this.distantBuoys.setMatrixAt(index, this.dummy.matrix);
    }
    this.distantBuoys.instanceMatrix.needsUpdate = true;

    for (let index = 0; index < this.environmentLayout.islands.length; index += 1) {
      const seed = this.environmentLayout.islands[index];
      if (!seed) continue;
      const travel = reducedMotion ? 0 : time * seed.speed * 0.34;
      const simulationX = simulationStart
        + positiveModulo(seed.u - travel, 1) * simulationSpan;
      const lateral = seed.side * seed.lateral;
      this.dummy.position.set(
        projection.mapX(simulationX) + sideX * lateral,
        waterY - 0.09 * seed.scale,
        projection.depthAt(simulationX) + sideZ * lateral,
      );
      this.dummy.rotation.set(0, seed.phase, 0);
      this.dummy.scale.set(1.35 * seed.scale, 0.2 * seed.scale, 0.82 * seed.scale);
      this.dummy.updateMatrix();
      this.distantIslands.setMatrixAt(index, this.dummy.matrix);
    }
    this.distantIslands.instanceMatrix.needsUpdate = true;

    for (let index = 0; index < this.environmentLayout.wrecks.length; index += 1) {
      const seed = this.environmentLayout.wrecks[index];
      if (!seed) continue;
      const travel = reducedMotion ? 0 : time * seed.speed * 0.27;
      const simulationX = simulationStart
        + positiveModulo(seed.u - travel, 1) * simulationSpan;
      const lateral = seed.side * seed.lateral;
      const x = projection.mapX(simulationX) + sideX * lateral;
      const z = projection.depthAt(simulationX) + sideZ * lateral;
      this.dummy.position.set(x, waterY - 0.14 * seed.scale, z);
      this.dummy.rotation.set(0.04, seed.phase, (seed.side * 0.08));
      this.dummy.scale.set(1.22 * seed.scale, 0.3 * seed.scale, 0.52 * seed.scale);
      this.dummy.updateMatrix();
      this.distantWreckHulls.setMatrixAt(index, this.dummy.matrix);

      this.dummy.position.set(
        x + Math.cos(seed.phase) * 0.16 * seed.scale,
        waterY + 0.24 * seed.scale,
        z + Math.sin(seed.phase) * 0.16 * seed.scale,
      );
      this.dummy.rotation.set(0, seed.phase, seed.side * 0.21);
      this.dummy.scale.set(seed.scale, 0.82 * seed.scale, seed.scale);
      this.dummy.updateMatrix();
      this.distantWreckMasts.setMatrixAt(index, this.dummy.matrix);
    }
    this.distantWreckHulls.instanceMatrix.needsUpdate = true;
    this.distantWreckMasts.instanceMatrix.needsUpdate = true;

    for (let index = 0; index < this.environmentLayout.birds.length; index += 1) {
      const seed = this.environmentLayout.birds[index];
      if (!seed) continue;
      const travel = reducedMotion ? 0 : time * seed.speed * 2.2;
      const simulationX = simulationStart
        + positiveModulo(seed.u - travel, 1) * simulationSpan;
      const lateral = seed.side * seed.lateral;
      const flap = reducedMotion ? 0.72 : 0.58 + Math.sin(time * 3.8 + seed.phase) * 0.22;
      this.dummy.position.set(
        projection.mapX(simulationX) + sideX * lateral,
        projection.mapY(seed.height),
        projection.depthAt(simulationX) + sideZ * lateral - 1.2,
      );
      this.dummy.rotation.set(0, projection.pathYaw, Math.sin(seed.phase) * 0.08);
      this.dummy.scale.set(0.72 * seed.scale, flap * seed.scale, 1);
      this.dummy.updateMatrix();
      this.distantBirds.setMatrixAt(index, this.dummy.matrix);
    }
    this.distantBirds.instanceMatrix.needsUpdate = true;
  }

  private updateStorkTarget(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    time: number,
  ): void {
    this.storkAimPath.count = 0;
    this.storkVaultTrail.count = 0;
    if (
      state.mode.active !== 'stork'
      || state.mode.stork.phase === 'idle'
    ) {
      this.targetMarker.visible = false;
      return;
    }
    const stepAhead = DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
    const playerX = clamp(
      state.player.x + state.player.vx * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.width,
    );
    const playerY = clamp(
      state.player.y + state.player.vy * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.height,
    );

    if (state.mode.stork.phase === 'vaulting') {
      const rawProgress = clamp(
        state.mode.stork.phaseTime / DEFAULT_GAME_CONFIG.modes.stork.vaultDuration,
        0,
        1,
      );
      const trailCount = 8;
      this.storkVaultTrail.count = trailCount;
      for (let index = 0; index < trailCount; index += 1) {
        const pastProgress = Math.max(0, rawProgress - (index + 1) * 0.043);
        const eased = smoothstep01(pastProgress);
        const pastY = state.mode.stork.vaultStartY
          + (state.mode.stork.vaultTargetY - state.mode.stork.vaultStartY) * eased;
        const pastX = playerX - (rawProgress - pastProgress) * 0.82;
        this.dummy.position.set(
          projection.mapX(pastX),
          projection.mapY(pastY),
          projection.depthAt(pastX),
        );
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(0.92 - index / trailCount * 0.62);
        this.dummy.updateMatrix();
        this.storkVaultTrail.setMatrixAt(index, this.dummy.matrix);
      }
      this.storkVaultTrail.instanceMatrix.needsUpdate = true;
    }

    if (!state.mode.stork.lockedTargetId) {
      this.targetMarker.visible = false;
      return;
    }
    const target = state.world.obstacles.find(
      (obstacle) => obstacle.id === state.mode.stork.lockedTargetId,
    );
    if (!target) {
      this.targetMarker.visible = false;
      return;
    }
    const safeHalfGap = Math.max(
      0,
      target.gapSize / 2 - DEFAULT_GAME_CONFIG.player.radiusY - 0.08,
    );
    const targetY = clamp(
      target.gapCenter + state.mode.stork.aimBias * safeHalfGap,
      DEFAULT_GAME_CONFIG.player.radiusY,
      DEFAULT_GAME_CONFIG.world.height - DEFAULT_GAME_CONFIG.player.radiusY,
    );
    const visualX = interpolatedWorldX(state, target.x, alpha);
    this.targetMarker.visible = true;
    const leadingOffset = -Math.max(0.42, target.width * projection.pathScale) * 0.58;
    this.targetMarker.position.set(
      projection.mapX(visualX) + Math.sin(projection.pathYaw) * leadingOffset,
      projection.mapY(targetY),
      projection.depthAt(visualX) + Math.cos(projection.pathYaw) * leadingOffset,
    );
    this.targetMarker.rotation.y = projection.pathYaw;
    const pulse = 0.96 + Math.sin(time * 10) * 0.08;
    this.targetMarker.scale.setScalar(pulse);
    this.targetRing.rotation.z = time * 2.4;
    this.targetOuterRing.rotation.z = -time * 1.35;
    this.targetOuterRing.scale.setScalar(0.92 + Math.sin(time * 6.5) * 0.08);

    if (state.mode.stork.phase === 'aiming') {
      const startX = projection.mapX(playerX);
      const startY = projection.mapY(playerY);
      const startZ = projection.depthAt(playerX);
      const endX = this.targetMarker.position.x;
      const endY = this.targetMarker.position.y;
      const endZ = this.targetMarker.position.z;
      const verticalDirection = Math.sign(endY - startY) || 1;
      const controlX = (startX + endX) * 0.5;
      const controlY = (startY + endY) * 0.5
        + verticalDirection * (0.42 + Math.abs(endY - startY) * 0.08);
      const controlZ = (startZ + endZ) * 0.5;
      const dotCount = 12;
      this.storkAimPath.count = dotCount;
      for (let index = 0; index < dotCount; index += 1) {
        // Leave breathing room around bird and target so the dotted guide
        // remains legible without turning into a pane across the safe gap.
        const progress = (index + 1) / (dotCount + 1);
        this.dummy.position.set(
          quadraticBezier(startX, controlX, endX, progress),
          quadraticBezier(startY, controlY, endY, progress),
          quadraticBezier(startZ, controlZ, endZ, progress),
        );
        this.dummy.rotation.set(0, 0, 0);
        const dotPulse = 0.68 + Math.sin(time * 8 - index * 0.72) * 0.14;
        this.dummy.scale.setScalar(dotPulse);
        this.dummy.updateMatrix();
        this.storkAimPath.setMatrixAt(index, this.dummy.matrix);
      }
      this.storkAimPath.instanceMatrix.needsUpdate = true;
    }
  }

  private acquireGate(): GateView | undefined {
    return this.freeGates.pop();
  }

  private createSeeds(count: number, salt: number): readonly AmbientSeed[] {
    const seeds: AmbientSeed[] = [];
    for (let index = 0; index < count; index += 1) {
      const value = index + salt;
      seeds.push(Object.freeze({
        u: ((value * 37) % 101) / 101,
        v: ((value * 61) % 97) / 97,
        depth: ((value * 43) % 89) / 89,
        scale: 0.36 + ((value * 29) % 67) / 100,
        speed: 0.08 + ((value * 17) % 23) / 90,
        spin: 0.15 + ((value * 13) % 31) / 20,
      }));
    }
    return Object.freeze(seeds);
  }

  private rememberEntity(id: string, x: number, y: number, z: number): void {
    const existing = this.lastEntityPositions.get(id);
    if (existing) existing.set(x, y, z);
    else this.lastEntityPositions.set(id, new THREE.Vector3(x, y, z));

    if (this.lastEntityPositions.size <= 180) return;
    const oldest = this.lastEntityPositions.keys().next().value as string | undefined;
    if (oldest) this.lastEntityPositions.delete(oldest);
  }

  private trackGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  private trackMaterial<T extends THREE.Material>(material: T): T {
    this.materials.add(material);
    return material;
  }
}
