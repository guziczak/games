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
  const xScale = Math.max(
    viewWidth / DEFAULT_GAME_CONFIG.world.width,
    clamp(viewHeight * 0.06, 0.58, 0.72),
  );
  const playerAnchor = -viewWidth * 0.24;
  const halfHeight = DEFAULT_GAME_CONFIG.world.height / 2;

  return Object.freeze({
    viewWidth,
    viewHeight,
    xScale,
    mapX: (simulationX: number): number => (
      playerAnchor + (simulationX - DEFAULT_GAME_CONFIG.player.startX) * xScale
    ),
    mapY: (simulationY: number): number => simulationY - halfHeight,
    depthAt: (simulationX: number): number => clamp(
      (DEFAULT_GAME_CONFIG.player.startX - simulationX) * 0.43,
      -6.2,
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
  private readonly lowerFace: THREE.Mesh;
  private readonly upperFace: THREE.Mesh;
  private readonly lowerRim: THREE.Mesh;
  private readonly upperRim: THREE.Mesh;
  private readonly lowerConduit: THREE.Mesh;
  private readonly upperConduit: THREE.Mesh;
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
    faceMaterial: THREE.Material,
    detailMaterial: THREE.Material,
    nodeMaterial: THREE.Material,
    lockMaterial: THREE.Material,
  ) {
    this.root.name = 'gate-view';
    this.root.visible = false;

    this.lowerColumn = new THREE.Mesh(columnGeometry, columnMaterial);
    this.upperColumn = new THREE.Mesh(columnGeometry, columnMaterial);
    this.lowerFace = new THREE.Mesh(columnGeometry, faceMaterial);
    this.upperFace = new THREE.Mesh(columnGeometry, faceMaterial);
    this.lowerRim = new THREE.Mesh(columnGeometry, detailMaterial);
    this.upperRim = new THREE.Mesh(columnGeometry, detailMaterial);
    this.lowerConduit = new THREE.Mesh(columnGeometry, nodeMaterial);
    this.upperConduit = new THREE.Mesh(columnGeometry, nodeMaterial);
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
      this.lowerFace,
      this.upperFace,
      this.lowerRim,
      this.upperRim,
      this.lowerConduit,
      this.upperConduit,
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
    const depth = 2.15;
    const rimHeight = 0.24;

    this.root.visible = true;
    this.root.position.set(projection.mapX(visualX), 0, projection.depthAt(visualX));
    this.root.rotation.y = Math.sin(time * 0.8 + obstacle.motionPhase) * 0.012;

    this.lowerColumn.visible = lowerHeight > 0.01;
    this.lowerColumn.position.set(0, projection.mapY(lowerHeight / 2), 0);
    this.lowerColumn.scale.set(width, Math.max(0.001, lowerHeight), depth);

    this.upperColumn.visible = upperHeight > 0.01;
    this.upperColumn.position.set(0, projection.mapY(gapTop + upperHeight / 2), 0);
    this.upperColumn.scale.set(width, Math.max(0.001, upperHeight), depth);

    this.lowerFace.visible = lowerHeight > 0.01;
    this.lowerFace.position.set(0, projection.mapY(lowerHeight / 2), depth * 0.51);
    this.lowerFace.scale.set(width * 0.86, Math.max(0.001, lowerHeight - 0.08), 0.055);
    this.upperFace.visible = upperHeight > 0.01;
    this.upperFace.position.set(0, projection.mapY(gapTop + upperHeight / 2), depth * 0.51);
    this.upperFace.scale.set(width * 0.86, Math.max(0.001, upperHeight - 0.08), 0.055);

    this.lowerRim.position.set(0, projection.mapY(gapBottom) - rimHeight / 2, 0.08);
    this.lowerRim.scale.set(width * 1.68, rimHeight, depth * 1.16);
    this.upperRim.position.set(0, projection.mapY(gapTop) + rimHeight / 2, 0.08);
    this.upperRim.scale.set(width * 1.68, rimHeight, depth * 1.16);

    this.lowerConduit.visible = lowerHeight > 0.32;
    this.lowerConduit.position.set(-width * 0.28, projection.mapY(lowerHeight / 2), depth * 0.56);
    this.lowerConduit.scale.set(0.035, Math.max(0.02, lowerHeight - 0.42), 0.035);
    this.upperConduit.visible = upperHeight > 0.32;
    this.upperConduit.position.set(-width * 0.28, projection.mapY(gapTop + upperHeight / 2), depth * 0.56);
    this.upperConduit.scale.set(0.035, Math.max(0.02, upperHeight - 0.42), 0.035);

    this.lowerNode.position.set(0, projection.mapY(gapBottom) + 0.14, depth * 0.57);
    this.upperNode.position.set(0, projection.mapY(gapTop) - 0.14, depth * 0.57);
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

  update(mode: MutationModeId, x: number, y: number, z: number, time: number): void {
    this.root.position.set(x, y, z);
    this.root.rotation.y = Math.sin(time * 1.4) * 0.18;
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
  private readonly laneLights: THREE.InstancedMesh;
  private readonly floor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly floorMaterial: THREE.ShaderMaterial;
  private readonly floorTimeUniform = { value: 0 };
  private readonly sun: THREE.Group;
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

    const floorGeometry = this.trackGeometry(new THREE.PlaneGeometry(1, 1));
    this.floorMaterial = this.trackMaterial(new THREE.ShaderMaterial({
      transparent: false,
      depthWrite: true,
      side: THREE.DoubleSide,
      uniforms: {
        time: this.floorTimeUniform,
        deepColour: { value: new THREE.Color(0x0d2238) },
        nearColour: { value: new THREE.Color(0x28516a) },
        gridColour: { value: new THREE.Color(0x2e7182) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 deepColour;
        uniform vec3 nearColour;
        uniform vec3 gridColour;
        varying vec2 vUv;
        float line(float value, float width) {
          float cell = abs(fract(value - 0.5) - 0.5) / max(fwidth(value), 0.0001);
          return 1.0 - smoothstep(width, width + 1.0, cell);
        }
        void main() {
          float depthFade = smoothstep(0.05, 0.92, vUv.y);
          float longitudinal = line(vUv.x * 18.0, 0.55);
          float crosswise = line(vUv.y * 32.0 + time * 0.35, 0.5);
          float grid = max(longitudinal * 0.22, crosswise * 0.31) * smoothstep(0.02, 0.28, vUv.y);
          vec3 base = mix(nearColour, deepColour, depthFade);
          gl_FragColor = vec4(base + gridColour * grid, 1.0);
        }
      `,
    }));
    this.floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floor.name = 'perspective-cloud-deck';
    this.floor.rotation.x = -Math.PI / 2;
    this.root.add(this.floor);

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

    const gateGeometry = this.trackGeometry(new THREE.BoxGeometry(1, 1, 1));
    const rivetGeometry = this.trackGeometry(new THREE.SphereGeometry(1, 7, 5));
    const nodeGeometry = this.trackGeometry(new THREE.OctahedronGeometry(0.14, 1));
    const lockGeometry = this.trackGeometry(new THREE.TorusGeometry(0.18, 0.02, 6, 24));
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
    const gateFaceMaterial = this.trackMaterial(new THREE.MeshStandardMaterial({
      color: 0x2a7279,
      emissive: 0x082d36,
      emissiveIntensity: 0.44,
      roughness: 0.4,
      metalness: 0.62,
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
        gateFaceMaterial,
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
    this.targetMarker = new THREE.Group();
    this.targetMarker.name = 'stork-target-marker';
    this.targetMarker.visible = false;
    this.targetRing = new THREE.Mesh(targetGeometry, targetMaterial);
    this.targetMarker.add(this.targetRing);
    const crossGeometry = this.trackGeometry(new THREE.BoxGeometry(0.54, 0.022, 0.022));
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
    this.floor.position.set(0, projection.mapY(0) - 0.055, -7.2);
    this.floor.scale.set(projection.viewWidth * 2.7, 30, 1);
    this.sun.position.set(
      projection.viewWidth * 0.32,
      projection.viewHeight * 0.28,
      -17,
    );
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
    this.floorTimeUniform.value = time;
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
        projection.mapX(simulationX) + side * separation,
        projection.mapY(0) + 0.045,
        depth + 0.35,
      );
      const size = 0.72 + (1 - progress) * 0.42;
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(size);
      this.dummy.updateMatrix();
      this.laneLights.setMatrixAt(index, this.dummy.matrix);
    }
    this.laneLights.instanceMatrix.needsUpdate = true;
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
