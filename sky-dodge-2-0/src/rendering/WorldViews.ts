import * as THREE from 'three';

import { DEFAULT_GAME_CONFIG, getDifficultyTier } from '../simulation/GameConfig';
import type { GameState, MutationModeId, ObstacleState } from '../simulation/GameState';

export type RenderQuality = 'low' | 'medium' | 'high';

export interface WorldProjection {
  readonly viewWidth: number;
  readonly viewHeight: number;
  readonly xScale: number;
  readonly mapX: (simulationX: number) => number;
  readonly mapY: (simulationY: number) => number;
  readonly depthAt: (simulationX: number) => number;
}

interface QualityBudget {
  readonly maximumGates: number;
  readonly maximumCoins: number;
  readonly clouds: number;
  readonly debris: number;
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
  low: Object.freeze({ maximumGates: 9, maximumCoins: 30, clouds: 10, debris: 5 }),
  medium: Object.freeze({ maximumGates: 12, maximumCoins: 42, clouds: 18, debris: 9 }),
  high: Object.freeze({ maximumGates: 14, maximumCoins: 54, clouds: 28, debris: 14 }),
});

const MODE_COLOURS: Readonly<Record<MutationModeId, number>> = Object.freeze({
  frog: 0x64e27a,
  rubber: 0xff6077,
  steel: 0xb8d4df,
  ghost: 0x80f2ff,
  stork: 0xf06455,
});

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

const positiveModulo = (value: number, modulus: number): number => (
  ((value % modulus) + modulus) % modulus
);

export function createWorldProjection(aspect: number): WorldProjection {
  const safeAspect = clamp(Number.isFinite(aspect) ? aspect : 1, 0.38, 2.5);
  const viewHeight = DEFAULT_GAME_CONFIG.world.height + 1.2;
  const viewWidth = viewHeight * safeAspect;
  const xScale = viewWidth / DEFAULT_GAME_CONFIG.world.width;
  const halfWidth = viewWidth / 2;
  const halfHeight = DEFAULT_GAME_CONFIG.world.height / 2;

  return Object.freeze({
    viewWidth,
    viewHeight,
    xScale,
    mapX: (simulationX: number): number => simulationX * xScale - halfWidth,
    mapY: (simulationY: number): number => simulationY - halfHeight,
    depthAt: (simulationX: number): number => clamp(
      (DEFAULT_GAME_CONFIG.player.startX - simulationX) * 0.3,
      -4.5,
      1.35,
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

function interpolatedWorldX(state: Readonly<GameState>, x: number, alpha: number): number {
  const tier = getDifficultyTier(state.world.passedObstacles);
  return x - tier.speed
    * worldTimeScale(state)
    * DEFAULT_GAME_CONFIG.fixedStep
    * clamp(alpha, 0, 1);
}

class GateView {
  readonly root = new THREE.Group();
  id: string | null = null;
  seenRevision = -1;

  private readonly lowerColumn: THREE.Mesh;
  private readonly upperColumn: THREE.Mesh;
  private readonly lowerRim: THREE.Mesh;
  private readonly upperRim: THREE.Mesh;
  private readonly lowerNode: THREE.Mesh;
  private readonly upperNode: THREE.Mesh;
  private readonly lowerLock: THREE.Mesh;
  private readonly upperLock: THREE.Mesh;
  private readonly rivets: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();

  constructor(
    columnGeometry: THREE.BufferGeometry,
    detailGeometry: THREE.BufferGeometry,
    nodeGeometry: THREE.BufferGeometry,
    lockGeometry: THREE.BufferGeometry,
    columnMaterial: THREE.Material,
    detailMaterial: THREE.Material,
    nodeMaterial: THREE.Material,
    lockMaterial: THREE.Material,
  ) {
    this.root.name = 'gate-view';
    this.root.visible = false;

    this.lowerColumn = new THREE.Mesh(columnGeometry, columnMaterial);
    this.upperColumn = new THREE.Mesh(columnGeometry, columnMaterial);
    this.lowerRim = new THREE.Mesh(columnGeometry, detailMaterial);
    this.upperRim = new THREE.Mesh(columnGeometry, detailMaterial);
    this.lowerNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    this.upperNode = new THREE.Mesh(nodeGeometry, nodeMaterial);
    this.lowerLock = new THREE.Mesh(lockGeometry, lockMaterial);
    this.upperLock = new THREE.Mesh(lockGeometry, lockMaterial);
    this.rivets = new THREE.InstancedMesh(detailGeometry, detailMaterial, 8);
    this.rivets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rivets.count = 8;

    this.lowerLock.visible = false;
    this.upperLock.visible = false;
    this.root.add(
      this.lowerColumn,
      this.upperColumn,
      this.lowerRim,
      this.upperRim,
      this.lowerNode,
      this.upperNode,
      this.lowerLock,
      this.upperLock,
      this.rivets,
    );
  }

  update(
    obstacle: Readonly<ObstacleState>,
    visualX: number,
    projection: WorldProjection,
    locked: boolean,
    time: number,
  ): void {
    const gapBottom = clamp(obstacle.gapCenter - obstacle.gapSize / 2, 0, DEFAULT_GAME_CONFIG.world.height);
    const gapTop = clamp(obstacle.gapCenter + obstacle.gapSize / 2, 0, DEFAULT_GAME_CONFIG.world.height);
    const lowerHeight = gapBottom;
    const upperHeight = DEFAULT_GAME_CONFIG.world.height - gapTop;
    const width = Math.max(0.24, obstacle.width * projection.xScale);
    const depth = 1.45;
    const rimHeight = 0.2;

    this.root.visible = true;
    this.root.position.set(projection.mapX(visualX), 0, projection.depthAt(visualX));
    this.root.rotation.y = Math.sin(time * 0.8 + obstacle.motionPhase) * 0.025;

    this.lowerColumn.visible = lowerHeight > 0.01;
    this.lowerColumn.position.set(0, projection.mapY(lowerHeight / 2), 0);
    this.lowerColumn.scale.set(width, Math.max(0.001, lowerHeight), depth);

    this.upperColumn.visible = upperHeight > 0.01;
    this.upperColumn.position.set(0, projection.mapY(gapTop + upperHeight / 2), 0);
    this.upperColumn.scale.set(width, Math.max(0.001, upperHeight), depth);

    this.lowerRim.position.set(0, projection.mapY(gapBottom) - rimHeight / 2, 0.05);
    this.lowerRim.scale.set(width * 1.52, rimHeight, depth * 1.14);
    this.upperRim.position.set(0, projection.mapY(gapTop) + rimHeight / 2, 0.05);
    this.upperRim.scale.set(width * 1.52, rimHeight, depth * 1.14);

    this.lowerNode.position.set(0, projection.mapY(gapBottom) + 0.12, depth * 0.58);
    this.upperNode.position.set(0, projection.mapY(gapTop) - 0.12, depth * 0.58);
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

    for (let index = 0; index < 8; index += 1) {
      const upper = index >= 4;
      const localIndex = index % 4;
      const height = upper ? upperHeight : lowerHeight;
      const baseY = upper ? gapTop : 0;
      const y = baseY + (localIndex + 0.5) * height / 4;
      this.position.set(
        (localIndex % 2 === 0 ? -1 : 1) * width * 0.3,
        projection.mapY(y),
        depth * 0.52,
      );
      this.scale.setScalar(0.055);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.rivets.setMatrixAt(index, this.matrix);
    }
    this.rivets.instanceMatrix.needsUpdate = true;
  }

  release(): void {
    this.id = null;
    this.seenRevision = -1;
    this.root.visible = false;
    this.lowerLock.visible = false;
    this.upperLock.visible = false;
  }
}

class PortalLane {
  readonly root = new THREE.Group();
  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly icons: Readonly<Record<MutationModeId, THREE.Mesh>>;

  constructor(
    ringGeometry: THREE.TorusGeometry,
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
    this.root.add(this.ring);

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

  update(mode: MutationModeId, x: number, y: number, z: number, time: number): void {
    this.root.position.set(x, y, z);
    this.root.rotation.y = Math.sin(time * 1.4) * 0.18;
    const pulse = 0.92 + Math.sin(time * 5.5) * 0.06;
    this.root.scale.setScalar(pulse);
    this.ring.rotation.z = time * 0.7;
    this.ring.material.color.setHex(MODE_COLOURS[mode]);
    this.ring.material.emissive.setHex(MODE_COLOURS[mode]);
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
    iconGeometries: Readonly<Record<MutationModeId, THREE.BufferGeometry>>,
    trackMaterial: <T extends THREE.Material>(material: T) => T,
  ) {
    this.root.name = 'mutation-portals';
    this.root.visible = false;
    this.upper = new PortalLane(ringGeometry, iconGeometries, trackMaterial);
    this.lower = new PortalLane(ringGeometry, iconGeometries, trackMaterial);
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
    const z = projection.depthAt(visualX) + 0.45;
    this.upper.update(offer.upper, x, projection.mapY(offer.upperY), z, time);
    this.lower.update(offer.lower, x, projection.mapY(offer.lowerY), z, time);
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
  private readonly gatePool: GateView[] = [];
  private readonly freeGates: GateView[] = [];
  private readonly gatesById = new Map<string, GateView>();
  private readonly coinRings: THREE.InstancedMesh;
  private readonly coinCores: THREE.InstancedMesh;
  private readonly clouds: THREE.InstancedMesh;
  private readonly debris: THREE.InstancedMesh;
  private readonly floor: THREE.Mesh;
  private readonly portal: PortalView;
  private readonly targetMarker: THREE.Group;
  private readonly targetRing: THREE.Mesh;
  private readonly ambientSeeds: readonly AmbientSeed[];
  private readonly debrisSeeds: readonly AmbientSeed[];
  private readonly dummy = new THREE.Object3D();
  private readonly lastEntityPositions = new Map<string, THREE.Vector3>();
  private revision = 0;
  private destroyed = false;

  constructor(parent: THREE.Object3D, quality: RenderQuality) {
    this.root.name = 'world-views';
    this.budget = QUALITY_BUDGET[quality];
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

    const floorGeometry = this.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const floorMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x15273c,
      roughness: 0.92,
      metalness: 0.05,
    }));
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.name = 'cloud-deck';
    this.root.add(this.floor);

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

    const gateGeometry = this.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const rivetGeometry = this.trackGeometry(new THREE.SphereGeometry(1, 7, 5));
    const nodeGeometry = this.trackGeometry(new THREE.OctahedronGeometry(0.14, 1));
    const lockGeometry = this.trackGeometry(new THREE.TorusGeometry(0.24, 0.025, 6, 24));
    const gateMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x315f68,
      roughness: 0.58,
      metalness: 0.48,
      flatShading: true,
    }));
    const gateDetailMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x8db2b3,
      roughness: 0.32,
      metalness: 0.76,
      flatShading: true,
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

    const makeGate = (): GateView => {
      const view = new GateView(
        gateGeometry,
        rivetGeometry,
        nodeGeometry,
        lockGeometry,
        gateMaterial,
        gateDetailMaterial,
        nodeMaterial,
        lockMaterial,
      );
      this.gatePool.push(view);
      this.root.add(view.root);
      return view;
    };
    for (let index = 0; index < this.budget.maximumGates; index += 1) {
      const view = makeGate();
      this.freeGates.push(view);
    }

    const coinRingGeometry = this.trackGeometry(new THREE.TorusGeometry(1, 0.19, 8, 24));
    const coinCoreGeometry = this.trackGeometry(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 18));
    coinCoreGeometry.rotateX(Math.PI / 2);
    const coinRingMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xffce4a,
      emissive: 0xff9b16,
      emissiveIntensity: 0.58,
      roughness: 0.24,
      metalness: 0.72,
    }));
    const coinCoreMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0xfff0a2,
      roughness: 0.34,
      metalness: 0.48,
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
    this.coinRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinCores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinRings.count = 0;
    this.coinCores.count = 0;
    this.root.add(this.coinRings, this.coinCores);

    const portalRing = this.trackGeometry(new THREE.TorusGeometry(0.62, 0.075, 10, 40));
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
    const targetGeometry = this.trackGeometry(new THREE.TorusGeometry(0.34, 0.035, 8, 32));
    this.targetMarker = new THREE.Group();
    this.targetMarker.name = 'stork-target-marker';
    this.targetMarker.visible = false;
    this.targetRing = new THREE.Mesh(targetGeometry, targetMaterial);
    this.targetMarker.add(this.targetRing);
    const crossGeometry = this.trackGeometry(new THREE.BoxGeometry(0.68, 0.025, 0.025));
    const horizontal = new THREE.Mesh(crossGeometry, targetMaterial);
    const vertical = new THREE.Mesh(crossGeometry, targetMaterial);
    vertical.rotation.z = Math.PI / 2;
    this.targetMarker.add(horizontal, vertical);
    this.root.add(this.targetMarker);

    this.ambientSeeds = this.createSeeds(this.budget.clouds, 17);
    this.debrisSeeds = this.createSeeds(this.budget.debris, 53);
  }

  update(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    reducedMotion: boolean,
  ): void {
    if (this.destroyed) return;
    this.revision += 1;
    const time = state.clock.elapsed + DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
    const ambientTime = reducedMotion ? 0 : time;
    this.updateFloor(projection);
    this.updateAmbient(projection, ambientTime, reducedMotion);
    this.updateGates(state, projection, alpha, time);
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
      const x = interpolatedWorldX(state, obstacle.x, alpha);
      target.set(projection.mapX(x), projection.mapY(obstacle.gapCenter), projection.depthAt(x) + 0.7);
      return target;
    }
    const coin = state.world.coins.find((candidate) => candidate.id === entityId);
    if (coin) {
      const x = interpolatedWorldX(state, coin.x, alpha);
      target.set(projection.mapX(x), projection.mapY(coin.y), projection.depthAt(x) + 0.65);
      return target;
    }
    const remembered = this.lastEntityPositions.get(entityId);
    if (remembered) return target.copy(remembered);

    const playerX = state.player.x + state.player.vx * DEFAULT_GAME_CONFIG.fixedStep * alpha;
    const playerY = state.player.y + state.player.vy * DEFAULT_GAME_CONFIG.fixedStep * alpha;
    target.set(projection.mapX(playerX), projection.mapY(playerY), projection.depthAt(playerX) + 0.72);
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
    this.portal.reset();
    this.targetMarker.visible = false;
    this.revision = 0;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
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

  private updateFloor(projection: WorldProjection): void {
    this.floor.position.set(0, projection.mapY(0) - 0.54, -1.2);
    this.floor.scale.set(projection.viewWidth * 1.8, 1.05, 11);
  }

  private updateGates(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    time: number,
  ): void {
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
      const visualX = interpolatedWorldX(state, obstacle.x, alpha);
      const locked = state.mode.active === 'stork'
        && state.mode.stork.lockedTargetId === obstacle.id;
      view.update(obstacle, visualX, projection, locked, time);
      this.rememberEntity(
        obstacle.id,
        projection.mapX(visualX),
        projection.mapY(obstacle.gapCenter),
        projection.depthAt(visualX) + 0.7,
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
    let count = 0;
    for (const coin of state.world.coins) {
      if (coin.collected || count >= this.budget.maximumCoins) continue;
      const visualX = interpolatedWorldX(state, coin.x, alpha);
      const x = projection.mapX(visualX);
      const y = projection.mapY(coin.y);
      const z = projection.depthAt(visualX) + 0.55;
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, time * 3.2 + count * 0.45, 0);
      this.dummy.scale.setScalar(coin.radius * 1.75);
      this.dummy.updateMatrix();
      this.coinRings.setMatrixAt(count, this.dummy.matrix);
      this.coinCores.setMatrixAt(count, this.dummy.matrix);
      this.rememberEntity(coin.id, x, y, z);
      count += 1;
    }
    this.coinRings.count = count;
    this.coinCores.count = count;
    this.coinRings.instanceMatrix.needsUpdate = true;
    this.coinCores.instanceMatrix.needsUpdate = true;
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
  }

  private updateStorkTarget(
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    time: number,
  ): void {
    if (
      state.mode.active !== 'stork'
      || state.mode.stork.phase === 'idle'
      || !state.mode.stork.lockedTargetId
    ) {
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
    this.targetMarker.position.set(
      projection.mapX(visualX),
      projection.mapY(targetY),
      projection.depthAt(visualX) + 0.92,
    );
    const pulse = 0.92 + Math.sin(time * 10) * 0.1;
    this.targetMarker.scale.setScalar(pulse);
    this.targetRing.rotation.z = time * 2;
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
