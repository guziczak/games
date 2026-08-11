import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  computeWaterDownwashStrength,
  createWaterShaderSources,
  enqueueWaterRipple,
  getWaterQualityProfile,
  MAX_WATER_RIPPLES,
  pruneWaterRipples,
  WATER_RIPPLE_DURATION,
  WaterSurface,
  waterRippleStrengthForEvent,
} from '../src/rendering/WaterSurface';
import type { GameEvent } from '../src/simulation/GameEvents';

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
    expect(high.rippleSlots).toBeLessThanOrEqual(MAX_WATER_RIPPLES);
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
    expect(`${high.vertexShader}\n${high.fragmentShader}`).not.toMatch(/sampler|texture2D|texture\s*\(/);
    expect(low.vertexShader).toContain('float crestSignal = max(waveSin, 0.0)');
    expect(low.vertexShader).toContain('vWaveHeight = displaced.y - restHeight');
    expect(low.vertexShader).toContain('vSurfacePosition = position.xz + uSurfaceOrigin');
    expect(low.fragmentShader).toContain('crest-ridge-lighting');
    expect(low.fragmentShader).toContain('float crestFoam = 0.0');
    expect(high.fragmentShader).toContain('float foamBreakup = sin(');
    expect(high.fragmentShader).toContain('analytic-breaking-crest');
    expect(high.fragmentShader).toContain('float breakingThreshold = mix(0.995, 0.965, foamDrift01)');
    expect(high.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(high.fragmentShader).toContain('#include <colorspace_fragment>');
  });
});

describe('WaterSurface ripple helpers', () => {
  it('smoothly limits downwash to the near-water band', () => {
    expect(computeWaterDownwashStrength(0.28)).toBe(1);
    expect(computeWaterDownwashStrength(1)).toBeGreaterThan(0);
    expect(computeWaterDownwashStrength(2)).toBe(0);
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

  it('creates contact ripples but rejects unrelated or high-altitude flaps', () => {
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
    expect(waterRippleStrengthForEvent(obstacleBounce, 1)).toBe(0);
    expect(waterRippleStrengthForEvent(flap, 0)).toBe(0);
    expect(waterRippleStrengthForEvent(flap, 1)).toBeGreaterThan(0);
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
});
