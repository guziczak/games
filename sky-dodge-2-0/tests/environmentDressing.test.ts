import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  createCameraReaction,
  createDuckReflectionPresentation,
  createEnvironmentLayout,
  createSceneMood,
  getEnvironmentBudget,
  quadraticBezier,
} from '../src/rendering/EnvironmentDressing';
import { createWorldProjection, WorldViews } from '../src/rendering/WorldViews';
import { createInitialGameState } from '../src/simulation/GameState';
import type { ObstacleState } from '../src/simulation/GameState';

const createObstacle = (): ObstacleState => ({
  id: 'environment-gate-fixture',
  x: 7.4,
  width: 0.9,
  active: true,
  activationDelay: 0,
  baseGapCenter: 5.2,
  gapCenter: 5.2,
  gapSize: 3.1,
  motionAmplitude: 0,
  motionFrequency: 0,
  motionPhase: 0.62,
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
});

describe('deterministic collision-free environment layout', () => {
  it('honours monotonic LOD budgets and keeps every feature outside the rail corridor', () => {
    const lowBudget = getEnvironmentBudget('low');
    const mediumBudget = getEnvironmentBudget('medium');
    const highBudget = getEnvironmentBudget('high');
    expect(lowBudget).toEqual({ reeds: 18, buoys: 3, islands: 2, wrecks: 2, birds: 6 });
    expect(highBudget).toEqual({ reeds: 48, buoys: 7, islands: 6, wrecks: 4, birds: 14 });
    expect(mediumBudget.reeds).toBeGreaterThan(lowBudget.reeds);
    expect(highBudget.birds).toBeGreaterThan(mediumBudget.birds);

    const layout = createEnvironmentLayout('high');
    expect(createEnvironmentLayout('high')).toEqual(layout);
    expect(layout.reeds).toHaveLength(highBudget.reeds);
    expect(layout.buoys).toHaveLength(highBudget.buoys);
    expect(layout.islands).toHaveLength(highBudget.islands);
    expect(layout.wrecks).toHaveLength(highBudget.wrecks);
    expect(layout.birds).toHaveLength(highBudget.birds);
    for (const seed of [
      ...layout.reeds,
      ...layout.buoys,
      ...layout.islands,
      ...layout.wrecks,
      ...layout.birds,
    ]) {
      expect(seed.lateral).toBeGreaterThanOrEqual(2.15);
      expect([-1, 1]).toContain(seed.side);
      expect(Object.isFrozen(seed)).toBe(true);
    }
    expect(Object.isFrozen(layout)).toBe(true);
    expect(Object.isFrozen(layout.reeds)).toBe(true);
  });
});

describe('environment reaction helpers', () => {
  it('fades and softly enlarges the reflection with altitude', () => {
    const low = createDuckReflectionPresentation({
      playerY: 1,
      worldHeight: 10,
      mode: 'normal',
      time: 2,
      reducedMotion: false,
    });
    const high = createDuckReflectionPresentation({
      playerY: 9,
      worldHeight: 10,
      mode: 'normal',
      time: 2,
      reducedMotion: false,
    });
    const stillA = createDuckReflectionPresentation({
      playerY: 3,
      worldHeight: 10,
      mode: 'ghost',
      time: 0,
      reducedMotion: true,
    });
    const stillB = createDuckReflectionPresentation({
      playerY: 3,
      worldHeight: 10,
      mode: 'ghost',
      time: 20,
      reducedMotion: true,
    });
    expect(low.opacity).toBeGreaterThan(high.opacity);
    expect(high.scale).toBeGreaterThan(low.scale);
    expect(stillA.rippleScale).toBe(stillB.rippleScale);
    expect(stillA.colour).not.toBe(low.colour);
  });

  it('bounds rubber lens/roll and steel impulse, with a strong reduced-motion cut', () => {
    const aiming = createCameraReaction({
      mode: 'rubber',
      rubberPhase: 'aiming',
      rubberPhaseTime: 0.2,
      aimX: -0.8,
      aimY: 0.7,
      velocityX: 0,
      velocityY: 0,
      steelImpulse: 1,
      impulsePhase: 0.04,
      reducedMotion: false,
    });
    const reduced = createCameraReaction({
      mode: 'rubber',
      rubberPhase: 'aiming',
      rubberPhaseTime: 0.2,
      aimX: -0.8,
      aimY: 0.7,
      velocityX: 0,
      velocityY: 0,
      steelImpulse: 1,
      impulsePhase: 0.04,
      reducedMotion: true,
    });
    const lateFlight = createCameraReaction({
      mode: 'rubber',
      rubberPhase: 'flying',
      rubberPhaseTime: 2,
      aimX: 0,
      aimY: 0,
      velocityX: 11,
      velocityY: -8,
      steelImpulse: 0,
      impulsePhase: 2,
      reducedMotion: false,
    });
    expect(aiming.fov).toBeGreaterThan(40);
    expect(aiming.fov).toBeLessThanOrEqual(41.55);
    expect(Math.abs(aiming.roll)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(aiming.lateralOffset)).toBeLessThanOrEqual(0.075);
    expect(reduced.fov - 40).toBeLessThan((aiming.fov - 40) * 0.2);
    expect(Math.abs(reduced.lateralOffset)).toBeLessThan(Math.abs(aiming.lateralOffset));
    expect(lateFlight.fov).toBeCloseTo(40, 2);
  });

  it('cools ghost ambience and evaluates the Bézier guide exactly', () => {
    const normal = createSceneMood('normal', false);
    const ghost = createSceneMood('ghost', true);
    expect(ghost.background).not.toBe(normal.background);
    expect(ghost.fog).not.toBe(normal.fog);
    expect(ghost.ambientIntensity).toBeLessThan(normal.ambientIntensity);
    expect(ghost.exposure).toBeLessThan(normal.exposure);
    expect(quadraticBezier(2, 7, 10, 0)).toBe(2);
    expect(quadraticBezier(2, 7, 10, 1)).toBe(10);
    expect(quadraticBezier(2, 7, 10, 0.5)).toBe(6.5);
  });
});

describe('WorldViews environment and stork feedback integration', () => {
  it('instantiates the quality budget and exposes a dotted aim/vault trail only in its phase', () => {
    const scene = new THREE.Scene();
    const views = new WorldViews(scene, 'high');
    const state = createInitialGameState(37);
    const obstacle = createObstacle();
    state.world.obstacles.push(obstacle);
    const projection = createWorldProjection(390 / 844);
    views.update(state, projection, 0, true);

    const budget = getEnvironmentBudget('high');
    expect((scene.getObjectByName('distant-water-reeds') as THREE.InstancedMesh).count)
      .toBe(budget.reeds);
    expect((scene.getObjectByName('distant-water-buoys') as THREE.InstancedMesh).count)
      .toBe(budget.buoys);
    expect((scene.getObjectByName('distant-water-islands') as THREE.InstancedMesh).count)
      .toBe(budget.islands);
    expect((scene.getObjectByName('distant-submerged-wreck-hulls') as THREE.InstancedMesh).count)
      .toBe(budget.wrecks);
    expect((scene.getObjectByName('distant-water-birds') as THREE.InstancedMesh).count)
      .toBe(budget.birds);

    state.mode.active = 'stork';
    state.mode.stork.phase = 'aiming';
    state.mode.stork.lockedTargetId = obstacle.id;
    state.mode.stork.aimBias = 0.45;
    views.update(state, projection, 0, true);
    const target = scene.getObjectByName('stork-target-marker') as THREE.Group;
    const aimPath = scene.getObjectByName('stork-bezier-aim-path') as THREE.InstancedMesh;
    const vaultTrail = scene.getObjectByName('stork-world-vault-trail') as THREE.InstancedMesh;
    expect(target.visible).toBe(true);
    expect(aimPath.count).toBe(12);
    expect(vaultTrail.count).toBe(0);

    state.mode.stork.phase = 'vaulting';
    state.mode.stork.phaseTime = 0.22;
    state.mode.stork.vaultStartY = state.player.y;
    state.mode.stork.vaultTargetY = 6.2;
    views.update(state, projection, 0, true);
    expect(aimPath.count).toBe(0);
    expect(vaultTrail.count).toBe(8);
    views.destroy();
  });

  it('sways gate plants deterministically and freezes that sway for reduced motion', () => {
    const scene = new THREE.Scene();
    const views = new WorldViews(scene, 'high');
    const state = createInitialGameState(41);
    state.world.obstacles.push(createObstacle());
    const projection = createWorldProjection(16 / 9);
    const first = new THREE.Matrix4();
    const animated = new THREE.Matrix4();
    const reducedA = new THREE.Matrix4();
    const reducedB = new THREE.Matrix4();

    state.clock.elapsed = 0;
    views.update(state, projection, 0, false);
    let gate: THREE.Object3D | undefined;
    scene.traverse((candidate) => {
      if (candidate.name === 'gate-view' && candidate.userData.obstacleId === 'environment-gate-fixture') {
        gate = candidate;
      }
    });
    const plants = gate?.getObjectByName('gate-water-plants') as THREE.InstancedMesh;
    expect(plants.count).toBeGreaterThan(0);
    plants.getMatrixAt(0, first);
    state.clock.elapsed = 0.9;
    views.update(state, projection, 0, false);
    plants.getMatrixAt(0, animated);
    expect(animated.elements).not.toEqual(first.elements);

    views.update(state, projection, 0, true);
    plants.getMatrixAt(0, reducedA);
    state.clock.elapsed = 2.1;
    views.update(state, projection, 0, true);
    plants.getMatrixAt(0, reducedB);
    expect(reducedB.elements).toEqual(reducedA.elements);
    views.destroy();
  });
});
