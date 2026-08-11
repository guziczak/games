'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    rectsOverlap,
    isEntityOffscreen,
    resolveHorizontalCling,
    calculatePipeLayout,
    calculateDraggedPipeLayout,
    chanceForDelta,
    rateFromIntervalChance,
    chooseMutation,
    ModeStateMachine
} = require('../gameLogic.js');

test('rectsOverlap detects AABB overlap without treating a touching edge as collision', () => {
    const bird = { x: 10, y: 10, width: 20, height: 20 };
    assert.equal(rectsOverlap(bird, { left: 25, top: 15, right: 40, bottom: 25 }), true);
    assert.equal(rectsOverlap(bird, { x: 30, y: 10, width: 10, height: 10 }), false);
    assert.equal(
        rectsOverlap(bird, { x: 30, y: 10, width: 10, height: 10 }, { inclusive: true }),
        true
    );
});

test('isEntityOffscreen handles cleanup on a selected edge and across a viewport', () => {
    const viewport = { width: 800, height: 600 };
    assert.equal(
        isEntityOffscreen({ x: -31, y: 100, width: 30, height: 30 }, viewport, { direction: 'left' }),
        true
    );
    assert.equal(
        isEntityOffscreen({ x: -30, y: 100, width: 30, height: 30 }, viewport, { direction: 'left' }),
        false
    );
    assert.equal(isEntityOffscreen({ x: 801, y: 100, width: 30, height: 30 }, viewport), true);
    assert.equal(isEntityOffscreen({ x: 400, y: 300, width: 30, height: 30 }, viewport), false);
});

test('scrolling pipe cannot carry a side-clinging frog outside the playable frame', () => {
    const viewportWidth = 320;
    const playerWidth = 48;
    const safeInset = 4;
    const pipeLeftByFrame = [110, 80, 50, 25, 5, -15];

    const pipeWidth = 80;
    const positions = pipeLeftByFrame.map(pipeLeft => resolveHorizontalCling({
        // Frog clings to the pipe's left side with one pixel of separation.
        desiredLeft: pipeLeft - playerWidth - 1,
        obstacleRight: pipeLeft + pipeWidth,
        viewportWidth,
        playerWidth,
        safeInset
    }));

    for (const position of positions) {
        assert.ok(position.left >= safeInset, 'frog remains visible at the left edge');
        assert.ok(
            position.left + playerWidth <= viewportWidth - safeInset,
            'frog remains visible at the right edge'
        );
    }

    assert.equal(positions[1].escapedScroll, false);
    assert.equal(positions[1].releaseCling, false);
    assert.deepEqual(positions.at(-1), {
        left: pipeLeftByFrame.at(-1) + pipeWidth + 1,
        escapedScroll: true,
        releaseCling: true
    });
});

test('calculatePipeLayout leaves exactly pipeGap above the ground', () => {
    const layout = calculatePipeLayout({
        gameHeight: 700,
        groundHeight: 70,
        pipeGap: 220,
        minPipeHeight: 50,
        random: () => 0.5
    });

    assert.ok(layout);
    assert.equal(layout.pipeGap, 220);
    assert.equal(layout.gapBottom - layout.gapTop, 220);
    assert.equal(700 - layout.bottomHeight, layout.gapBottom);
    assert.equal(layout.bottomHeight, layout.bottomVisibleHeight + 70);
    assert.ok(layout.topHeight >= 50);
    assert.ok(layout.bottomVisibleHeight >= 50);
});

test('calculatePipeLayout returns null when two safe pipe ends and a gap do not fit', () => {
    assert.equal(calculatePipeLayout({
        gameHeight: 300,
        groundHeight: 60,
        pipeGap: 180,
        minPipeHeight: 50,
        random: () => 0
    }), null);
});

test('calculateDraggedPipeLayout preserves the gap and clamps both pipe ends', () => {
    const common = {
        gameHeight: 700,
        groundHeight: 70,
        pipeGap: 220,
        minPipeHeight: 50
    };
    const atTop = calculateDraggedPipeLayout(Object.assign({ desiredCenter: -500 }, common));
    const atBottom = calculateDraggedPipeLayout(Object.assign({ desiredCenter: 5000 }, common));

    assert.equal(atTop.center, 160);
    assert.equal(atTop.topHeight, 50);
    assert.equal(atTop.pipeGap, 220);
    assert.equal(atBottom.center, 470);
    assert.equal(atBottom.bottomVisibleHeight, 50);
    assert.equal(atBottom.pipeGap, 220);
    assert.equal(atBottom.gapBottom, 580);
    assert.equal(calculateDraggedPipeLayout({
        gameHeight: 300,
        groundHeight: 70,
        pipeGap: 220,
        minPipeHeight: 50,
        desiredCenter: 150
    }), null);
});

test('chanceForDelta is frame-rate independent and rate converts interval chance', () => {
    const rate = rateFromIntervalChance(0.8, 2000);
    assert.ok(Math.abs(chanceForDelta(rate, 2000) - 0.8) < 1e-12);

    const oneSecond = chanceForDelta(rate, 1000);
    const twoHalfSeconds = 1 - ((1 - chanceForDelta(rate, 500)) ** 2);
    assert.ok(Math.abs(oneSecond - twoHalfSeconds) < 1e-12);
    assert.equal(chanceForDelta(rate, 0), 0);
});

test('chooseMutation follows normalized play-style counters', () => {
    assert.equal(chooseMutation({ nearMiss: 0, groundImpact: 0, pipeImpact: 0, jump: 11 }), null);
    assert.equal(chooseMutation({ nearMiss: 4, groundImpact: 0, pipeImpact: 0, jump: 12 }), 'ghost');
    assert.equal(chooseMutation({ nearMiss: 0, groundImpact: 5, pipeImpact: 2, jump: 0 }), 'rubber');
    assert.equal(chooseMutation({ nearMiss: 0, groundImpact: 0, pipeImpact: 5, jump: 0 }), 'steel');
    assert.equal(chooseMutation({ nearMiss: 0, groundImpact: 0, pipeImpact: 0, jump: 20 }), 'frog');
});

test('ModeStateMachine enforces controlled primary transitions', () => {
    const machine = new ModeStateMachine();
    assert.equal(machine.primary, 'normal');
    assert.equal(machine.activate('steel'), false, 'steel is reached through frog');
    assert.equal(machine.activate('frog'), true);
    assert.equal(machine.primary, 'frog');
    assert.equal(machine.canActivate('stork'), true, 'stork is a controlled frog evolution');
    assert.equal(machine.canActivate('ghost'), false);
    assert.equal(machine.activate('steel'), true);
    assert.equal(machine.primary, 'steel');
    assert.equal(machine.activate('ghost'), false, 'steel must cleanly leave before ghost starts');
    assert.equal(machine.deactivate('steel'), true);
    assert.equal(machine.activate('ghost'), true);
    assert.equal(machine.primary, 'ghost');
    assert.equal(machine.activate('frog'), false);
    assert.equal(machine.deactivate('ghost'), true);
    assert.equal(machine.primary, 'normal');
});

test('ModeStateMachine treats rubber as a compatible modifier and resets idempotently', () => {
    const machine = new ModeStateMachine();
    const changes = [];
    machine.subscribe(event => changes.push(event.current));

    assert.equal(machine.activate('rubber'), true);
    assert.equal(machine.primary, 'normal');
    assert.equal(machine.modifier, 'rubber');
    assert.equal(machine.activate('frog'), true);
    assert.equal(machine.modifier, 'rubber');
    assert.equal(machine.activate('steel'), true);
    assert.equal(machine.modifier, null, 'incompatible modifier is removed on transition');
    assert.equal(machine.reset(), true);
    assert.equal(machine.reset(), false);
    assert.deepEqual(machine.snapshot(), { primary: 'normal', modifier: null, revision: 4 });
    assert.equal(changes.length, 4);
});

test('mutation strain waits through an incompatible mode and activates after returning to normal', async () => {
    const skyDodge = require('../gameState.js');
    skyDodge.resetState({ keepGeneration: true });
    skyDodge.modeMachine.activate('stork', { force: true, reason: 'test' });

    globalThis.activateSteelMode = options => {
        return skyDodge.modeMachine.activate('steel', Object.assign({}, options, { force: true }));
    };

    skyDodge.mutations.strain(50, 'pipeImpact', { source: 'first-grab' });
    skyDodge.mutations.strain(50, 'pipeImpact', { source: 'second-grab' });

    assert.equal(skyDodge.state.metrics.pipeImpact, 2);
    assert.equal(skyDodge.state.mutation.instability, 100);
    assert.equal(skyDodge.state.mutation.pending, 'steel');
    assert.equal(skyDodge.modeMachine.primary, 'stork');

    skyDodge.modeMachine.deactivate('stork', { reason: 'stork-expired' });
    await Promise.resolve();

    assert.equal(skyDodge.modeMachine.primary, 'steel');
    assert.equal(skyDodge.state.mutation.instability, 0);
    assert.equal(skyDodge.state.mutation.pending, null);

    delete globalThis.activateSteelMode;
    skyDodge.resetState({ keepGeneration: true });
});

test('failed emergency and reentrant listeners cannot leave an unpayable pending mutation', () => {
    const skyDodge = require('../gameState.js');
    skyDodge.resetState({ keepGeneration: true });
    skyDodge.modeMachine.activate('stork', { force: true, reason: 'test' });

    skyDodge.mutations.strain(75, null, { source: 'emergency-setup' });
    assert.equal(skyDodge.mutations.tryEmergency('pipe', { source: 'test' }), false);
    assert.equal(skyDodge.state.mutation.instability, 75);
    assert.equal(skyDodge.state.mutation.pending, null);

    skyDodge.mutations.reset();
    skyDodge.mutations.strain(50, 'pipeImpact', { source: 'first-grab' });
    const unsubscribe = skyDodge.mutations.onTrigger(() => {
        skyDodge.mutations.reset();
        skyDodge.mutations.trigger('ghost', { source: 'nested-listener' });
        return false;
    });
    skyDodge.mutations.strain(50, 'pipeImpact', { source: 'second-grab' });
    unsubscribe();

    assert.equal(skyDodge.state.mutation.instability, 0);
    assert.equal(skyDodge.state.mutation.pending, null);
    skyDodge.resetState({ keepGeneration: true });
});

test('mutation listeners are isolated and a gameplay reset clears mutation history', t => {
    const skyDodge = require('../gameState.js');
    skyDodge.resetState({ keepGeneration: true });

    globalThis.activateFrogMode = () => skyDodge.modeMachine.activate('frog', {
        reason: 'mutation-listener-test'
    });
    const originalConsoleError = console.error;
    console.error = () => {};
    const unsubscribe = skyDodge.mutations.onTrigger(() => {
        throw new Error('optional listener failed');
    });
    t.after(() => {
        unsubscribe();
        console.error = originalConsoleError;
        delete globalThis.activateFrogMode;
        skyDodge.resetState({ keepGeneration: true });
    });

    assert.equal(skyDodge.mutations.record('jump', 100), 'frog');
    assert.equal(skyDodge.state.mutation.pending, null);
    assert.deepEqual(skyDodge.state.mutation.history.map(event => event.choice), ['frog']);

    skyDodge.modeMachine.reset({ reason: 'between-games' });
    skyDodge.mutations.reset();
    assert.equal(skyDodge.state.mutation.history.length, 0);
});

test('a synchronous session reset cancels the mutation attempt that caused it', t => {
    const skyDodge = require('../gameState.js');
    skyDodge.resetState({ keepGeneration: true });
    const previousGeneration = skyDodge.state.session.generation;
    let activations = 0;

    globalThis.activateFrogMode = () => {
        activations += 1;
        return skyDodge.modeMachine.activate('frog', { reason: 'stale-attempt' });
    };
    const unsubscribe = skyDodge.mutations.onTrigger(() => {
        skyDodge.resetState();
        return false;
    });
    t.after(() => {
        unsubscribe();
        delete globalThis.activateFrogMode;
        skyDodge.resetState({ keepGeneration: true });
    });

    assert.equal(skyDodge.mutations.record('jump', 100, { generation: previousGeneration }), null);
    assert.equal(skyDodge.state.session.generation, previousGeneration + 1);
    assert.equal(activations, 0);
    assert.equal(skyDodge.modeMachine.primary, 'normal');
    assert.equal(skyDodge.state.mutation.lastChoice, null);
    assert.equal(skyDodge.state.mutation.history.length, 0);
});

test('a deferred retry from an old session cannot consume a new session pending mutation', async t => {
    const skyDodge = require('../gameState.js');
    skyDodge.resetState({ keepGeneration: true });
    skyDodge.modeMachine.activate('stork', { force: true, reason: 'old-session' });
    skyDodge.mutations.strain(50, 'pipeImpact');
    skyDodge.mutations.strain(50, 'pipeImpact');

    let activations = 0;
    globalThis.activateSteelMode = () => {
        activations += 1;
        if (activations === 1) return false;
        return skyDodge.modeMachine.activate('steel', { force: true, reason: 'stale-retry' });
    };
    t.after(() => {
        delete globalThis.activateSteelMode;
        skyDodge.resetState({ keepGeneration: true });
    });

    skyDodge.modeMachine.deactivate('stork', { reason: 'old-session-ended' });
    skyDodge.resetState();
    skyDodge.mutations.strain(50, 'pipeImpact');
    skyDodge.mutations.strain(50, 'pipeImpact');

    assert.equal(activations, 1, 'the new session made its own activation attempt');
    assert.equal(skyDodge.state.mutation.pending, 'steel');
    await Promise.resolve();

    assert.equal(activations, 1, 'the queued old-session retry was ignored');
    assert.equal(skyDodge.modeMachine.primary, 'normal');
    assert.equal(skyDodge.state.mutation.pending, 'steel');
    assert.equal(skyDodge.state.mutation.instability, 100);
});

test('a full strain meter without enough evidence remains recoverable', t => {
    const skyDodge = require('../gameState.js');
    skyDodge.resetState({ keepGeneration: true });
    globalThis.activateSteelMode = options => skyDodge.modeMachine.activate(
        'steel',
        Object.assign({}, options, { force: true })
    );
    t.after(() => {
        delete globalThis.activateSteelMode;
        skyDodge.resetState({ keepGeneration: true });
    });

    assert.equal(skyDodge.mutations.strain(100), null);
    assert.equal(skyDodge.state.mutation.instability, 100);
    assert.equal(skyDodge.state.mutation.pending, null);

    assert.equal(skyDodge.mutations.strain(1, 'pipeImpact'), null);
    assert.equal(skyDodge.state.mutation.pending, null);
    assert.equal(skyDodge.mutations.strain(1, 'pipeImpact'), 'steel');
    assert.equal(skyDodge.modeMachine.primary, 'steel');
    assert.equal(skyDodge.state.mutation.instability, 0);
    assert.equal(skyDodge.state.mutation.pending, null);
});
