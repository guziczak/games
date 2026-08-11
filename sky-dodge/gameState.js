(function (root, factory) {
    'use strict';

    let logic = root && root.SkyDodgeLogic;
    if (!logic && typeof module === 'object' && module.exports) {
        logic = require('./gameLogic.js');
    }

    const api = factory(root, logic);
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root, logic) {
    'use strict';

    if (!logic || typeof logic.ModeStateMachine !== 'function') {
        throw new Error('gameState.js requires gameLogic.js to be loaded first');
    }

    const existingNamespace = root.SkyDodge && typeof root.SkyDodge === 'object'
        ? root.SkyDodge
        : {};
    const modeMachine = existingNamespace.modeMachine instanceof logic.ModeStateMachine
        ? existingNamespace.modeMachine
        : new logic.ModeStateMachine();

    function createInitialState() {
        return {
            session: {
                generation: 0,
                rafId: null
            },
            runtime: {
                running: false,
                lastTime: 0,
                deltaTime: 0
            },
            entities: {
                pipes: [],
                coins: [],
                storks: []
            },
            scores: {
                distance: 0,
                coins: {
                    normalScore: 0,
                    purpleScore: 0,
                    frogScore: 0,
                    normalCount: 0,
                    purpleCount: 0,
                    frogCount: 0,
                    normalValue: 10,
                    purpleValue: 50,
                    frogValue: 100
                }
            },
            physics: {
                gravity: 0.25,
                normalGravity: 0.25,
                frogGravity: 0.20,
                velocity: 0,
                velocityLimit: 7,
                jump: -7,
                normalJump: -7,
                frogJump: -11,
                birdPosition: undefined,
                birdHorizontalPosition: 15,
                invincible: false
            },
            world: {
                pipe: {
                    width: 80,
                    gap: 220,
                    speed: 2,
                    currentSpeed: 2,
                    interval: 2500,
                    lastTime: 0
                },
                coin: {
                    interval: 1500,
                    lastTime: 0,
                    purpleChance: 0.15,
                    safePadding: 40
                },
                stork: {
                    interval: 2000,
                    lastTime: 0,
                    chance: 0.80,
                    coinWindInterval: 600,
                    lastCoinWindTime: 0,
                    coinChance: 0.50
                }
            },
            modes: {
                primary: modeMachine.primary,
                modifier: modeMachine.modifier,
                frog: {
                    time: 0,
                    duration: 8,
                    cooldown: 0,
                    cooldownTime: 5,
                    normalCost: 3,
                    purpleCost: 1,
                    jump: -11,
                    gravity: 0.20,
                    speedMultiplier: 2,
                    charging: false,
                    chargeStart: 0,
                    chargeMax: 1500,
                    jumpMinPower: -8,
                    jumpMaxPower: -15,
                    isOnGround: false,
                    chargeIndicator: null,
                    overloadThreshold: 2000,
                    overloaded: false,
                    overloadBounceCount: 0,
                    maxBounces: 5,
                    rubberChance: 0.30
                },
                rubber: {
                    time: 0,
                    duration: 20,
                    dragActive: false,
                    dragStartX: null,
                    dragStartY: null,
                    velocityModifier: 0,
                    horizontalModifier: 0,
                    moveX: 0,
                    maxVelocity: 40,
                    damping: 0.99,
                    bounciness: 1.3,
                    stretchFactor: 1.5,
                    lastBounceTime: 0,
                    elasticityEffect: true,
                    previousGravity: null,
                    previousJump: null,
                    lastPhaseEffect: 0
                },
                steel: {
                    duration: 3
                },
                ghost: {
                    time: 0,
                    duration: 5,
                    cooldown: 0,
                    cooldownTime: 7,
                    normalCost: 2,
                    purpleCost: 0
                },
                stork: {
                    time: 0,
                    duration: 6,
                    cooldown: 0,
                    cooldownTime: 10,
                    normalCost: 1,
                    purpleCost: 1,
                    frogCost: 1,
                    grabActive: false,
                    grabbedPipe: null,
                    grabEnergy: 100,
                    grabMaxEnergy: 100,
                    grabCooldown: 0,
                    grabCooldownTime: 1.25,
                    grabRange: 260,
                    grabDrainRate: 34,
                    grabRechargeRate: 22,
                    grabTargetY: null
                }
            },
            metrics: {
                nearMiss: 0,
                groundImpact: 0,
                pipeImpact: 0,
                jump: 0
            },
            mutation: {
                instability: 0,
                threshold: 100,
                pending: null,
                lastChoice: null,
                lastMetadata: null,
                history: []
            },
            timers: {
                frogComplaint: null,
                modeTransition: null,
                mutationAnnouncement: null,
                handles: new Map()
            },
            ui: {
                bird: null,
                gameArea: null,
                startScreen: null,
                gameOverScreen: null,
                startButton: null,
                restartButton: null,
                scoreElement: null,
                bonusScoreElement: null,
                purpleCoinScoreElement: null,
                finalScoreElement: null,
                finalCoinsElement: null,
                finalPurpleCoinsElement: null,
                finalFrogCoinsElement: null,
                finalTotalScoreElement: null,
                ground: null,
                frogModeButton: null,
                frogModeTimer: null,
                ghostModeButton: null,
                ghostModeTimer: null,
                storkModeButton: null,
                storkModeTimer: null
            }
        };
    }

    let state = createInitialState();

    modeMachine.subscribe(event => {
        state.modes.primary = event.current.primary;
        state.modes.modifier = event.current.modifier;
    });

    function valueAtPath(path) {
        let cursor = state;
        for (const part of path) cursor = cursor[part];
        return cursor;
    }

    function setValueAtPath(path, value) {
        let cursor = state;
        for (let index = 0; index < path.length - 1; index += 1) {
            cursor = cursor[path[index]];
        }
        cursor[path[path.length - 1]] = value;
    }

    const aliases = {
        gameRunning: ['runtime', 'running'],
        pipes: ['entities', 'pipes'],
        coins: ['entities', 'coins'],
        storks: ['entities', 'storks'],
        score: ['scores', 'distance'],
        coinScore: ['scores', 'coins', 'normalScore'],
        purpleCoinScore: ['scores', 'coins', 'purpleScore'],
        frogCoinScore: ['scores', 'coins', 'frogScore'],
        normalCoinCount: ['scores', 'coins', 'normalCount'],
        purpleCoinCount: ['scores', 'coins', 'purpleCount'],
        frogCoinCount: ['scores', 'coins', 'frogCount'],
        coinValue: ['scores', 'coins', 'normalValue'],
        purpleCoinValue: ['scores', 'coins', 'purpleValue'],
        frogCoinValue: ['scores', 'coins', 'frogValue'],
        gravity: ['physics', 'gravity'],
        normalGravity: ['physics', 'normalGravity'],
        frogGravity: ['physics', 'frogGravity'],
        velocity: ['physics', 'velocity'],
        velocityLimit: ['physics', 'velocityLimit'],
        jump: ['physics', 'jump'],
        normalJump: ['physics', 'normalJump'],
        frogJump: ['physics', 'frogJump'],
        birdPosition: ['physics', 'birdPosition'],
        birdHorizontalPosition: ['physics', 'birdHorizontalPosition'],
        invincible: ['physics', 'invincible'],
        pipeWidth: ['world', 'pipe', 'width'],
        pipeGap: ['world', 'pipe', 'gap'],
        pipeSpeed: ['world', 'pipe', 'speed'],
        currentPipeSpeed: ['world', 'pipe', 'currentSpeed'],
        pipeInterval: ['world', 'pipe', 'interval'],
        lastPipeTime: ['world', 'pipe', 'lastTime'],
        coinInterval: ['world', 'coin', 'interval'],
        lastCoinTime: ['world', 'coin', 'lastTime'],
        purpleCoinChance: ['world', 'coin', 'purpleChance'],
        safePadding: ['world', 'coin', 'safePadding'],
        lastStorkTime: ['world', 'stork', 'lastTime'],
        storkInterval: ['world', 'stork', 'interval'],
        storkChance: ['world', 'stork', 'chance'],
        storkCoinWindInterval: ['world', 'stork', 'coinWindInterval'],
        lastStorkCoinWindTime: ['world', 'stork', 'lastCoinWindTime'],
        storkCoinChance: ['world', 'stork', 'coinChance'],
        animationId: ['session', 'rafId'],
        rafId: ['session', 'rafId'],
        gameSessionGeneration: ['session', 'generation'],
        lastTime: ['runtime', 'lastTime'],
        deltaTime: ['runtime', 'deltaTime'],
        frogModeTime: ['modes', 'frog', 'time'],
        frogModeDuration: ['modes', 'frog', 'duration'],
        frogModeCooldown: ['modes', 'frog', 'cooldown'],
        frogModeCooldownTime: ['modes', 'frog', 'cooldownTime'],
        normalFrogModeCost: ['modes', 'frog', 'normalCost'],
        purpleFrogModeCost: ['modes', 'frog', 'purpleCost'],
        frogSpeedMultiplier: ['modes', 'frog', 'speedMultiplier'],
        frogIsCharging: ['modes', 'frog', 'charging'],
        frogChargeStart: ['modes', 'frog', 'chargeStart'],
        frogChargeMax: ['modes', 'frog', 'chargeMax'],
        frogJumpMinPower: ['modes', 'frog', 'jumpMinPower'],
        frogJumpMaxPower: ['modes', 'frog', 'jumpMaxPower'],
        frogIsOnGround: ['modes', 'frog', 'isOnGround'],
        frogChargeIndicator: ['modes', 'frog', 'chargeIndicator'],
        frogOverloadThreshold: ['modes', 'frog', 'overloadThreshold'],
        frogIsOverloaded: ['modes', 'frog', 'overloaded'],
        frogOverloadBounceCount: ['modes', 'frog', 'overloadBounceCount'],
        frogMaxBounces: ['modes', 'frog', 'maxBounces'],
        frogRubberModeChance: ['modes', 'frog', 'rubberChance'],
        rubberModeDuration: ['modes', 'rubber', 'duration'],
        rubberModeTime: ['modes', 'rubber', 'time'],
        rubberDragActive: ['modes', 'rubber', 'dragActive'],
        rubberDragStartX: ['modes', 'rubber', 'dragStartX'],
        rubberDragStartY: ['modes', 'rubber', 'dragStartY'],
        rubberVelocityModifier: ['modes', 'rubber', 'velocityModifier'],
        rubberHorizontalModifier: ['modes', 'rubber', 'horizontalModifier'],
        rubberMoveX: ['modes', 'rubber', 'moveX'],
        rubberMaxVelocity: ['modes', 'rubber', 'maxVelocity'],
        rubberDamping: ['modes', 'rubber', 'damping'],
        rubberBounciness: ['modes', 'rubber', 'bounciness'],
        rubberStretchFactor: ['modes', 'rubber', 'stretchFactor'],
        lastRubberBounceTime: ['modes', 'rubber', 'lastBounceTime'],
        rubberElasticityEffect: ['modes', 'rubber', 'elasticityEffect'],
        prevGravity: ['modes', 'rubber', 'previousGravity'],
        prevJump: ['modes', 'rubber', 'previousJump'],
        lastRubberPhaseEffect: ['modes', 'rubber', 'lastPhaseEffect'],
        steelModeDuration: ['modes', 'steel', 'duration'],
        ghostModeTime: ['modes', 'ghost', 'time'],
        ghostModeDuration: ['modes', 'ghost', 'duration'],
        ghostModeCooldown: ['modes', 'ghost', 'cooldown'],
        ghostModeCooldownTime: ['modes', 'ghost', 'cooldownTime'],
        normalGhostModeCost: ['modes', 'ghost', 'normalCost'],
        purpleGhostModeCost: ['modes', 'ghost', 'purpleCost'],
        storkModeTime: ['modes', 'stork', 'time'],
        storkModeDuration: ['modes', 'stork', 'duration'],
        storkModeCooldown: ['modes', 'stork', 'cooldown'],
        storkModeCooldownTime: ['modes', 'stork', 'cooldownTime'],
        normalStorkModeCost: ['modes', 'stork', 'normalCost'],
        purpleStorkModeCost: ['modes', 'stork', 'purpleCost'],
        frogStorkModeCost: ['modes', 'stork', 'frogCost'],
        storkGrabActive: ['modes', 'stork', 'grabActive'],
        storkGrabbedPipe: ['modes', 'stork', 'grabbedPipe'],
        storkGrabEnergy: ['modes', 'stork', 'grabEnergy'],
        storkGrabMaxEnergy: ['modes', 'stork', 'grabMaxEnergy'],
        storkGrabCooldown: ['modes', 'stork', 'grabCooldown'],
        storkGrabCooldownTime: ['modes', 'stork', 'grabCooldownTime'],
        storkGrabRange: ['modes', 'stork', 'grabRange'],
        storkGrabDrainRate: ['modes', 'stork', 'grabDrainRate'],
        storkGrabRechargeRate: ['modes', 'stork', 'grabRechargeRate'],
        storkGrabTargetY: ['modes', 'stork', 'grabTargetY'],
        frogComplaintTimeout: ['timers', 'frogComplaint'],
        bird: ['ui', 'bird'],
        gameArea: ['ui', 'gameArea'],
        startScreen: ['ui', 'startScreen'],
        gameOverScreen: ['ui', 'gameOverScreen'],
        startButton: ['ui', 'startButton'],
        restartButton: ['ui', 'restartButton'],
        scoreElement: ['ui', 'scoreElement'],
        bonusScoreElement: ['ui', 'bonusScoreElement'],
        purpleCoinScoreElement: ['ui', 'purpleCoinScoreElement'],
        finalScoreElement: ['ui', 'finalScoreElement'],
        finalCoinsElement: ['ui', 'finalCoinsElement'],
        finalPurpleCoinsElement: ['ui', 'finalPurpleCoinsElement'],
        finalFrogCoinsElement: ['ui', 'finalFrogCoinsElement'],
        finalTotalScoreElement: ['ui', 'finalTotalScoreElement'],
        ground: ['ui', 'ground'],
        frogModeButton: ['ui', 'frogModeButton'],
        frogModeTimer: ['ui', 'frogModeTimer'],
        ghostModeButton: ['ui', 'ghostModeButton'],
        ghostModeTimer: ['ui', 'ghostModeTimer'],
        storkModeButton: ['ui', 'storkModeButton'],
        storkModeTimer: ['ui', 'storkModeTimer']
    };

    const modeAliases = {
        frogModeActive: 'frog',
        steelModeActive: 'steel',
        ghostModeActive: 'ghost',
        ghostMode: 'ghost',
        storkModeActive: 'stork',
        rubberModeActive: 'rubber'
    };

    function setLegacyMode(mode, active) {
        if (active) {
            // Legacy writes used to bypass transitions. Force keeps those writes
            // compatible while all new callers use the controlled public API.
            modeMachine.activate(mode, { force: true, reason: 'legacy-alias' });
        } else if (modeMachine.isActive(mode)) {
            modeMachine.deactivate(mode, { reason: 'legacy-alias' });
        }
    }

    function installAlias(target, name, getter, setter) {
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        if (descriptor && descriptor.configurable === false) return false;

        let previous;
        if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
            previous = descriptor.value;
        }

        Object.defineProperty(target, name, {
            configurable: true,
            enumerable: true,
            get: getter,
            set: setter
        });
        if (previous !== undefined) setter(previous);
        return true;
    }

    function installGlobalAliases(target) {
        const destination = target || root;
        for (const [name, path] of Object.entries(aliases)) {
            installAlias(
                destination,
                name,
                () => valueAtPath(path),
                value => setValueAtPath(path, value)
            );
        }
        for (const [name, mode] of Object.entries(modeAliases)) {
            installAlias(
                destination,
                name,
                () => modeMachine.isActive(mode),
                value => setLegacyMode(mode, Boolean(value))
            );
        }
        return destination;
    }

    const mutationListeners = new Set();
    const metricKinds = new Set(Object.keys(logic.DEFAULT_MUTATION_THRESHOLDS));
    const metricForMutation = {
        ghost: 'nearMiss',
        rubber: 'groundImpact',
        steel: 'pipeImpact',
        frog: 'jump',
        ground: 'groundImpact',
        ceiling: 'groundImpact',
        pipe: 'pipeImpact',
        stork: 'nearMiss'
    };
    const mutationForEmergency = {
        ground: 'rubber',
        ceiling: 'rubber',
        pipe: 'steel',
        stork: 'ghost'
    };

    function mutationElement() {
        if (!root.document) return null;
        return root.document.getElementById('mutationMeter')
            || root.document.getElementById('instabilityMeter')
            || root.document.getElementById('mutationIndicator');
    }

    function updateMutationUI() {
        if (!root.document) return state.mutation.instability;
        const value = Math.round(state.mutation.instability);
        const meter = mutationElement();
        const fill = root.document.getElementById('mutationMeterFill')
            || root.document.getElementById('instabilityFill')
            || root.document.getElementById('mutationBar');
        const label = root.document.getElementById('mutationMeterValue')
            || root.document.getElementById('instabilityValue')
            || root.document.getElementById('mutationLabel');

        if (meter) {
            meter.setAttribute('aria-valuenow', String(value));
            meter.classList.toggle('is-ready', value >= state.mutation.threshold);
            meter.classList.toggle('warning', value >= 50 && value < 75);
            meter.classList.toggle('critical', value >= 75);
            meter.dataset.level = value >= 75 ? 'critical' : (value >= 50 ? 'warning' : 'stable');
        }
        if (fill) fill.style.width = `${value}%`;
        if (label) {
            label.textContent = state.mutation.pending && value >= state.mutation.threshold
                ? 'MUTACJA OCZEKUJE'
                : (value >= state.mutation.threshold
                    ? 'DNA PEŁNE • BRAK WZORCA'
                    : (value === 0
                        ? 'DNA stabilne'
                        : (value >= 75 ? `MUTACJA: ${value}%` : `Niestabilność DNA: ${value}%`)));
        }
        return value;
    }

    function activateMutation(choice) {
        const primaryMode = modeMachine.primary;
        const modifierMode = modeMachine.modifier;
        // Primary evolutions wait for the current transformation to finish.
        // Rubber is the intentional exception: it is a controlled modifier
        // compatible with both the normal bird and the frog.
        if (choice === 'rubber' && primaryMode !== 'normal' && primaryMode !== 'frog') return false;
        if (choice !== 'rubber' && primaryMode !== 'normal') return false;
        if (modifierMode === 'rubber' && choice !== 'rubber' && choice !== 'frog') return false;

        const activators = {
            frog: () => typeof root.activateFrogMode === 'function' && root.activateFrogMode(null, true),
            steel: () => typeof root.activateSteelMode === 'function'
                && root.activateSteelMode({ source: 'mutation', force: true }),
            ghost: () => typeof root.activateGhostMode === 'function' && root.activateGhostMode(null, true),
            rubber: () => typeof root.activateRubberMode === 'function'
                && root.activateRubberMode({ source: 'mutation' })
        };
        const activate = activators[choice];
        return activate ? activate() : undefined;
    }

    let mutationTriggerInProgress = false;

    function triggerMutation(forcedChoice, metadata) {
        if (mutationTriggerInProgress) return null;
        mutationTriggerInProgress = true;
        try {
            return performMutation(forcedChoice, metadata);
        } finally {
            mutationTriggerInProgress = false;
        }
    }

    function performMutation(forcedChoice, metadata) {
        const choice = forcedChoice || logic.chooseMutation(state.metrics);
        if (!choice) return null;

        const attemptState = state;
        const attemptGeneration = state.session.generation;

        const event = Object.freeze({
            choice,
            instability: state.mutation.instability,
            metrics: Object.freeze(Object.assign({}, state.metrics)),
            metadata: metadata || null,
            timestamp: Date.now()
        });
        state.mutation.pending = choice;
        let handled = false;
        for (const listener of mutationListeners) {
            try {
                if (listener(event) === true) handled = true;
            } catch (error) {
                if (root.console && typeof root.console.error === 'function') {
                    root.console.error('Mutation listener failed:', error);
                }
            }
            // A listener may reset the game synchronously. Never let an
            // evolution attempt from the previous session leak into the new one.
            if (state !== attemptState || state.session.generation !== attemptGeneration) {
                return null;
            }
        }
        const activated = handled || activateMutation(choice) === true;
        if (state !== attemptState || state.session.generation !== attemptGeneration) {
            return null;
        }

        // A full meter is valuable game state. Keep both it and the selected
        // evolution while the current FSM cannot accept the transformation.
        // A mode transition will retry it once the bird becomes compatible.
        if (!activated) {
            state.mutation.pending = state.mutation.instability >= state.mutation.threshold
                ? choice
                : null;
            updateMutationUI();
            return null;
        }

        state.mutation.lastChoice = choice;
        state.mutation.lastMetadata = metadata || null;
        state.mutation.history.push(event);
        if (state.mutation.history.length > 30) state.mutation.history.shift();
        state.mutation.instability = 0;
        for (const key of metricKinds) state.metrics[key] = 0;
        updateMutationUI();

        if (root.document && typeof root.CustomEvent === 'function') {
            root.document.dispatchEvent(new root.CustomEvent('sky-dodge:mutation', { detail: event }));
        }
        if (state !== attemptState || state.session.generation !== attemptGeneration) {
            return choice;
        }
        state.mutation.pending = null;
        return choice;
    }

    const mutations = {
        reset() {
            for (const key of metricKinds) state.metrics[key] = 0;
            state.mutation.instability = 0;
            state.mutation.pending = null;
            state.mutation.lastChoice = null;
            state.mutation.lastMetadata = null;
            state.mutation.history.length = 0;
            updateMutationUI();
        },
        record(kind, amount, metadata) {
            if (!metricKinds.has(kind)) return null;
            const increment = amount === undefined ? 1 : Number(amount);
            if (!Number.isFinite(increment) || increment <= 0) return null;
            state.metrics[kind] += increment;
            state.mutation.instability = Math.min(
                state.mutation.threshold,
                state.mutation.instability + increment
            );
            state.mutation.lastMetadata = metadata || null;
            updateMutationUI();
            if (state.mutation.instability >= state.mutation.threshold) {
                if (state.mutation.pending) return null;
                return triggerMutation(null, metadata);
            }
            return null;
        },
        strain(amount, influence, metadata) {
            const increment = amount === undefined ? 1 : Number(amount);
            if (!Number.isFinite(increment) || increment <= 0) return null;
            if (influence !== undefined && influence !== null) {
                if (!metricKinds.has(influence)) return null;
                // Strain controls how quickly the meter fills; influence is one
                // behavioural vote, so a dramatic drag does not drown out the
                // rest of the player's style history.
                state.metrics[influence] += 1;
            }
            state.mutation.instability = Math.min(
                state.mutation.threshold,
                state.mutation.instability + increment
            );
            state.mutation.lastMetadata = metadata || null;
            updateMutationUI();
            if (state.mutation.instability >= state.mutation.threshold) {
                if (state.mutation.pending) return null;
                return triggerMutation(null, metadata);
            }
            return null;
        },
        tryEmergency(type, metadata) {
            const metric = metricKinds.has(type) ? type : metricForMutation[type];
            if (!metric) return false;
            // Emergency evolution is earned at 75% instability and consumes the meter.
            if (state.mutation.instability < state.mutation.threshold * 0.75) return false;
            state.metrics[metric] = Math.max(
                state.metrics[metric],
                logic.DEFAULT_MUTATION_THRESHOLDS[metric]
            );
            const choice = metricKinds.has(type) ? null : (mutationForEmergency[type] || type);
            return triggerMutation(choice, metadata) !== null;
        },
        trigger(choice, metadata) {
            return triggerMutation(choice, metadata);
        },
        updateUI: updateMutationUI,
        onTrigger(listener) {
            if (typeof listener !== 'function') throw new TypeError('listener must be a function');
            mutationListeners.add(listener);
            return () => mutationListeners.delete(listener);
        }
    };

    let mutationRetryToken = 0;
    modeMachine.subscribe(event => {
        if (!state.mutation.pending
            || state.mutation.instability < state.mutation.threshold
            || event.current.primary !== 'normal') {
            return;
        }
        const retryToken = ++mutationRetryToken;
        const retryState = state;
        const retryGeneration = state.session.generation;
        const retry = () => {
            if (retryToken !== mutationRetryToken
                || state !== retryState
                || state.session.generation !== retryGeneration
                || !state.mutation.pending
                || state.mutation.instability < state.mutation.threshold
                || modeMachine.primary !== 'normal') {
                return;
            }
            triggerMutation(state.mutation.pending, {
                source: 'deferred-mutation',
                previous: state.mutation.lastMetadata
            });
        };
        if (typeof root.queueMicrotask === 'function') root.queueMicrotask(retry);
        else root.setTimeout(retry, 0);
    });

    const timers = {
        set(key, handle) {
            if (state.timers.handles.has(key)) {
                root.clearTimeout(state.timers.handles.get(key));
            }
            state.timers.handles.set(key, handle);
            return handle;
        },
        get(key) {
            return state.timers.handles.get(key);
        },
        clear(key) {
            if (!state.timers.handles.has(key)) return false;
            root.clearTimeout(state.timers.handles.get(key));
            state.timers.handles.delete(key);
            return true;
        },
        clearAll() {
            for (const handle of state.timers.handles.values()) root.clearTimeout(handle);
            state.timers.handles.clear();
        }
    };

    const namespace = existingNamespace;
    Object.defineProperties(namespace, {
        state: {
            configurable: true,
            enumerable: true,
            get: () => state
        },
        modeMachine: {
            configurable: true,
            enumerable: true,
            value: modeMachine
        },
        mutations: {
            configurable: true,
            enumerable: true,
            value: mutations
        },
        timers: {
            configurable: true,
            enumerable: true,
            value: timers
        }
    });

    namespace.installGlobalAliases = installGlobalAliases;
    namespace.beginSession = function beginSession() {
        state.session.generation += 1;
        state.session.rafId = null;
        return state.session.generation;
    };
    namespace.isCurrentSession = generation => state.session.generation === generation;
    namespace.resetState = function resetState(options) {
        const settings = options || {};
        const generation = state.session.generation + (settings.keepGeneration ? 0 : 1);
        const ui = settings.keepUI === false ? null : state.ui;
        timers.clearAll();
        modeMachine.reset({ reason: 'state-reset' });
        state = createInitialState();
        state.session.generation = generation;
        if (ui) state.ui = ui;
        mutations.reset();
        return state;
    };

    root.SkyDodge = namespace;
    installGlobalAliases(root);
    return namespace;
}));
