import * as THREE from 'three';

import { DEFAULT_GAME_CONFIG, getDifficultyTier } from '../simulation/GameConfig';
import type { GameEvent } from '../simulation/GameEvents';
import type { GameState, ObstacleState } from '../simulation/GameState';
import type { RenderQuality, WorldProjection } from './WorldViews';

export const MAX_WATER_RIPPLES = 3;
export const MAX_WATER_PIPE_CONTACTS = 4;
export const WATER_RIPPLE_DURATION = 1.55;

export interface WaterQualityProfile {
  readonly segmentsX: number;
  readonly segmentsZ: number;
  readonly geometryWaves: number;
  readonly microWaves: number;
  readonly rippleSlots: number;
  readonly pipeContactSlots: number;
  readonly pipeContactCurrent: boolean;
  readonly crestFoam: boolean;
  readonly amplitudeScale: number;
}

export interface WaterRipple {
  readonly x: number;
  readonly z: number;
  readonly startedAt: number;
  readonly strength: number;
}

export interface WaterPipeContact {
  readonly obstacleId: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly strength: number;
}

export interface WaterPoint {
  readonly x: number;
  readonly z: number;
}

export interface WaterDebugSnapshot {
  readonly quality: RenderQuality;
  readonly displayTime: number;
  readonly reducedMotion: boolean;
  readonly downwash: number;
  readonly ghostInfluence: number;
  readonly pipeContacts: readonly WaterPipeContact[];
  readonly ripples: readonly WaterRipple[];
}

export interface WaterShaderSources {
  readonly vertexShader: string;
  readonly fragmentShader: string;
}

const WATER_PROFILES: Readonly<Record<RenderQuality, Readonly<WaterQualityProfile>>> = Object.freeze({
  low: Object.freeze({
    segmentsX: 24,
    segmentsZ: 36,
    geometryWaves: 3,
    microWaves: 0,
    rippleSlots: 1,
    pipeContactSlots: 3,
    pipeContactCurrent: false,
    crestFoam: false,
    amplitudeScale: 0.9,
  }),
  medium: Object.freeze({
    segmentsX: 40,
    segmentsZ: 56,
    geometryWaves: 4,
    microWaves: 1,
    rippleSlots: 2,
    pipeContactSlots: 3,
    pipeContactCurrent: true,
    crestFoam: true,
    amplitudeScale: 0.95,
  }),
  high: Object.freeze({
    segmentsX: 64,
    segmentsZ: 88,
    geometryWaves: 6,
    microWaves: 2,
    rippleSlots: 3,
    pipeContactSlots: 4,
    pipeContactCurrent: true,
    crestFoam: true,
    amplitudeScale: 1,
  }),
});

interface GerstnerWaveDefinition {
  readonly directionX: number;
  readonly directionZ: number;
  readonly amplitude: number;
  readonly wavelength: number;
  readonly speed: number;
  readonly phase: number;
  readonly steepness: number;
}

interface MicroWaveDefinition {
  readonly directionX: number;
  readonly directionZ: number;
  readonly frequency: number;
  readonly speed: number;
  readonly strength: number;
  readonly phase: number;
}

const GERSTNER_WAVES: readonly GerstnerWaveDefinition[] = Object.freeze([
  // The broad swell travels roughly along the flight rail, so its crests cut
  // across the 3/4 view instead of collapsing into the perspective direction.
  Object.freeze({ directionX: 0.805, directionZ: -0.593, amplitude: 0.082, wavelength: 9.4, speed: 0.8, phase: 0.2, steepness: 0.58 }),
  Object.freeze({ directionX: 0.97, directionZ: 0.243, amplitude: 0.044, wavelength: 5.8, speed: 0.98, phase: 1.7, steepness: 0.52 }),
  Object.freeze({ directionX: -0.342, directionZ: 0.94, amplitude: 0.023, wavelength: 3.9, speed: 0.9, phase: 3, steepness: 0.46 }),
  Object.freeze({ directionX: 0.89, directionZ: -0.456, amplitude: 0.012, wavelength: 2.8, speed: 1.1, phase: 0.8, steepness: 0.38 }),
  Object.freeze({ directionX: -0.76, directionZ: 0.65, amplitude: 0.006, wavelength: 2, speed: 0.86, phase: 2.3, steepness: 0.3 }),
  Object.freeze({ directionX: 0.181, directionZ: 0.984, amplitude: 0.0035, wavelength: 1.45, speed: 1.2, phase: 4.2, steepness: 0.24 }),
]);

const MICRO_WAVES: readonly MicroWaveDefinition[] = Object.freeze([
  Object.freeze({ directionX: 0.96, directionZ: 0.28, frequency: 7.4, speed: 2.1, strength: 0.018, phase: 0.3 }),
  Object.freeze({ directionX: -0.55, directionZ: 0.84, frequency: 11.2, speed: 2.75, strength: 0.011, phase: 2.1 }),
]);

const WATER_WIDTH = 64;
const WATER_DEPTH = 54;
const WATER_CENTRE_Z = -7.2;
// Keep the mean plane below the simulation floor. Even a coincident maximum
// crest stays below the flight rail, while the collision truth remains y = 0.
const WATER_LEVEL_OFFSET = -0.13;
const FOG_DENSITY = 0.0105;
const CONTINUOUS_DOWNWASH_REACH = 2.25;

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

const finiteOr = (value: number, fallback: number): number => (
  Number.isFinite(value) ? value : fallback
);

function glslNumber(value: number): string {
  const result = String(value);
  return result.includes('.') ? result : `${result}.0`;
}

function normalizeRipple(ripple: Readonly<WaterRipple>): WaterRipple {
  return Object.freeze({
    x: finiteOr(ripple.x, 0),
    z: finiteOr(ripple.z, 0),
    startedAt: finiteOr(ripple.startedAt, 0),
    strength: clamp(finiteOr(ripple.strength, 0), 0, 1.25),
  });
}

function waterWorldTimeScale(state: Readonly<GameState>): number {
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

function interpolatedWaterObstacleX(
  state: Readonly<GameState>,
  obstacle: Readonly<ObstacleState>,
  interpolation: number,
): number {
  const alpha = clamp(finiteOr(interpolation, 0), 0, 1);
  if (obstacle.active) {
    const tier = getDifficultyTier(state.world.passedObstacles);
    return obstacle.x - tier.speed
      * waterWorldTimeScale(state)
      * DEFAULT_GAME_CONFIG.fixedStep
      * alpha;
  }
  if (state.dna.offer) return obstacle.x;
  const spawnX = DEFAULT_GAME_CONFIG.world.width + DEFAULT_GAME_CONFIG.obstacle.spawnLead;
  const remaining = Math.max(DEFAULT_GAME_CONFIG.fixedStep, obstacle.activationDelay);
  const velocity = (obstacle.x - spawnX) / remaining;
  return obstacle.x - velocity * DEFAULT_GAME_CONFIG.fixedStep * alpha;
}

export function selectWaterPipeContacts(
  state: Readonly<GameState>,
  projection: WorldProjection,
  interpolation: number,
  capacity = MAX_WATER_PIPE_CONTACTS,
): readonly WaterPipeContact[] {
  const safeCapacity = Math.floor(clamp(
    finiteOr(capacity, 0),
    0,
    MAX_WATER_PIPE_CONTACTS,
  ));
  if (safeCapacity === 0) return Object.freeze([]);

  const alpha = clamp(finiteOr(interpolation, 0), 0, 1);
  const playerX = clamp(
    state.player.x + state.player.vx * DEFAULT_GAME_CONFIG.fixedStep * alpha,
    0,
    DEFAULT_GAME_CONFIG.world.width,
  );
  const duckX = projection.mapX(playerX);
  const duckZ = projection.depthAt(playerX);
  const candidates = state.world.obstacles
    .filter((obstacle) => (
      !obstacle.destroyed
      && obstacle.gapCenter - obstacle.gapSize * 0.5 > 0.08
    ))
    .map((obstacle) => {
      const visualX = interpolatedWaterObstacleX(state, obstacle, alpha);
      const x = projection.mapX(visualX);
      const z = projection.depthAt(visualX);
      const lowerHeight = obstacle.gapCenter - obstacle.gapSize * 0.5;
      const radius = clamp(0.44 + obstacle.width * projection.pathScale * 0.1, 0.48, 0.7);
      const strength = clamp(lowerHeight / 1.4, 0.25, 1);
      const distanceSquared = (x - duckX) * (x - duckX) + (z - duckZ) * (z - duckZ);
      return { obstacle, x, z, radius, strength, distanceSquared };
    })
    .sort((first, second) => (
      first.distanceSquared - second.distanceSquared
      || (first.obstacle.id < second.obstacle.id ? -1 : first.obstacle.id === second.obstacle.id ? 0 : 1)
    ))
    .slice(0, safeCapacity)
    .map(({ obstacle, x, z, radius, strength }) => Object.freeze({
      obstacleId: obstacle.id,
      x,
      z,
      radius,
      strength,
    }));
  return Object.freeze(candidates);
}

function eventEntityId(event: Readonly<GameEvent>): string | null {
  return 'entityId' in event && event.entityId ? event.entityId : null;
}

export function waterRipplePositionForEvent(
  event: Readonly<GameEvent>,
  state: Readonly<GameState>,
  projection: WorldProjection,
  interpolation: number,
  fallback: Readonly<WaterPoint>,
): Readonly<WaterPoint> {
  const entityId = eventEntityId(event);
  if (entityId && !entityId.startsWith('boundary-')) {
    const obstacle = state.world.obstacles.find((candidate) => candidate.id === entityId);
    if (obstacle) {
      const visualX = interpolatedWaterObstacleX(state, obstacle, interpolation);
      return Object.freeze({ x: projection.mapX(visualX), z: projection.depthAt(visualX) });
    }
  }
  return Object.freeze({
    x: finiteOr(fallback.x, 0),
    z: finiteOr(fallback.z, 0),
  });
}

export function getWaterQualityProfile(quality: RenderQuality): Readonly<WaterQualityProfile> {
  return WATER_PROFILES[quality];
}

export function computeWaterDownwashStrength(
  playerY: number,
  contactY = DEFAULT_GAME_CONFIG.player.radiusY,
  reach = 1.65,
): number {
  if (!Number.isFinite(playerY) || !Number.isFinite(contactY) || !Number.isFinite(reach)) return 0;
  const linear = 1 - (playerY - contactY) / Math.max(reach, 0.001);
  const value = clamp(linear, 0, 1);
  return value * value * (3 - 2 * value);
}

export function pruneWaterRipples(
  ripples: readonly Readonly<WaterRipple>[],
  time: number,
): readonly WaterRipple[] {
  const safeTime = finiteOr(time, 0);
  return Object.freeze(ripples
    .map(normalizeRipple)
    .filter((ripple) => (
      ripple.strength > 0
      && ripple.startedAt <= safeTime + 0.001
      && safeTime - ripple.startedAt <= WATER_RIPPLE_DURATION
    ))
    .sort((first, second) => first.startedAt - second.startedAt));
}

export function enqueueWaterRipple(
  ripples: readonly Readonly<WaterRipple>[],
  ripple: Readonly<WaterRipple>,
  capacity = MAX_WATER_RIPPLES,
): readonly WaterRipple[] {
  const safeCapacity = Math.floor(clamp(finiteOr(capacity, 0), 0, MAX_WATER_RIPPLES));
  if (safeCapacity === 0) return Object.freeze([]);
  const next = [
    ...pruneWaterRipples(ripples, ripple.startedAt),
    normalizeRipple(ripple),
  ].sort((first, second) => first.startedAt - second.startedAt);
  return Object.freeze(next.slice(Math.max(0, next.length - safeCapacity)));
}

export function waterRippleStrengthForEvent(
  event: Readonly<GameEvent>,
  downwash: number,
): number {
  const proximity = clamp(finiteOr(downwash, 0), 0, 1);
  if (event.type === 'flap') return proximity <= 0.02 ? 0 : 0.08 + proximity * 0.2;
  if (event.type === 'mode-action') {
    if (event.action === 'frog-launch') return 0.68;
    if (event.action === 'rubber-bounce') return 0.78;
    return 0;
  }
  if (event.type !== 'collision') return 0;
  if (event.entityId !== 'boundary-floor') {
    if (event.outcome === 'destroy') return 0.94;
    if (event.outcome === 'bounce') return 0.78;
    return 0;
  }
  if (event.outcome === 'fatal') return 1;
  if (event.outcome === 'destroy') return 0.94;
  if (event.outcome === 'bounce') return 0.78;
  if (event.outcome === 'shielded') return 0.62;
  if (event.outcome === 'cling') return 0.5;
  return 0.34;
}

function createGerstnerCalls(profile: Readonly<WaterQualityProfile>): string {
  return GERSTNER_WAVES.slice(0, profile.geometryWaves).map((wave, index) => `
    // gerstner-wave-${index}
    accumulateGerstner(
      vec2(${glslNumber(wave.directionX)}, ${glslNumber(wave.directionZ)}),
      ${glslNumber(wave.amplitude)}, ${glslNumber(wave.wavelength)},
      ${glslNumber(wave.speed)}, ${glslNumber(wave.phase)}, ${glslNumber(wave.steepness)},
      displaced, tangentX, tangentZ, crest
    );`).join('');
}

function createMicroWaveCalls(profile: Readonly<WaterQualityProfile>): string {
  return MICRO_WAVES.slice(0, profile.microWaves).map((wave, index) => `
    // micro-wave-${index}
    accumulateMicroSlope(
      vec2(${glslNumber(wave.directionX)}, ${glslNumber(wave.directionZ)}),
      ${glslNumber(wave.frequency)}, ${glslNumber(wave.speed)},
      ${glslNumber(wave.strength)}, ${glslNumber(wave.phase)},
      vWorldPosition.xz, microSlope
    );`).join('');
}

function createVertexRippleCalls(profile: Readonly<WaterQualityProfile>): string {
  return Array.from({ length: profile.rippleSlots }, (_, index) => (
    `\n    applyRippleDisplacement(uRipples[${index}], displaced); // vertex-ripple-${index}`
  )).join('');
}

function createFragmentRippleCalls(profile: Readonly<WaterQualityProfile>): string {
  return Array.from({ length: profile.rippleSlots }, (_, index) => (
    `\n    rippleFoam = max(rippleFoam, rippleFoamAt(uRipples[${index}], vWorldPosition.xz)); // fragment-ripple-${index}`
  )).join('');
}

function createPipeContactCalls(profile: Readonly<WaterQualityProfile>): string {
  return Array.from({ length: profile.pipeContactSlots }, (_, index) => (
    `\n    accumulatePipeContact(uPipeContacts[${index}], vSurfacePosition, pipeFoam, pipeCurrent); // pipe-contact-${index}`
  )).join('');
}

export function createWaterShaderSources(
  profile: Readonly<WaterQualityProfile>,
): Readonly<WaterShaderSources> {
  const primaryWave = GERSTNER_WAVES[0];
  if (!primaryWave) throw new Error('WaterSurface requires one primary wave');
  const primaryWaveNumber = 2 * Math.PI / primaryWave.wavelength;
  const primaryWaveOmega = Math.sqrt(9.81 * primaryWaveNumber) * primaryWave.speed;
  const gerstnerCalls = createGerstnerCalls(profile);
  const microWaveCalls = createMicroWaveCalls(profile);
  const vertexRippleCalls = createVertexRippleCalls(profile);
  const fragmentRippleCalls = createFragmentRippleCalls(profile);
  const pipeContactCalls = createPipeContactCalls(profile);
  const pipeContactCurrent = profile.pipeContactCurrent
    ? `
      // pipe-contact-current: a cheap triangular radial phase avoids another sin.
      float currentCycle = fract(
        (distanceToPipe - radius) * 1.34
        - uTime * 0.3 + dot(contact.xy, vec2(0.047, -0.041))
      );
      float currentPulse = 1.0 - abs(currentCycle * 2.0 - 1.0);
      float movingRing = smoothstep(0.5, 0.9, currentPulse) * halo;
      float contactCurrent = halo * 0.22
        + movingRing * 0.78 * mix(0.28, 1.0, uMotion);
      float currentFoam = movingRing * 0.16 * uMotion;
    `
    : `
      // Low keeps only a static footprint: no animated contact phase.
      float contactCurrent = halo * 0.2;
      float currentFoam = 0.0;
    `;
  const crestFoam = profile.crestFoam
    ? `
    // Patchy, narrow white water only on the strongest normalized crests.
    // Reusing foamDrift for spacing, gating and width avoids an extra sample.
    float foamDrift = sin(
      vSurfacePosition.x * 1.17 - vSurfacePosition.y * 0.83 - uTime * 0.52
    );
    float foamDrift01 = 0.5 + 0.5 * foamDrift;
    float foamBreakup = sin(
      vSurfacePosition.x * 4.6 + vSurfacePosition.y * 6.2
      + foamDrift * 2.1
    );
    // analytic-breaking-crest: evaluate the broad swell per fragment so its
    // narrow foam lip stays curved instead of following the mesh triangles.
    float breakingPhase = ${glslNumber(primaryWaveNumber)} * dot(
      vec2(${glslNumber(primaryWave.directionX)}, ${glslNumber(primaryWave.directionZ)}),
      vSurfacePosition
    ) - ${glslNumber(primaryWaveOmega)} * uTime + ${glslNumber(primaryWave.phase)};
    float breakingThreshold = mix(0.995, 0.965, foamDrift01);
    float breakingCrest = smoothstep(breakingThreshold, 0.9997, sin(breakingPhase));
    float crestFoam = breakingCrest
      * smoothstep(0.55, 0.82, foamDrift01)
      * smoothstep(0.15, 0.88, foamBreakup);
  `
    : '\n    float crestFoam = 0.0;\n';

  const vertexShader = `
    precision highp float;

    uniform float uTime;
    uniform float uWaveScale;
    uniform float uMotion;
    uniform vec2 uSurfaceOrigin;
    uniform vec2 uDuckPosition;
    uniform float uDownwash;
    uniform vec4 uRipples[${MAX_WATER_RIPPLES}];

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec2 vSurfacePosition;
    varying float vViewDistance;
    varying float vCrest;
    varying float vWaveHeight;

    const float WATER_PI = 3.141592653589793;

    void accumulateGerstner(
      vec2 direction,
      float amplitude,
      float wavelength,
      float speed,
      float phaseOffset,
      float steepness,
      inout vec3 displaced,
      inout vec3 tangentX,
      inout vec3 tangentZ,
      inout float crest
    ) {
      float k = 2.0 * WATER_PI / wavelength;
      float omega = sqrt(9.81 * k) * speed;
      float phase = k * dot(direction, displaced.xz + uSurfaceOrigin) - omega * uTime + phaseOffset;
      float waveSin = sin(phase);
      float waveCos = cos(phase);
      float scaledAmplitude = amplitude * uWaveScale;
      float horizontal = steepness * scaledAmplitude;
      float qak = horizontal * k;

      displaced.x += horizontal * direction.x * waveCos;
      displaced.y += scaledAmplitude * waveSin;
      displaced.z += horizontal * direction.y * waveCos;

      tangentX.x -= qak * direction.x * direction.x * waveSin;
      tangentX.y += scaledAmplitude * k * direction.x * waveCos;
      tangentX.z -= qak * direction.x * direction.y * waveSin;
      tangentZ.x -= qak * direction.x * direction.y * waveSin;
      tangentZ.y += scaledAmplitude * k * direction.y * waveCos;
      tangentZ.z -= qak * direction.y * direction.y * waveSin;

      // A normalized crest signal is stable across wavelength and quality.
      // The former dimensional value never reached the fragment foam threshold.
      float crestSignal = max(waveSin, 0.0);
      float scaleWeight = mix(0.42, 1.0, smoothstep(0.008, 0.075, scaledAmplitude));
      crest = max(crest, crestSignal * scaleWeight * mix(0.82, 1.0, steepness));
    }

    void applyRippleDisplacement(vec4 ripple, inout vec3 displaced) {
      float age = uTime - ripple.z;
      float valid = step(0.0, age) * (1.0 - step(${glslNumber(WATER_RIPPLE_DURATION)}, age));
      float distanceToRipple = length(displaced.xz + uSurfaceOrigin - ripple.xy);
      float radius = age * 1.72;
      float delta = abs(distanceToRipple - radius);
      float band = 1.0 - smoothstep(0.035 + age * 0.025, 0.23 + age * 0.09, delta);
      float oscillation = sin((distanceToRipple - radius) * 12.0);
      displaced.y += oscillation * band * exp(-age * 1.35) * ripple.w * valid * 0.025 * uMotion;
    }

    void main() {
      vec3 displaced = position;
      float restHeight = position.y;
      vec3 tangentX = vec3(1.0, 0.0, 0.0);
      vec3 tangentZ = vec3(0.0, 0.0, 1.0);
      float crest = 0.0;
      ${gerstnerCalls}
      ${vertexRippleCalls}

      float duckDistance = length(displaced.xz + uSurfaceOrigin - uDuckPosition);
      float downwashWave = sin(duckDistance * 10.5 - uTime * 6.4)
        * exp(-duckDistance * 1.85) * uDownwash * uMotion;
      displaced.y += downwashWave * 0.018;

      vec3 localNormal = normalize(cross(tangentZ, tangentX));
      vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
      vec4 viewPosition = viewMatrix * worldPosition;
      vWorldPosition = worldPosition.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
      vSurfacePosition = position.xz + uSurfaceOrigin;
      vViewDistance = length(viewPosition.xyz);
      vCrest = crest;
      vWaveHeight = displaced.y - restHeight;
      gl_Position = projectionMatrix * viewPosition;
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform float uTime;
    uniform float uMotion;
    uniform vec3 uCameraPosition;
    uniform vec2 uDuckPosition;
    uniform vec2 uPathForward;
    uniform float uDownwash;
    uniform vec4 uRipples[${MAX_WATER_RIPPLES}];
    uniform vec4 uPipeContacts[${MAX_WATER_PIPE_CONTACTS}];
    uniform float uGhostInfluence;
    uniform vec3 uFogColour;
    uniform float uFogDensity;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying vec2 vSurfacePosition;
    varying float vViewDistance;
    varying float vCrest;
    varying float vWaveHeight;

    float saturateValue(float value) {
      return clamp(value, 0.0, 1.0);
    }

    void accumulateMicroSlope(
      vec2 direction,
      float frequency,
      float speed,
      float strength,
      float phaseOffset,
      vec2 worldPosition,
      inout vec2 slope
    ) {
      float phase = dot(worldPosition, direction) * frequency - uTime * speed + phaseOffset;
      slope += direction * cos(phase) * strength * uMotion;
    }

    vec3 analyticSky(vec3 direction, vec3 sunDirection) {
      float elevation = saturateValue(direction.y * 0.85 + 0.18);
      float zenithBlend = pow(max(elevation, 0.0), 0.55);
      vec3 horizon = vec3(0.18, 0.40, 0.65);
      vec3 zenith = vec3(0.035, 0.18, 0.56);
      vec3 sky = mix(horizon, zenith, zenithBlend);
      float sunAlignment = saturateValue(dot(normalize(direction), sunDirection));
      sky += vec3(1.0, 0.72, 0.34) * pow(sunAlignment, 24.0) * 0.2;
      sky += vec3(3.4, 2.85, 1.9) * pow(sunAlignment, 420.0);
      return sky;
    }

    float rippleFoamAt(vec4 ripple, vec2 worldPosition) {
      float age = uTime - ripple.z;
      float valid = step(0.0, age) * (1.0 - step(${glslNumber(WATER_RIPPLE_DURATION)}, age));
      float radius = age * 1.72;
      float delta = abs(length(worldPosition - ripple.xy) - radius);
      float width = 0.07 + age * 0.055;
      float ring = 1.0 - smoothstep(width, width + 0.13, delta);
      return ring * exp(-age * 1.18) * ripple.w * valid * uMotion;
    }

    void accumulatePipeContact(
      vec4 contact,
      vec2 worldPosition,
      inout float foam,
      inout float current
    ) {
      if (contact.w <= 0.001) return;
      float radius = max(contact.z, 0.001);
      float distanceToPipe = length(worldPosition - contact.xy);
      if (distanceToPipe > radius + 1.08) return;
      float ring = 1.0 - smoothstep(0.04, 0.15, abs(distanceToPipe - radius));
      float halo = smoothstep(radius * 0.58, radius * 0.92, distanceToPipe)
        * (1.0 - smoothstep(radius + 0.08, radius + 1.08, distanceToPipe));
      ${pipeContactCurrent}
      float contactStrength = contact.w;
      foam = max(foam, (ring * 0.84 + currentFoam) * contactStrength);
      current = max(current, contactCurrent * contactStrength);
    }

    float kelvinDownwash(vec2 worldPosition) {
      vec2 forward = normalize(uPathForward);
      vec2 right = vec2(-forward.y, forward.x);
      vec2 offset = worldPosition - uDuckPosition;
      float behind = -dot(offset, forward);
      float lateral = dot(offset, right);
      // continuous-kelvin-wake: longer arms and a bow disturbance remain
      // coupled directly to low altitude rather than waiting for an event.
      float lengthMask = smoothstep(0.02, 0.42, behind)
        * (1.0 - smoothstep(5.5, 7.4, behind));
      float armCentre = 0.3 * behind + 0.07;
      float armWidth = 0.09 + behind * 0.052;
      float leftArm = 1.0 - smoothstep(armWidth, armWidth * 2.25, abs(lateral - armCentre));
      float rightArm = 1.0 - smoothstep(armWidth, armWidth * 2.25, abs(lateral + armCentre));
      float centreWidth = 0.15 + behind * 0.06;
      float centre = 1.0 - smoothstep(centreWidth, centreWidth * 2.1, abs(lateral));
      float breakup = 0.72 + 0.28 * sin(behind * 4.7 + abs(lateral) * 6.2 - uTime * 3.8);
      float bowDistance = length(vec2(lateral * 1.45, behind + 0.06));
      float bow = (1.0 - smoothstep(0.12, 0.48, bowDistance)) * 0.34;
      return saturateValue((((leftArm + rightArm) * 0.58 + centre * 0.4 * breakup)
        * lengthMask * exp(-behind * 0.18) + bow) * uDownwash * uMotion);
    }

    float distributionGgx(float noH, float roughness) {
      float alpha = roughness * roughness;
      float alphaSquared = alpha * alpha;
      float denominator = noH * noH * (alphaSquared - 1.0) + 1.0;
      return alphaSquared / max(3.141592653589793 * denominator * denominator, 0.00001);
    }

    float geometrySchlick(float noX, float roughness) {
      float k = (roughness + 1.0) * (roughness + 1.0) * 0.125;
      return noX / max(noX * (1.0 - k) + k, 0.00001);
    }

    void main() {
      vec3 normal = normalize(vWorldNormal);
      vec2 microSlope = vec2(0.0);
      ${microWaveCalls}
      normal = normalize(normal + vec3(-microSlope.x, 0.0, -microSlope.y));
      if (!gl_FrontFacing) normal = -normal;

      vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
      vec3 sunDirection = normalize(vec3(0.42, 0.82, -0.38));
      float noV = max(dot(normal, viewDirection), 0.001);
      float noL = max(dot(normal, sunDirection), 0.0);

      float distanceBlend = smoothstep(3.0, 31.0, vViewDistance);
      vec3 nearColour = vec3(0.022, 0.225, 0.3);
      vec3 deepColour = vec3(0.006, 0.072, 0.155);
      vec3 refracted = mix(nearColour, deepColour, distanceBlend);
      refracted += vec3(0.014, 0.058, 0.067) * max(normal.y * 0.8 + noL * 0.2, 0.0);

      // Height tint separates the lit ridge from its darker trough at a
      // shallow camera angle without another fragment-space wave evaluation.
      float heightLight = smoothstep(-0.16, 0.16, vWaveHeight);
      refracted *= mix(0.88, 1.06, heightLight);
      refracted += vec3(0.012, 0.048, 0.055) * heightLight;

      vec3 reflectionDirection = reflect(-viewDirection, normal);
      vec3 reflectedSky = analyticSky(reflectionDirection, sunDirection);
      float fresnel = 0.0204 + 0.9796 * pow(max(1.0 - noV, 0.0), 5.0);
      vec3 colour = mix(refracted, reflectedSky, saturateValue(fresnel * 0.96 + 0.055));

      vec3 halfVector = normalize(viewDirection + sunDirection);
      float noH = max(dot(normal, halfVector), 0.0);
      float voH = max(dot(viewDirection, halfVector), 0.0);
      float roughness = 0.16;
      float distribution = distributionGgx(noH, roughness);
      float geometry = geometrySchlick(noV, roughness) * geometrySchlick(noL, roughness);
      float specularFresnel = 0.0204 + 0.9796 * pow(max(1.0 - voH, 0.0), 5.0);
      float specular = min(
        distribution * geometry * specularFresnel * noL / max(4.0 * noV * noL, 0.001),
        1.8
      );
      colour += vec3(1.0, 0.91, 0.69) * specular * 0.72;

      // crest-ridge-lighting: a restrained turquoise shoulder keeps every
      // quality tier legible in 3/4 view, including low where foam is disabled.
      float troughShade = 1.0 - smoothstep(-0.14, -0.015, vWaveHeight);
      colour *= 1.0 - troughShade * 0.06;
      float crestRidge = smoothstep(0.34, 0.78, vCrest);
      float ridgeLight = crestRidge * (0.62 + noL * 0.38);
      colour = mix(colour, vec3(0.15, 0.55, 0.62), ridgeLight * 0.18);
      colour += vec3(0.025, 0.06, 0.07) * ridgeLight;

      ${crestFoam}
      float rippleFoam = 0.0;
      ${fragmentRippleCalls}
      float wakeFoam = kelvinDownwash(vWorldPosition.xz);
      float pipeFoam = 0.0;
      float pipeCurrent = 0.0;
      ${pipeContactCalls}
      colour = mix(colour, vec3(0.035, 0.31, 0.34), pipeCurrent * 0.16);
      colour = mix(colour, vec3(0.075, 0.42, 0.46), wakeFoam * 0.12);
      float foam = saturateValue(
        crestFoam * 0.1 + rippleFoam * 0.62 + wakeFoam * 0.46 + pipeFoam * 0.28
      );
      colour = mix(colour, vec3(0.72, 0.94, 0.98), foam);

      // ghost-water-cooling: subtle desaturation plus a blue/cyan bias.
      float ghostLuma = dot(colour, vec3(0.2126, 0.7152, 0.0722));
      vec3 ghostCool = mix(vec3(ghostLuma), vec3(ghostLuma * 0.72, ghostLuma * 0.94, ghostLuma * 1.14), 0.62);
      colour = mix(colour, ghostCool, uGhostInfluence * 0.22);

      float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vViewDistance * vViewDistance);
      colour = mix(colour, uFogColour, saturateValue(fogFactor));
      gl_FragColor = vec4(max(colour, vec3(0.0)), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  return Object.freeze({ vertexShader, fragmentShader });
}

interface WaterUniforms extends Record<string, THREE.IUniform> {
  readonly uTime: { value: number };
  readonly uWaveScale: { value: number };
  readonly uMotion: { value: number };
  readonly uSurfaceOrigin: { value: THREE.Vector2 };
  readonly uCameraPosition: { value: THREE.Vector3 };
  readonly uDuckPosition: { value: THREE.Vector2 };
  readonly uPathForward: { value: THREE.Vector2 };
  readonly uDownwash: { value: number };
  readonly uRipples: { value: THREE.Vector4[] };
  readonly uPipeContacts: { value: THREE.Vector4[] };
  readonly uGhostInfluence: { value: number };
  readonly uFogColour: { value: THREE.Color };
  readonly uFogDensity: { value: number };
}

/**
 * A one-draw-call, texture-free water presentation. It is intentionally visual:
 * simulation boundaries remain the single source of collision truth.
 */
export class WaterSurface {
  readonly profile: Readonly<WaterQualityProfile>;

  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: WaterUniforms;
  private readonly quality: RenderQuality;
  private readonly recentEventKeys = new Set<string>();
  private readonly recentEventOrder: string[] = [];
  private ripples: readonly WaterRipple[] = Object.freeze([]);
  private pipeContacts: readonly WaterPipeContact[] = Object.freeze([]);
  private displayTime = 0;
  private downwash = 0;
  private ghostInfluence = 0;
  private reducedMotion = false;
  private destroyed = false;

  constructor(parent: THREE.Object3D, quality: RenderQuality) {
    this.quality = quality;
    this.profile = getWaterQualityProfile(quality);
    const shaders = createWaterShaderSources(this.profile);
    const rippleUniforms = Array.from(
      { length: MAX_WATER_RIPPLES },
      () => new THREE.Vector4(0, 0, -100, 0),
    );
    const pipeContactUniforms = Array.from(
      { length: MAX_WATER_PIPE_CONTACTS },
      () => new THREE.Vector4(0, 0, 0, 0),
    );
    this.uniforms = {
      uTime: { value: 0 },
      uWaveScale: { value: this.profile.amplitudeScale },
      uMotion: { value: 1 },
      uSurfaceOrigin: { value: new THREE.Vector2(0, WATER_CENTRE_Z) },
      uCameraPosition: { value: new THREE.Vector3(0, 5.5, 8) },
      uDuckPosition: { value: new THREE.Vector2() },
      uPathForward: { value: new THREE.Vector2(1, 0) },
      uDownwash: { value: 0 },
      uRipples: { value: rippleUniforms },
      uPipeContacts: { value: pipeContactUniforms },
      uGhostInfluence: { value: 0 },
      uFogColour: { value: new THREE.Color(0x17354e) },
      uFogDensity: { value: FOG_DENSITY },
    };

    this.geometry = new THREE.PlaneGeometry(
      WATER_WIDTH,
      WATER_DEPTH,
      this.profile.segmentsX,
      this.profile.segmentsZ,
    );
    this.geometry.rotateX(-Math.PI / 2);
    this.geometry.computeBoundingSphere();
    this.material = new THREE.ShaderMaterial({
      name: `water-${quality}`,
      uniforms: this.uniforms,
      vertexShader: shaders.vertexShader,
      fragmentShader: shaders.fragmentShader,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'procedural-water-surface';
    this.mesh.position.set(0, WATER_LEVEL_OFFSET, WATER_CENTRE_Z);
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }

  update(
    state: Readonly<GameState>,
    projection: WorldProjection,
    time: number,
    reducedMotion: boolean,
    events: readonly GameEvent[] = [],
    cameraPosition?: Readonly<THREE.Vector3>,
  ): void {
    if (this.destroyed) return;
    const safeTime = Math.max(0, finiteOr(time, state.clock.elapsed));
    const interpolation = clamp(
      (safeTime - state.clock.elapsed) / DEFAULT_GAME_CONFIG.fixedStep,
      0,
      1,
    );
    const playerX = clamp(
      state.player.x + state.player.vx * DEFAULT_GAME_CONFIG.fixedStep * interpolation,
      0,
      DEFAULT_GAME_CONFIG.world.width,
    );
    const playerY = clamp(
      state.player.y + state.player.vy * DEFAULT_GAME_CONFIG.fixedStep * interpolation,
      0,
      DEFAULT_GAME_CONFIG.world.height,
    );
    const duckX = projection.mapX(playerX);
    const duckZ = projection.depthAt(playerX);

    this.displayTime = reducedMotion ? 0 : safeTime;
    this.reducedMotion = reducedMotion;
    this.downwash = reducedMotion
      ? 0
      : computeWaterDownwashStrength(
        playerY,
        DEFAULT_GAME_CONFIG.player.radiusY,
        CONTINUOUS_DOWNWASH_REACH,
      );
    this.ghostInfluence = state.mode.active === 'ghost' ? 1 : 0;
    const horizonObstacle = state.world.obstacles.reduce<(typeof state.world.obstacles)[number] | null>(
      (farthest, obstacle) => (
        obstacle.destroyed || obstacle.passed || (farthest && farthest.x >= obstacle.x)
          ? farthest
          : obstacle
      ),
      null,
    );
    if (horizonObstacle) {
      const horizonVisualX = interpolatedWaterObstacleX(state, horizonObstacle, interpolation);
      const horizonX = projection.mapX(horizonVisualX);
      const horizonZ = projection.depthAt(horizonVisualX);
      this.mesh.position.x = (duckX + horizonX) * 0.5;
      this.mesh.position.z = (duckZ + horizonZ) * 0.5;
    } else {
      this.mesh.position.x = 0;
      this.mesh.position.z = WATER_CENTRE_Z;
    }
    this.mesh.position.y = projection.mapY(0) + WATER_LEVEL_OFFSET;
    this.uniforms.uTime.value = this.displayTime;
    this.uniforms.uMotion.value = reducedMotion ? 0 : 1;
    this.uniforms.uWaveScale.value = this.profile.amplitudeScale * (reducedMotion ? 0.4 : 1);
    this.uniforms.uSurfaceOrigin.value.set(this.mesh.position.x, this.mesh.position.z);
    this.uniforms.uDuckPosition.value.set(duckX, duckZ);
    this.uniforms.uPathForward.value.set(
      Math.sin(projection.pathYaw),
      Math.cos(projection.pathYaw),
    ).normalize();
    this.uniforms.uDownwash.value = this.downwash;
    this.uniforms.uGhostInfluence.value = this.ghostInfluence;
    if (cameraPosition) this.uniforms.uCameraPosition.value.copy(cameraPosition);

    this.pipeContacts = selectWaterPipeContacts(
      state,
      projection,
      interpolation,
      this.profile.pipeContactSlots,
    );
    this.syncPipeContactUniforms();

    this.ripples = pruneWaterRipples(this.ripples, safeTime);
    for (const event of events) {
      const strength = waterRippleStrengthForEvent(event, this.downwash);
      if (strength <= 0) continue;
      const eventKey = this.rippleEventKey(event);
      if (this.recentEventKeys.has(eventKey)) continue;
      this.rememberEvent(eventKey);
      if (reducedMotion) continue;
      const ripplePosition = waterRipplePositionForEvent(
        event,
        state,
        projection,
        interpolation,
        { x: duckX, z: duckZ },
      );
      this.ripples = enqueueWaterRipple(this.ripples, {
        x: ripplePosition.x,
        z: ripplePosition.z,
        startedAt: Math.max(0, finiteOr(event.time, safeTime)),
        strength,
      }, this.profile.rippleSlots);
    }
    this.syncRippleUniforms();
  }

  reset(): void {
    if (this.destroyed) return;
    this.ripples = Object.freeze([]);
    this.pipeContacts = Object.freeze([]);
    this.recentEventKeys.clear();
    this.recentEventOrder.length = 0;
    this.displayTime = 0;
    this.downwash = 0;
    this.ghostInfluence = 0;
    this.reducedMotion = false;
    this.uniforms.uTime.value = 0;
    this.uniforms.uMotion.value = 1;
    this.uniforms.uWaveScale.value = this.profile.amplitudeScale;
    this.uniforms.uDownwash.value = 0;
    this.uniforms.uGhostInfluence.value = 0;
    this.syncPipeContactUniforms();
    this.syncRippleUniforms();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.ripples = Object.freeze([]);
    this.pipeContacts = Object.freeze([]);
    this.recentEventKeys.clear();
    this.recentEventOrder.length = 0;
  }

  getDebugSnapshot(): Readonly<WaterDebugSnapshot> {
    return Object.freeze({
      quality: this.quality,
      displayTime: this.displayTime,
      reducedMotion: this.reducedMotion,
      downwash: this.downwash,
      ghostInfluence: this.ghostInfluence,
      pipeContacts: Object.freeze(this.pipeContacts.map((contact) => Object.freeze({ ...contact }))),
      ripples: Object.freeze(this.ripples.map((ripple) => Object.freeze({ ...ripple }))),
    });
  }

  private syncRippleUniforms(): void {
    for (let index = 0; index < MAX_WATER_RIPPLES; index += 1) {
      const uniform = this.uniforms.uRipples.value[index];
      if (!uniform) continue;
      const ripple = this.ripples[index];
      if (ripple && index < this.profile.rippleSlots) {
        uniform.set(ripple.x, ripple.z, ripple.startedAt, ripple.strength);
      } else {
        uniform.set(0, 0, -100, 0);
      }
    }
  }

  private syncPipeContactUniforms(): void {
    for (let index = 0; index < MAX_WATER_PIPE_CONTACTS; index += 1) {
      const uniform = this.uniforms.uPipeContacts.value[index];
      if (!uniform) continue;
      const contact = this.pipeContacts[index];
      if (contact && index < this.profile.pipeContactSlots) {
        uniform.set(contact.x, contact.z, contact.radius, contact.strength);
      } else {
        uniform.set(0, 0, 0, 0);
      }
    }
  }

  private rippleEventKey(event: Readonly<GameEvent>): string {
    if (event.type === 'collision' && event.outcome === 'bounce') {
      return `${event.tick}:water-impact:rubber-bounce:${event.entityId}`;
    }
    if (event.type === 'mode-action' && event.action === 'rubber-bounce') {
      return `${event.tick}:water-impact:rubber-bounce:${event.entityId ?? ''}`;
    }
    if (event.type === 'collision' && event.outcome === 'destroy') {
      return `${event.tick}:water-impact:steel-destroy:${event.entityId}`;
    }
    if (event.type === 'mode-action' && event.action === 'frog-launch') {
      return `${event.tick}:water-impact:frog-launch:${event.entityId ?? ''}`;
    }
    let detail = '';
    if ('entityId' in event && event.entityId) detail = event.entityId;
    else if ('coinId' in event) detail = event.coinId;
    else if ('obstacleId' in event) detail = event.obstacleId;
    else if ('offerId' in event) detail = event.offerId;
    if ('outcome' in event) detail += `:${event.outcome}`;
    return `${event.tick}:${event.type}:${detail}`;
  }

  private rememberEvent(key: string): void {
    this.recentEventKeys.add(key);
    this.recentEventOrder.push(key);
    if (this.recentEventOrder.length <= 128) return;
    const oldest = this.recentEventOrder.shift();
    if (oldest) this.recentEventKeys.delete(oldest);
  }
}
