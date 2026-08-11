import * as THREE from 'three';

import { DEFAULT_GAME_CONFIG } from '../simulation/GameConfig';
import type { GameEvent } from '../simulation/GameEvents';
import type { GameState, MutationModeId } from '../simulation/GameState';
import type { RenderQuality, WorldProjection, WorldViews } from './WorldViews';

interface Particle {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly colour: THREE.Color;
  age: number;
  lifetime: number;
  drag: number;
  gravity: number;
  alive: boolean;
}

type BurstShape = 'radial' | 'droplet' | 'spray' | 'trail' | 'flake';
type BurstOrigin = 'entity' | 'player';

interface BurstStyle {
  readonly colour: number;
  readonly secondaryColour: number;
  readonly count: number;
  readonly speed: number;
  readonly lifetime: number;
  readonly gravity: number;
  readonly dragMinimum: number;
  readonly dragMaximum: number;
  readonly spread: number;
  readonly trailLength: number;
  readonly shape: BurstShape;
  readonly origin: BurstOrigin;
}

const MODE_COLOURS: Readonly<Record<MutationModeId, number>> = Object.freeze({
  frog: 0x6cff8d,
  rubber: 0xff617b,
  steel: 0xd8f0f8,
  ghost: 0x7ff6ff,
  stork: 0xff7767,
});

const MAXIMUM_PARTICLES: Readonly<Record<RenderQuality, number>> = Object.freeze({
  low: 72,
  medium: 128,
  high: 208,
});

function style(
  colour: number,
  secondaryColour: number,
  count: number,
  speed: number,
  lifetime: number,
  shape: BurstShape = 'radial',
  origin: BurstOrigin = 'entity',
  gravity = 0,
  dragMinimum = 0.93,
  dragMaximum = 0.975,
  spread = 1,
  trailLength = 0,
): Readonly<BurstStyle> {
  return Object.freeze({
    colour,
    secondaryColour,
    count,
    speed,
    lifetime,
    gravity,
    dragMinimum,
    dragMaximum,
    spread,
    trailLength,
    shape,
    origin,
  });
}

const NORMAL_FLAP = style(0xb8f7ff, 0x79ddea, 5, 1.25, 0.42, 'radial', 'player', -0.3);
const FROG_FLAP = style(0x75e7ad, 0xc6fbff, 8, 1.15, 0.58, 'droplet', 'player', -3.4, 0.95, 0.982, 0.62, 0.52);
const FROG_LAUNCH = style(0x57d68d, 0xbaf6dc, 15, 1.8, 0.72, 'droplet', 'player', -3.8, 0.948, 0.98, 0.82, 0.85);
const COIN_BURST = style(0xffd34f, 0xfff0a0, 12, 1.8, 0.68);
const STEEL_FLAKES = style(0xa64d26, 0x82939a, 26, 2.15, 1.22, 'flake', 'player', -5.2, 0.96, 0.989, 0.84);
const RUBBER_SPRAY = style(0xff5f83, 0xbef7ef, 17, 2.65, 0.72, 'spray', 'player', -2.1, 0.91, 0.965, 1.08);
const GHOST_TRAIL = style(0x63e9ff, 0xd2fdff, 18, 0.78, 0.96, 'trail', 'player', 0.12, 0.96, 0.991, 0.36, 1.85);
const GHOST_TRAIL_END = style(0xa8f8ff, 0x6389d7, 10, 0.48, 0.72, 'trail', 'player', 0.18, 0.965, 0.992, 0.28, 1.1);
const STORK_TRAIL = style(0xecfbff, 0xff8c72, 22, 1.45, 0.72, 'trail', 'player', -0.35, 0.935, 0.978, 0.3, 2.35);
const STORK_TRAIL_END = style(0xffffff, 0xffb49d, 11, 0.82, 0.58, 'trail', 'player', -0.45, 0.94, 0.98, 0.26, 1.35);
const FATAL_BURST = style(0xff435e, 0xff96a4, 28, 2.8, 1.05);
const STEEL_CRITICAL = style(0xff692f, 0xffc052, 16, 1.5, 0.9, 'flake', 'player', -2.4, 0.95, 0.982, 0.7);
const NEAR_MISS = style(0xf9f3ae, 0xffffff, 8, 1.05, 0.54);
const GAME_OVER = style(0xff4963, 0xffa1ad, 30, 2.5, 1.1, 'radial', 'player', -1.2);

const MODE_ENTRY_STYLES: Readonly<Record<MutationModeId, Readonly<BurstStyle>>> = Object.freeze({
  frog: style(MODE_COLOURS.frog, 0xc4ffd1, 22, 2.2, 0.82, 'droplet', 'player', -2.6, 0.94, 0.978, 0.9, 0.45),
  rubber: style(MODE_COLOURS.rubber, 0xffbdca, 22, 2.2, 0.82, 'spray', 'player', -0.8, 0.91, 0.966, 1.05),
  steel: style(MODE_COLOURS.steel, 0x8a9ba3, 22, 2.2, 0.82, 'flake', 'player', -3.8, 0.955, 0.986, 0.78),
  ghost: style(MODE_COLOURS.ghost, 0xd9ffff, 22, 0.88, 0.92, 'trail', 'player', 0.1, 0.96, 0.99, 0.34, 1.45),
  stork: style(MODE_COLOURS.stork, 0xf2fdff, 22, 1.6, 0.76, 'trail', 'player', -0.3, 0.94, 0.978, 0.32, 1.7),
});

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function eventIdentity(event: GameEvent): string {
  let detail = '';
  if ('entityId' in event && event.entityId) detail = event.entityId;
  else if ('coinId' in event) detail = event.coinId;
  else if ('obstacleId' in event) detail = event.obstacleId;
  else if ('offerId' in event) detail = event.offerId;
  if ('action' in event) detail += `:${event.action}`;
  if ('kind' in event) detail += `:${event.kind}`;
  if ('mode' in event) detail += `:${event.mode}`;
  return `${event.tick}:${event.type}:${detail}`;
}

function eventEntityId(event: GameEvent): string | null {
  if ('entityId' in event && event.entityId) return event.entityId;
  if ('coinId' in event) return event.coinId;
  if ('obstacleId' in event) return event.obstacleId;
  return null;
}

/** A single pooled Points field; gameplay events only request deterministic bursts. */
export class ParticleField {
  private readonly root: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly particles: readonly Particle[];
  private readonly positions: Float32Array;
  private readonly colours: Float32Array;
  private readonly positionAttribute: THREE.BufferAttribute;
  private readonly colourAttribute: THREE.BufferAttribute;
  private readonly recentEventKeys = new Set<string>();
  private readonly recentEventOrder: string[] = [];
  private readonly eventPosition = new THREE.Vector3();
  private readonly playerPosition = new THREE.Vector3();
  private cursor = 0;
  private randomState = 0;
  private lastTime: number | null = null;
  private destroyed = false;

  constructor(
    parent: THREE.Object3D,
    quality: RenderQuality,
    private readonly reducedMotion: boolean,
  ) {
    const maximum = MAXIMUM_PARTICLES[quality];
    this.positions = new Float32Array(maximum * 3);
    this.colours = new Float32Array(maximum * 3);
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colourAttribute = new THREE.BufferAttribute(this.colours, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.colourAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colourAttribute);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      size: quality === 'low' ? 0.075 : 0.095,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.root = new THREE.Points(this.geometry, this.material);
    this.root.name = 'event-particles';
    this.root.frustumCulled = false;
    this.root.renderOrder = 30;
    parent.add(this.root);

    this.particles = Object.freeze(Array.from({ length: maximum }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      colour: new THREE.Color(),
      age: 0,
      lifetime: 0,
      drag: 1,
      gravity: 0,
      alive: false,
    })));
  }

  consume(
    events: readonly GameEvent[],
    state: Readonly<GameState>,
    projection: WorldProjection,
    alpha: number,
    worldViews: WorldViews,
  ): void {
    if (this.destroyed || events.length === 0) return;
    const playerX = state.player.x + state.player.vx * DEFAULT_GAME_CONFIG.fixedStep * alpha;
    this.playerPosition.set(
      projection.mapX(playerX),
      projection.mapY(state.player.y + state.player.vy * DEFAULT_GAME_CONFIG.fixedStep * alpha),
      projection.depthAt(playerX),
    );

    for (const event of events) {
      const key = eventIdentity(event);
      if (this.recentEventKeys.has(key)) continue;
      this.rememberEvent(key);
      const burstStyle = this.styleForEvent(event);
      if (!burstStyle) continue;
      const entityId = eventEntityId(event);
      const origin = burstStyle.origin === 'player' || !entityId
        ? this.eventPosition.copy(this.playerPosition)
        : entityId
        ? worldViews.positionForEntity(entityId, state, projection, alpha, this.eventPosition)
        : this.eventPosition.copy(this.playerPosition);
      const motionScale = this.reducedMotion ? 0.42 : 1;
      const count = this.reducedMotion
        ? Math.max(2, Math.ceil(burstStyle.count * motionScale))
        : burstStyle.count;
      this.spawnBurst(
        origin,
        burstStyle,
        count,
        burstStyle.speed * motionScale,
        motionScale,
        projection.pathYaw,
        hashText(key),
      );
    }
  }

  update(simulationTime: number): void {
    if (this.destroyed) return;
    const previousTime = this.lastTime;
    this.lastTime = simulationTime;
    const dt = previousTime === null
      ? 0
      : clamp(simulationTime - previousTime, 0, 0.1);
    let rendered = 0;

    for (const particle of this.particles) {
      if (!particle.alive) continue;
      particle.age += dt;
      if (particle.age >= particle.lifetime) {
        particle.alive = false;
        continue;
      }
      const damping = Math.pow(particle.drag, dt * 60);
      particle.velocity.y += particle.gravity * dt;
      particle.velocity.multiplyScalar(damping);
      particle.position.addScaledVector(particle.velocity, dt);
      const life = 1 - particle.age / particle.lifetime;
      const offset = rendered * 3;
      this.positions[offset] = particle.position.x;
      this.positions[offset + 1] = particle.position.y;
      this.positions[offset + 2] = particle.position.z;
      this.colours[offset] = particle.colour.r * life;
      this.colours[offset + 1] = particle.colour.g * life;
      this.colours[offset + 2] = particle.colour.b * life;
      rendered += 1;
    }

    this.geometry.setDrawRange(0, rendered);
    this.positionAttribute.needsUpdate = true;
    this.colourAttribute.needsUpdate = true;
  }

  reset(): void {
    if (this.destroyed) return;
    for (const particle of this.particles) particle.alive = false;
    this.geometry.setDrawRange(0, 0);
    this.recentEventKeys.clear();
    this.recentEventOrder.length = 0;
    this.cursor = 0;
    this.randomState = 0;
    this.lastTime = null;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.recentEventKeys.clear();
    this.recentEventOrder.length = 0;
  }

  private nextRandom(): number {
    let next = this.randomState || 0x9e3779b9;
    next ^= next << 13;
    next ^= next >>> 17;
    next ^= next << 5;
    this.randomState = next >>> 0;
    return this.randomState / 0x100000000;
  }

  private spawnBurst(
    origin: THREE.Vector3,
    burstStyle: Readonly<BurstStyle>,
    count: number,
    speed: number,
    motionScale: number,
    pathYaw: number,
    randomSeed: number,
  ): void {
    this.randomState = randomSeed;
    const forwardX = Math.sin(pathYaw);
    const forwardZ = Math.cos(pathYaw);
    const sideX = Math.cos(pathYaw);
    const sideZ = -Math.sin(pathYaw);

    for (let index = 0; index < count; index += 1) {
      const particle = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.particles.length;
      if (!particle) continue;
      const randomA = this.nextRandom();
      const randomB = this.nextRandom();
      const randomC = this.nextRandom();
      const randomD = this.nextRandom();
      const randomE = this.nextRandom();
      const randomF = this.nextRandom();
      particle.position.copy(origin);

      if (burstStyle.shape === 'flake') {
        const along = (randomA - 0.5) * 0.3 * burstStyle.spread;
        const across = (randomB - 0.5) * 0.72 * burstStyle.spread;
        particle.position.x += forwardX * along + sideX * across;
        particle.position.y += (randomC - 0.5) * 0.32;
        particle.position.z += forwardZ * along + sideZ * across;
        const sideSpeed = (randomD - 0.5) * speed * burstStyle.spread;
        const backwardSpeed = speed * (0.08 + randomE * 0.24);
        particle.velocity.set(
          sideX * sideSpeed - forwardX * backwardSpeed,
          speed * (0.08 + randomF * 0.5),
          sideZ * sideSpeed - forwardZ * backwardSpeed,
        );
      } else if (burstStyle.shape === 'droplet') {
        const trail = burstStyle.trailLength * motionScale * (0.12 + randomA * 0.88);
        const across = (randomB - 0.5) * burstStyle.spread * 0.34 * motionScale;
        particle.position.x -= forwardX * trail - sideX * across;
        particle.position.y += (randomC - 0.5) * 0.22 * motionScale;
        particle.position.z -= forwardZ * trail - sideZ * across;
        const backwardSpeed = speed * (0.22 + randomD * 0.42);
        const sideSpeed = (randomE - 0.5) * speed * 0.36;
        particle.velocity.set(
          -forwardX * backwardSpeed + sideX * sideSpeed,
          speed * (randomF * 0.9 - 0.18),
          -forwardZ * backwardSpeed + sideZ * sideSpeed,
        );
      } else if (burstStyle.shape === 'spray') {
        const fan = (randomA - 0.5) * 2;
        const outward = speed * (0.52 + randomB * 0.48);
        const alongSpeed = (randomC - 0.5) * speed * 0.72;
        particle.position.x += sideX * fan * 0.12 * motionScale;
        particle.position.y += randomD * 0.12 * motionScale;
        particle.position.z += sideZ * fan * 0.12 * motionScale;
        particle.velocity.set(
          sideX * fan * outward + forwardX * alongSpeed,
          speed * (0.18 + randomE * 0.88),
          sideZ * fan * outward + forwardZ * alongSpeed,
        );
      } else if (burstStyle.shape === 'trail') {
        const progress = count <= 1 ? 0 : (index + randomA * 0.45) / count;
        const trail = burstStyle.trailLength * motionScale * progress;
        const across = (randomB - 0.5) * burstStyle.spread * motionScale;
        particle.position.x -= forwardX * trail - sideX * across;
        particle.position.y += (randomC - 0.5) * burstStyle.spread * motionScale;
        particle.position.z -= forwardZ * trail - sideZ * across;
        const backwardSpeed = speed * (0.2 + randomD * 0.36);
        const sideSpeed = (randomE - 0.5) * speed * 0.2;
        particle.velocity.set(
          -forwardX * backwardSpeed + sideX * sideSpeed,
          (randomF - 0.45) * speed * 0.22,
          -forwardZ * backwardSpeed + sideZ * sideSpeed,
        );
      } else {
        const angle = randomA * Math.PI * 2;
        const radialSpread = (0.35 + randomB * 0.65) * burstStyle.spread;
        const verticalBias = (randomC - 0.42) * speed;
        particle.position.z += (randomD - 0.5) * 0.5;
        particle.velocity.set(
          Math.cos(angle) * speed * radialSpread,
          Math.sin(angle) * speed * radialSpread + verticalBias * 0.25,
          (randomE - 0.5) * speed * 0.35,
        );
      }

      particle.colour.setHex(randomF < 0.28 ? burstStyle.secondaryColour : burstStyle.colour);
      particle.age = 0;
      particle.lifetime = burstStyle.lifetime * (0.78 + this.nextRandom() * 0.36);
      particle.drag = burstStyle.dragMinimum
        + this.nextRandom() * (burstStyle.dragMaximum - burstStyle.dragMinimum);
      particle.gravity = burstStyle.gravity * (0.55 + motionScale * 0.45);
      particle.alive = true;
    }
  }

  private styleForEvent(event: GameEvent): Readonly<BurstStyle> | null {
    if (event.type === 'flap') {
      return event.mode === 'frog' ? FROG_FLAP : NORMAL_FLAP;
    }
    if (event.type === 'coin-collected') {
      return COIN_BURST;
    }
    if (event.type === 'mutation-selected' || event.type === 'mode-entered') {
      return MODE_ENTRY_STYLES[event.mode];
    }
    if (event.type === 'collision') {
      if (event.outcome === 'destroy') {
        return STEEL_FLAKES;
      }
      if (event.outcome === 'bounce') {
        return RUBBER_SPRAY;
      }
      if (event.outcome === 'phase') {
        return GHOST_TRAIL;
      }
      if (event.outcome === 'vault') {
        return STORK_TRAIL_END;
      }
      if (event.outcome === 'fatal') {
        return FATAL_BURST;
      }
    }
    if (event.type === 'mode-action') {
      if (event.action === 'frog-launch') return FROG_LAUNCH;
      if (event.action === 'ghost-phase-start') return GHOST_TRAIL;
      if (event.action === 'ghost-phase-end') return GHOST_TRAIL_END;
      if (event.action === 'stork-vault-start') return STORK_TRAIL;
      if (event.action === 'stork-vault-end') return STORK_TRAIL_END;
      if (event.action === 'steel-critical') return STEEL_CRITICAL;
    }
    if (event.type === 'near-miss') {
      return NEAR_MISS;
    }
    if (event.type === 'game-over') {
      return GAME_OVER;
    }
    return null;
  }

  private rememberEvent(key: string): void {
    this.recentEventKeys.add(key);
    this.recentEventOrder.push(key);
    if (this.recentEventOrder.length <= 256) return;
    const oldest = this.recentEventOrder.shift();
    if (oldest) this.recentEventKeys.delete(oldest);
  }
}
