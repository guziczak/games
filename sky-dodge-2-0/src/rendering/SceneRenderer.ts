import * as THREE from 'three';

import { DEFAULT_GAME_CONFIG } from '../simulation/GameConfig';
import type { GameEvent } from '../simulation/GameEvents';
import type { GameState, ModeId } from '../simulation/GameState';
import { CharacterRig } from './CharacterRig';
import {
  createCameraReaction,
  createDuckReflectionPresentation,
  createSceneMood,
} from './EnvironmentDressing';
import { ParticleField } from './ParticleField';
import {
  createWorldProjection,
  type RenderQuality,
  type WorldProjection,
  WorldViews,
} from './WorldViews';

export interface SceneRendererPreferences {
  readonly reducedMotion?: boolean;
  readonly coarsePointer?: boolean;
  readonly quality?: RenderQuality | 'auto';
  readonly maxPixelRatio?: number;
}

const NO_EVENTS: readonly GameEvent[] = Object.freeze([]);

const MODE_LIGHT_COLOURS: Readonly<Record<ModeId, number>> = Object.freeze({
  normal: 0x71dcff,
  frog: 0x63ef8b,
  rubber: 0xff6680,
  steel: 0xd4eff8,
  ghost: 0x83f8ff,
  stork: 0xff8c70,
});

const PIXEL_RATIO_CAP: Readonly<Record<RenderQuality, number>> = Object.freeze({
  low: 1,
  medium: 1.3,
  high: 1.55,
});

const PIXEL_BUDGET: Readonly<Record<RenderQuality, number>> = Object.freeze({
  low: 900_000,
  medium: 1_450_000,
  high: 2_050_000,
});

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

function resolveQuality(preferences: Readonly<SceneRendererPreferences>): RenderQuality {
  if (preferences.quality && preferences.quality !== 'auto') return preferences.quality;
  return preferences.coarsePointer ? 'medium' : 'high';
}

/**
 * Three.js presentation adapter. It never mutates GameState: the deterministic
 * simulation remains the sole source of collision, scoring and mode truth.
 */
export class SceneRenderer {
  readonly quality: RenderQuality;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 180);
  private readonly character: CharacterRig;
  private readonly worldViews: WorldViews;
  private readonly particles: ParticleField;
  private readonly ambientLight: THREE.AmbientLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly playerLight: THREE.PointLight;
  private readonly gateFocusLight: THREE.PointLight;
  private readonly blobShadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly duckReflection = new THREE.Group();
  private readonly reflectionBodyMaterial: THREE.MeshBasicMaterial;
  private readonly reflectionDetailMaterial: THREE.MeshBasicMaterial;
  private readonly reflectionRippleMaterial: THREE.MeshBasicMaterial;
  private readonly reflectionGeometries: readonly THREE.BufferGeometry[];
  private readonly reducedMotion: boolean;
  private readonly requestedPixelRatio: number;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly viewport: VisualViewport | null;
  private readonly cameraTarget = new THREE.Vector3();
  private projection: WorldProjection = createWorldProjection(1);
  private cssWidth = 0;
  private cssHeight = 0;
  private cameraImpulse = 0;
  private cameraImpulseAge = 0;
  private lastRenderTime: number | null = null;
  private contextLost = false;
  private destroyed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    preferences: Readonly<SceneRendererPreferences> = {},
  ) {
    this.quality = resolveQuality(preferences);
    this.reducedMotion = preferences.reducedMotion ?? false;
    const configuredRatio = preferences.maxPixelRatio;
    this.requestedPixelRatio = Number.isFinite(configuredRatio)
      ? clamp(configuredRatio as number, 0.75, 2)
      : PIXEL_RATIO_CAP[this.quality];

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality !== 'low',
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = false;
    this.scene.background = new THREE.Color(0x112b4c);
    // Exp2 fog now does useful separation between the real look-ahead gates;
    // the nearest active one receives a local contrast light below.
    this.scene.fog = new THREE.FogExp2(0x17354e, 0.0185);

    const hemisphere = new THREE.HemisphereLight(0xd8f7ff, 0x39213f, 2.15);
    hemisphere.name = 'sky-fill';
    this.ambientLight = new THREE.AmbientLight(0x8fc5d5, 0.42);
    this.ambientLight.name = 'soft-ambient';
    const key = new THREE.DirectionalLight(0xffe7b5, 3.15);
    key.name = 'sun-key';
    key.position.set(-7, 10, 13);
    this.rimLight = new THREE.DirectionalLight(0x43cfff, 1.65);
    this.rimLight.name = 'cool-rim';
    this.rimLight.position.set(10, 3, -2);
    const warmFill = new THREE.PointLight(0xffa454, 0.75, 24, 2);
    warmFill.name = 'sun-fill';
    warmFill.position.set(7, 5, -8);
    this.playerLight = new THREE.PointLight(MODE_LIGHT_COLOURS.normal, 1.2, 5.5, 2);
    this.playerLight.name = 'mode-glow';
    this.gateFocusLight = new THREE.PointLight(0xffcf8a, 0, 5.8, 2);
    this.gateFocusLight.name = 'nearest-gate-contrast';
    this.scene.add(
      hemisphere,
      this.ambientLight,
      key,
      this.rimLight,
      warmFill,
      this.playerLight,
      this.gateFocusLight,
    );

    this.worldViews = new WorldViews(this.scene, this.quality);
    this.character = new CharacterRig(this.scene);
    this.particles = new ParticleField(this.scene, this.quality, this.reducedMotion);

    const shadowGeometry = new THREE.CircleGeometry(0.64, 24);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x07101c,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.blobShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.blobShadow.name = 'player-blob-shadow';
    this.blobShadow.rotation.x = -Math.PI / 2;
    this.blobShadow.renderOrder = 2;
    this.scene.add(this.blobShadow);

    const reflectionDiscGeometry = new THREE.CircleGeometry(1, 20);
    const reflectionBeakGeometry = new THREE.BufferGeometry();
    reflectionBeakGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, -0.42, 0,
      1, 0, 0,
      0, 0.42, 0,
    ], 3));
    const reflectionRippleGeometry = new THREE.RingGeometry(0.76, 1, 30);
    this.reflectionGeometries = Object.freeze([
      reflectionDiscGeometry,
      reflectionBeakGeometry,
      reflectionRippleGeometry,
    ]);
    this.reflectionBodyMaterial = new THREE.MeshBasicMaterial({
      color: MODE_LIGHT_COLOURS.normal,
      transparent: true,
      opacity: 0.1,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.reflectionDetailMaterial = this.reflectionBodyMaterial.clone();
    this.reflectionDetailMaterial.opacity = 0.075;
    this.reflectionRippleMaterial = new THREE.MeshBasicMaterial({
      color: 0x9ddce5,
      transparent: true,
      opacity: 0.05,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const reflectionBody = new THREE.Mesh(reflectionDiscGeometry, this.reflectionBodyMaterial);
    reflectionBody.name = 'duck-reflection-body';
    reflectionBody.rotation.x = -Math.PI / 2;
    reflectionBody.scale.set(0.62, 0.36, 1);
    const reflectionHead = new THREE.Mesh(reflectionDiscGeometry, this.reflectionDetailMaterial);
    reflectionHead.name = 'duck-reflection-head';
    reflectionHead.position.x = 0.48;
    reflectionHead.rotation.x = -Math.PI / 2;
    reflectionHead.scale.set(0.25, 0.22, 1);
    const reflectionBeak = new THREE.Mesh(reflectionBeakGeometry, this.reflectionDetailMaterial);
    reflectionBeak.name = 'duck-reflection-beak';
    reflectionBeak.position.x = 0.66;
    reflectionBeak.rotation.x = -Math.PI / 2;
    reflectionBeak.scale.set(0.28, 0.2, 1);
    const reflectionRipple = new THREE.Mesh(reflectionRippleGeometry, this.reflectionRippleMaterial);
    reflectionRipple.name = 'duck-reflection-ripple';
    reflectionRipple.rotation.x = -Math.PI / 2;
    reflectionRipple.scale.set(0.9, 0.48, 1);
    this.duckReflection.name = 'duck-water-reflection';
    this.duckReflection.renderOrder = 6;
    this.duckReflection.add(reflectionRipple, reflectionBody, reflectionHead, reflectionBeak);
    this.scene.add(this.duckReflection);

    this.canvas.dataset.renderQuality = this.quality;
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(this.handleResizeObserved);
    this.resizeObserver?.observe(this.canvas);
    this.viewport = this.canvas.ownerDocument.defaultView?.visualViewport ?? null;
    this.viewport?.addEventListener('resize', this.handleViewportResize);
    this.resize();
  }

  resize(): void {
    if (this.destroyed) return;
    const view = this.canvas.ownerDocument.defaultView;
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(
      1,
      Math.round(bounds.width || this.canvas.parentElement?.clientWidth || view?.innerWidth || 1),
    );
    const height = Math.max(
      1,
      Math.round(bounds.height || this.canvas.parentElement?.clientHeight || view?.innerHeight || 1),
    );
    const devicePixelRatio = Math.max(1, view?.devicePixelRatio ?? 1);
    const ratioByBudget = Math.sqrt(PIXEL_BUDGET[this.quality] / (width * height));
    const pixelRatio = clamp(
      Math.min(devicePixelRatio, this.requestedPixelRatio, ratioByBudget),
      0.72,
      this.requestedPixelRatio,
    );
    const drawingWidth = Math.max(1, Math.floor(width * pixelRatio));
    const drawingHeight = Math.max(1, Math.floor(height * pixelRatio));

    if (this.cssWidth !== width || this.cssHeight !== height
      || this.canvas.width !== drawingWidth || this.canvas.height !== drawingHeight) {
      this.cssWidth = width;
      this.cssHeight = height;
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(drawingWidth, drawingHeight, false);
      const aspect = width / height;
      this.projection = createWorldProjection(aspect);
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
  }

  render(
    state: Readonly<GameState>,
    alpha: number,
    events: readonly GameEvent[] = NO_EVENTS,
  ): void {
    if (this.destroyed || this.contextLost) return;
    const interpolation = clamp(Number.isFinite(alpha) ? alpha : 0, 0, 1);
    const time = state.clock.elapsed + DEFAULT_GAME_CONFIG.fixedStep * interpolation;

    this.updateReactionClock(events, time);
    this.updateSceneMood(state);
    this.updateCamera(state, time);
    this.worldViews.update(
      state,
      this.projection,
      interpolation,
      this.reducedMotion,
      events,
      this.camera.position,
    );
    this.character.update(state, this.projection, interpolation);
    this.particles.consume(events, state, this.projection, interpolation, this.worldViews);
    this.particles.update(time);
    this.updateShadowAndLight(state, interpolation);
    this.renderer.render(this.scene, this.camera);
  }

  reset(): void {
    if (this.destroyed) return;
    this.character.reset();
    this.worldViews.reset();
    this.particles.reset();
    this.playerLight.color.setHex(MODE_LIGHT_COLOURS.normal);
    this.playerLight.intensity = 1.2;
    this.gateFocusLight.intensity = 0;
    this.blobShadow.visible = true;
    this.duckReflection.visible = true;
    this.cameraImpulse = 0;
    this.cameraImpulseAge = 0;
    this.lastRenderTime = null;
    this.contextLost = false;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.viewport?.removeEventListener('resize', this.handleViewportResize);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.particles.destroy();
    this.character.destroy();
    this.worldViews.destroy();
    this.blobShadow.geometry.dispose();
    this.blobShadow.material.dispose();
    this.blobShadow.removeFromParent();
    for (const geometry of this.reflectionGeometries) geometry.dispose();
    this.reflectionBodyMaterial.dispose();
    this.reflectionDetailMaterial.dispose();
    this.reflectionRippleMaterial.dispose();
    this.duckReflection.removeFromParent();
    this.scene.clear();
    this.renderer.dispose();
    // This renderer owns the canvas for its whole lifetime. Explicit context loss
    // releases driver-side allocations promptly on mobile route changes/restarts.
    this.renderer.forceContextLoss();
    delete this.canvas.dataset.renderQuality;
  }

  private updateReactionClock(
    events: readonly GameEvent[],
    time: number,
  ): void {
    const previous = this.lastRenderTime;
    const dt = previous === null ? 0 : clamp(time - previous, 0, 0.1);
    this.lastRenderTime = time;
    this.cameraImpulseAge += dt;
    this.cameraImpulse *= Math.exp(-dt * 10.5);
    const steelDestroy = events.some((event) => (
      event.type === 'collision'
      && event.outcome === 'destroy'
    ));
    if (steelDestroy) {
      this.cameraImpulse = 1;
      this.cameraImpulseAge = 0;
    }
  }

  private updateSceneMood(state: Readonly<GameState>): void {
    const mood = createSceneMood(
      state.mode.active,
      state.mode.active === 'ghost' && state.mode.ghost.phase === 'phasing',
    );
    (this.scene.background as THREE.Color).setHex(mood.background);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(mood.fog);
      this.scene.fog.density = mood.fogDensity;
    }
    this.ambientLight.intensity = mood.ambientIntensity;
    this.rimLight.intensity = mood.rimIntensity;
    this.renderer.toneMappingExposure = mood.exposure;
  }

  private updateShadowAndLight(state: Readonly<GameState>, alpha: number): void {
    const playerX = clamp(
      state.player.x + state.player.vx * DEFAULT_GAME_CONFIG.fixedStep * alpha,
      0,
      DEFAULT_GAME_CONFIG.world.width,
    );
    const playerY = clamp(
      state.player.y + state.player.vy * DEFAULT_GAME_CONFIG.fixedStep * alpha,
      0,
      DEFAULT_GAME_CONFIG.world.height,
    );
    const altitude = playerY / DEFAULT_GAME_CONFIG.world.height;
    const depth = this.projection.depthAt(playerX);
    this.blobShadow.visible = state.mode.active !== 'ghost';
    this.blobShadow.position.set(
      this.projection.mapX(playerX),
      this.projection.mapY(0) + 0.025,
      depth,
    );
    this.blobShadow.scale.set(
      0.48 + (1 - altitude) * 0.5,
      0.72 + (1 - altitude) * 0.42,
      1,
    );
    this.blobShadow.material.opacity = 0.055 + (1 - altitude) * 0.17;

    const reflection = createDuckReflectionPresentation({
      playerY,
      worldHeight: DEFAULT_GAME_CONFIG.world.height,
      mode: state.mode.active,
      time: state.clock.elapsed + DEFAULT_GAME_CONFIG.fixedStep * alpha,
      reducedMotion: this.reducedMotion,
    });
    this.duckReflection.position.set(
      this.projection.mapX(playerX),
      this.projection.mapY(0) + 0.028,
      depth,
    );
    this.duckReflection.rotation.set(0, this.projection.pathYaw - Math.PI / 2, 0);
    this.duckReflection.scale.setScalar(reflection.scale);
    this.reflectionBodyMaterial.color.setHex(reflection.colour);
    this.reflectionDetailMaterial.color.setHex(reflection.colour);
    this.reflectionBodyMaterial.opacity = reflection.opacity;
    this.reflectionDetailMaterial.opacity = reflection.opacity * 0.76;
    this.reflectionRippleMaterial.opacity = reflection.rippleOpacity;
    const ripple = this.duckReflection.getObjectByName('duck-reflection-ripple');
    ripple?.scale.set(0.9 * reflection.rippleScale, 0.48 * reflection.rippleScale, 1);

    this.playerLight.position.set(
      this.projection.mapX(playerX),
      this.projection.mapY(playerY),
      depth + 1.2,
    );
    this.playerLight.color.setHex(MODE_LIGHT_COLOURS[state.mode.active]);
    this.playerLight.intensity = state.mode.active === 'normal' ? 0.72 : 1.35;

    let nearest = state.world.obstacles[0];
    let nearestDelta = Number.POSITIVE_INFINITY;
    for (const obstacle of state.world.obstacles) {
      if (!obstacle.active || obstacle.destroyed || obstacle.passed) continue;
      const delta = obstacle.x - playerX;
      if (delta < -obstacle.width * 0.55 || delta >= nearestDelta) continue;
      nearest = obstacle;
      nearestDelta = delta;
    }
    if (nearest && Number.isFinite(nearestDelta)) {
      const focus = clamp(1 - Math.max(0, nearestDelta) / 6.4, 0.18, 1);
      this.gateFocusLight.position.set(
        this.projection.mapX(nearest.x),
        this.projection.mapY(nearest.gapCenter),
        this.projection.depthAt(nearest.x) + 0.7,
      );
      this.gateFocusLight.color.setHex(state.mode.active === 'ghost' ? 0x8adce7 : 0xffcf8a);
      this.gateFocusLight.intensity = (state.mode.active === 'ghost' ? 0.38 : 0.62) + focus * 0.72;
      this.gateFocusLight.distance = 4.8 + focus * 1.7;
    } else {
      this.gateFocusLight.intensity = 0;
    }
  }

  private updateCamera(state: Readonly<GameState>, time: number): void {
    const reaction = createCameraReaction({
      mode: state.mode.active,
      rubberPhase: state.mode.rubber.phase,
      rubberPhaseTime: state.mode.rubber.phaseTime,
      aimX: state.mode.rubber.aim.x,
      aimY: state.mode.rubber.aim.y,
      velocityX: state.player.vx,
      velocityY: state.player.vy,
      steelImpulse: this.cameraImpulse,
      impulsePhase: this.cameraImpulseAge,
      reducedMotion: this.reducedMotion,
    });
    if (Math.abs(this.camera.fov - reaction.fov) > 0.001) {
      this.camera.fov = reaction.fov;
      this.camera.updateProjectionMatrix();
    }
    const baseDistance = (
      this.projection.viewHeight
      / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2))
    ) * 1.08;
    const viewportAspect = this.projection.viewWidth / this.projection.viewHeight;
    // A fixed 18-degree side look put the vanishing point almost outside a
    // phone's narrow horizontal FOV. Ease toward the rail in portrait while
    // retaining the more cinematic desktop parallax.
    const chaseYaw = THREE.MathUtils.degToRad(clamp(
      8 + (viewportAspect - 0.46) * 8,
      8,
      18,
    ));
    const pitch = THREE.MathUtils.degToRad(10);
    const horizontalDistance = baseDistance * Math.cos(pitch);
    const playerY = this.projection.mapY(state.player.y);
    const drift = this.reducedMotion ? 0 : Math.sin(time * 0.32) * 0.055;
    const lookAhead = clamp(
      this.projection.viewWidth / this.projection.xScale * 0.28,
      4.4,
      5.2,
    );
    const targetSimulationX = clamp(
      state.player.x + lookAhead,
      0,
      DEFAULT_GAME_CONFIG.world.width,
    );
    const pathForwardX = Math.sin(this.projection.pathYaw);
    const pathForwardZ = Math.cos(this.projection.pathYaw);
    const pathSideX = Math.cos(this.projection.pathYaw);
    const pathSideZ = -Math.sin(this.projection.pathYaw);
    const viewDirectionX = -pathForwardX * Math.cos(chaseYaw)
      - pathSideX * Math.sin(chaseYaw);
    const viewDirectionZ = -pathForwardZ * Math.cos(chaseYaw)
      - pathSideZ * Math.sin(chaseYaw);

    this.cameraTarget.set(
      this.projection.mapX(targetSimulationX),
      0.08 + playerY * 0.045,
      this.projection.depthAt(targetSimulationX),
    );
    this.camera.position.set(
      this.cameraTarget.x + viewDirectionX * horizontalDistance + drift
        + pathSideX * reaction.lateralOffset,
      this.cameraTarget.y + Math.sin(pitch) * baseDistance + reaction.verticalOffset,
      this.cameraTarget.z + viewDirectionZ * horizontalDistance
        + pathSideZ * reaction.lateralOffset,
    );
    this.camera.lookAt(this.cameraTarget);
    this.camera.rotateZ(reaction.roll);
  }

  private readonly handleResizeObserved = (): void => {
    this.resize();
  };

  private readonly handleViewportResize = (): void => {
    this.resize();
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.canvas.dispatchEvent(new CustomEvent('sky-dodge-renderer-lost'));
  };

  private readonly handleContextRestored = (): void => {
    if (this.destroyed) return;
    this.contextLost = false;
    this.resize();
    this.canvas.dispatchEvent(new CustomEvent('sky-dodge-renderer-restored'));
  };
}
