import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  createGateDressing,
  getGateDressingQualityProfile,
} from '../src/rendering/GateDressing';
import { createWorldProjection, WorldViews } from '../src/rendering/WorldViews';
import { createInitialGameState } from '../src/simulation/GameState';
import type { ObstacleState } from '../src/simulation/GameState';

const createObstacle = (): ObstacleState => ({
  id: 'gate-rust-fixture',
  x: 6,
  width: 0.9,
  active: true,
  activationDelay: 0,
  baseGapCenter: 5,
  gapCenter: 5,
  gapSize: 3,
  motionAmplitude: 0,
  motionFrequency: 0,
  motionPhase: 0.4,
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

describe('gate dressing profiles', () => {
  it('uses monotonic cylindrical detail and bounded mobile dressing', () => {
    const low = getGateDressingQualityProfile('low');
    const medium = getGateDressingQualityProfile('medium');
    const high = getGateDressingQualityProfile('high');

    expect([low.cylinderSegments, medium.cylinderSegments, high.cylinderSegments]).toEqual([
      10,
      14,
      18,
    ]);
    expect([low.maximumPlantBlades, medium.maximumPlantBlades, high.maximumPlantBlades]).toEqual([
      4,
      6,
      6,
    ]);
    expect([
      low.maximumMineralGrowths,
      medium.maximumMineralGrowths,
      high.maximumMineralGrowths,
    ]).toEqual([4, 6, 8]);
    expect(medium.plantScale).toBeGreaterThan(low.plantScale);
    expect(medium.plantScale).toBeGreaterThan(high.plantScale);
    expect(low.detailDistance).toBeLessThan(medium.detailDistance);
    expect(medium.detailDistance).toBeLessThan(high.detailDistance);
    expect(Object.isFrozen(low)).toBe(true);
  });

  it('derives stable but distinct rust and plant layouts from the gate id', () => {
    const first = createGateDressing('obstacle-17', 'high');
    const repeated = createGateDressing('obstacle-17', 'high');
    const other = createGateDressing('obstacle-18', 'high');

    expect(repeated).toEqual(first);
    expect(other).not.toEqual(first);
    expect(first.rustMarks.length).toBeGreaterThanOrEqual(6);
    expect(first.rustMarks.length).toBeLessThanOrEqual(8);
    expect(first.rustMarks[0]?.upper).toBe(false);
    expect(first.rustMarks[1]?.upper).toBe(true);
    expect(new Set(first.rustMarks.map((mark) => mark.silhouette)).size).toBeGreaterThanOrEqual(2);
    expect(first.rustMarks.every((mark) => mark.tone >= 0.5 && mark.tone <= 1)).toBe(true);
    expect(first.mineralGrowths.length).toBeGreaterThanOrEqual(6);
    expect(first.mineralGrowths.length).toBeLessThanOrEqual(8);
    expect(first.mineralGrowths.slice(0, 2).every((growth) => growth.anchor === 'waterline')).toBe(true);
    expect(first.plantBlades.length).toBeGreaterThanOrEqual(4);
    expect(first.plantBlades.length).toBeLessThanOrEqual(6);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rustMarks)).toBe(true);
    expect(Object.isFrozen(first.rustMarks[0])).toBe(true);
    expect(Object.isFrozen(first.mineralGrowths)).toBe(true);
    expect(Object.isFrozen(first.mineralGrowths[0])).toBe(true);
  });
});

describe('rounded gate integration', () => {
  it('keeps cylindrical collars outside the exact simulation gap', () => {
    const scene = new THREE.Scene();
    const views = new WorldViews(scene, 'high');
    const state = createInitialGameState(19);
    const obstacle = createObstacle();
    state.world.obstacles.push(obstacle);
    const projection = createWorldProjection(16 / 9);

    views.update(state, projection, 0, true);
    let gate: THREE.Object3D | undefined;
    scene.traverse((candidate) => {
      if (candidate.name === 'gate-view' && candidate.userData.obstacleId === obstacle.id) {
        gate = candidate;
      }
    });
    expect(gate).toBeDefined();

    const lower = gate?.getObjectByName('gate-lower-cylinder') as THREE.Mesh<THREE.CylinderGeometry>;
    const lowerCollar = gate?.getObjectByName('gate-lower-gap-collar') as THREE.Mesh;
    const upperCollar = gate?.getObjectByName('gate-upper-gap-collar') as THREE.Mesh;
    const rust = gate?.getObjectByName('gate-rust-marks') as THREE.InstancedMesh;
    const rustBands = gate?.getObjectByName('gate-rust-bands') as THREE.InstancedMesh;
    const algaeBand = gate?.getObjectByName('gate-algae-waterline-band') as THREE.Mesh;
    const mineralGrowths = gate?.getObjectByName('gate-mineral-barnacles') as THREE.InstancedMesh;
    const plants = gate?.getObjectByName('gate-water-plants') as THREE.InstancedMesh;
    const gapBottomY = projection.mapY(obstacle.gapCenter - obstacle.gapSize / 2);
    const gapTopY = projection.mapY(obstacle.gapCenter + obstacle.gapSize / 2);

    expect(lower.geometry.parameters.radialSegments).toBe(18);
    expect(lower.position.y + lower.scale.y / 2).toBeCloseTo(gapBottomY, 8);
    expect(lowerCollar.position.y + lowerCollar.scale.y / 2).toBeCloseTo(gapBottomY, 8);
    expect(upperCollar.position.y - upperCollar.scale.y / 2).toBeCloseTo(gapTopY, 8);
    expect(rust.visible).toBe(true);
    expect(rust.count).toBeGreaterThanOrEqual(6);
    expect(rust.count).toBeLessThanOrEqual(8);
    expect(rustBands.visible).toBe(true);
    expect(rustBands.count).toBe(2);
    expect(algaeBand.visible).toBe(true);
    expect(algaeBand.position.y + algaeBand.scale.y / 2).toBeLessThan(gapBottomY);
    expect((algaeBand.material as THREE.MeshStandardMaterial).roughness).toBeLessThanOrEqual(0.35);
    expect(mineralGrowths.visible).toBe(true);
    expect(mineralGrowths.count).toBeGreaterThanOrEqual(6);
    expect(mineralGrowths.count).toBeLessThanOrEqual(8);
    expect(plants.visible).toBe(true);
    expect(plants.count).toBeGreaterThanOrEqual(4);
    expect(plants.count).toBeLessThanOrEqual(6);

    const plantMatrix = new THREE.Matrix4();
    const plantPosition = new THREE.Vector3();
    const plantRotation = new THREE.Quaternion();
    const plantScale = new THREE.Vector3();
    for (let index = 0; index < plants.count; index += 1) {
      plants.getMatrixAt(index, plantMatrix);
      plantMatrix.decompose(plantPosition, plantRotation, plantScale);
      expect(plantPosition.y + plantScale.y).toBeLessThan(gapBottomY);
    }

    const dressing = createGateDressing(obstacle.id, 'high');
    const growthMatrix = new THREE.Matrix4();
    const growthPosition = new THREE.Vector3();
    const growthRotation = new THREE.Quaternion();
    const growthScale = new THREE.Vector3();
    for (let index = 0; index < mineralGrowths.count; index += 1) {
      const growth = dressing.mineralGrowths[index];
      if (!growth) continue;
      mineralGrowths.getMatrixAt(index, growthMatrix);
      growthMatrix.decompose(growthPosition, growthRotation, growthScale);
      const verticalExtent = Math.max(growthScale.x, growthScale.y) * 0.55;
      if (growth.anchor === 'upper-collar' || growth.anchor === 'upper-body') {
        expect(growthPosition.y - verticalExtent).toBeGreaterThan(gapTopY);
      } else {
        expect(growthPosition.y + verticalExtent).toBeLessThan(gapBottomY);
      }
    }

    views.destroy();
    expect(scene.getObjectByName('world-views')).toBeUndefined();
  });
});
