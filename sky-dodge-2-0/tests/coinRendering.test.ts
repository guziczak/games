import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  createCoinRenderPose,
  createWorldProjection,
  WorldViews,
} from '../src/rendering/WorldViews';
import { createInitialGameState } from '../src/simulation/GameState';

describe('coin render presentation', () => {
  it('keeps spatial truth fixed while proximity only strengthens soft feedback', () => {
    const projection = createWorldProjection(16 / 9);
    const input = {
      simulationX: 7.25,
      simulationY: 5.4,
      radius: 0.18,
      time: 2.1,
      phase: 0.73,
    } as const;
    const far = createCoinRenderPose(projection, { ...input, normalizedProximity: 0 });
    const near = createCoinRenderPose(projection, { ...input, normalizedProximity: 1 });

    expect(near.x).toBe(projection.mapX(input.simulationX));
    expect(near.y).toBe(projection.mapY(input.simulationY));
    expect(near.z).toBe(projection.depthAt(input.simulationX));
    expect(near.solidRadius).toBe(input.radius);
    expect(near.x).toBe(far.x);
    expect(near.y).toBe(far.y);
    expect(near.z).toBe(far.z);
    expect(near.solidRadius).toBe(far.solidRadius);
    expect(near.haloRadius).toBeGreaterThan(far.haloRadius);
    expect(near.haloRadius).toBeGreaterThan(input.radius * 1.9);
    expect(near.trailLength).toBeGreaterThan(far.trailLength);
    expect(Math.abs(near.yaw - projection.pathYaw)).toBeLessThanOrEqual(0.3);
    expect(Object.isFrozen(near)).toBe(true);
  });

  it('uses the shared rail projection and real depth occlusion for every coin layer', () => {
    const scene = new THREE.Scene();
    const views = new WorldViews(scene, 'high');
    const state = createInitialGameState(29);
    const coin = {
      id: 'coin-render-fixture',
      obstacleId: 'gate-render-fixture',
      x: 7.4,
      y: 5.15,
      radius: 0.18,
      collected: false,
    };
    state.world.coins.push(coin);
    const projection = createWorldProjection(16 / 9);

    views.update(state, projection, 0, true);
    const rings = scene.getObjectByName('coin-solid-rings') as THREE.InstancedMesh;
    const cores = scene.getObjectByName('coin-solid-cores') as THREE.InstancedMesh;
    const halos = scene.getObjectByName('coin-readability-halos') as THREE.InstancedMesh;
    const trails = scene.getObjectByName('coin-rail-trails') as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    expect([rings.count, cores.count, halos.count, trails.count]).toEqual([1, 1, 1, 1]);
    rings.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.x).toBeCloseTo(projection.mapX(coin.x), 6);
    expect(position.y).toBeCloseTo(projection.mapY(coin.y), 6);
    expect(position.z).toBeCloseTo(projection.depthAt(coin.x), 6);
    expect(scale.x).toBeCloseTo(coin.radius, 6);

    halos.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.x).toBeCloseTo(projection.mapX(coin.x), 6);
    expect(position.z).toBeCloseTo(projection.depthAt(coin.x), 6);
    expect(scale.x).toBeGreaterThan(coin.radius * 1.65);

    trails.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);
    const pathForward = new THREE.Vector3(
      Math.sin(projection.pathYaw),
      0,
      Math.cos(projection.pathYaw),
    );
    position.addScaledVector(pathForward, scale.z * 0.5);
    expect(position.x).toBeCloseTo(projection.mapX(coin.x), 7);
    expect(position.y).toBeCloseTo(projection.mapY(coin.y), 7);
    expect(position.z).toBeCloseTo(projection.depthAt(coin.x), 7);

    const ringMaterial = rings.material as THREE.MeshStandardMaterial;
    const coreMaterial = cores.material as THREE.MeshStandardMaterial;
    const haloMaterial = halos.material as THREE.MeshBasicMaterial;
    const trailMaterial = trails.material as THREE.MeshBasicMaterial;
    expect(ringMaterial.depthTest).toBe(true);
    expect(ringMaterial.depthWrite).toBe(true);
    expect(coreMaterial.depthTest).toBe(true);
    expect(coreMaterial.depthWrite).toBe(true);
    expect(haloMaterial.depthTest).toBe(true);
    expect(haloMaterial.depthWrite).toBe(false);
    expect(trailMaterial.depthTest).toBe(true);
    expect(trailMaterial.depthWrite).toBe(false);
    expect([rings.frustumCulled, cores.frustumCulled, halos.frustumCulled, trails.frustumCulled])
      .toEqual([false, false, false, false]);

    coin.collected = true;
    views.update(state, projection, 0, true);
    expect([rings.count, cores.count, halos.count, trails.count]).toEqual([0, 0, 0, 0]);
    views.destroy();
  });
});
