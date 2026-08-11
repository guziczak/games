import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { ParticleField } from '../src/rendering/ParticleField';
import { createWorldProjection } from '../src/rendering/WorldViews';
import type { WorldProjection, WorldViews } from '../src/rendering/WorldViews';
import type { GameEvent } from '../src/simulation/GameEvents';
import { createInitialGameState } from '../src/simulation/GameState';

function createFixture(reducedMotion = false, quality: 'low' | 'medium' | 'high' = 'high') {
  const scene = new THREE.Scene();
  const field = new ParticleField(scene, quality, reducedMotion);
  const state = createInitialGameState(0x51a7);
  const projection = createWorldProjection(16 / 9);
  const worldViews = {
    positionForEntity: (
      _entityId: string,
      _state: unknown,
      _projection: WorldProjection,
      _alpha: number,
      target: THREE.Vector3,
    ) => target.set(8, 2, -4),
  } as unknown as WorldViews;
  const points = scene.getObjectByName('event-particles') as THREE.Points<
    THREE.BufferGeometry,
    THREE.PointsMaterial
  >;
  return { scene, field, state, projection, worldViews, points };
}

function consume(
  fixture: ReturnType<typeof createFixture>,
  events: readonly GameEvent[],
): void {
  fixture.field.consume(
    events,
    fixture.state,
    fixture.projection,
    0,
    fixture.worldViews,
  );
  fixture.field.update(0);
}

function activeArray(points: THREE.Points, name: 'position' | 'color'): Float32Array {
  const attribute = points.geometry.getAttribute(name) as THREE.BufferAttribute;
  return (attribute.array as Float32Array).slice(0, points.geometry.drawRange.count * 3);
}

function formEvents(): readonly GameEvent[] {
  return [
    { type: 'flap', tick: 1, time: 0.1, mode: 'frog' },
    { type: 'mode-action', tick: 2, time: 0.2, mode: 'frog', action: 'frog-launch', entityId: 'gate-a' },
    { type: 'collision', tick: 3, time: 0.3, entityId: 'gate-b', outcome: 'destroy' },
    { type: 'collision', tick: 4, time: 0.4, entityId: 'gate-c', outcome: 'bounce' },
    // Simulation emits this beside the physical collision. It must not double
    // the spray requested by the collision event.
    { type: 'mode-action', tick: 4, time: 0.4, mode: 'rubber', action: 'rubber-bounce', entityId: 'gate-c' },
    { type: 'collision', tick: 5, time: 0.5, entityId: 'gate-d', outcome: 'phase' },
    { type: 'mode-action', tick: 6, time: 0.6, mode: 'stork', action: 'stork-vault-start', entityId: 'gate-e' },
  ];
}

describe('ParticleField form reactions', () => {
  it('emits deterministic wet, metallic, spectral and aerodynamic shapes with event dedupe', () => {
    const first = createFixture();
    const second = createFixture();
    const events = formEvents();
    consume(first, events);
    consume(second, events);

    // 8 frog drops + 15 launch drops + 26 flakes + 17 spray + 18 ghost
    // trail points + 22 stork trail points. The paired rubber action is silent.
    expect(first.points.geometry.drawRange.count).toBe(106);
    expect(second.points.geometry.drawRange.count).toBe(106);
    expect(activeArray(first.points, 'position')).toEqual(activeArray(second.points, 'position'));
    expect(activeArray(first.points, 'color')).toEqual(activeArray(second.points, 'color'));

    first.field.consume(events, first.state, first.projection, 0, first.worldViews);
    first.field.update(0);
    expect(first.points.geometry.drawRange.count).toBe(106);

    const colours = activeArray(first.points, 'color');
    const uniqueColours = new Set<string>();
    for (let index = 0; index < colours.length; index += 3) {
      uniqueColours.add(`${colours[index]?.toFixed(4)}:${colours[index + 1]?.toFixed(4)}:${colours[index + 2]?.toFixed(4)}`);
    }
    expect(uniqueColours.size).toBeGreaterThanOrEqual(8);

    first.field.destroy();
    second.field.destroy();
  });

  it('lays a stork trail behind the flight rail and pulls steel flakes down toward the water', () => {
    const trail = createFixture();
    const vault: GameEvent = {
      type: 'mode-action',
      tick: 10,
      time: 1,
      mode: 'stork',
      action: 'stork-vault-start',
      entityId: 'gate-vault',
    };
    consume(trail, [vault]);
    const positions = activeArray(trail.points, 'position');
    const playerWorldX = trail.projection.mapX(trail.state.player.x);
    const playerWorldZ = trail.projection.depthAt(trail.state.player.x);
    const forwardX = Math.sin(trail.projection.pathYaw);
    const forwardZ = Math.cos(trail.projection.pathYaw);
    let mostDistantTrailPoint = 0;
    for (let index = 0; index < positions.length; index += 3) {
      const alongRail = ((positions[index] ?? 0) - playerWorldX) * forwardX
        + ((positions[index + 2] ?? 0) - playerWorldZ) * forwardZ;
      mostDistantTrailPoint = Math.min(mostDistantTrailPoint, alongRail);
      expect(alongRail).toBeLessThanOrEqual(0.00001);
    }
    expect(mostDistantTrailPoint).toBeLessThan(-1.5);

    const flakes = createFixture();
    const steelHit: GameEvent = {
      type: 'collision',
      tick: 11,
      time: 1.1,
      entityId: 'gate-rust',
      outcome: 'destroy',
    };
    consume(flakes, [steelHit]);
    flakes.field.update(0.1);
    const early = activeArray(flakes.points, 'position');
    const earlyMeanY = early.reduce((sum, value, index) => index % 3 === 1 ? sum + value : sum, 0)
      / flakes.points.geometry.drawRange.count;
    for (let time = 0.2; time <= 0.7; time += 0.1) flakes.field.update(time);
    const late = activeArray(flakes.points, 'position');
    const lateMeanY = late.reduce((sum, value, index) => index % 3 === 1 ? sum + value : sum, 0)
      / flakes.points.geometry.drawRange.count;
    expect(lateMeanY).toBeLessThan(earlyMeanY - 0.35);

    trail.field.destroy();
    flakes.field.destroy();
  });

  it('bounds one reusable pool, reduces motion, and clears lifecycle state on reset/destroy', () => {
    const normal = createFixture(false, 'low');
    const reduced = createFixture(true, 'low');
    const steelHit: GameEvent = {
      type: 'collision',
      tick: 20,
      time: 2,
      entityId: 'gate-heavy',
      outcome: 'destroy',
    };
    consume(normal, [steelHit]);
    consume(reduced, [steelHit]);
    expect(normal.points.geometry.drawRange.count).toBe(26);
    expect(reduced.points.geometry.drawRange.count).toBe(11);

    const positionAttribute = normal.points.geometry.getAttribute('position');
    for (let time = 0.1; time <= 0.5; time += 0.1) normal.field.update(time);
    expect(normal.points.geometry.getAttribute('position')).toBe(positionAttribute);
    expect(normal.points.geometry.getAttribute('position').array).toBe(positionAttribute.array);

    const flood: GameEvent[] = Array.from({ length: 90 }, (_, index) => ({
      type: 'coin-collected',
      tick: 100 + index,
      time: 3 + index / 60,
      coinId: `coin-${index}`,
      obstacleId: `gate-${index}`,
    }));
    normal.field.consume(flood, normal.state, normal.projection, 0, normal.worldViews);
    normal.field.update(0.51);
    expect(normal.points.geometry.drawRange.count).toBe(72);
    expect(normal.points.geometry.getAttribute('position').count).toBe(72);

    normal.field.reset();
    expect(normal.points.geometry.drawRange.count).toBe(0);
    consume(normal, [steelHit]);
    expect(normal.points.geometry.drawRange.count).toBe(26);

    let geometryDisposed = false;
    let materialDisposed = false;
    normal.points.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
    normal.points.material.addEventListener('dispose', () => { materialDisposed = true; });
    normal.field.destroy();
    expect(normal.scene.getObjectByName('event-particles')).toBeUndefined();
    expect(geometryDisposed).toBe(true);
    expect(materialDisposed).toBe(true);
    reduced.field.destroy();
  });
});
