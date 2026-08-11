import * as THREE from 'three';

import { DEFAULT_GAME_CONFIG } from '../simulation/GameConfig';
import type { GameState, ModeId } from '../simulation/GameState';
import type { WorldProjection } from './WorldViews';

interface FormParts {
  readonly root: THREE.Group;
  readonly wings: readonly THREE.Object3D[];
  readonly accent?: THREE.Object3D;
  readonly aimGuide?: THREE.Group;
  readonly vaultTrail?: THREE.Mesh;
  readonly heatMaterials?: readonly THREE.MeshStandardMaterial[];
  readonly ghostMaterials?: readonly THREE.MeshStandardMaterial[];
}

interface BirdPalette {
  readonly body: number;
  readonly belly: number;
  readonly wing: number;
  readonly beak: number;
  readonly accent: number;
}

const MODE_IDS: readonly ModeId[] = Object.freeze([
  'normal',
  'frog',
  'rubber',
  'steel',
  'ghost',
  'stork',
]);

const MODE_GLOW: Readonly<Record<ModeId, number>> = Object.freeze({
  normal: 0x7de7ff,
  frog: 0x78ff9a,
  rubber: 0xff6581,
  steel: 0xe3f8ff,
  ghost: 0x81f8ff,
  stork: 0xff9a78,
});

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.max(minimum, Math.min(maximum, value))
);

/**
 * A complete visual rig for every phenotype. Forms never share materials and
 * switching mode changes visibility atomically, so a colour/scale mutation
 * cannot leak from one animal into another.
 */
export class CharacterRig {
  readonly object = new THREE.Group();

  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly forms: Readonly<Record<ModeId, FormParts>>;
  private readonly invulnerabilityHalo: THREE.Mesh;
  private readonly modeAura: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private readonly thrustTrail: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  private activeMode: ModeId = 'normal';
  private destroyed = false;

  constructor(parent: THREE.Object3D) {
    this.object.name = 'character-rig';
    this.object.renderOrder = 20;

    this.forms = {
      normal: this.createBirdForm({
        body: 0xf6c84b,
        belly: 0xffe8a6,
        wing: 0xe9a92d,
        beak: 0xff7b2f,
        accent: 0x35d9ff,
      }),
      frog: this.createFrogForm(),
      rubber: this.createRubberForm(),
      steel: this.createSteelForm(),
      ghost: this.createGhostForm(),
      stork: this.createStorkForm(),
    };

    for (const mode of MODE_IDS) {
      const form = this.forms[mode];
      form.root.visible = mode === this.activeMode;
      this.object.add(form.root);
    }

    const haloGeometry = this.trackGeometry(new THREE.TorusGeometry(0.78, 0.035, 8, 48));
    const haloMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xeffcff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.invulnerabilityHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    this.invulnerabilityHalo.name = 'invulnerability-halo';
    this.invulnerabilityHalo.visible = false;
    this.invulnerabilityHalo.position.z = -0.08;
    this.object.add(this.invulnerabilityHalo);

    const auraGeometry = this.trackGeometry(new THREE.TorusGeometry(0.9, 0.028, 8, 56));
    const auraMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: MODE_GLOW.normal,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.modeAura = new THREE.Mesh(auraGeometry, auraMaterial);
    this.modeAura.name = 'mode-aura';
    this.modeAura.position.z = -0.18;
    this.modeAura.visible = false;
    this.object.add(this.modeAura);

    const trailGeometry = this.trackGeometry(new THREE.ConeGeometry(0.24, 1.18, 10, 1, true));
    trailGeometry.rotateZ(Math.PI / 2);
    const trailMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: MODE_GLOW.normal,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }));
    this.thrustTrail = new THREE.Mesh(trailGeometry, trailMaterial);
    this.thrustTrail.name = 'flight-direction-trail';
    this.thrustTrail.position.set(-1.12, -0.02, -0.08);
    this.object.add(this.thrustTrail);

    parent.add(this.object);
  }

  update(state: Readonly<GameState>, projection: WorldProjection, alpha: number): void {
    if (this.destroyed) return;

    const mode = state.mode.active;
    if (mode !== this.activeMode) this.setMode(mode);

    const stepAhead = DEFAULT_GAME_CONFIG.fixedStep * clamp(alpha, 0, 1);
    const playerX = clamp(
      state.player.x + state.player.vx * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.width,
    );
    const playerY = clamp(
      state.player.y + state.player.vy * stepAhead,
      0,
      DEFAULT_GAME_CONFIG.world.height,
    );
    const time = state.clock.elapsed + stepAhead;
    const form = this.forms[mode];

    this.object.position.set(
      projection.mapX(playerX),
      projection.mapY(playerY),
      projection.depthAt(playerX) + 0.72,
    );
    this.object.scale.setScalar(0.78);
    this.object.rotation.set(-0.025, -0.1, clamp(state.player.vy / 16, -0.34, 0.34));

    form.root.position.set(0, 0, 0);
    form.root.rotation.set(0, 0, 0);
    form.root.scale.set(1, 1, 1);
    for (let index = 0; index < form.wings.length; index += 1) {
      const wing = form.wings[index];
      if (!wing) continue;
      const direction = index % 2 === 0 ? 1 : -1;
      wing.rotation.x = direction * (0.28 + Math.sin(time * 13) * 0.34);
    }
    if (form.accent) form.accent.rotation.z = time * 1.7;
    if (form.aimGuide) form.aimGuide.visible = false;
    if (form.vaultTrail) form.vaultTrail.visible = false;

    if (mode === 'frog') {
      const charge = clamp(
        state.mode.frog.charge / DEFAULT_GAME_CONFIG.modes.frog.maxCharge,
        0,
        1,
      );
      const anchored = state.mode.frog.phase !== 'airborne';
      form.root.scale.set(1 + charge * 0.12, 1 - charge * 0.3, 1 + charge * 0.08);
      form.root.position.y = anchored ? -0.08 : Math.sin(time * 7) * 0.025;
      if (form.accent) {
        form.accent.visible = state.mode.frog.phase === 'charging';
        form.accent.scale.setScalar(0.82 + charge * 0.55);
      }
    } else if (mode === 'rubber') {
      const aiming = state.mode.rubber.phase === 'aiming';
      const speed = Math.hypot(state.player.vx, state.player.vy);
      const stretch = aiming ? 0.82 : 1 + clamp(speed / 22, 0, 0.22);
      form.root.scale.set(stretch, 1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch));
      if (aiming) {
        form.root.rotation.z = Math.atan2(state.mode.rubber.aim.y, state.mode.rubber.aim.x) * 0.22;
      }
    } else if (mode === 'steel') {
      const heat = clamp(
        state.mode.steel.heat / DEFAULT_GAME_CONFIG.modes.steel.maximumHeat,
        0,
        1,
      );
      for (const material of form.heatMaterials ?? []) {
        material.emissive.setRGB(0.75 * heat, 0.12 * heat, 0.01);
        material.emissiveIntensity = state.mode.steel.critical ? 1.25 : 0.5;
      }
      form.root.rotation.y = Math.sin(time * 2.5) * 0.035;
    } else if (mode === 'ghost') {
      const phasing = state.mode.ghost.phase === 'phasing';
      for (const material of form.ghostMaterials ?? []) {
        material.opacity = phasing ? 0.3 : 0.58;
      }
      form.root.position.y = Math.sin(time * 4) * 0.08;
      form.root.scale.set(1, 1 + Math.sin(time * 5) * 0.04, 1);
    } else if (mode === 'stork') {
      this.updateStork(form, state, time);
    }

    const haloVisible = state.player.invulnerableTime > 0;
    this.invulnerabilityHalo.visible = haloVisible;
    if (haloVisible) {
      const pulse = 1 + Math.sin(time * 12) * 0.08;
      this.invulnerabilityHalo.scale.setScalar(pulse);
      this.invulnerabilityHalo.rotation.z = -time * 1.5;
    }

    this.modeAura.visible = mode !== 'normal';
    this.modeAura.material.color.setHex(MODE_GLOW[mode]);
    if (this.modeAura.visible) {
      const auraPulse = 0.94 + Math.sin(time * 6.5) * 0.055;
      this.modeAura.scale.setScalar(auraPulse);
      this.modeAura.rotation.z = time * (mode === 'ghost' ? -0.75 : 0.55);
    }

    const abilityHold = (mode === 'frog' && state.mode.frog.phase !== 'airborne')
      || (mode === 'rubber' && state.mode.rubber.phase === 'aiming')
      || (mode === 'stork' && state.mode.stork.phase === 'aiming');
    this.thrustTrail.visible = !abilityHold;
    this.thrustTrail.material.color.setHex(MODE_GLOW[mode]);
    if (this.thrustTrail.visible) {
      const thrust = 0.82 + clamp(Math.abs(state.player.vy) / 8, 0, 0.7);
      this.thrustTrail.scale.set(thrust, 0.8 + Math.sin(time * 17) * 0.12, 0.8);
      this.thrustTrail.material.opacity = mode === 'ghost' ? 0.16 : 0.3;
    }
  }

  reset(): void {
    if (this.destroyed) return;
    this.object.position.set(0, 0, 0);
    this.object.rotation.set(0, 0, 0);
    this.object.scale.setScalar(0.78);
    this.invulnerabilityHalo.visible = false;
    this.modeAura.visible = false;
    this.thrustTrail.visible = true;
    this.setMode('normal');
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.object.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear();
    this.materials.clear();
  }

  private setMode(mode: ModeId): void {
    this.activeMode = mode;
    for (const candidate of MODE_IDS) this.forms[candidate].root.visible = candidate === mode;
  }

  private updateStork(form: FormParts, state: Readonly<GameState>, time: number): void {
    const stork = state.mode.stork;
    if (form.aimGuide) {
      form.aimGuide.visible = stork.phase === 'aiming';
      form.aimGuide.rotation.z = stork.aimBias * 0.48;
      const energy = clamp(stork.energy / DEFAULT_GAME_CONFIG.modes.stork.maximumEnergy, 0, 1);
      form.aimGuide.scale.set(0.72 + energy * 0.28, 1, 1);
    }
    if (form.vaultTrail) {
      form.vaultTrail.visible = stork.phase === 'vaulting';
      form.vaultTrail.scale.x = 0.9 + Math.sin(time * 18) * 0.12;
    }

    if (stork.phase === 'aiming') {
      form.root.rotation.z = -0.08 + stork.aimBias * 0.16;
      form.root.scale.set(1.04, 0.96, 1);
    } else if (stork.phase === 'vaulting') {
      const direction = Math.sign(stork.vaultTargetY - stork.vaultStartY);
      form.root.rotation.z = -0.42 * direction;
      form.root.scale.set(1.12, 0.9, 1);
    }
  }

  private createBirdForm(palette: BirdPalette): FormParts {
    const root = new THREE.Group();
    root.name = 'form-normal';
    const sphere = this.trackGeometry(new THREE.SphereGeometry(0.62, 18, 12));
    const eyeGeometry = this.trackGeometry(new THREE.SphereGeometry(0.07, 10, 7));
    const beakGeometry = this.trackGeometry(new THREE.ConeGeometry(0.2, 0.48, 4));
    beakGeometry.rotateZ(-Math.PI / 2);

    const bodyMaterial = this.standard(palette.body, 0.66, 0.02, true);
    const bellyMaterial = this.standard(palette.belly, 0.82, 0, true);
    const wingMaterial = this.standard(palette.wing, 0.72, 0.01, true);
    const beakMaterial = this.standard(palette.beak, 0.62, 0, true);
    const eyeMaterial = this.standard(0x101728, 0.45, 0.05);
    const accentMaterial = this.standard(palette.accent, 0.25, 0.3, true);

    const body = new THREE.Mesh(sphere, bodyMaterial);
    body.scale.set(1.18, 0.78, 0.82);
    root.add(body);

    const belly = new THREE.Mesh(sphere, bellyMaterial);
    belly.position.set(0.24, -0.09, 0.52);
    belly.scale.set(0.62, 0.48, 0.13);
    root.add(belly);

    const head = new THREE.Mesh(sphere, bodyMaterial);
    head.position.set(0.72, 0.42, 0.02);
    head.scale.setScalar(0.62);
    root.add(head);

    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(1.23, 0.36, 0.04);
    beak.scale.set(1, 0.82, 1);
    root.add(beak);

    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0.94, 0.58, 0.33);
    root.add(eye);

    const eyeGlint = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(0.022, 7, 5)),
      this.standard(0xffffff, 0.18, 0),
    );
    eyeGlint.position.set(0.97, 0.606, 0.388);
    root.add(eyeGlint);

    const wing = new THREE.Mesh(sphere, wingMaterial);
    wing.position.set(-0.12, 0.04, 0.58);
    wing.scale.set(0.72, 0.28, 0.16);
    wing.rotation.z = -0.32;
    root.add(wing);

    const tailGeometry = this.trackGeometry(new THREE.ConeGeometry(0.18, 0.54, 5));
    tailGeometry.rotateZ(Math.PI / 2);
    const tailTop = new THREE.Mesh(tailGeometry, wingMaterial);
    tailTop.position.set(-0.83, 0.22, -0.18);
    tailTop.rotation.x = 0.24;
    const tailBottom = new THREE.Mesh(tailGeometry, wingMaterial);
    tailBottom.position.set(-0.84, -0.16, -0.16);
    tailBottom.rotation.x = -0.24;
    root.add(tailTop, tailBottom);

    const crestGeometry = this.trackGeometry(new THREE.ConeGeometry(0.09, 0.34, 5));
    const crest = new THREE.Mesh(crestGeometry, accentMaterial);
    crest.position.set(0.66, 0.83, -0.02);
    crest.rotation.z = -0.22;
    root.add(crest);

    const turbineGeometry = this.trackGeometry(new THREE.TorusGeometry(0.18, 0.05, 8, 24));
    const turbine = new THREE.Mesh(turbineGeometry, accentMaterial);
    turbine.position.set(-0.78, 0.04, 0.02);
    turbine.rotation.y = Math.PI / 2;
    root.add(turbine);

    return { root, wings: [wing], accent: turbine };
  }

  private createFrogForm(): FormParts {
    const root = new THREE.Group();
    root.name = 'form-frog';
    const sphere = this.trackGeometry(new THREE.SphereGeometry(0.6, 18, 12));
    const limbGeometry = this.trackGeometry(new THREE.CapsuleGeometry(0.1, 0.44, 4, 8));
    const eyeGeometry = this.trackGeometry(new THREE.SphereGeometry(0.12, 10, 8));

    const skin = this.standard(0x55c96b, 0.72, 0, true);
    const darkSkin = this.standard(0x238d59, 0.78, 0, true);
    // Deliberately pale green: frog belly never borrows the amber portal material.
    const belly = this.standard(0xd9f3a8, 0.9, 0, true);
    const pupil = this.standard(0x10191f, 0.5, 0);
    const chargeMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xa7ffcb,
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));

    const body = new THREE.Mesh(sphere, skin);
    body.scale.set(1.03, 0.72, 0.84);
    root.add(body);

    const bellyPatch = new THREE.Mesh(sphere, belly);
    bellyPatch.position.set(0.17, -0.12, 0.52);
    bellyPatch.scale.set(0.64, 0.46, 0.13);
    root.add(bellyPatch);

    const head = new THREE.Mesh(sphere, skin);
    head.position.set(0.52, 0.33, 0.03);
    head.scale.set(0.68, 0.55, 0.66);
    root.add(head);

    for (const z of [-0.27, 0.27]) {
      const eyeBulb = new THREE.Mesh(eyeGeometry, skin);
      eyeBulb.position.set(0.72, 0.68, z);
      root.add(eyeBulb);
      const eye = new THREE.Mesh(eyeGeometry, pupil);
      eye.position.set(0.78, 0.7, z + 0.055);
      eye.scale.setScalar(0.42);
      root.add(eye);
    }

    const legs: THREE.Object3D[] = [];
    for (const z of [-0.38, 0.38]) {
      const leg = new THREE.Mesh(limbGeometry, darkSkin);
      leg.position.set(-0.42, -0.48, z);
      leg.rotation.z = Math.PI / 3;
      root.add(leg);
      legs.push(leg);
    }

    const chargeGeometry = this.trackGeometry(new THREE.TorusGeometry(0.78, 0.035, 8, 40));
    const charge = new THREE.Mesh(chargeGeometry, chargeMaterial);
    charge.visible = false;
    charge.position.z = -0.12;
    root.add(charge);

    return { root, wings: legs, accent: charge };
  }

  private createRubberForm(): FormParts {
    const root = new THREE.Group();
    root.name = 'form-rubber';
    const sphere = this.trackGeometry(new THREE.SphereGeometry(0.63, 20, 14));
    const torus = this.trackGeometry(new THREE.TorusGeometry(0.68, 0.055, 8, 36));
    const beakGeometry = this.trackGeometry(new THREE.ConeGeometry(0.18, 0.45, 5));
    beakGeometry.rotateZ(-Math.PI / 2);

    const bodyMaterial = this.standard(0xff5b70, 0.22, 0.03);
    const bellyMaterial = this.standard(0xffb0b5, 0.34, 0);
    const bandMaterial = this.standard(0x8dffe0, 0.28, 0.08, true);
    const beakMaterial = this.standard(0xffca4c, 0.56, 0);
    const eyeMaterial = this.standard(0x192038, 0.5, 0);

    const body = new THREE.Mesh(sphere, bodyMaterial);
    body.scale.set(1.16, 0.84, 0.9);
    root.add(body);

    const belly = new THREE.Mesh(sphere, bellyMaterial);
    belly.position.set(0.24, -0.1, 0.56);
    belly.scale.set(0.62, 0.5, 0.13);
    root.add(belly);

    const head = new THREE.Mesh(sphere, bodyMaterial);
    head.position.set(0.73, 0.4, 0.02);
    head.scale.setScalar(0.6);
    root.add(head);

    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(1.21, 0.34, 0.03);
    root.add(beak);

    const eye = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(0.065, 9, 7)), eyeMaterial);
    eye.position.set(0.95, 0.56, 0.34);
    root.add(eye);

    const band = new THREE.Mesh(torus, bandMaterial);
    band.rotation.y = Math.PI / 2;
    root.add(band);

    const wing = new THREE.Mesh(sphere, bodyMaterial);
    wing.position.set(-0.18, 0.03, 0.62);
    wing.scale.set(0.7, 0.24, 0.14);
    root.add(wing);

    return { root, wings: [wing], accent: band };
  }

  private createSteelForm(): FormParts {
    const root = new THREE.Group();
    root.name = 'form-steel';
    const bodyGeometry = this.trackGeometry(new THREE.IcosahedronGeometry(0.67, 2));
    const plateGeometry = this.trackGeometry(new THREE.BoxGeometry(0.42, 0.25, 0.09));
    const rivetGeometry = this.trackGeometry(new THREE.SphereGeometry(0.055, 8, 6));
    const beakGeometry = this.trackGeometry(new THREE.ConeGeometry(0.19, 0.48, 4));
    beakGeometry.rotateZ(-Math.PI / 2);

    const armour = this.standard(0x93a7b7, 0.28, 0.82, true);
    const brightArmour = this.standard(0xd8edf4, 0.2, 0.9, true);
    const darkMetal = this.standard(0x273c4b, 0.32, 0.88, true);
    const eyeMaterial = this.standard(0xffc54a, 0.2, 0.35, true);

    const body = new THREE.Mesh(bodyGeometry, armour);
    body.scale.set(1.16, 0.78, 0.84);
    root.add(body);

    const head = new THREE.Mesh(bodyGeometry, brightArmour);
    head.position.set(0.72, 0.42, 0.02);
    head.scale.setScalar(0.58);
    root.add(head);

    const beak = new THREE.Mesh(beakGeometry, darkMetal);
    beak.position.set(1.22, 0.35, 0.03);
    root.add(beak);

    const eye = new THREE.Mesh(rivetGeometry, eyeMaterial);
    eye.position.set(0.96, 0.57, 0.33);
    eye.scale.setScalar(1.18);
    root.add(eye);

    for (let index = -1; index <= 1; index += 1) {
      const plate = new THREE.Mesh(plateGeometry, brightArmour);
      plate.position.set(-0.12 + index * 0.32, 0.04, 0.69);
      plate.rotation.z = index * 0.08;
      root.add(plate);
      for (const side of [-1, 1]) {
        const rivet = new THREE.Mesh(rivetGeometry, darkMetal);
        rivet.position.set(plate.position.x + side * 0.15, plate.position.y, 0.76);
        root.add(rivet);
      }
    }

    const wing = new THREE.Mesh(bodyGeometry, armour);
    wing.position.set(-0.2, 0.03, 0.63);
    wing.scale.set(0.62, 0.2, 0.12);
    root.add(wing);

    return {
      root,
      wings: [wing],
      heatMaterials: [armour, brightArmour],
    };
  }

  private createGhostForm(): FormParts {
    const root = new THREE.Group();
    root.name = 'form-ghost';
    const sphere = this.trackGeometry(new THREE.SphereGeometry(0.62, 18, 12));
    const tailGeometry = this.trackGeometry(new THREE.ConeGeometry(0.54, 1.1, 10, 1, true));
    tailGeometry.rotateZ(Math.PI / 2);
    const eyeGeometry = this.trackGeometry(new THREE.SphereGeometry(0.065, 9, 7));

    const spectral = this.translucentStandard(0x7eeeff, 0.58, 0.55);
    const spectralLight = this.translucentStandard(0xd6ffff, 0.58, 0.82);
    const eyeMaterial = this.translucentStandard(0x16233e, 0.76, 0.25);

    const body = new THREE.Mesh(sphere, spectral);
    body.scale.set(1.08, 0.78, 0.82);
    root.add(body);

    const head = new THREE.Mesh(sphere, spectralLight);
    head.position.set(0.7, 0.4, 0.02);
    head.scale.setScalar(0.6);
    root.add(head);

    const tail = new THREE.Mesh(tailGeometry, spectral);
    tail.position.set(-0.94, -0.03, 0);
    tail.scale.set(1.15, 0.9, 0.76);
    root.add(tail);

    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0.94, 0.56, 0.34);
    root.add(eye);

    const wing = new THREE.Mesh(sphere, spectralLight);
    wing.position.set(-0.08, 0.04, 0.61);
    wing.scale.set(0.66, 0.22, 0.12);
    root.add(wing);

    return {
      root,
      wings: [wing],
      ghostMaterials: [spectral, spectralLight, eyeMaterial],
    };
  }

  private createStorkForm(): FormParts {
    const root = new THREE.Group();
    root.name = 'form-stork';
    const sphere = this.trackGeometry(new THREE.SphereGeometry(0.52, 18, 12));
    const neckGeometry = this.trackGeometry(new THREE.CapsuleGeometry(0.14, 0.78, 5, 10));
    const legGeometry = this.trackGeometry(new THREE.CylinderGeometry(0.025, 0.035, 0.78, 6));
    const beakGeometry = this.trackGeometry(new THREE.ConeGeometry(0.13, 0.88, 5));
    beakGeometry.rotateZ(-Math.PI / 2);

    const white = this.standard(0xf4f8ef, 0.68, 0, true);
    const shadow = this.standard(0x24303b, 0.72, 0.04, true);
    const red = this.standard(0xeb4d46, 0.58, 0.02, true);
    const eye = this.standard(0x0c1820, 0.5, 0);
    const guideMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x72f4ff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    const trailMaterial = this.trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xf4fbff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }));

    const body = new THREE.Mesh(sphere, white);
    body.scale.set(1.2, 0.68, 0.72);
    root.add(body);

    const neck = new THREE.Mesh(neckGeometry, white);
    neck.position.set(0.65, 0.53, 0);
    neck.rotation.z = -0.64;
    root.add(neck);

    const head = new THREE.Mesh(sphere, white);
    head.position.set(1.05, 0.88, 0);
    head.scale.setScalar(0.5);
    root.add(head);

    const beak = new THREE.Mesh(beakGeometry, red);
    beak.position.set(1.58, 0.84, 0.02);
    root.add(beak);

    const pupil = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(0.055, 8, 6)), eye);
    pupil.position.set(1.2, 0.98, 0.28);
    root.add(pupil);

    const wings: THREE.Object3D[] = [];
    for (const z of [-0.48, 0.48]) {
      const wing = new THREE.Mesh(sphere, shadow);
      wing.position.set(-0.12, 0.08, z);
      wing.scale.set(0.82, 0.22, 0.14);
      root.add(wing);
      wings.push(wing);
    }

    for (const x of [-0.24, 0.18]) {
      const leg = new THREE.Mesh(legGeometry, red);
      leg.position.set(x, -0.7, 0.05);
      root.add(leg);
    }

    const aimGuide = new THREE.Group();
    const guideShaftGeometry = this.trackGeometry(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 6));
    guideShaftGeometry.rotateZ(-Math.PI / 2);
    const guideShaft = new THREE.Mesh(guideShaftGeometry, guideMaterial);
    guideShaft.position.x = 1.35;
    aimGuide.add(guideShaft);
    const guideTipGeometry = this.trackGeometry(new THREE.ConeGeometry(0.11, 0.32, 6));
    guideTipGeometry.rotateZ(-Math.PI / 2);
    const guideTip = new THREE.Mesh(guideTipGeometry, guideMaterial);
    guideTip.position.x = 2.28;
    aimGuide.add(guideTip);
    aimGuide.position.set(0.25, 0.12, 0.58);
    aimGuide.visible = false;
    root.add(aimGuide);

    const trailGeometry = this.trackGeometry(new THREE.ConeGeometry(0.42, 1.9, 10, 1, true));
    trailGeometry.rotateZ(Math.PI / 2);
    const vaultTrail = new THREE.Mesh(trailGeometry, trailMaterial);
    vaultTrail.position.set(-1.25, 0, -0.04);
    vaultTrail.visible = false;
    root.add(vaultTrail);

    return { root, wings, aimGuide, vaultTrail };
  }

  private standard(
    color: number,
    roughness: number,
    metalness: number,
    flatShading = false,
  ): THREE.MeshStandardMaterial {
    const base = new THREE.Color(color);
    const emissive = base.clone().multiplyScalar(metalness > 0.7 ? 0.035 : 0.065);
    return this.trackMaterial(new THREE.MeshStandardMaterial({
      color: base,
      emissive,
      emissiveIntensity: 0.52,
      roughness,
      metalness,
      flatShading,
    }));
  }

  private translucentStandard(
    color: number,
    opacity: number,
    emissiveIntensity: number,
  ): THREE.MeshStandardMaterial {
    return this.trackMaterial(new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }));
  }

  private trackGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  private trackMaterial<T extends THREE.Material>(material: T): T {
    this.materials.add(material);
    return material;
  }
}
