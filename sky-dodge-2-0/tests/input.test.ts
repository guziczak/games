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
  readonly clientWidth = 390;
  readonly clientHeight = 844;
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
    router.setModeContext('stork');

    const down = pointerEvent(pad, { clientX: 40, clientY: 80 });
    emitPointerDown(document, pad, down);
    expect(actions).toEqual([{ type: 'ability-start' }]);
    expect(pad.capturedPointers.has(1)).toBe(true);

    document.emit('pointermove', pointerEvent(pad, { clientX: 60, clientY: 60 }));
    expect(actions).toHaveLength(2);
    const aim = actions[1];
    expect(aim?.type).toBe('ability-aim');
    if (aim?.type === 'ability-aim') {
      expect(Math.hypot(aim.vector.x, aim.vector.y)).toBeGreaterThan(0);
      expect(Math.hypot(aim.vector.x, aim.vector.y)).toBeLessThanOrEqual(1);
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
    router.setModeContext('stork');

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

  it('keeps normal, steel, stork and airborne frog on the immediate flap profile', () => {
    const { actions, canvas, document, router } = createRouter();
    const contexts = [
      ['normal', 'airborne'],
      ['steel', 'airborne'],
      ['stork', 'airborne'],
      ['frog', 'airborne'],
    ] as const;

    contexts.forEach(([mode, frogPhase], index) => {
      router.setModeContext(mode, frogPhase);
      const event = pointerEvent(canvas, { pointerId: 20 + index });
      emitPointerDown(document, canvas, event);
      document.emit('pointerup', pointerEvent(canvas, { pointerId: 20 + index }));
    });

    expect(actions).toEqual([
      { type: 'flap' },
      { type: 'flap' },
      { type: 'flap' },
      { type: 'flap' },
    ]);
    router.destroy();
  });

  it('charges and releases a clinging frog without cancelling on the charging phase update', () => {
    const { actions, canvas, document, router } = createRouter();
    router.setModeContext('frog', 'clinging');

    emitPointerDown(document, canvas, pointerEvent(canvas, { pointerId: 31 }));
    expect(actions).toEqual([{ type: 'ability-start' }]);
    router.setModeContext('frog', 'charging');
    expect(actions).toEqual([{ type: 'ability-start' }]);
    document.emit('pointerup', pointerEvent(canvas, { pointerId: 31 }));
    expect(actions.at(-1)).toEqual({ type: 'ability-release' });

    router.setModeContext('frog', 'clinging');
    emitPointerDown(document, canvas, pointerEvent(canvas, { pointerId: 32 }));
    document.emit('pointercancel', pointerEvent(canvas, { pointerId: 32 }));
    expect(actions.slice(-2)).toEqual([{ type: 'ability-start' }, { type: 'ability-cancel' }]);
    router.destroy();
  });

  it('routes a rubber drag as start, proportional aim and release', () => {
    const { actions, canvas, document, router } = createRouter();
    router.setModeContext('rubber');

    emitPointerDown(document, canvas, pointerEvent(canvas, {
      pointerId: 41,
      clientX: 120,
      clientY: 180,
    }));
    document.emit('pointermove', pointerEvent(canvas, {
      pointerId: 41,
      clientX: 60,
      clientY: 240,
    }));

    expect(actions[0]).toEqual({ type: 'ability-start' });
    const aim = actions[1];
    expect(aim?.type).toBe('ability-aim');
    if (aim?.type === 'ability-aim') {
      expect(aim.vector.x).toBeLessThan(0);
      expect(aim.vector.y).toBeLessThan(0);
      expect(Math.hypot(aim.vector.x, aim.vector.y)).toBeGreaterThan(0.5);
      expect(Math.hypot(aim.vector.x, aim.vector.y)).toBeLessThan(1);
    }

    document.emit('pointermove', pointerEvent(canvas, {
      pointerId: 41,
      clientX: 120,
      clientY: 180,
    }));
    expect(actions.at(-1)).toEqual({ type: 'ability-aim', vector: { x: 0, y: 0 } });
    document.emit('pointerup', pointerEvent(canvas, { pointerId: 41 }));
    expect(actions.at(-1)).toEqual({ type: 'ability-release' });
    router.destroy();
  });

  it('starts ghost phase together with its flap and releases or cancels cleanly', () => {
    const { actions, canvas, document, router } = createRouter();
    router.setModeContext('ghost');

    emitPointerDown(document, canvas, pointerEvent(canvas, { pointerId: 51 }));
    document.emit('pointerup', pointerEvent(canvas, { pointerId: 51 }));
    expect(actions).toEqual([
      { type: 'flap' },
      { type: 'ability-start' },
      { type: 'ability-release' },
    ]);

    emitPointerDown(document, canvas, pointerEvent(canvas, { pointerId: 52 }));
    document.emit('pointercancel', pointerEvent(canvas, { pointerId: 52 }));
    expect(actions.slice(-3)).toEqual([
      { type: 'flap' },
      { type: 'ability-start' },
      { type: 'ability-cancel' },
    ]);
    router.destroy();
  });

  it('cancels a held form ability exactly once when its mode context changes', () => {
    const { actions, canvas, document, router } = createRouter();
    router.setModeContext('rubber');
    emitPointerDown(document, canvas, pointerEvent(canvas, { pointerId: 61 }));

    router.setModeContext('steel');
    router.setModeContext('normal');
    document.emit('pointerup', pointerEvent(canvas, { pointerId: 61 }));

    expect(actions).toEqual([{ type: 'ability-start' }, { type: 'ability-cancel' }]);
    router.destroy();
  });
});

describe('InputRouter keyboard and lifecycle', () => {
  it('routes flap keys and uses arrows for aim while E is held', () => {
    const { actions, document, router } = createRouter();
    router.setModeContext('stork');

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

  it('uses held Space for frog, rubber and ghost abilities', () => {
    const { actions, document, router } = createRouter();

    router.setModeContext('frog', 'clinging');
    document.emit('keydown', keyboardEvent('Space'));
    router.setModeContext('frog', 'charging');
    document.emit('keyup', keyboardEvent('Space'));

    router.setModeContext('rubber');
    document.emit('keydown', keyboardEvent('Space'));
    document.emit('keydown', keyboardEvent('ArrowRight'));
    document.emit('keydown', keyboardEvent('ArrowUp'));
    document.emit('keyup', keyboardEvent('ArrowRight'));
    document.emit('keyup', keyboardEvent('ArrowUp'));
    document.emit('keyup', keyboardEvent('Space'));

    router.setModeContext('ghost');
    document.emit('keydown', keyboardEvent('Space'));
    document.emit('keyup', keyboardEvent('Space'));

    const diagonal = 1 / Math.hypot(1, 1);
    expect(actions).toEqual([
      { type: 'ability-start' },
      { type: 'ability-release' },
      { type: 'ability-start' },
      { type: 'ability-aim', vector: { x: 1, y: 0 } },
      { type: 'ability-aim', vector: { x: diagonal, y: diagonal } },
      { type: 'ability-aim', vector: { x: 0, y: 1 } },
      { type: 'ability-aim', vector: { x: 0, y: 0 } },
      { type: 'ability-release' },
      { type: 'flap' },
      { type: 'ability-start' },
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
