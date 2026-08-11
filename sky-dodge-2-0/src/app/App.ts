import { AudioEngine } from '../audio/AudioEngine';
import { InputRouter } from '../input/InputRouter';
import { SceneRenderer } from '../rendering/SceneRenderer';
import { getDifficultyTier } from '../simulation/GameConfig';
import type { GameEvent } from '../simulation/GameEvents';
import type { GameState, ModeId, MutationModeId } from '../simulation/GameState';
import type { InputAction } from '../simulation/InputActions';
import { Simulation } from '../simulation/Simulation';
import { probeCapabilities } from './CapabilityProbe';

type AppPhase = 'loading' | 'menu' | 'running' | 'paused' | 'game-over' | 'fallback' | 'destroyed';

interface AppElements {
  readonly canvas: HTMLCanvasElement;
  readonly loadingScreen: HTMLElement;
  readonly startScreen: HTMLElement;
  readonly fallbackScreen: HTMLElement;
  readonly hud: HTMLElement;
  readonly pauseScreen: HTMLElement;
  readonly gameOverScreen: HTMLElement;
  readonly startButton: HTMLButtonElement;
  readonly restartButton: HTMLButtonElement;
  readonly resumeButton: HTMLButtonElement;
  readonly pauseButton: HTMLButtonElement;
  readonly muteButton: HTMLButtonElement;
  readonly storkButton: HTMLButtonElement;
  readonly storkUses: HTMLElement;
  readonly score: HTMLOutputElement;
  readonly coins: HTMLOutputElement;
  readonly dnaValue: HTMLOutputElement;
  readonly dnaTrack: HTMLElement;
  readonly dnaBar: HTMLElement;
  readonly modeName: HTMLElement;
  readonly modeTimer: HTMLOutputElement;
  readonly modeResource: HTMLElement;
  readonly modeResourceBar: HTMLElement;
  readonly combo: HTMLOutputElement;
  readonly abilityTouchHint: HTMLElement;
  readonly abilityKeyboardHint: HTMLElement;
  readonly mutationPrompt: HTMLElement;
  readonly finalScore: HTMLElement;
  readonly finalCombo: HTMLElement;
  readonly finalGates: HTMLElement;
  readonly status: HTMLElement;
}

interface DebugBridge {
  readonly version: '2.0.0';
  readonly phase: () => AppPhase;
  readonly snapshot: () => GameState;
  readonly start: () => Promise<void>;
  readonly restart: () => Promise<void>;
  readonly forceMode: (mode: MutationModeId) => void;
  readonly dispatch: (action: InputAction) => void;
}

const MODE_LABELS: Readonly<Record<ModeId, string>> = Object.freeze({
  normal: 'KACZOR',
  frog: 'ŻABA',
  rubber: 'KAUCZUK',
  steel: 'STAL',
  ghost: 'DUCH',
  stork: 'BOCIAN',
});

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Sky Dodge 2.0: missing ${selector}`);
  return element;
}

function setPanelVisibility(element: HTMLElement, visible: boolean): void {
  element.hidden = !visible;
  element.inert = !visible;
  element.setAttribute('aria-hidden', String(!visible));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createRunSeed(): number {
  const time = Date.now() >>> 0;
  const entropy = globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? 0;
  return (time ^ entropy ^ 0x5d20_26e5) >>> 0;
}

/** Owns the complete browser lifecycle. Exactly one RAF and one InputRouter can
 * exist per App instance, including after any number of restarts. */
export class App {
  private readonly elements: AppElements;
  private readonly audio = new AudioEngine();
  private simulation = new Simulation({ seed: createRunSeed() });
  private renderer: SceneRenderer | null = null;
  private input: InputRouter | null = null;
  private phase: AppPhase = 'loading';
  private readonly inputQueue: InputAction[] = [];
  private animationFrame = 0;
  private previousFrameTime = 0;
  private runGeneration = 0;
  private startRequestGeneration = 0;
  private audioFaulted = false;
  private audioRecoveryPending = false;
  private destroyed = false;
  private debugBridge: DebugBridge | null = null;

  constructor(private readonly root: HTMLElement) {
    this.elements = {
      canvas: requireElement(root, '#gameCanvas'),
      loadingScreen: requireElement(root, '#loadingScreen'),
      startScreen: requireElement(root, '#startScreen'),
      fallbackScreen: requireElement(root, '#fallbackScreen'),
      hud: requireElement(root, '#hud'),
      pauseScreen: requireElement(root, '#pauseScreen'),
      gameOverScreen: requireElement(root, '#gameOverScreen'),
      startButton: requireElement(root, '#startButton'),
      restartButton: requireElement(root, '#restartButton'),
      resumeButton: requireElement(root, '#resumeButton'),
      pauseButton: requireElement(root, '#pauseButton'),
      muteButton: requireElement(root, '#muteButton'),
      storkButton: requireElement(root, '#storkActionButton'),
      storkUses: requireElement(root, '#storkUses'),
      score: requireElement(root, '#scoreOutput'),
      coins: requireElement(root, '#coinOutput'),
      dnaValue: requireElement(root, '#dnaValue'),
      dnaTrack: requireElement(root, '#dnaTrack'),
      dnaBar: requireElement(root, '#dnaBar'),
      modeName: requireElement(root, '#modeName'),
      modeTimer: requireElement(root, '#modeTimer'),
      modeResource: requireElement(root, '#modeResource'),
      modeResourceBar: requireElement(root, '#modeResourceBar'),
      combo: requireElement(root, '#comboOutput'),
      abilityTouchHint: requireElement(root, '#abilityTouchHint'),
      abilityKeyboardHint: requireElement(root, '#abilityKeyboardHint'),
      mutationPrompt: requireElement(root, '#mutationPrompt'),
      finalScore: requireElement(root, '#finalScore'),
      finalCombo: requireElement(root, '#finalCombo'),
      finalGates: requireElement(root, '#finalGates'),
      status: requireElement(root, '#gameStatus'),
    };
  }

  async initialize(): Promise<void> {
    if (this.destroyed) return;
    const capabilities = probeCapabilities(this.root.ownerDocument);
    if (!capabilities.webgl2) {
      this.showFallback();
      return;
    }

    try {
      this.renderer = new SceneRenderer(this.elements.canvas, capabilities);
      this.renderer.resize();
      this.renderer.render(this.simulation.state, 0, []);
      this.input = new InputRouter(
        this.elements.canvas,
        this.elements.storkButton,
        (action) => this.enqueueInput(action),
      );
      this.bindEvents();
      this.installDebugBridge();
      this.showMenu();
    } catch (error) {
      console.error('Sky Dodge 2.0 could not initialize WebGL', error);
      this.renderer?.destroy();
      this.renderer = null;
      this.showFallback();
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.startRequestGeneration += 1;
    this.stopAnimationLoop();
    this.phase = 'destroyed';
    this.root.dataset.phase = this.phase;
    this.inputQueue.length = 0;
    this.input?.destroy();
    this.input = null;
    this.renderer?.destroy();
    this.renderer = null;
    try {
      this.audio.destroy();
    } catch {
      // Audio must never prevent renderer/input cleanup.
    }
    this.unbindEvents();
    this.removeDebugBridge();
  }

  private bindEvents(): void {
    this.elements.startButton.addEventListener('click', this.handleStart);
    this.elements.restartButton.addEventListener('click', this.handleRestart);
    this.elements.resumeButton.addEventListener('click', this.handleResume);
    this.elements.pauseButton.addEventListener('click', this.handlePause);
    this.elements.muteButton.addEventListener('click', this.handleMute);
    this.root.ownerDocument.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.root.ownerDocument.addEventListener('keydown', this.handleAppKeyDown);
    globalThis.addEventListener('resize', this.handleResize, { passive: true });
    globalThis.visualViewport?.addEventListener('resize', this.handleResize, { passive: true });
  }

  private unbindEvents(): void {
    this.elements.startButton.removeEventListener('click', this.handleStart);
    this.elements.restartButton.removeEventListener('click', this.handleRestart);
    this.elements.resumeButton.removeEventListener('click', this.handleResume);
    this.elements.pauseButton.removeEventListener('click', this.handlePause);
    this.elements.muteButton.removeEventListener('click', this.handleMute);
    this.root.ownerDocument.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.root.ownerDocument.removeEventListener('keydown', this.handleAppKeyDown);
    globalThis.removeEventListener('resize', this.handleResize);
    globalThis.visualViewport?.removeEventListener('resize', this.handleResize);
  }

  private installDebugBridge(): void {
    this.debugBridge = Object.freeze({
      version: '2.0.0',
      phase: () => this.phase,
      snapshot: () => this.simulation.snapshot(),
      start: () => this.startRun(),
      restart: () => this.startRun(),
      forceMode: (mode: MutationModeId) => this.forceMode(mode),
      dispatch: (action: InputAction) => this.enqueueInput(action),
    });
    (globalThis as typeof globalThis & { __SKY_DODGE_2__?: DebugBridge }).__SKY_DODGE_2__ = this.debugBridge;
  }

  private removeDebugBridge(): void {
    const target = globalThis as typeof globalThis & { __SKY_DODGE_2__?: DebugBridge };
    if (target.__SKY_DODGE_2__ === this.debugBridge) delete target.__SKY_DODGE_2__;
    this.debugBridge = null;
  }

  private showFallback(): void {
    this.stopAnimationLoop();
    this.phase = 'fallback';
    this.root.dataset.phase = this.phase;
    setPanelVisibility(this.elements.loadingScreen, false);
    setPanelVisibility(this.elements.startScreen, false);
    setPanelVisibility(this.elements.hud, false);
    setPanelVisibility(this.elements.pauseScreen, false);
    setPanelVisibility(this.elements.gameOverScreen, false);
    setPanelVisibility(this.elements.fallbackScreen, true);
  }

  private showMenu(): void {
    this.stopAnimationLoop();
    this.phase = 'menu';
    this.root.dataset.phase = this.phase;
    setPanelVisibility(this.elements.loadingScreen, false);
    setPanelVisibility(this.elements.fallbackScreen, false);
    setPanelVisibility(this.elements.hud, false);
    setPanelVisibility(this.elements.pauseScreen, false);
    setPanelVisibility(this.elements.gameOverScreen, false);
    setPanelVisibility(this.elements.startScreen, true);
    this.elements.canvas.setAttribute('aria-hidden', 'true');
    this.elements.startButton.focus({ preventScroll: true });
  }

  private async startRun(): Promise<void> {
    if (this.destroyed || !this.renderer || !this.input) return;
    const requestGeneration = this.startRequestGeneration + 1;
    this.startRequestGeneration = requestGeneration;
    this.audioFaulted = false;
    try {
      await this.audio.unlock();
    } catch (error) {
      if (requestGeneration === this.startRequestGeneration) this.disableAudio(error);
    }
    if (this.destroyed
      || requestGeneration !== this.startRequestGeneration
      || !this.renderer
      || !this.input) return;
    this.runGeneration += 1;
    this.stopAnimationLoop();
    this.useAudio(() => {
      this.audio.reset();
      this.audio.beginRun();
    });
    this.input.reset();
    this.inputQueue.length = 0;
    this.simulation.reset(createRunSeed() ^ this.runGeneration);
    this.renderer.reset();
    this.phase = 'running';
    this.root.dataset.phase = this.phase;
    setPanelVisibility(this.elements.loadingScreen, false);
    setPanelVisibility(this.elements.startScreen, false);
    setPanelVisibility(this.elements.fallbackScreen, false);
    setPanelVisibility(this.elements.pauseScreen, false);
    setPanelVisibility(this.elements.gameOverScreen, false);
    setPanelVisibility(this.elements.hud, true);
    this.updateInterface(this.simulation.state);
    this.renderer.render(this.simulation.state, 0, []);
    this.announce('Lot rozpoczęty. Tapnij ekran, aby machnąć skrzydłami.');
    this.previousFrameTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.runFrame);
  }

  private pauseRun(): void {
    if (this.phase !== 'running') return;
    this.stopAnimationLoop();
    this.useAudio(() => this.audio.setPaused(true));
    // Drop stale actions first, then preserve the cancellation produced by
    // reset so a held phase/charge cannot continue after resume.
    this.inputQueue.length = 0;
    this.input?.reset();
    this.input?.setStorkEnabled(false);
    this.elements.storkButton.hidden = true;
    this.elements.storkButton.disabled = true;
    this.phase = 'paused';
    this.root.dataset.phase = this.phase;
    setPanelVisibility(this.elements.pauseScreen, true);
    this.elements.resumeButton.focus({ preventScroll: true });
    this.announce('Pauza.');
  }

  private resumeRun(): void {
    if (this.phase !== 'paused' || this.destroyed) return;
    setPanelVisibility(this.elements.pauseScreen, false);
    this.useAudio(() => this.audio.setPaused(false));
    this.phase = 'running';
    this.root.dataset.phase = this.phase;
    this.updateInterface(this.simulation.state);
    this.previousFrameTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.runFrame);
    this.announce('Lot wznowiony.');
  }

  private endRun(): void {
    if (this.phase !== 'running') return;
    this.stopAnimationLoop();
    this.useAudio(() => this.audio.finishRun());
    this.input?.reset();
    this.inputQueue.length = 0;
    this.phase = 'game-over';
    this.root.dataset.phase = this.phase;
    const state = this.simulation.state;
    this.elements.finalScore.textContent = Math.round(state.score.total).toLocaleString('pl-PL');
    this.elements.finalCombo.textContent = `×${state.combo.bestMultiplier.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}`;
    this.elements.finalGates.textContent = String(state.world.passedObstacles);
    setPanelVisibility(this.elements.hud, false);
    this.elements.storkButton.hidden = true;
    this.elements.storkButton.disabled = true;
    setPanelVisibility(this.elements.gameOverScreen, true);
    this.elements.restartButton.focus({ preventScroll: true });
    this.announce(`Koniec lotu. Wynik ${Math.round(state.score.total)}.`);
  }

  private enqueueInput(action: InputAction): void {
    if (this.phase !== 'running' || this.destroyed) return;
    if (!this.audioFaulted && !this.audioRecoveryPending && this.audio.needsUnlock()) {
      this.audioRecoveryPending = true;
      void this.audio.unlock()
        .catch((error: unknown) => this.disableAudio(error))
        .finally(() => { this.audioRecoveryPending = false; });
    }
    this.inputQueue.push(action);
  }

  private forceMode(mode: MutationModeId): void {
    if (this.phase !== 'running') return;
    const result = this.simulation.startMode(mode);
    this.useAudio(() => {
      this.audio.update(result.state);
      this.audio.handle(result.events, result.state);
    });
    this.consumeEvents(result.events);
    this.updateInterface(result.state);
    this.renderer?.render(result.state, 0, result.events);
  }

  private stopAnimationLoop(): void {
    if (this.animationFrame !== 0) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  private readonly runFrame = (time: number): void => {
    this.animationFrame = 0;
    if (this.destroyed || this.phase !== 'running' || !this.renderer) return;
    const delta = Math.max(0, Math.min(0.25, (time - this.previousFrameTime) / 1000));
    this.previousFrameTime = time;
    const actions = this.inputQueue.splice(0);
    const result = this.simulation.step(delta, actions);
    const interpolation = result.state.clock.accumulator / this.simulation.config.fixedStep;
    this.renderer.render(result.state, clamp01(interpolation), result.events);
    this.useAudio(() => {
      this.audio.update(result.state);
      this.audio.handle(result.events, result.state);
    });
    this.consumeEvents(result.events);
    this.updateInterface(result.state);

    if (result.state.status === 'dead') {
      this.endRun();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.runFrame);
  };

  private consumeEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'mutation-offered') {
        this.announce('DNA pełne. Wleć w górny albo dolny portal mutacji.');
      } else if (event.type === 'mode-entered') {
        this.announce(`Transformacja: ${MODE_LABELS[event.mode]}.`);
      } else if (event.type === 'mode-exited') {
        this.announce(`Koniec transformacji ${MODE_LABELS[event.mode]}.`);
      } else if (event.type === 'combo-changed' && event.links >= 4) {
        this.announce(`Combo razy ${event.multiplier}.`);
      } else if (event.type === 'game-over') {
        // AudioEngine handles the taunting flock; endRun owns the screen.
      }
    }
  }

  private updateInterface(state: Readonly<GameState>): void {
    const mode = state.mode.active;
    this.root.dataset.mode = mode;
    this.elements.score.value = String(Math.round(state.score.total));
    this.elements.score.textContent = Math.round(state.score.total).toLocaleString('pl-PL');
    this.elements.coins.value = String(state.score.coins);
    this.elements.coins.textContent = `${state.score.coins} ◉`;

    const dna = Math.round(clamp01(state.dna.value / 100) * 100);
    this.elements.dnaValue.value = String(dna);
    this.elements.dnaValue.textContent = `${dna}%`;
    this.elements.dnaTrack.setAttribute('aria-valuenow', String(dna));
    this.elements.dnaTrack.setAttribute('aria-valuetext', `${dna} procent niestabilności DNA`);
    this.elements.dnaBar.style.width = `${dna}%`;
    this.elements.mutationPrompt.hidden = !state.dna.offer;
    this.root.dataset.mutationOffer = state.dna.offer ? 'true' : 'false';

    this.elements.modeName.textContent = MODE_LABELS[mode];
    this.elements.modeTimer.value = mode === 'normal' ? '' : state.mode.remaining.toFixed(1);
    this.elements.modeTimer.textContent = mode === 'normal' ? '' : `${Math.max(0, state.mode.remaining).toFixed(1)} s`;
    const resource = this.modeResource(state);
    this.elements.modeResource.hidden = resource === null;
    if (resource !== null) {
      const resourcePercent = Math.round(clamp01(resource) * 100);
      const resourceLabel = this.modeResourceLabel(mode);
      this.elements.modeResourceBar.style.width = `${resourcePercent}%`;
      this.elements.modeResource.setAttribute('aria-label', resourceLabel);
      this.elements.modeResource.setAttribute('aria-valuenow', String(resourcePercent));
      this.elements.modeResource.setAttribute('aria-valuetext', `${resourceLabel}: ${resourcePercent} procent`);
    }

    const comboVisible = state.combo.links > 1 && state.combo.expiresAt > state.clock.elapsed;
    this.elements.combo.value = comboVisible ? String(state.combo.multiplier) : '';
    this.elements.combo.textContent = comboVisible
      ? `×${state.combo.multiplier.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} · ${state.combo.links} OGNIW`
      : '';

    const storkActive = mode === 'stork';
    const storkAction = this.storkActionPresentation(state);
    this.elements.storkButton.hidden = !storkActive;
    this.elements.storkButton.disabled = !storkActive || !storkAction.enabled;
    this.elements.storkButton.setAttribute('aria-pressed', String(state.mode.stork.phase === 'aiming'));
    this.elements.storkButton.setAttribute('aria-label', storkAction.label);
    this.elements.storkButton.title = storkAction.label;
    this.elements.storkButton.dataset.state = storkAction.state;
    this.elements.storkUses.textContent = String(state.mode.stork.uses);
    this.input?.setModeContext(mode, state.mode.frog.phase);
    this.input?.setStorkEnabled(storkActive && storkAction.enabled);

    const hints = this.abilityHints(state, storkAction.state);
    if (this.elements.abilityTouchHint.textContent !== hints.touch) {
      this.elements.abilityTouchHint.textContent = hints.touch;
    }
    if (this.elements.abilityKeyboardHint.textContent !== hints.keyboard) {
      this.elements.abilityKeyboardHint.textContent = hints.keyboard;
    }
  }

  private modeResource(state: Readonly<GameState>): number | null {
    switch (state.mode.active) {
      case 'frog':
        return state.mode.frog.phase === 'charging'
          ? state.mode.frog.charge / this.simulation.config.modes.frog.maxCharge
          : 0;
      case 'rubber':
        return Math.hypot(state.mode.rubber.aim.x, state.mode.rubber.aim.y);
      case 'steel':
        return state.mode.steel.heat / this.simulation.config.modes.steel.maximumHeat;
      case 'ghost':
        return null;
      case 'stork':
        return state.mode.stork.energy / this.simulation.config.modes.stork.maximumEnergy;
      default:
        return null;
    }
  }

  private modeResourceLabel(mode: ModeId): string {
    switch (mode) {
      case 'frog': return 'Ładunek żabiego skoku';
      case 'rubber': return 'Naciąg kauczukowej procy';
      case 'steel': return 'Temperatura stali';
      case 'ghost': return 'Automatyczne przenikanie';
      case 'stork': return 'Energia pika';
      default: return 'Zasób trybu';
    }
  }

  private hasStorkTarget(state: Readonly<GameState>): boolean {
    const speed = getDifficultyTier(state.world.passedObstacles, this.simulation.config).speed;
    const maximumDistance = speed * this.simulation.config.modes.stork.lockLeadTime
      + this.simulation.config.obstacle.width;
    return state.world.obstacles.some((obstacle) => {
      if (obstacle.destroyed || obstacle.passed) return false;
      const distance = obstacle.x - state.player.x;
      return distance >= 0 && distance <= maximumDistance;
    });
  }

  private storkActionPresentation(state: Readonly<GameState>): {
    readonly enabled: boolean;
    readonly label: string;
    readonly state: 'hidden' | 'ready' | 'aiming' | 'vaulting' | 'cooldown' | 'empty' | 'no-target';
  } {
    if (state.mode.active !== 'stork') {
      return { enabled: false, label: 'Bociani PIK jest teraz niedostępny', state: 'hidden' };
    }
    const stork = state.mode.stork;
    if (stork.phase === 'aiming') {
      return { enabled: true, label: 'Przesuń palec w górę lub w dół i puść, aby wykonać PIK', state: 'aiming' };
    }
    if (stork.phase === 'vaulting') {
      return { enabled: false, label: 'Bocian wykonuje PIK', state: 'vaulting' };
    }
    if (stork.uses <= 0 || stork.energy < this.simulation.config.modes.stork.useEnergy) {
      return { enabled: false, label: 'Wykorzystano wszystkie PIKI', state: 'empty' };
    }
    if (stork.cooldown > 0) {
      return { enabled: false, label: 'PIK odnawia się', state: 'cooldown' };
    }
    if (!this.hasStorkTarget(state)) {
      return { enabled: false, label: 'Brak przeszkody w zasięgu PIKA', state: 'no-target' };
    }
    return { enabled: true, label: 'Przytrzymaj PIK, przesuń palec w górę lub w dół i puść', state: 'ready' };
  }

  private abilityHints(
    state: Readonly<GameState>,
    storkActionState: 'hidden' | 'ready' | 'aiming' | 'vaulting' | 'cooldown' | 'empty' | 'no-target',
  ): { readonly touch: string; readonly keyboard: string } {
    switch (state.mode.active) {
      case 'frog':
        if (state.mode.frog.phase === 'charging') {
          return { touch: 'PUŚĆ · WYBIJ SIĘ', keyboard: 'PUŚĆ SPACJĘ · WYBIJ SIĘ' };
        }
        if (state.mode.frog.phase === 'clinging') {
          return { touch: 'PRZYTRZYMAJ · ŁADUJ SKOK', keyboard: 'TRZYMAJ SPACJĘ · ŁADUJ SKOK' };
        }
        return { touch: 'TAPNIJ · LOT • PRZY RURZE PRZYTRZYMAJ', keyboard: 'SPACJA / ↑ · LOT • PRZY RURZE TRZYMAJ SPACJĘ' };
      case 'rubber':
        return state.mode.rubber.phase === 'aiming'
          ? { touch: 'PRZECIĄGNIJ · CELUJ • PUŚĆ · WYSTRZEL', keyboard: 'SPACJA + STRZAŁKI · CELUJ • PUŚĆ SPACJĘ' }
          : { touch: 'PRZYTRZYMAJ I PRZECIĄGNIJ · KAUCZUKOWA PROCA', keyboard: 'TRZYMAJ SPACJĘ + STRZAŁKI · KAUCZUKOWA PROCA' };
      case 'steel':
        return { touch: 'TAPNIJ · LOT • UDERZENIA GRZEJĄ STAL', keyboard: 'SPACJA / ↑ · LOT • UDERZENIA GRZEJĄ STAL' };
      case 'ghost':
        return { touch: 'TAPNIJ · LOT • RURY PRZENIKASZ AUTOMATYCZNIE', keyboard: 'SPACJA / ↑ · LOT • RURY PRZENIKASZ AUTOMATYCZNIE' };
      case 'stork':
        if (storkActionState === 'aiming') {
          return { touch: 'PRZESUŃ ↑↓ • PUŚĆ PIK', keyboard: 'STRZAŁKI ↑↓ • PUŚĆ E' };
        }
        if (storkActionState === 'ready') {
          return { touch: 'TAPNIJ · LOT • PRZYTRZYMAJ PIK · NAMIERZ', keyboard: 'SPACJA · LOT • TRZYMAJ E + ↑↓ · PIK' };
        }
        if (storkActionState === 'vaulting') {
          return { touch: 'PIK!', keyboard: 'PIK!' };
        }
        if (storkActionState === 'empty') {
          return { touch: 'TAPNIJ · LOT • BRAK PIKÓW', keyboard: 'SPACJA / ↑ · LOT • BRAK PIKÓW' };
        }
        return { touch: 'TAPNIJ · LOT • PIK CZEKA NA CEL', keyboard: 'SPACJA / ↑ · LOT • E: PIK CZEKA NA CEL' };
      default:
        return { touch: 'TAPNIJ · MACHNIJ SKRZYDŁAMI', keyboard: 'SPACJA / ↑ · MACHNIJ SKRZYDŁAMI' };
    }
  }

  private announce(message: string): void {
    this.elements.status.textContent = '';
    requestAnimationFrame(() => {
      if (!this.destroyed) this.elements.status.textContent = message;
    });
  }

  private useAudio(action: () => void): void {
    if (this.audioFaulted) return;
    try {
      action();
    } catch (error) {
      this.disableAudio(error);
    }
  }

  private disableAudio(error: unknown): void {
    if (!this.audioFaulted) console.warn('Sky Dodge 2.0 audio was disabled for this run.', error);
    this.audioFaulted = true;
    try {
      this.audio.destroy();
    } catch {
      // The visual simulation stays authoritative even after an audio failure.
    }
  }

  private readonly handleStart = (): void => {
    void this.startRun();
  };

  private readonly handleRestart = (): void => {
    void this.startRun();
  };

  private readonly handlePause = (): void => {
    this.pauseRun();
  };

  private readonly handleResume = (): void => {
    this.resumeRun();
  };

  private readonly handleMute = (): void => {
    let muted = true;
    this.audioFaulted = false;
    try {
      muted = this.audio.toggleMuted();
    } catch (error) {
      this.disableAudio(error);
    }
    this.elements.muteButton.setAttribute('aria-pressed', String(muted));
    this.elements.muteButton.setAttribute('aria-label', muted ? 'Włącz dźwięk' : 'Wycisz dźwięk');
    this.elements.muteButton.textContent = muted ? '♩' : '♫';
    this.announce(muted ? 'Dźwięk wyciszony.' : 'Dźwięk włączony.');
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.root.ownerDocument.hidden) this.pauseRun();
  };

  private readonly handleResize = (): void => {
    this.renderer?.resize();
    this.renderer?.render(this.simulation.state, 0, []);
  };

  private readonly handleAppKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as Element | null;
    if (target?.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
    if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat) {
      if (this.phase === 'running') this.pauseRun();
      else if (this.phase === 'paused') this.resumeRun();
      event.preventDefault();
    }
  };
}
