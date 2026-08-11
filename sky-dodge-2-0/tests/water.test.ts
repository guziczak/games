import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  computeWaterDownwashStrength,
  createWaterShaderSources,
  enqueueWaterRipple,
  getWaterQualityProfile,
  MAX_WATER_PIPE_CONTACTS,
  MAX_WATER_RIPPLES,
  pruneWaterRipples,
  selectWaterPipeContacts,
  WATER_RIPPLE_DURATION,
  WaterSurface,
  waterRipplePositionForEvent,
  waterRippleStrengthForEvent,
} from '../src/rendering/WaterSurface';
import type { GameEvent } from '../src/simulation/GameEvents';
import { createInitialGameState } from '../src/simulation/GameState';
import type { ObstacleState } from '../src/simulation/GameState';
import type { WorldProjection } from '../src/rendering/WorldViews';

const TEST_PROJECTION: WorldProjection = Object.freeze({
  viewWidth: 12,
  viewHeight: 10,
  xScale: 1.5,
  pathScale: 1.6,
  pathYaw: 0.4,
  mapX: (x: number) => x * 1.5 - 2,
  mapY: (y: number) => y - 5,
  depthAt: (x: number) => -x * 0.5,
});

function obstacle(id: string, x: number, overrides: Partial<ObstacleState> = {}): ObstacleState {
  return {
    id,
    x,
    width: 1.2,
    active: true,
    activationDelay: 0,
    baseGapCenter: 4,
    gapCenter: 4,
    gapSize: 4,
    motionAmplitude: 0,
    motionFrequency: 0,
    motionPhase: 0,
    passed: false,
    nearMissAwarded: false,
    destroyed: false,
    collisionResolved: false,
    frogCatapultAwarded: false,
    rubberRicochetAwarded: false,
    steelBreakAwarded: false,
    ghostPhaseAwarded: false,
    storkVaultCommitted: false,
    storkVaultAwarded: false,
    ...overrides,
  };
}

describe('WaterSurface quality contract', () => {
  it('scales geometry and effects monotonically while staying within the mobile budget', () => {
    const low = getWaterQualityProfile('low');
    const medium = getWaterQualityProfile('medium');
    const high = getWaterQualityProfile('high');

    expect(low.segmentsX * low.segmentsZ * 2).toBe(1_728);
    expect(medium.segmentsX * medium.segmentsZ * 2).toBe(4_480);
    expect(high.segmentsX * high.segmentsZ * 2).toBe(11_264);
    expect([low.geometryWaves, medium.geometryWaves, high.geometryWaves]).toEqual([3, 4, 6]);
    expect([low.microWaves, medium.microWaves, high.microWaves]).toEqual([0, 1, 2]);
    expect([low.rippleSlots, medium.rippleSlots, high.rippleSlots]).toEqual([1, 2, 3]);
    expect([low.pipeContactSlots, medium.pipeContactSlots, high.pipeContactSlots]).toEqual([3, 3, 4]);
    expect([low.pipeContactCurrent, medium.pipeContactCurrent, high.pipeContactCurrent]).toEqual([
      false,
      true,
      true,
    ]);
    expect(high.rippleSlots).toBeLessThanOrEqual(MAX_WATER_RIPPLES);
    expect(high.pipeContactSlots).toBeLessThanOrEqual(MAX_WATER_PIPE_CONTACTS);
    expect(Object.isFrozen(low)).toBe(true);
  });

  it('builds fixed, texture-free shader variants with only the requested work', () => {
    const low = createWaterShaderSources(getWaterQualityProfile('low'));
    const high = createWaterShaderSources(getWaterQualityProfile('high'));

    expect(low.vertexShader.match(/gerstner-wave-/g)).toHaveLength(3);
    expect(high.vertexShader.match(/gerstner-wave-/g)).toHaveLength(6);
    expect(low.fragmentShader.match(/micro-wave-/g)).toBeNull();
    expect(high.fragmentShader.match(/micro-wave-/g)).toHaveLength(2);
    expect(low.fragmentShader.match(/fragment-ripple-/g)).toHaveLength(1);
    expect(high.fragmentShader.match(/fragment-ripple-/g)).toHaveLength(3);
    expect(low.fragmentShader.match(/pipe-contact-/g)).toHaveLength(3);
    expect(high.fragmentShader.match(/pipe-contact-/g)).toHaveLength(5);
    expect(low.fragmentShader).not.toContain('pipe-contact-current');
    expect(high.fragmentShader).toContain('pipe-contact-current');
    expect(`${high.vertexShader}\n${high.fragmentShader}`).not.toMatch(/sampler|texture2D|texture\s*\(/);
    expect(low.vertexShader).toContain('float crestSignal = max(waveSin, 0.0)');
    expect(low.vertexShader).toContain('vWaveHeight = displaced.y - restHeight');
    expect(low.vertexShader).toContain('vSurfacePosition = position.xz + uSurfaceOrigin');
    expect(low.fragmentShader).toContain('crest-ridge-lighting');
    expect(low.fragmentShader).toContain('float crestFoam = 0.0');
    expect(high.fragmentShader).toContain('float foamBreakup = sin(');
    expect(high.fragmentShader).toContain('analytic-breaking-crest');
    expect(high.fragmentShader).toContain('float breakingThreshold = mix(0.995, 0.965, foamDrift01)');
    expect(high.fragmentShader).toContain('continuous-kelvin-wake');
    expect(high.fragmentShader).toContain('ghost-water-cooling');
    expect(high.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(high.fragmentShader).toContain('#include <colorspace_fragment>');
  });
});

describe('WaterSurface ripple helpers', () => {
  it('smoothly limits downwash to the near-water band', () => {
    expect(computeWaterDownwashStrength(0.28)).toBe(1);
    expect(computeWaterDownwashStrength(1)).toBeGreaterThan(0);
    expect(computeWaterDownwashStrength(2)).toBe(0);
    expect(computeWaterDownwashStrength(2, 0.28, 2.25)).toBeGreaterThan(0);
    expect(computeWaterDownwashStrength(Number.NaN)).toBe(0);
  });

  it('keeps only the newest active ripples without mutating the source', () => {
    const source = Object.freeze([
      Object.freeze({ x: 1, z: 1, startedAt: 0, strength: 0.5 }),
      Object.freeze({ x: 2, z: 2, startedAt: 1, strength: 0.6 }),
    ]);
    const result = enqueueWaterRipple(source, { x: 3, z: 3, startedAt: 1.2, strength: 2 }, 2);

    expect(source).toHaveLength(2);
    expect(result.map((ripple) => ripple.x)).toEqual([2, 3]);
    expect(result[1]?.strength).toBe(1.25);
    expect(Object.isFrozen(result)).toBe(true);
    expect(pruneWaterRipples(result, 1.2 + WATER_RIPPLE_DURATION + 0.01)).toHaveLength(0);
  });

  it('creates form and floor ripples but rejects unrelated or high-altitude events', () => {
    const floorBounce: GameEvent = {
      tick: 10,
      time: 1,
      type: 'collision',
      entityId: 'boundary-floor',
      outcome: 'bounce',
    };
    const obstacleBounce: GameEvent = { ...floorBounce, entityId: 'obstacle-1' };
    const flap: GameEvent = { tick: 11, time: 1.1, type: 'flap', mode: 'normal' };

    expect(waterRippleStrengthForEvent(floorBounce, 0)).toBeCloseTo(0.78);
    const obstacleDestroy: GameEvent = { ...floorBounce, entityId: 'obstacle-1', outcome: 'destroy' };
    const frogLaunch: GameEvent = {
      tick: 12,
      time: 1.2,
      type: 'mode-action',
      mode: 'frog',
      action: 'frog-launch',
      entityId: 'obstacle-1',
    };

    expect(waterRippleStrengthForEvent(obstacleBounce, 1)).toBeCloseTo(0.78);
    expect(waterRippleStrengthForEvent(obstacleDestroy, 0)).toBeCloseTo(0.94);
    expect(waterRippleStrengthForEvent(frogLaunch, 0)).toBeCloseTo(0.68);
    expect(waterRippleStrengthForEvent(flap, 0)).toBe(0);
    expect(waterRippleStrengthForEvent(flap, 1)).toBeGreaterThan(0);
  });
});

describe('WaterSurface world contact projection', () => {
  it('selects a bounded nearest set of real lower pipe bases', () => {
    const state = createInitialGameState(7);
    state.world.obstacles = [
      obstacle('far', 12),
      obstacle('near', 5),
      obstacle('behind', 2),
      obstacle('third', 9),
      obstacle('destroyed', 4.5, { destroyed: true }),
      obstacle('no-lower-pipe', 4.6, { gapCenter: 2, gapSize: 4 }),
    ];

    const contacts = selectWaterPipeContacts(state, TEST_PROJECTION, 0, 3);

    expect(contacts.map((contact) => contact.obstacleId)).toEqual(['near', 'behind', 'third']);
    expect(contacts).toHaveLength(3);
    expect(contacts[0]?.radius).toBeGreaterThan(0);
    expect(Object.isFrozen(contacts)).toBe(true);
  });

  it('anchors obstacle events to their projected gate instead of the duck', () => {
    const state = createInitialGameState(8);
    state.world.obstacles = [obstacle('gate-impact', 6)];
    const event: GameEvent = {
      tick: 20,
      time: 2,
      type: 'collision',
      entityId: 'gate-impact',
      outcome: 'destroy',
    };

    const point = waterRipplePositionForEvent(
      event,
      state,
      TEST_PROJECTION,
      0,
      { x: -100, z: -100 },
    );

    expect(point).toEqual({ x: TEST_PROJECTION.mapX(6), z: TEST_PROJECTION.depthAt(6) });
  });
});

describe('WaterSurface lifecycle', () => {
  it('owns one mesh and releases it idempotently', () => {
    const scene = new THREE.Scene();
    const water = new WaterSurface(scene, 'medium');
    const mesh = scene.getObjectByName('procedural-water-surface') as THREE.Mesh<
      THREE.PlaneGeometry,
      THREE.ShaderMaterial
    >;
    expect(mesh).toBeDefined();
    expect(mesh.material.transparent).toBe(false);
    expect(mesh.material.depthWrite).toBe(true);
    expect(mesh.material.uniforms).not.toHaveProperty('map');
    expect(water.getDebugSnapshot().ripples).toHaveLength(0);

    water.reset();
    water.destroy();
    water.destroy();
    expect(scene.getObjectByName('procedural-water-surface')).toBeUndefined();
  });

  it('syncs contacts and ghost cooling while deduplicating paired rubber events', () => {
    const scene = new THREE.Scene();
    const water = new WaterSurface(scene, 'medium');
    const state = createInitialGameState(9);
    state.clock.elapsed = 1;
    state.player.y = 1;
    state.mode.active = 'ghost';
    state.world.obstacles = [obstacle('rubber-gate', 6)];
    const events: readonly GameEvent[] = [
      {
        tick: 30,
        time: 1,
        type: 'collision',
        entityId: 'rubber-gate',
        outcome: 'bounce',
      },
      {
        tick: 30,
        time: 1,
        type: 'mode-action',
        mode: 'rubber',
        action: 'rubber-bounce',
        entityId: 'rubber-gate',
      },
    ];

    water.update(state, TEST_PROJECTION, 1, false, events, new THREE.Vector3(0, 5, 8));
    const snapshot = water.getDebugSnapshot();

    expect(snapshot.pipeContacts.map((contact) => contact.obstacleId)).toEqual(['rubber-gate']);
    expect(snapshot.ghostInfluence).toBe(1);
    expect(snapshot.downwash).toBeGreaterThan(0);
    expect(snapshot.ripples).toHaveLength(1);
    expect(snapshot.ripples[0]?.x).toBeCloseTo(TEST_PROJECTION.mapX(6));

    water.destroy();
  });
});
