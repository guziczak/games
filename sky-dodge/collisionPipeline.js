(function () {
    'use strict';

    const CONTACT_COOLDOWN = 140;
    const FROG_CONTACT_TOLERANCE = 4;
    const NEAR_MISS_DISTANCE = 18;
    const PLAYER_SAFE_INSET = 4;
    const CLING_RELEASE_GRACE = 650;
    const eventTimes = new Map();
    const entityIds = new WeakMap();
    const recordedNearMisses = new WeakSet();
    let nextEntityId = 1;
    let previousBirdBottom = null;
    let previousTimestamp = null;
    let previousGeneration = null;

    function finite(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function getRect(element) {
        if (!element || typeof element.getBoundingClientRect !== 'function') {
            return null;
        }

        try {
            const source = element.getBoundingClientRect();
            if (!source) return null;

            const left = finite(source.left, finite(source.x, NaN));
            const top = finite(source.top, finite(source.y, NaN));
            const right = finite(source.right, left + finite(source.width, NaN));
            const bottom = finite(source.bottom, top + finite(source.height, NaN));

            if (![left, top, right, bottom].every(Number.isFinite)) {
                return null;
            }

            return {
                left: Math.min(left, right),
                right: Math.max(left, right),
                top: Math.min(top, bottom),
                bottom: Math.max(top, bottom),
                width: Math.abs(right - left),
                height: Math.abs(bottom - top)
            };
        } catch (error) {
            return null;
        }
    }

    function rectsOverlap(first, second) {
        const helper = window.SkyDodgeLogic && window.SkyDodgeLogic.rectsOverlap;
        if (typeof helper === 'function') {
            try {
                return Boolean(helper(first, second));
            } catch (error) {
                // Fall through to the deliberately small local implementation.
            }
        }

        return first.left < second.right
            && first.right > second.left
            && first.top < second.bottom
            && first.bottom > second.top;
    }

    function getEntityId(entity) {
        if (!entity || (typeof entity !== 'object' && typeof entity !== 'function')) {
            return String(entity);
        }
        if (!entityIds.has(entity)) {
            entityIds.set(entity, nextEntityId++);
        }
        return entityIds.get(entity);
    }

    function canEmit(key, timestamp, cooldown) {
        const now = finite(timestamp, performance.now());
        const last = eventTimes.get(key);
        if (last !== undefined && now - last < (cooldown || CONTACT_COOLDOWN)) {
            return false;
        }
        eventTimes.set(key, now);
        return true;
    }

    function record(kind, amount, metadata) {
        const mutations = window.SkyDodge && window.SkyDodge.mutations;
        if (!mutations || typeof mutations.record !== 'function') return null;

        try {
            return mutations.record(kind, amount === undefined ? 1 : amount, metadata || {});
        } catch (error) {
            // Metrics must never make collision handling fail.
            return null;
        }
    }

    function currentModes() {
        const state = window.SkyDodge && (
            window.SkyDodge.modeMachine
            || window.SkyDodge.modeState
            || window.SkyDodge.stateMachine
            || window.SkyDodge.state
        );
        let primary = null;
        let modifier = null;

        if (state) {
            try {
                const snapshot = typeof state.snapshot === 'function' ? state.snapshot() : state;
                if (snapshot && typeof snapshot === 'object') {
                    primary = snapshot.primary || snapshot.mode || snapshot.currentMode || null;
                    modifier = snapshot.modifier || null;
                }
            } catch (error) {
                // Legacy globals below remain the source of truth if state is unavailable.
            }
        }

        const active = function (mode, legacyFlag) {
            if (primary === mode || modifier === mode) return true;
            if (state && typeof state.isActive === 'function') {
                try {
                    if (state.isActive(mode)) return true;
                } catch (error) {
                    // Use the legacy flag.
                }
            }
            return Boolean(window[legacyFlag]);
        };

        return {
            frog: active('frog', 'frogModeActive'),
            steel: active('steel', 'steelModeActive'),
            ghost: active('ghost', 'ghostModeActive'),
            stork: active('stork', 'storkModeActive'),
            rubber: active('rubber', 'rubberModeActive')
        };
    }

    function modeName(modes) {
        const primary = ['steel', 'ghost', 'stork', 'frog'].find((name) => modes[name]) || 'normal';
        return modes.rubber ? `${primary}+rubber` : primary;
    }

    function playBounceSound(timestamp, key, soundName = 'jump') {
        if (!canEmit(`sound:${key}`, timestamp, 110)) return;
        if (typeof window.playSound === 'function') {
            try {
                window.playSound(soundName);
            } catch (error) {
                // Audio is optional.
            }
        }
    }

    function setPlayerTop(bird, gameRect, viewportTop) {
        const localTop = viewportTop - gameRect.top;
        window.birdPosition = localTop;
        if (bird.style) bird.style.top = `${localTop}px`;
    }

    function setPlayerLeft(bird, gameArea, gameRect, viewportLeft) {
        const playerRect = getRect(bird);
        const playerWidth = playerRect ? playerRect.width : 0;
        const viewportWidth = gameArea.clientWidth || gameRect.width;
        const maxLeft = Math.max(
            PLAYER_SAFE_INSET,
            viewportWidth - playerWidth - PLAYER_SAFE_INSET
        );
        const localLeft = Math.max(
            PLAYER_SAFE_INSET,
            Math.min(maxLeft, viewportLeft - gameRect.left)
        );
        if (bird.style) bird.style.left = `${localLeft}px`;
        if (viewportWidth > 0) {
            window.birdHorizontalPosition = (localLeft / viewportWidth) * 100;
        }
    }

    function resolveHorizontalCling(options) {
        const helper = window.SkyDodgeLogic && window.SkyDodgeLogic.resolveHorizontalCling;
        if (typeof helper === 'function') {
            try {
                return helper(options);
            } catch (error) {
                // Use the same small invariant locally if optional logic fails.
            }
        }

        const minLeft = options.safeInset;
        const maxLeft = Math.max(
            minLeft,
            options.viewportWidth - options.playerWidth - options.safeInset
        );
        const clamp = value => Math.max(minLeft, Math.min(maxLeft, value));
        const escapedScroll = options.desiredLeft < minLeft || options.desiredLeft > maxLeft;
        return {
            left: escapedScroll ? clamp(options.obstacleRight + 1) : clamp(options.desiredLeft),
            escapedScroll,
            releaseCling: escapedScroll
        };
    }

    function collisionNormal(playerRect, obstacleRect) {
        const candidates = [
            { x: -1, y: 0, depth: playerRect.right - obstacleRect.left },
            { x: 1, y: 0, depth: obstacleRect.right - playerRect.left },
            { x: 0, y: -1, depth: playerRect.bottom - obstacleRect.top },
            { x: 0, y: 1, depth: obstacleRect.bottom - playerRect.top }
        ].filter((candidate) => candidate.depth >= 0);

        candidates.sort((first, second) => first.depth - second.depth);
        return candidates[0] || { x: 0, y: -1, depth: 0 };
    }

    function contactNormal(playerRect, obstacleRect, tolerance) {
        if (rectsOverlap(playerRect, obstacleRect)) {
            return collisionNormal(playerRect, obstacleRect);
        }

        const horizontalOverlap = playerRect.left < obstacleRect.right
            && playerRect.right > obstacleRect.left;
        const verticalOverlap = playerRect.top < obstacleRect.bottom
            && playerRect.bottom > obstacleRect.top;
        const contacts = [];

        if (horizontalOverlap) {
            contacts.push({ x: 0, y: -1, depth: Math.abs(playerRect.bottom - obstacleRect.top) });
            contacts.push({ x: 0, y: 1, depth: Math.abs(playerRect.top - obstacleRect.bottom) });
        }
        if (verticalOverlap) {
            contacts.push({ x: -1, y: 0, depth: Math.abs(playerRect.right - obstacleRect.left) });
            contacts.push({ x: 1, y: 0, depth: Math.abs(playerRect.left - obstacleRect.right) });
        }

        contacts.sort((first, second) => first.depth - second.depth);
        return contacts.length && contacts[0].depth <= tolerance ? contacts[0] : null;
    }

    function separatePlayer(bird, gameArea, gameRect, playerRect, obstacleRect, normal) {
        const spacing = 1;
        if (normal.x < 0) {
            setPlayerLeft(bird, gameArea, gameRect, obstacleRect.left - playerRect.width - spacing);
        } else if (normal.x > 0) {
            setPlayerLeft(bird, gameArea, gameRect, obstacleRect.right + spacing);
        }

        if (normal.y < 0) {
            setPlayerTop(bird, gameRect, obstacleRect.top - playerRect.height - spacing);
        } else if (normal.y > 0) {
            setPlayerTop(bird, gameRect, obstacleRect.bottom + spacing);
        }
    }

    function markClinging(bird, surface, normal, pipeId) {
        window.frogIsOnGround = true;
        window.velocity = 0;
        if (!bird.classList) return;
        bird.classList.add('frog-clinging');
        if (bird.dataset) {
            bird.dataset.clingingSurface = surface;
            bird.dataset.clingingNormalX = String(finite(normal && normal.x, 0));
            bird.dataset.clingingNormalY = String(finite(normal && normal.y, 0));
            if (pipeId !== undefined && pipeId !== null) {
                bird.dataset.clingingPipeId = String(pipeId);
            }
        }
        bird.classList.remove('jumping');
    }

    function clearClinging(bird) {
        if (!bird || !bird.classList) return;
        bird.classList.remove('frog-clinging');
        if (bird.dataset) {
            delete bird.dataset.clingingSurface;
            delete bird.dataset.clingingNormalX;
            delete bird.dataset.clingingNormalY;
            delete bird.dataset.clingingPipeId;
        }
    }

    function releaseScrollingCling(bird, pipeId, timestamp) {
        clearClinging(bird);
        window.frogIsOnGround = false;
        window.frogIsCharging = false;
        window.velocity = Math.min(
            finite(window.velocity, 0),
            finite(window.frogJumpMinPower, -8) * 0.85
        );

        if (bird.classList) {
            bird.classList.remove('charging');
            bird.classList.add('jumping');
        }
        if (bird.dataset) {
            bird.dataset.releasedPipeId = String(pipeId);
            bird.dataset.clingReleaseUntil = String(timestamp + CLING_RELEASE_GRACE);
        }

        const indicator = document.getElementById('frogJumpChargeIndicator');
        const bar = document.getElementById('frogJumpChargeBar');
        if (indicator && indicator.style) indicator.style.display = 'none';
        if (bar && bar.style) bar.style.width = '0%';
        playBounceSound(timestamp, `frog-edge-release:${pipeId}`, 'frogLaunch');
    }

    function finishOverload(bird) {
        if (finite(window.frogOverloadBounceCount, 0) > 0) return;
        window.frogOverloadBounceCount = 0;
        window.frogIsOverloaded = false;
        if (bird.classList) bird.classList.remove('overloaded');

        const indicator = document.getElementById('frogOverloadIndicator');
        if (indicator && indicator.style) indicator.style.display = 'none';
        if (window.frogComplaintTimeout) {
            clearTimeout(window.frogComplaintTimeout);
            window.frogComplaintTimeout = null;
        }
    }

    function bouncePlayer(bird, normal, kind, timestamp, source) {
        const bounciness = kind === 'rubber'
            ? Math.max(1, finite(window.rubberBounciness, 1.2))
            : 0.9;
        const currentVelocity = finite(window.velocity, 0);

        if (normal.y !== 0) {
            const minimumSpeed = kind === 'overload'
                ? Math.abs(finite(window.frogJumpMaxPower, -12)) * 0.75
                : 4;
            const speed = Math.max(minimumSpeed, Math.abs(currentVelocity) * bounciness);
            window.velocity = normal.y * speed;
        } else if (normal.x !== 0) {
            if (kind === 'rubber') {
                const horizontalSpeed = Math.max(8, Math.abs(finite(window.rubberMoveX, 0)) * bounciness);
                window.rubberMoveX = normal.x * horizontalSpeed;
            }
            window.velocity = currentVelocity * 0.75;
        }

        window.frogIsOnGround = false;
        clearClinging(bird);
        const bounceSound = kind === 'rubber'
            ? 'rubberSnap'
            : (kind === 'steel' ? 'steelImpact' : (kind === 'overload' ? 'frogLaunch' : 'jump'));
        playBounceSound(timestamp, source, bounceSound);
        record('jump', 1, { source, bounce: kind });

        if (kind === 'overload') {
            window.frogOverloadBounceCount = Math.max(
                0,
                finite(window.frogOverloadBounceCount, 0) - 1
            );
            finishOverload(bird);
        }
    }

    function tryEmergency(type, metadata) {
        const mutations = window.SkyDodge && window.SkyDodge.mutations;
        const metricMutation = record(
            'nearMiss',
            1,
            Object.assign({ type, emergencyAttempt: true }, metadata)
        );
        // record() may itself fill the instability meter and activate a rescue.
        if (metricMutation) return true;
        if (!mutations || typeof mutations.tryEmergency !== 'function') return false;

        try {
            const result = mutations.tryEmergency(type, metadata);
            if (result) {
                return true;
            }
        } catch (error) {
            // A broken optional mutation system must not suppress a real death.
        }
        return false;
    }

    function fatalOrRescued(type, metadata) {
        return !tryEmergency(type, metadata);
    }

    function handleCoins(playerRect) {
        const coins = Array.isArray(window.coins) ? window.coins : [];

        // Callbacks are allowed to clean up entities immediately; iterate a snapshot
        // so such cleanup can never skip the next collectible.
        for (const coin of coins.slice()) {
            if (!coin || coin.collected || !coin.element) continue;
            const coinRect = getRect(coin.element);
            if (!coinRect || !rectsOverlap(playerRect, coinRect)) continue;

            if (typeof window.collectCoin === 'function') {
                try {
                    window.collectCoin(coin);
                } catch (error) {
                    coin.collected = true;
                }
            } else {
                coin.collected = true;
                coin.removeTime = performance.now();
            }

            for (const updateName of ['updateFrogModeButton', 'updateGhostModeButton', 'updateStorkModeButton']) {
                if (typeof window[updateName] === 'function') {
                    try {
                        window[updateName]();
                    } catch (error) {
                        // UI refresh is secondary to collecting the coin.
                    }
                }
            }
        }
    }

    function destroySteelPipe(pipe, bird, timestamp) {
        if (!pipe || pipe.destroyed || pipe.scheduledForRemoval || pipe._collisionPipelineDestroyed) {
            return;
        }

        pipe._collisionPipelineDestroyed = true;
        pipe.destroyed = true;
        pipe.scheduledForRemoval = true;

        for (const element of [pipe.upPipe, pipe.downPipe]) {
            if (element && element.classList) element.classList.add('pipe-destroyed');
        }

        window.score = finite(window.score, 0) + 5;
        const scoreElement = window.scoreElement || document.getElementById('score');
        if (scoreElement) scoreElement.textContent = String(window.score);

        const jumpPower = finite(window.jump, -7);
        window.velocity = jumpPower < 0 ? jumpPower * 0.5 : -4;
        playBounceSound(timestamp, `steel-pipe:${getEntityId(pipe)}`, 'steelImpact');
        record('pipeImpact', 1, { mode: 'steel', outcome: 'destroyed' });
        record('jump', 1, { source: 'steel-pipe' });
        clearClinging(bird);
    }

    function maybeRecordPipeNearMiss(pipe, playerRect, obstacleRects) {
        if (!pipe || recordedNearMisses.has(pipe) || obstacleRects.length < 2) return;
        const topObstacle = obstacleRects.reduce((first, second) => first.top < second.top ? first : second);
        const bottomObstacle = obstacleRects.reduce((first, second) => first.top > second.top ? first : second);
        const horizontalOverlap = playerRect.left < topObstacle.right
            && playerRect.right > topObstacle.left;
        if (!horizontalOverlap) return;

        const upperClearance = playerRect.top - topObstacle.bottom;
        const lowerClearance = bottomObstacle.top - playerRect.bottom;
        const clearance = Math.min(upperClearance, lowerClearance);
        if (clearance >= 0 && clearance <= NEAR_MISS_DISTANCE) {
            recordedNearMisses.add(pipe);
            record('nearMiss', 1, { type: 'pipe', clearance });
        }
    }

    function handlePipes(context) {
        const { bird, gameArea, gameRect, modes, timestamp } = context;
        const pipes = Array.isArray(window.pipes) ? window.pipes : [];
        let playerRect = context.playerRect;

        for (const pipe of pipes.slice()) {
            if (!pipe || pipe.destroyed || pipe.scheduledForRemoval) continue;
            const obstacles = [pipe.downPipe, pipe.upPipe]
                .map((element) => ({ element, rect: getRect(element) }))
                .filter((entry) => entry.rect);
            if (!obstacles.length) continue;

            let collision = null;
            for (const obstacle of obstacles) {
                const normal = modes.frog
                    ? contactNormal(playerRect, obstacle.rect, FROG_CONTACT_TOLERANCE)
                    : (rectsOverlap(playerRect, obstacle.rect)
                        ? collisionNormal(playerRect, obstacle.rect)
                        : null);
                if (normal) {
                    collision = { obstacle, normal };
                    break;
                }
            }

            if (!collision) {
                maybeRecordPipeNearMiss(pipe, playerRect, obstacles.map((entry) => entry.rect));
                continue;
            }

            const pipeId = getEntityId(pipe);
            const metadata = { type: 'pipe', mode: modeName(modes), pipeId };
            const releaseUntil = finite(bird.dataset && bird.dataset.clingReleaseUntil, 0);
            const releasedPipeId = bird.dataset && bird.dataset.releasedPipeId;
            if (modes.frog && releasedPipeId === String(pipeId) && timestamp < releaseUntil) {
                continue;
            }

            if (modes.steel) {
                destroySteelPipe(pipe, bird, timestamp);
                continue;
            }
            if (modes.rubber) {
                separatePlayer(
                    bird,
                    gameArea,
                    gameRect,
                    playerRect,
                    collision.obstacle.rect,
                    collision.normal
                );
                bouncePlayer(bird, collision.normal, 'rubber', timestamp, `pipe:${pipeId}`);
                if (canEmit(`metric:pipe:${pipeId}`, timestamp)) {
                    record('pipeImpact', 1, Object.assign({ outcome: 'bounce' }, metadata));
                }
                playerRect = getRect(bird) || playerRect;
                continue;
            }
            if (modes.ghost || modes.stork) {
                continue;
            }
            if (modes.frog && window.frogIsOverloaded
                && finite(window.frogOverloadBounceCount, 0) > 0) {
                separatePlayer(
                    bird,
                    gameArea,
                    gameRect,
                    playerRect,
                    collision.obstacle.rect,
                    collision.normal
                );
                bouncePlayer(bird, collision.normal, 'overload', timestamp, `overload-pipe:${pipeId}`);
                if (canEmit(`metric:pipe:${pipeId}`, timestamp)) {
                    record('pipeImpact', 1, Object.assign({ outcome: 'overload-bounce' }, metadata));
                }
                playerRect = getRect(bird) || playerRect;
                continue;
            }
            if (modes.frog) {
                if (collision.normal.x < 0) {
                    const viewportWidth = gameArea.clientWidth || gameRect.width;
                    const resolution = resolveHorizontalCling({
                        desiredLeft: collision.obstacle.rect.left
                            - gameRect.left
                            - playerRect.width
                            - 1,
                        obstacleRight: collision.obstacle.rect.right - gameRect.left,
                        playerWidth: playerRect.width,
                        viewportWidth,
                        safeInset: PLAYER_SAFE_INSET
                    });
                    if (resolution.releaseCling) {
                        setPlayerLeft(
                            bird,
                            gameArea,
                            gameRect,
                            gameRect.left + resolution.left
                        );
                        releaseScrollingCling(bird, pipeId, timestamp);
                        playerRect = getRect(bird) || playerRect;
                        continue;
                    }
                }
                separatePlayer(
                    bird,
                    gameArea,
                    gameRect,
                    playerRect,
                    collision.obstacle.rect,
                    collision.normal
                );
                const surface = collision.normal.x
                    ? 'pipe-side'
                    : (collision.normal.y < 0 ? 'pipe-top' : 'pipe-bottom');
                markClinging(bird, surface, collision.normal, pipeId);
                context.didCling = true;
                if (canEmit(`metric:frog-cling:${pipeId}`, timestamp, 500)) {
                    record('pipeImpact', 1, Object.assign({ outcome: 'cling', surface }, metadata));
                }
                playerRect = getRect(bird) || playerRect;
                continue;
            }

            const metricMutation = record(
                'pipeImpact',
                1,
                Object.assign({ outcome: 'fatal' }, metadata)
            );
            if (metricMutation) {
                bouncePlayer(bird, collision.normal, 'emergency', timestamp, `mutation-pipe:${pipeId}`);
                return false;
            }
            if (fatalOrRescued('pipe', metadata)) return true;

            bouncePlayer(bird, collision.normal, 'emergency', timestamp, `emergency-pipe:${pipeId}`);
            return false;
        }

        context.playerRect = playerRect;
        return false;
    }

    function handleBoundary(context, type, obstacleRect, normal) {
        const { bird, gameArea, gameRect, modes, timestamp } = context;
        const playerRect = context.playerRect;
        const metadata = { type, mode: modeName(modes) };

        separatePlayer(bird, gameArea, gameRect, playerRect, obstacleRect, normal);
        context.playerRect = getRect(bird) || playerRect;

        let metricMutation = null;
        if (type === 'ground' || type === 'ceiling') {
            const metricKey = `metric:${type}`;
            if (canEmit(metricKey, timestamp, 220)) {
                metricMutation = record('groundImpact', 1, metadata);
            }
        }

        if (modes.rubber) {
            bouncePlayer(bird, normal, 'rubber', timestamp, type);
            return false;
        }
        if (modes.steel) {
            bouncePlayer(bird, normal, 'steel', timestamp, type);
            return false;
        }
        if (modes.frog && window.frogIsOverloaded
            && finite(window.frogOverloadBounceCount, 0) > 0) {
            bouncePlayer(bird, normal, 'overload', timestamp, `overload-${type}`);
            return false;
        }
        if (modes.frog) {
            markClinging(bird, type, normal);
            context.didCling = true;
            return false;
        }
        if (modes.ghost || modes.stork) {
            window.velocity = normal.y * Math.max(1, Math.abs(finite(window.velocity, 0)) * 0.35);
            return false;
        }

        if (metricMutation) {
            bouncePlayer(bird, normal, 'emergency', timestamp, `mutation-${type}`);
            return false;
        }
        if (fatalOrRescued(type, metadata)) return true;
        bouncePlayer(bird, normal, 'emergency', timestamp, `emergency-${type}`);
        return false;
    }

    function handleBoundaries(context, ground) {
        const { playerRect, gameRect } = context;
        const groundRect = getRect(ground);
        const floorTop = groundRect ? groundRect.top : gameRect.bottom;
        const ceilingContact = context.modes.frog
            && context.bird.classList
            && context.bird.classList.contains('frog-clinging')
            && context.bird.dataset
            && context.bird.dataset.clingingSurface === 'ceiling'
            && playerRect.top <= gameRect.top + FROG_CONTACT_TOLERANCE;

        if (playerRect.bottom >= floorTop) {
            const floor = groundRect || {
                left: gameRect.left,
                right: gameRect.right,
                top: floorTop,
                bottom: gameRect.bottom + 1,
                width: gameRect.width,
                height: 1
            };
            if (handleBoundary(context, 'ground', floor, { x: 0, y: -1, depth: playerRect.bottom - floorTop })) {
                return true;
            }
        } else if (playerRect.top <= gameRect.top || ceilingContact) {
            const ceiling = {
                left: gameRect.left,
                right: gameRect.right,
                top: gameRect.top - 1,
                bottom: gameRect.top,
                width: gameRect.width,
                height: 1
            };
            if (handleBoundary(context, 'ceiling', ceiling, { x: 0, y: 1, depth: gameRect.top - playerRect.top })) {
                return true;
            }
        }

        return false;
    }

    function defeatStork(stork) {
        if (!stork || stork.defeated) return;
        if (typeof window.defeatStork === 'function') {
            try {
                window.defeatStork(stork);
                return;
            } catch (error) {
                // Keep the entity harmless even if its visual effect cannot run.
            }
        }
        stork.defeated = true;
        stork.removeTime = performance.now();
    }

    function handleStorks(context) {
        const { bird, gameArea, gameRect, modes, timestamp } = context;
        const storks = Array.isArray(window.storks) ? window.storks : [];
        let playerRect = context.playerRect;

        // defeatStork may be supplied by another module and may remove immediately.
        for (const stork of storks.slice()) {
            if (!stork || stork.defeated || !stork.element) continue;
            const storkRect = getRect(stork.element);
            if (!storkRect || !rectsOverlap(playerRect, storkRect)) continue;

            const storkId = getEntityId(stork);
            const metadata = { type: 'stork', mode: modeName(modes), storkId };
            const falling = finite(window.velocity, 0) > 0;
            const enteredFromAbove = previousBirdBottom !== null
                && previousBirdBottom <= storkRect.top + 3;
            const stomp = falling && enteredFromAbove;

            if (modes.steel || stomp) {
                defeatStork(stork);
                if (!modes.steel) {
                    window.velocity = finite(window.jump, -7) * 0.7;
                    record('jump', 1, { source: 'stork-stomp' });
                }
                record('pipeImpact', 1, Object.assign({ outcome: modes.steel ? 'destroyed' : 'stomp' }, metadata));
                continue;
            }

            const normal = collisionNormal(playerRect, storkRect);
            if (modes.rubber) {
                separatePlayer(bird, gameArea, gameRect, playerRect, storkRect, normal);
                bouncePlayer(bird, normal, 'rubber', timestamp, `stork:${storkId}`);
                if (canEmit(`metric:stork:${storkId}`, timestamp)) {
                    record('nearMiss', 1, Object.assign({ outcome: 'bounce' }, metadata));
                }
                playerRect = getRect(bird) || playerRect;
                continue;
            }

            // Ghosts phase through enemies; the player's stork does not fight its own kind.
            if (modes.ghost || modes.stork || window.invincible) {
                if (canEmit(`metric:stork-safe:${storkId}`, timestamp, 500)) {
                    record('nearMiss', 1, Object.assign({ outcome: 'phased' }, metadata));
                }
                continue;
            }

            if (fatalOrRescued('stork', metadata)) return true;
            separatePlayer(bird, gameArea, gameRect, playerRect, storkRect, normal);
            bouncePlayer(bird, normal, 'emergency', timestamp, `emergency-stork:${storkId}`);
            return false;
        }

        context.playerRect = playerRect;
        return false;
    }

    function processCollisions(timestamp) {
        const now = finite(timestamp, performance.now());
        const bird = window.bird || document.getElementById('bird');
        const gameArea = window.gameArea || document.getElementById('gameArea');
        const ground = window.ground || document.getElementById('ground');
        const playerRect = getRect(bird);
        const gameRect = getRect(gameArea);
        const generation = window.SkyDodge
            && window.SkyDodge.state
            && window.SkyDodge.state.session
            ? window.SkyDodge.state.session.generation
            : null;

        if (!bird || !gameArea || !playerRect || !gameRect) {
            previousBirdBottom = null;
            previousTimestamp = now;
            previousGeneration = generation;
            return false;
        }

        // A restart or a long pause invalidates the previous-frame sweep used for stomps.
        if (previousTimestamp === null
            || now < previousTimestamp
            || now - previousTimestamp > 250
            || (generation !== null && generation !== previousGeneration)) {
            previousBirdBottom = playerRect.bottom;
        }

        const context = {
            bird,
            gameArea,
            gameRect,
            playerRect,
            modes: currentModes(),
            timestamp: now,
            didCling: false
        };

        const releaseUntil = finite(bird.dataset && bird.dataset.clingReleaseUntil, 0);
        if (releaseUntil && now >= releaseUntil && bird.dataset) {
            delete bird.dataset.clingReleaseUntil;
            delete bird.dataset.releasedPipeId;
        }

        handleCoins(context.playerRect);

        let fatal = handleBoundaries(context, ground);
        if (!fatal) fatal = handlePipes(context);
        if (!fatal) fatal = handleStorks(context);

        if (!context.didCling) {
            clearClinging(bird);
            if (context.modes.frog) window.frogIsOnGround = false;
        }

        const finalRect = getRect(bird) || context.playerRect;
        previousBirdBottom = finalRect.bottom;
        previousTimestamp = now;
        previousGeneration = generation;
        return fatal === true;
    }

    function install() {
        window.processCollisions = processCollisions;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }
}());
