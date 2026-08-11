import type { InputAction, MutationLane } from '../simulation/InputActions';
import type { FrogModeState, ModeId, Vec2 } from '../simulation/GameState';
import { DoubleTapGuard } from './DoubleTapGuard';

export type InputDispatcher = (action: InputAction) => void;

type AbilityOwner = 'frog' | 'rubber' | 'stork';
type PointerOwner = 'flap' | AbilityOwner;

interface ActivePointer {
  readonly id: number;
  readonly owner: PointerOwner;
  readonly captureTarget: HTMLElement;
  readonly startX: number;
  readonly startY: number;
  readonly aimRadius: number;
  readonly verticalBias: number;
}

interface KeyboardAbility {
  readonly owner: AbilityOwner;
  readonly key: 'Space' | 'KeyE';
}

interface TouchFlapEdge {
  readonly time: number;
  readonly x: number;
  readonly y: number;
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
const STORK_VERTICAL_BIAS = 1.35;
const TOUCH_POINTER_DEDUP_MS = 700;
const TOUCH_POINTER_DEDUP_PX = 64;

function inputEventTime(event: Event): number {
  return Number.isFinite(event.timeStamp)
    ? event.timeStamp
    : (globalThis.performance?.now() ?? Date.now());
}

function isPrimaryActivation(event: PointerEvent): boolean {
  return event.isPrimary && (event.pointerType !== 'mouse' || event.button === 0);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  return Boolean((target as Element).closest(INTERACTIVE_SELECTOR));
}

function isAbilityOwner(owner: PointerOwner): owner is AbilityOwner {
  return owner !== 'flap';
}

function canvasOwnerFor(mode: ModeId, frogPhase: FrogModeState['phase']): PointerOwner {
  if (mode === 'frog' && frogPhase !== 'airborne') return 'frog';
  if (mode === 'rubber') return mode;
  return 'flap';
}

function aimRadiusFor(element: HTMLElement, owner: AbilityOwner): number {
  const shortestSide = Math.min(element.clientWidth, element.clientHeight);
  if (!(shortestSide > 0)) return owner === 'stork' ? 48 : 120;
  if (owner === 'stork') return Math.max(36, shortestSide * 0.45);
  return Math.min(160, Math.max(72, shortestSide * 0.28));
}

function normalizedAimVector(
  deltaX: number,
  deltaY: number,
  radius: number,
  verticalBias: number,
): Vec2 {
  const biasedY = -deltaY * verticalBias;
  const pixelLength = Math.hypot(deltaX, biasedY);
  if (pixelLength < POINTER_AIM_DEAD_ZONE) return Object.freeze({ x: 0, y: 0 });

  const safeRadius = Math.max(1, radius);
  const x = deltaX / safeRadius;
  const y = biasedY / safeRadius;
  const normalizedLength = Math.hypot(x, y);
  const scale = normalizedLength > 1 ? 1 / normalizedLength : 1;
  return Object.freeze({ x: x * scale, y: y * scale });
}

/** Routes browser input into deterministic, device-independent simulation actions. */
export class InputRouter {
  private activePointer: ActivePointer | null = null;
  private keyboardAbility: KeyboardAbility | null = null;
  private keyboardAimUp = false;
  private keyboardAimDown = false;
  private keyboardAimLeft = false;
  private keyboardAimRight = false;
  private touchFlapEdge: TouchFlapEdge | null = null;
  private mode: ModeId = 'normal';
  private frogPhase: FrogModeState['phase'] = 'airborne';
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
    // Guard the complete game surface (including overlay controls) when the
    // canvas has a wrapper. The guard still leaves every multi-touch gesture
    // alone, so accessibility pinch zoom remains available.
    this.doubleTapGuard = new DoubleTapGuard(canvas.parentElement ?? canvas);

    canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    canvas.addEventListener('lostpointercapture', this.handleLostPointerCapture);
    canvas.addEventListener('touchstart', this.handleCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchend', this.handleCanvasTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', this.handleCanvasTouchCancel, { passive: true });
    storkPad?.addEventListener('pointerdown', this.handleStorkPointerDown);
    storkPad?.addEventListener('lostpointercapture', this.handleLostPointerCapture);
    storkPad?.addEventListener('click', this.handleStorkAccessibleClick);
    this.ownerDocument.addEventListener('pointerdown', this.handleGlobalPointerDown, true);
    this.ownerDocument.addEventListener('pointermove', this.handlePointerMove);
    this.ownerDocument.addEventListener('pointerup', this.handlePointerUp);
    this.ownerDocument.addEventListener('pointercancel', this.handlePointerCancel);
    this.ownerDocument.addEventListener('keydown', this.handleKeyDown);
    this.ownerDocument.addEventListener('keyup', this.handleKeyUp);
    this.ownerDocument.defaultView?.addEventListener('blur', this.handleBlur);
  }

  setModeContext(mode: ModeId, frogPhase: FrogModeState['phase'] = 'airborne'): void {
    if (this.destroyed) return;
    this.mode = mode;
    this.frogPhase = mode === 'frog' ? frogPhase : 'airborne';

    const expectedCanvasOwner = this.canvasOwner();
    const pointerOwner = this.activePointer?.owner;
    const pointerStillValid = pointerOwner === undefined
      || pointerOwner === 'flap'
      || (pointerOwner === 'stork' ? mode === 'stork' : pointerOwner === expectedCanvasOwner);
    const keyboardOwner = this.keyboardAbility?.owner;
    const keyboardStillValid = keyboardOwner === undefined
      || (keyboardOwner === 'stork' ? mode === 'stork' : keyboardOwner === expectedCanvasOwner);

    if (!pointerStillValid || !keyboardStillValid) this.cancelAbility();
  }

  setStorkEnabled(enabled: boolean): void {
    if (this.destroyed || this.storkEnabled === enabled) return;
    this.storkEnabled = enabled;
    if (!enabled && (
      this.activePointer?.owner === 'stork'
      || this.keyboardAbility?.owner === 'stork'
    )) this.cancelAbility();
  }

  selectMutation(lane: MutationLane): void {
    if (this.destroyed) return;
    this.emit({ type: 'select-mutation', lane });
  }

  reset(): void {
    if (this.destroyed) return;
    this.cancelAbility();
    this.releaseActivePointer();
    this.resetKeyboardAim();
    this.touchFlapEdge = null;
    this.doubleTapGuard.reset();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.reset();
    this.destroyed = true;

    this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.canvas.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.canvas.removeEventListener('touchstart', this.handleCanvasTouchStart);
    this.canvas.removeEventListener('touchend', this.handleCanvasTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.handleCanvasTouchCancel);
    this.storkPad?.removeEventListener('pointerdown', this.handleStorkPointerDown);
    this.storkPad?.removeEventListener('lostpointercapture', this.handleLostPointerCapture);
    this.storkPad?.removeEventListener('click', this.handleStorkAccessibleClick);
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

  private canvasOwner(): PointerOwner {
    return canvasOwnerFor(this.mode, this.frogPhase);
  }

  private storkIsAvailable(): boolean {
    return Boolean(
      this.mode === 'stork'
      && this.storkEnabled
      && this.storkPad
      && !this.storkPad.disabled
      && !this.storkPad.hidden
      && this.storkPad.getAttribute('aria-disabled') !== 'true',
    );
  }

  private capturePointer(
    target: HTMLElement,
    event: PointerEvent,
    owner: PointerOwner,
  ): void {
    this.activePointer = {
      id: event.pointerId,
      owner,
      captureTarget: target,
      startX: event.clientX,
      startY: event.clientY,
      aimRadius: isAbilityOwner(owner) ? aimRadiusFor(target, owner) : 1,
      verticalBias: owner === 'stork' ? STORK_VERTICAL_BIAS : 1,
    };
    try {
      target.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic events and pointers already released by the browser can fail capture.
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
      // Capture can disappear before pointercancel/lost capture is observed.
    }
    return pointer;
  }

  private resetKeyboardAim(): void {
    this.keyboardAimUp = false;
    this.keyboardAimDown = false;
    this.keyboardAimLeft = false;
    this.keyboardAimRight = false;
  }

  private cancelAbility(): void {
    const pointerAbility = this.activePointer && isAbilityOwner(this.activePointer.owner);
    if (pointerAbility) this.releaseActivePointer();
    if (!pointerAbility && !this.keyboardAbility) return;

    this.keyboardAbility = null;
    this.resetKeyboardAim();
    this.emit({ type: 'ability-cancel' });
  }

  private emitKeyboardAim(): void {
    const rawX = Number(this.keyboardAimRight) - Number(this.keyboardAimLeft);
    const rawY = Number(this.keyboardAimUp) - Number(this.keyboardAimDown);
    const length = Math.hypot(rawX, rawY);
    const vector = length > 1
      ? Object.freeze({ x: rawX / length, y: rawY / length })
      : Object.freeze({ x: rawX, y: rawY });
    this.emit({ type: 'ability-aim', vector });
  }

  private beginKeyboardAbility(owner: AbilityOwner, key: KeyboardAbility['key']): void {
    this.keyboardAbility = { owner, key };
    this.resetKeyboardAim();
    this.emit({ type: 'ability-start' });
  }

  private consumesTouchFlapEdge(event: PointerEvent): boolean {
    const edge = this.touchFlapEdge;
    if (!edge || event.pointerType !== 'touch') return false;
    const elapsed = inputEventTime(event) - edge.time;
    const distance = Math.hypot(event.clientX - edge.x, event.clientY - edge.y);
    const duplicate = elapsed >= 0
      && elapsed <= TOUCH_POINTER_DEDUP_MS
      && distance <= TOUCH_POINTER_DEDUP_PX;
    if (duplicate || elapsed > TOUCH_POINTER_DEDUP_MS) this.touchFlapEdge = null;
    return duplicate;
  }

  private readonly handleGlobalPointerDown = (event: PointerEvent): void => {
    if (
      this.activePointer
      && event.pointerType === 'touch'
      && event.pointerId !== this.activePointer.id
    ) {
      if (isAbilityOwner(this.activePointer.owner)) this.cancelAbility();
      else this.releaseActivePointer();
    }
  };

  private readonly handleCanvasPointerDown = (event: PointerEvent): void => {
    if (
      this.destroyed
      || this.activePointer
      || this.keyboardAbility
      || !isPrimaryActivation(event)
      || (event.target !== this.canvas && isEditableTarget(event.target))
    ) return;

    const owner = this.canvasOwner();
    const touchFallbackAlreadyFlapped = owner === 'flap'
      && this.consumesTouchFlapEdge(event);
    if (isAbilityOwner(owner) && event.cancelable) event.preventDefault();
    this.capturePointer(this.canvas, event, owner);

    if (owner === 'flap') {
      if (!touchFallbackAlreadyFlapped) this.emit({ type: 'flap' });
    } else this.emit({ type: 'ability-start' });
  };

  private readonly handleCanvasTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1) {
      this.touchFlapEdge = null;
      return;
    }
    if (
      this.destroyed
      || this.activePointer
      || this.keyboardAbility
      || this.canvasOwner() !== 'flap'
    ) return;

    const touch = event.touches[0];
    if (!touch) return;
    this.touchFlapEdge = {
      time: inputEventTime(event),
      x: touch.clientX,
      y: touch.clientY,
    };
    if (event.cancelable) event.preventDefault();
    this.emit({ type: 'flap' });
  };

  private readonly handleCanvasTouchEnd = (event: TouchEvent): void => {
    // iOS occasionally omits the document-level pointerup after a captured
    // canvas touch.  End the flap ownership here as well; the later pointerup
    // becomes a harmless no-op and the next physical tap is never blocked.
    if (event.touches.length === 0 && this.activePointer?.owner === 'flap') {
      this.releaseActivePointer();
    }
  };

  private readonly handleCanvasTouchCancel = (): void => {
    this.touchFlapEdge = null;
    if (this.activePointer?.owner === 'flap') this.releaseActivePointer();
  };

  private readonly handleStorkPointerDown = (event: PointerEvent): void => {
    if (
      this.destroyed
      || this.activePointer
      || this.keyboardAbility
      || !isPrimaryActivation(event)
      || !this.storkIsAvailable()
    ) return;

    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    this.capturePointer(this.storkPad as HTMLButtonElement, event, 'stork');
    this.emit({ type: 'ability-start' });
  };

  private readonly handleStorkAccessibleClick = (event: MouseEvent): void => {
    // Pointer input is handled on pointerdown/up. A zero-detail click is the
    // activation generated by a keyboard or assistive technology, for which a
    // quick lock-and-release is the usable button equivalent.
    if (
      this.destroyed
      || event.detail !== 0
      || this.activePointer
      || this.keyboardAbility
      || !this.storkIsAvailable()
    ) return;
    event.preventDefault();
    this.emit({ type: 'ability-start' });
    this.emit({ type: 'ability-release' });
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const pointer = this.activePointer;
    if (
      !pointer
      || pointer.id !== event.pointerId
      || (pointer.owner !== 'rubber' && pointer.owner !== 'stork')
    ) return;

    const vector = normalizedAimVector(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY,
      pointer.aimRadius,
      pointer.verticalBias,
    );
    if (event.cancelable) event.preventDefault();
    this.emit({ type: 'ability-aim', vector });
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const pointer = this.activePointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    this.releaseActivePointer();
    if (isAbilityOwner(pointer.owner)) {
      if (event.cancelable) event.preventDefault();
      this.emit({ type: 'ability-release' });
    }
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    const pointer = this.activePointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (isAbilityOwner(pointer.owner)) this.cancelAbility();
    else this.releaseActivePointer();
  };

  private readonly handleLostPointerCapture = (event: PointerEvent): void => {
    const pointer = this.activePointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (isAbilityOwner(pointer.owner)) this.cancelAbility();
    else this.releaseActivePointer();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.destroyed || isEditableTarget(event.target)) return;

    if (event.code === 'KeyE') {
      if (!this.storkIsAvailable()) return;
      event.preventDefault();
      if (event.repeat || this.keyboardAbility || this.activePointer) return;
      this.beginKeyboardAbility('stork', 'KeyE');
      return;
    }

    if (this.keyboardAbility && event.code.startsWith('Arrow')) {
      event.preventDefault();
      if (this.keyboardAbility.owner !== 'rubber' && this.keyboardAbility.owner !== 'stork') return;
      if (event.code === 'ArrowUp') this.keyboardAimUp = true;
      else if (event.code === 'ArrowDown') this.keyboardAimDown = true;
      else if (event.code === 'ArrowLeft') this.keyboardAimLeft = true;
      else if (event.code === 'ArrowRight') this.keyboardAimRight = true;
      this.emitKeyboardAim();
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      if (event.repeat || this.activePointer) return;
      if (this.keyboardAbility) {
        if (this.keyboardAbility.owner === 'stork') this.emit({ type: 'flap' });
        return;
      }

      const owner = this.canvasOwner();
      if (owner === 'flap') {
        this.emit({ type: 'flap' });
      } else this.beginKeyboardAbility(owner, 'Space');
      return;
    }

    if (event.code === 'ArrowUp' && !event.repeat) {
      event.preventDefault();
      this.emit({ type: 'flap' });
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.destroyed || !this.keyboardAbility) return;

    if (event.code === this.keyboardAbility.key) {
      event.preventDefault();
      this.keyboardAbility = null;
      this.resetKeyboardAim();
      this.emit({ type: 'ability-release' });
      return;
    }

    if (this.keyboardAbility.owner !== 'rubber' && this.keyboardAbility.owner !== 'stork') return;
    if (!event.code.startsWith('Arrow')) return;
    event.preventDefault();
    if (event.code === 'ArrowUp') this.keyboardAimUp = false;
    else if (event.code === 'ArrowDown') this.keyboardAimDown = false;
    else if (event.code === 'ArrowLeft') this.keyboardAimLeft = false;
    else if (event.code === 'ArrowRight') this.keyboardAimRight = false;
    this.emitKeyboardAim();
  };

  private readonly handleBlur = (): void => {
    this.reset();
  };
}
