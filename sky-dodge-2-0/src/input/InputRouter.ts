import type { InputAction, MutationLane } from '../simulation/InputActions';
import type { Vec2 } from '../simulation/GameState';
import { DoubleTapGuard } from './DoubleTapGuard';

export type InputDispatcher = (action: InputAction) => void;

interface ActivePointer {
  readonly id: number;
  readonly owner: 'canvas' | 'stork';
  readonly captureTarget: HTMLElement;
  readonly startX: number;
  readonly startY: number;
}

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="button"]',
  '[data-input-ignore]',
].join(',');

const POINTER_AIM_DEAD_ZONE = 6;
const POINTER_VERTICAL_BIAS = 1.35;

function isPrimaryActivation(event: PointerEvent): boolean {
  return event.isPrimary && (event.pointerType !== 'mouse' || event.button === 0);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  return Boolean((target as Element).closest(INTERACTIVE_SELECTOR));
}

function normalizedAimVector(deltaX: number, deltaY: number): Vec2 | null {
  const biasedY = -deltaY * POINTER_VERTICAL_BIAS;
  const length = Math.hypot(deltaX, biasedY);
  if (length < POINTER_AIM_DEAD_ZONE) return null;
  return Object.freeze({ x: deltaX / length, y: biasedY / length });
}

/** Routes browser input into deterministic, device-independent simulation actions. */
export class InputRouter {
  private activePointer: ActivePointer | null = null;
  private keyboardAbilityActive = false;
  private keyboardAimUp = false;
  private keyboardAimDown = false;
  private storkEnabled = true;
  private destroyed = false;
  private readonly ownerDocument: Document;
  private readonly doubleTapGuard: DoubleTapGuard;

  constructor(
    private readonly canvas: HTMLElement,
    private readonly storkPad: HTMLButtonElement | null | undefined,
    private readonly dispatch: InputDispatcher,
  ) {
    this.ownerDocument = canvas.ownerDocument;
    this.doubleTapGuard = new DoubleTapGuard(canvas);

    canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    storkPad?.addEventListener('pointerdown', this.handleStorkPointerDown);
    this.ownerDocument.addEventListener('pointerdown', this.handleGlobalPointerDown, true);
    this.ownerDocument.addEventListener('pointermove', this.handlePointerMove);
    this.ownerDocument.addEventListener('pointerup', this.handlePointerUp);
    this.ownerDocument.addEventListener('pointercancel', this.handlePointerCancel);
    this.ownerDocument.addEventListener('keydown', this.handleKeyDown);
    this.ownerDocument.addEventListener('keyup', this.handleKeyUp);
    this.ownerDocument.defaultView?.addEventListener('blur', this.handleBlur);
  }

  setStorkEnabled(enabled: boolean): void {
    if (this.destroyed || this.storkEnabled === enabled) return;
    this.storkEnabled = enabled;
    if (!enabled) this.cancelAbility();
  }

  selectMutation(lane: MutationLane): void {
    if (this.destroyed) return;
    this.emit({ type: 'select-mutation', lane });
  }

  reset(): void {
    if (this.destroyed) return;
    this.cancelAbility();
    this.releaseActivePointer();
    this.keyboardAimUp = false;
    this.keyboardAimDown = false;
    this.doubleTapGuard.reset();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.reset();
    this.destroyed = true;

    this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.storkPad?.removeEventListener('pointerdown', this.handleStorkPointerDown);
    this.ownerDocument.removeEventListener('pointerdown', this.handleGlobalPointerDown, true);
    this.ownerDocument.removeEventListener('pointermove', this.handlePointerMove);
    this.ownerDocument.removeEventListener('pointerup', this.handlePointerUp);
    this.ownerDocument.removeEventListener('pointercancel', this.handlePointerCancel);
    this.ownerDocument.removeEventListener('keydown', this.handleKeyDown);
    this.ownerDocument.removeEventListener('keyup', this.handleKeyUp);
    this.ownerDocument.defaultView?.removeEventListener('blur', this.handleBlur);
    this.doubleTapGuard.destroy();
  }

  private emit(action: InputAction): void {
    this.dispatch(action);
  }

  private storkIsAvailable(): boolean {
    return Boolean(
      this.storkEnabled
      && this.storkPad
      && !this.storkPad.disabled
      && !this.storkPad.hidden
      && this.storkPad.getAttribute('aria-disabled') !== 'true',
    );
  }

  private capturePointer(target: HTMLElement, event: PointerEvent, owner: ActivePointer['owner']): void {
    this.activePointer = {
      id: event.pointerId,
      owner,
      captureTarget: target,
      startX: event.clientX,
      startY: event.clientY,
    };
    try {
      target.setPointerCapture?.(event.pointerId);
    } catch {
      // A synthetic event or a pointer already released by the browser may fail capture.
    }
  }

  private releaseActivePointer(): ActivePointer | null {
    const pointer = this.activePointer;
    this.activePointer = null;
    if (!pointer) return null;
    try {
      if (pointer.captureTarget.hasPointerCapture?.(pointer.id)) {
        pointer.captureTarget.releasePointerCapture(pointer.id);
      }
    } catch {
      // Pointer capture can disappear before pointercancel/lost capture is observed.
    }
    return pointer;
  }

  private cancelAbility(): void {
    const pointerAbility = this.activePointer?.owner === 'stork';
    if (pointerAbility) this.releaseActivePointer();
    if (!pointerAbility && !this.keyboardAbilityActive) return;

    this.keyboardAbilityActive = false;
    this.keyboardAimUp = false;
    this.keyboardAimDown = false;
    this.emit({ type: 'ability-cancel' });
  }

  private emitKeyboardAim(): void {
    const y = Number(this.keyboardAimUp) - Number(this.keyboardAimDown);
    this.emit({ type: 'ability-aim', vector: Object.freeze({ x: 0, y }) });
  }

  private readonly handleGlobalPointerDown = (event: PointerEvent): void => {
    if (
      this.activePointer
      && event.pointerType === 'touch'
      && event.pointerId !== this.activePointer.id
    ) {
      if (this.activePointer.owner === 'stork') this.cancelAbility();
      else this.releaseActivePointer();
    }
  };

  private readonly handleCanvasPointerDown = (event: PointerEvent): void => {
    if (
      this.destroyed
      || this.activePointer
      || this.keyboardAbilityActive
      || !isPrimaryActivation(event)
      || (event.target !== this.canvas && isEditableTarget(event.target))
    ) return;

    this.capturePointer(this.canvas, event, 'canvas');
    this.emit({ type: 'flap' });
  };

  private readonly handleStorkPointerDown = (event: PointerEvent): void => {
    if (
      this.destroyed
      || this.activePointer
      || this.keyboardAbilityActive
      || !isPrimaryActivation(event)
      || !this.storkIsAvailable()
    ) return;

    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    this.capturePointer(this.storkPad as HTMLButtonElement, event, 'stork');
    this.emit({ type: 'ability-start' });
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const pointer = this.activePointer;
    if (!pointer || pointer.id !== event.pointerId || pointer.owner !== 'stork') return;

    const vector = normalizedAimVector(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY,
    );
    if (!vector) return;
    if (event.cancelable) event.preventDefault();
    this.emit({ type: 'ability-aim', vector });
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const pointer = this.activePointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    this.releaseActivePointer();
    if (pointer.owner === 'stork') {
      if (event.cancelable) event.preventDefault();
      this.emit({ type: 'ability-release' });
    }
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    const pointer = this.activePointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (pointer.owner === 'stork') this.cancelAbility();
    else this.releaseActivePointer();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.destroyed || isEditableTarget(event.target)) return;

    if (event.code === 'KeyE') {
      if (!this.storkIsAvailable()) return;
      event.preventDefault();
      if (event.repeat || this.keyboardAbilityActive || this.activePointer) return;
      this.keyboardAbilityActive = true;
      this.emit({ type: 'ability-start' });
      return;
    }

    if (this.keyboardAbilityActive && (event.code === 'ArrowUp' || event.code === 'ArrowDown')) {
      event.preventDefault();
      if (event.code === 'ArrowUp') this.keyboardAimUp = true;
      else this.keyboardAimDown = true;
      this.emitKeyboardAim();
      return;
    }

    if ((event.code === 'Space' || event.code === 'ArrowUp') && !event.repeat) {
      event.preventDefault();
      this.emit({ type: 'flap' });
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.destroyed) return;

    if (event.code === 'KeyE' && this.keyboardAbilityActive) {
      event.preventDefault();
      this.keyboardAbilityActive = false;
      this.keyboardAimUp = false;
      this.keyboardAimDown = false;
      this.emit({ type: 'ability-release' });
      return;
    }

    if (!this.keyboardAbilityActive) return;
    if (event.code === 'ArrowUp') {
      event.preventDefault();
      this.keyboardAimUp = false;
      this.emitKeyboardAim();
    } else if (event.code === 'ArrowDown') {
      event.preventDefault();
      this.keyboardAimDown = false;
      this.emitKeyboardAim();
    }
  };

  private readonly handleBlur = (): void => {
    this.reset();
  };
}
