import * as THREE from 'three';

import { DEFAULT_GAME_CONFIG } from '../simulation/GameConfig';
import type { GameEvent } from '../simulation/GameEvents';
import type { GameState, ModeId } from '../simulation/GameState';
import { CharacterRig } from './CharacterRig';
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
  private readonly playerLight: THREE.PointLight;
  private readonly blobShadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly reducedMotion: boolean;
  private readonly requestedPixelRatio: number;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly viewport: VisualViewport | null;
  private readonly cameraTarget = new THREE.Vector3();
  private projection: WorldProjection = createWorldProjection(1);
  private cssWidth = 0;
  private cssHeight = 0;
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
    // Preserve atmospheric depth while leaving the third real look-ahead gate
    // legible as a silhouette on wide desktop paths.
    this.scene.fog = new THREE.FogExp2(0x17354e, 0.0105);

    const hemisphere = new THREE.HemisphereLight(0xd8f7ff, 0x39213f, 2.15);
    hemisphere.name = 'sky-fill';
    const ambient = new THREE.AmbientLight(0x8fc5d5, 0.42);
    ambient.name = 'soft-ambient';
    const key = new THREE.DirectionalLight(0xffe7b5, 3.15);
    key.name = 'sun-key';
    key.position.set(-7, 10, 13);
    const rim = new THREE.DirectionalLight(0x43cfff, 1.65);
    rim.name = 'cool-rim';
    rim.position.set(10, 3, -2);
    const warmFill = new THREE.PointLight(0xffa454, 0.75, 24, 2);
    warmFill.name = 'sun-fill';
    warmFill.position.set(7, 5, -8);
    this.playerLight = new THREE.PointLight(MODE_LIGHT_COLOURS.normal, 1.2, 5.5, 2);
    this.playerLight.name = 'mode-glow';
    this.scene.add(hemisphere, ambient, key, rim, warmFill, this.playerLight);

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
    this.blobShadow.visible = true;
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
    this.scene.clear();
    this.renderer.dispose();
    // This renderer owns the canvas for its whole lifetime. Explicit context loss
    // releases driver-side allocations promptly on mobile route changes/restarts.
    this.renderer.forceContextLoss();
    delete this.canvas.dataset.renderQuality;
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

    this.playerLight.position.set(
      this.projection.mapX(playerX),
      this.projection.mapY(playerY),
      depth + 1.2,
    );
    this.playerLight.color.setHex(MODE_LIGHT_COLOURS[state.mode.active]);
    this.playerLight.intensity = state.mode.active === 'normal' ? 0.72 : 1.35;
  }

  private updateCamera(state: Readonly<GameState>, time: number): void {
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
      this.cameraTarget.x + viewDirectionX * horizontalDistance + drift,
      this.cameraTarget.y + Math.sin(pitch) * baseDistance,
      this.cameraTarget.z + viewDirectionZ * horizontalDistance,
    );
    this.camera.lookAt(this.cameraTarget);
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
