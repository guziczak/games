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
  alive: boolean;
}

interface BurstStyle {
  readonly colour: number;
  readonly count: number;
  readonly speed: number;
  readonly lifetime: number;
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

function nextUnit(seed: { value: number }): number {
  let next = seed.value || 0x9e3779b9;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  seed.value = next >>> 0;
  return seed.value / 0x100000000;
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
      const style = this.styleForEvent(event);
      if (!style) continue;
      const entityId = eventEntityId(event);
      const origin = entityId
        ? worldViews.positionForEntity(entityId, state, projection, alpha, this.eventPosition)
        : this.eventPosition.copy(this.playerPosition);
      const count = this.reducedMotion ? Math.max(2, Math.ceil(style.count * 0.42)) : style.count;
      const speed = this.reducedMotion ? style.speed * 0.42 : style.speed;
      this.spawnBurst(origin, { ...style, count, speed }, hashText(key));
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

  private spawnBurst(origin: THREE.Vector3, style: BurstStyle, randomSeed: number): void {
    const seed = { value: randomSeed };
    for (let index = 0; index < style.count; index += 1) {
      const particle = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.particles.length;
      if (!particle) continue;
      const angle = nextUnit(seed) * Math.PI * 2;
      const spread = 0.35 + nextUnit(seed) * 0.65;
      const verticalBias = (nextUnit(seed) - 0.42) * style.speed;
      particle.position.copy(origin);
      particle.position.z += (nextUnit(seed) - 0.5) * 0.5;
      particle.velocity.set(
        Math.cos(angle) * style.speed * spread,
        Math.sin(angle) * style.speed * spread + verticalBias * 0.25,
        (nextUnit(seed) - 0.5) * style.speed * 0.35,
      );
      particle.colour.setHex(style.colour);
      particle.age = 0;
      particle.lifetime = style.lifetime * (0.78 + nextUnit(seed) * 0.36);
      particle.drag = 0.93 + nextUnit(seed) * 0.045;
      particle.alive = true;
    }
  }

  private styleForEvent(event: GameEvent): BurstStyle | null {
    if (event.type === 'flap') {
      return { colour: 0xb8f7ff, count: 5, speed: 1.25, lifetime: 0.42 };
    }
    if (event.type === 'coin-collected') {
      return { colour: 0xffd34f, count: 12, speed: 1.8, lifetime: 0.68 };
    }
    if (event.type === 'mutation-selected' || event.type === 'mode-entered') {
      return { colour: MODE_COLOURS[event.mode], count: 22, speed: 2.2, lifetime: 0.82 };
    }
    if (event.type === 'collision') {
      if (event.outcome === 'destroy') {
        return { colour: 0xff9d2e, count: 20, speed: 3, lifetime: 0.86 };
      }
      if (event.outcome === 'bounce') {
        return { colour: 0xff6685, count: 13, speed: 2.3, lifetime: 0.66 };
      }
      if (event.outcome === 'phase') {
        return { colour: 0x79f5ff, count: 15, speed: 1.35, lifetime: 0.78 };
      }
      if (event.outcome === 'vault') {
        return { colour: 0xe9fcff, count: 18, speed: 2.55, lifetime: 0.72 };
      }
      if (event.outcome === 'fatal') {
        return { colour: 0xff435e, count: 28, speed: 2.8, lifetime: 1.05 };
      }
    }
    if (event.type === 'mode-action' && event.action === 'steel-critical') {
      return { colour: 0xff692f, count: 16, speed: 1.5, lifetime: 0.9 };
    }
    if (event.type === 'near-miss') {
      return { colour: 0xf9f3ae, count: 8, speed: 1.05, lifetime: 0.54 };
    }
    if (event.type === 'game-over') {
      return { colour: 0xff4963, count: 30, speed: 2.5, lifetime: 1.1 };
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
