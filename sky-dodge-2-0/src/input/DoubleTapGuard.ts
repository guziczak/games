export interface DoubleTapGuardOptions {
  readonly maximumDelayMs?: number;
  readonly maximumDistance?: number;
  readonly now?: () => number;
}

interface TapPoint {
  readonly time: number;
  readonly x: number;
  readonly y: number;
}

const DEFAULT_MAXIMUM_DELAY_MS = 360;
const DEFAULT_MAXIMUM_DISTANCE = 56;

/**
 * Stops Safari's single-finger double-tap zoom without disabling pinch zoom.
 * The guard deliberately cancels only the second nearby `touchend`.
 */
export class DoubleTapGuard {
  private readonly maximumDelayMs: number;
  private readonly maximumDistance: number;
  private readonly now: () => number;
  private lastTap: TapPoint | null = null;
  private multiTouchGesture = false;
  private destroyed = false;

  constructor(
    private readonly element: HTMLElement,
    options: DoubleTapGuardOptions = {},
  ) {
    this.maximumDelayMs = options.maximumDelayMs ?? DEFAULT_MAXIMUM_DELAY_MS;
    this.maximumDistance = options.maximumDistance ?? DEFAULT_MAXIMUM_DISTANCE;
    this.now = options.now ?? (() => globalThis.performance?.now() ?? Date.now());

    element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', this.handleTouchCancel, { passive: true });
    element.addEventListener('dblclick', this.handleDoubleClick);
  }

  reset(): void {
    this.lastTap = null;
    this.multiTouchGesture = false;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reset();
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    this.element.removeEventListener('dblclick', this.handleDoubleClick);
  }

  private readonly handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length <= 1) return;
    this.multiTouchGesture = true;
    this.lastTap = null;
  };

  private readonly handleTouchEnd = (event: TouchEvent): void => {
    if (this.multiTouchGesture) {
      if (event.touches.length === 0) this.multiTouchGesture = false;
      this.lastTap = null;
      return;
    }

    if (event.touches.length !== 0 || event.changedTouches.length !== 1) {
      this.lastTap = null;
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      this.lastTap = null;
      return;
    }
    const tap: TapPoint = {
      time: this.now(),
      x: touch.clientX,
      y: touch.clientY,
    };
    const previous = this.lastTap;
    const elapsed = previous ? tap.time - previous.time : Number.POSITIVE_INFINITY;
    const distance = previous
      ? Math.hypot(tap.x - previous.x, tap.y - previous.y)
      : Number.POSITIVE_INFINITY;

    if (
      previous
      && elapsed >= 0
      && elapsed <= this.maximumDelayMs
      && distance <= this.maximumDistance
    ) {
      if (event.cancelable) event.preventDefault();
      this.lastTap = null;
      return;
    }

    this.lastTap = tap;
  };

  private readonly handleTouchCancel = (): void => {
    this.reset();
  };

  private readonly handleDoubleClick = (event: MouseEvent): void => {
    if (event.cancelable) event.preventDefault();
  };
}
