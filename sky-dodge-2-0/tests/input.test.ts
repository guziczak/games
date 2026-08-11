import { describe, expect, it } from 'vitest';
import { DoubleTapGuard } from '../src/input/DoubleTapGuard';
import { InputRouter } from '../src/input/InputRouter';
import type { InputAction } from '../src/simulation/InputActions';

type Listener = EventListenerOrEventListenerObject;

class FakeEventHub {
  private readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener | null): void {
    if (!listener) return;
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: Listener | null): void {
    if (!listener) return;
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (typeof listener === 'function') listener.call(this, event);
      else listener.handleEvent(event);
    }
  }
}

class FakeWindow extends FakeEventHub {}

class FakeDocument extends FakeEventHub {
  readonly defaultView = new FakeWindow();
}

class FakeElement extends FakeEventHub {
  readonly capturedPointers = new Set<number>();
  readonly attributes = new Map<string, string>();
  disabled = false;
  hidden = false;

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly interactive = false,
  ) {
    super();
  }

  closest(): FakeElement | null {
    return this.interactive ? this : null;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setPointerCapture(pointerId: number): void {
    this.capturedPointers.add(pointerId);
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.capturedPointers.has(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.capturedPointers.delete(pointerId);
  }
}

interface FakeEvent extends Event {
  defaultPrevented: boolean;
  propagationStopped: boolean;
}

function fakeEvent<T extends object>(properties: T): T & FakeEvent {
  const event = {
    cancelable: true,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault(): void {
      if (this.cancelable) this.defaultPrevented = true;
    },
    stopPropagation(): void {
      this.propagationStopped = true;
    },
    ...properties,
  };
  return event as T & FakeEvent;
}

function pointerEvent(
  target: FakeElement,
  overrides: Partial<PointerEvent> = {},
): PointerEvent & FakeEvent {
  return fakeEvent({
    target,
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    clientX: 100,
    clientY: 100,
    ...overrides,
  }) as unknown as PointerEvent & FakeEvent;
}

function keyboardEvent(code: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent & FakeEvent {
  return fakeEvent({
    target: null,
    code,
    repeat: false,
    ...overrides,
  }) as unknown as KeyboardEvent & FakeEvent;
}

function touch(x: number, y: number): Touch {
  return { clientX: x, clientY: y } as Touch;
}

function touchEvent(
  touches: readonly Touch[],
  changedTouches: readonly Touch[],
): TouchEvent & FakeEvent {
  return fakeEvent({ touches, changedTouches }) as unknown as TouchEvent & FakeEvent;
}

function emitPointerDown(
  document: FakeDocument,
  target: FakeElement,
  event: PointerEvent & FakeEvent,
): void {
  document.emit('pointerdown', event);
  if (!event.propagationStopped) target.emit('pointerdown', event);
}

function createRouter(): {
  actions: InputAction[];
  canvas: FakeElement;
  document: FakeDocument;
  pad: FakeElement;
  router: InputRouter;
} {
  const document = new FakeDocument();
  const canvas = new FakeElement(document);
  const pad = new FakeElement(document, true);
  const actions: InputAction[] = [];
  const router = new InputRouter(
    canvas as unknown as HTMLElement,
    pad as unknown as HTMLButtonElement,
    (action) => actions.push(action),
  );
  return { actions, canvas, document, pad, router };
}

describe('InputRouter pointer input', () => {
  it('flaps immediately on a primary canvas pointer and ignores interactive descendants', () => {
    const { actions, canvas, document, router } = createRouter();

    const down = pointerEvent(canvas);
    emitPointerDown(document, canvas, down);
    expect(actions).toEqual([{ type: 'flap' }]);
    expect(canvas.capturedPointers.has(1)).toBe(true);

    document.emit('pointerup', pointerEvent(canvas));
    const interactiveChild = new FakeElement(document, true);
    const ignored = pointerEvent(interactiveChild, { pointerId: 2 });
    document.emit('pointerdown', ignored);
    canvas.emit('pointerdown', ignored);
    expect(actions).toEqual([{ type: 'flap' }]);

    router.destroy();
  });

  it('gives the stork pad exclusive start, biased normalized aim and release', () => {
    const { actions, document, pad, router } = createRouter();

    const down = pointerEvent(pad, { clientX: 40, clientY: 80 });
    emitPointerDown(document, pad, down);
    expect(actions).toEqual([{ type: 'ability-start' }]);
    expect(pad.capturedPointers.has(1)).toBe(true);

    document.emit('pointermove', pointerEvent(pad, { clientX: 60, clientY: 60 }));
    expect(actions).toHaveLength(2);
    const aim = actions[1];
    expect(aim?.type).toBe('ability-aim');
    if (aim?.type === 'ability-aim') {
      expect(Math.hypot(aim.vector.x, aim.vector.y)).toBeCloseTo(1);
      expect(aim.vector.y).toBeGreaterThan(aim.vector.x);
    }

    document.emit('pointerup', pointerEvent(pad, { clientX: 60, clientY: 60 }));
    expect(actions.at(-1)).toEqual({ type: 'ability-release' });
    expect(actions).not.toContainEqual({ type: 'flap' });
    expect(pad.capturedPointers.size).toBe(0);

    router.destroy();
  });

  it('cancels an ability on pointercancel, multitouch, reset and disabling', () => {
    const { actions, document, pad, router } = createRouter();

    emitPointerDown(document, pad, pointerEvent(pad));
    document.emit('pointercancel', pointerEvent(pad));
    expect(actions.slice(-2)).toEqual([{ type: 'ability-start' }, { type: 'ability-cancel' }]);

    emitPointerDown(document, pad, pointerEvent(pad, { pointerId: 3 }));
    document.emit('pointerdown', pointerEvent(pad, {
      pointerId: 4,
      isPrimary: false,
    }));
    expect(actions.at(-1)).toEqual({ type: 'ability-cancel' });

    emitPointerDown(document, pad, pointerEvent(pad, { pointerId: 5 }));
    router.reset();
    router.reset();
    expect(actions.filter((action) => action.type === 'ability-cancel')).toHaveLength(3);

    emitPointerDown(document, pad, pointerEvent(pad, { pointerId: 6 }));
    pad.emit('lostpointercapture', pointerEvent(pad, { pointerId: 6 }));
    expect(actions.at(-1)).toEqual({ type: 'ability-cancel' });

    emitPointerDown(document, pad, pointerEvent(pad, { pointerId: 7 }));
    router.setStorkEnabled(false);
    expect(actions.at(-1)).toEqual({ type: 'ability-cancel' });
    const lengthAfterDisable = actions.length;
    emitPointerDown(document, pad, pointerEvent(pad, { pointerId: 8 }));
    expect(actions).toHaveLength(lengthAfterDisable);

    router.destroy();
  });
});

describe('InputRouter keyboard and lifecycle', () => {
  it('routes flap keys and uses arrows for aim while E is held', () => {
    const { actions, document, router } = createRouter();

    document.emit('keydown', keyboardEvent('Space'));
    document.emit('keydown', keyboardEvent('ArrowUp'));
    document.emit('keydown', keyboardEvent('Space', { repeat: true }));
    document.emit('keydown', keyboardEvent('KeyE'));
    document.emit('keydown', keyboardEvent('ArrowUp'));
    document.emit('keydown', keyboardEvent('ArrowDown'));
    document.emit('keyup', keyboardEvent('ArrowUp'));
    document.emit('keyup', keyboardEvent('KeyE'));

    expect(actions).toEqual([
      { type: 'flap' },
      { type: 'flap' },
      { type: 'ability-start' },
      { type: 'ability-aim', vector: { x: 0, y: 1 } },
      { type: 'ability-aim', vector: { x: 0, y: 0 } },
      { type: 'ability-aim', vector: { x: 0, y: -1 } },
      { type: 'ability-release' },
    ]);

    router.destroy();
  });

  it('supports mutation selection and removes every listener idempotently', () => {
    const { actions, canvas, document, router } = createRouter();
    router.selectMutation('upper');
    router.selectMutation('lower');
    router.destroy();
    router.destroy();

    emitPointerDown(document, canvas, pointerEvent(canvas, { pointerId: 8 }));
    document.emit('keydown', keyboardEvent('Space'));
    router.selectMutation('upper');

    expect(actions).toEqual([
      { type: 'select-mutation', lane: 'upper' },
      { type: 'select-mutation', lane: 'lower' },
    ]);
  });
});

describe('DoubleTapGuard', () => {
  it('prevents only the second nearby single-finger touchend', () => {
    const document = new FakeDocument();
    const element = new FakeElement(document);
    let now = 1_000;
    const guard = new DoubleTapGuard(element as unknown as HTMLElement, { now: () => now });

    const first = touchEvent([], [touch(40, 60)]);
    element.emit('touchend', first);
    expect(first.defaultPrevented).toBe(false);

    now += 200;
    const second = touchEvent([], [touch(45, 64)]);
    element.emit('touchend', second);
    expect(second.defaultPrevented).toBe(true);

    now += 100;
    const fresh = touchEvent([], [touch(45, 64)]);
    element.emit('touchend', fresh);
    expect(fresh.defaultPrevented).toBe(false);

    now += 100;
    const far = touchEvent([], [touch(180, 180)]);
    element.emit('touchend', far);
    expect(far.defaultPrevented).toBe(false);

    guard.destroy();
  });

  it('leaves every end of a multitouch pinch unprevented and blocks dblclick', () => {
    const document = new FakeDocument();
    const element = new FakeElement(document);
    const guard = new DoubleTapGuard(element as unknown as HTMLElement);

    element.emit('touchstart', touchEvent([touch(10, 10), touch(80, 80)], []));
    const firstFinger = touchEvent([touch(80, 80)], [touch(10, 10)]);
    const lastFinger = touchEvent([], [touch(80, 80)]);
    element.emit('touchend', firstFinger);
    element.emit('touchend', lastFinger);
    expect(firstFinger.defaultPrevented).toBe(false);
    expect(lastFinger.defaultPrevented).toBe(false);

    const doubleClick = fakeEvent({ target: element }) as unknown as MouseEvent & FakeEvent;
    element.emit('dblclick', doubleClick);
    expect(doubleClick.defaultPrevented).toBe(true);

    guard.destroy();
    const afterDestroy = fakeEvent({ target: element }) as unknown as MouseEvent & FakeEvent;
    element.emit('dblclick', afterDestroy);
    expect(afterDestroy.defaultPrevented).toBe(false);
  });
});
