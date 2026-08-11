(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.SkyDodgeLogic = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const PRIMARY_MODES = Object.freeze(['normal', 'frog', 'steel', 'ghost', 'stork']);
    const MODIFIERS = Object.freeze(['rubber']);

    const DEFAULT_TRANSITIONS = Object.freeze({
        normal: Object.freeze(['frog', 'ghost']),
        frog: Object.freeze(['normal', 'steel', 'stork']),
        steel: Object.freeze(['normal']),
        ghost: Object.freeze(['normal']),
        stork: Object.freeze(['normal'])
    });

    const DEFAULT_MODIFIER_COMPATIBILITY = Object.freeze({
        rubber: Object.freeze(['normal', 'frog'])
    });

    const DEFAULT_MUTATION_THRESHOLDS = Object.freeze({
        nearMiss: 3,
        groundImpact: 2,
        pipeImpact: 2,
        jump: 12
    });

    const MUTATION_BY_METRIC = Object.freeze({
        nearMiss: 'ghost',
        groundImpact: 'rubber',
        pipeImpact: 'steel',
        jump: 'frog'
    });

    function finiteNumber(value, name) {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            throw new TypeError(`${name} must be a finite number`);
        }
        return number;
    }

    function rectEdges(rect, name) {
        if (!rect || typeof rect !== 'object') {
            throw new TypeError(`${name} must be a rectangle-like object`);
        }

        let left = Number.isFinite(Number(rect.left)) ? Number(rect.left) : Number(rect.x);
        let top = Number.isFinite(Number(rect.top)) ? Number(rect.top) : Number(rect.y);
        let right = Number.isFinite(Number(rect.right))
            ? Number(rect.right)
            : left + Number(rect.width);
        let bottom = Number.isFinite(Number(rect.bottom))
            ? Number(rect.bottom)
            : top + Number(rect.height);

        left = finiteNumber(left, `${name}.left`);
        top = finiteNumber(top, `${name}.top`);
        right = finiteNumber(right, `${name}.right`);
        bottom = finiteNumber(bottom, `${name}.bottom`);

        return {
            left: Math.min(left, right),
            right: Math.max(left, right),
            top: Math.min(top, bottom),
            bottom: Math.max(top, bottom)
        };
    }

    /**
     * Axis-aligned rectangle collision. Touching edges are not a collision unless
     * `inclusive` is explicitly enabled.
     */
    function rectsOverlap(first, second, options) {
        const settings = options || {};
        const padding = settings.padding === undefined
            ? 0
            : finiteNumber(settings.padding, 'options.padding');
        const a = rectEdges(first, 'first');
        const b = rectEdges(second, 'second');

        if (settings.inclusive) {
            return a.left - padding <= b.right
                && a.right + padding >= b.left
                && a.top - padding <= b.bottom
                && a.bottom + padding >= b.top;
        }

        return a.left - padding < b.right
            && a.right + padding > b.left
            && a.top - padding < b.bottom
            && a.bottom + padding > b.top;
    }

    function normalizeBounds(bounds) {
        if (typeof bounds === 'number') {
            return {
                left: 0,
                right: finiteNumber(bounds, 'bounds'),
                top: Number.NEGATIVE_INFINITY,
                bottom: Number.POSITIVE_INFINITY
            };
        }

        if (!bounds || typeof bounds !== 'object') {
            throw new TypeError('bounds must be a width or a bounds-like object');
        }

        const left = bounds.left === undefined ? 0 : finiteNumber(bounds.left, 'bounds.left');
        const top = bounds.top === undefined ? 0 : finiteNumber(bounds.top, 'bounds.top');
        const right = bounds.right === undefined
            ? left + finiteNumber(bounds.width, 'bounds.width')
            : finiteNumber(bounds.right, 'bounds.right');
        const bottom = bounds.bottom === undefined
            ? (bounds.height === undefined ? Number.POSITIVE_INFINITY : top + finiteNumber(bounds.height, 'bounds.height'))
            : finiteNumber(bounds.bottom, 'bounds.bottom');

        return { left, right, top, bottom };
    }

    function entityEdges(entity) {
        if (!entity || typeof entity !== 'object') {
            throw new TypeError('entity must be an entity-like object');
        }

        const left = entity.left === undefined
            ? finiteNumber(entity.x, 'entity.x')
            : finiteNumber(entity.left, 'entity.left');
        const topSource = entity.top === undefined ? entity.y : entity.top;
        const top = topSource === undefined ? 0 : finiteNumber(topSource, 'entity.top');
        const width = entity.right === undefined
            ? finiteNumber(entity.width === undefined ? 0 : entity.width, 'entity.width')
            : finiteNumber(entity.right, 'entity.right') - left;
        const height = entity.bottom === undefined
            ? finiteNumber(entity.height === undefined ? 0 : entity.height, 'entity.height')
            : finiteNumber(entity.bottom, 'entity.bottom') - top;

        return {
            left: Math.min(left, left + width),
            right: Math.max(left, left + width),
            top: Math.min(top, top + height),
            bottom: Math.max(top, top + height)
        };
    }

    /**
     * Reports whether the whole entity has left the selected viewport edge.
     * The default direction, `any`, is useful for generic entity cleanup.
     */
    function isEntityOffscreen(entity, bounds, options) {
        const settings = typeof options === 'number' ? { margin: options } : (options || {});
        const margin = settings.margin === undefined
            ? 0
            : finiteNumber(settings.margin, 'options.margin');
        const direction = settings.direction || 'any';
        const rect = entityEdges(entity);
        const viewport = normalizeBounds(bounds);
        const checks = {
            left: rect.right < viewport.left - margin,
            right: rect.left > viewport.right + margin,
            top: rect.bottom < viewport.top - margin,
            bottom: rect.top > viewport.bottom + margin
        };

        if (direction === 'any') {
            return checks.left || checks.right || checks.top || checks.bottom;
        }
        if (!Object.prototype.hasOwnProperty.call(checks, direction)) {
            throw new RangeError(`Unknown offscreen direction: ${direction}`);
        }
        return checks[direction];
    }

    /**
     * Keeps an actor that is being carried by a scrolling obstacle inside the
     * playable horizontal area. `desiredLeft` is the position produced by
     * collision separation (for example, the left side of a moving pipe).
     *
     * A side-clinging actor must be released once that desired position crosses
     * a viewport edge. Otherwise the next collision frame keeps moving it with
     * the obstacle and can eventually carry it entirely off-screen.
     */
    function resolveHorizontalCling(options) {
        if (!options || typeof options !== 'object') {
            throw new TypeError('resolveHorizontalCling expects an options object');
        }

        const desiredLeft = finiteNumber(options.desiredLeft, 'desiredLeft');
        const obstacleRight = finiteNumber(options.obstacleRight, 'obstacleRight');
        const viewportWidth = finiteNumber(options.viewportWidth, 'viewportWidth');
        const playerWidth = finiteNumber(options.playerWidth, 'playerWidth');
        const safeInset = options.safeInset === undefined
            ? 0
            : finiteNumber(options.safeInset, 'safeInset');
        if (viewportWidth <= 0 || playerWidth < 0 || safeInset < 0) {
            throw new RangeError('Viewport width must be positive; player width and safe inset cannot be negative');
        }

        const minLeft = safeInset;
        const maxLeft = Math.max(minLeft, viewportWidth - playerWidth - safeInset);
        const clamp = value => Math.max(minLeft, Math.min(maxLeft, value));
        const escapedScroll = desiredLeft < minLeft || desiredLeft > maxLeft;

        // The scrolling-left failure mode starts with the frog on the pipe's
        // left face. Once that position leaves the frame, move it just beyond
        // the pipe's right face. Clamping alone would leave both rectangles in
        // contact, so the following frame could immediately capture it again.
        const left = escapedScroll
            ? clamp(obstacleRight + 1)
            : clamp(desiredLeft);

        return Object.freeze({
            left,
            escapedScroll,
            releaseCling: escapedScroll
        });
    }

    /**
     * Calculates CSS heights for a top-anchored and bottom-anchored pipe pair.
     * `bottomHeight` includes the ground hidden behind the bottom pipe, so the
     * visible opening is exactly `pipeGap` pixels rather than pipeGap + ground.
     */
    function calculatePipeLayout(options) {
        if (!options || typeof options !== 'object') {
            throw new TypeError('calculatePipeLayout expects an options object');
        }

        const gameHeight = finiteNumber(
            options.gameHeight === undefined ? options.viewportHeight : options.gameHeight,
            'gameHeight'
        );
        const groundHeight = finiteNumber(options.groundHeight || 0, 'groundHeight');
        const pipeGap = finiteNumber(
            options.pipeGap === undefined ? options.gap : options.pipeGap,
            'pipeGap'
        );
        const minPipeHeight = finiteNumber(
            options.minPipeHeight === undefined ? 50 : options.minPipeHeight,
            'minPipeHeight'
        );

        if (gameHeight <= 0 || groundHeight < 0 || pipeGap < 0 || minPipeHeight < 0) {
            throw new RangeError('Pipe layout dimensions cannot be negative and gameHeight must be positive');
        }

        const playableHeight = gameHeight - groundHeight;
        const distributableHeight = playableHeight - pipeGap - (2 * minPipeHeight);
        if (distributableHeight < 0) {
            return null;
        }

        const randomSource = typeof options.random === 'function' ? options.random : Math.random;
        const randomValue = Math.max(0, Math.min(1, finiteNumber(randomSource(), 'random()')));
        const topHeight = minPipeHeight + Math.floor(distributableHeight * randomValue);
        const bottomVisibleHeight = playableHeight - pipeGap - topHeight;
        const bottomHeight = groundHeight + bottomVisibleHeight;
        const gapTop = topHeight;
        const gapBottom = gameHeight - bottomHeight;

        return Object.freeze({
            topHeight,
            bottomHeight,
            bottomVisibleHeight,
            gapTop,
            gapBottom,
            pipeGap: gapBottom - gapTop,
            playableHeight
        });
    }

    /**
     * Repositions an existing pipe gap around a requested centre while keeping
     * both pipe ends playable. It returns the same shape as calculatePipeLayout
     * so rendering code can apply the result without a second geometry model.
     */
    function calculateDraggedPipeLayout(options) {
        if (!options || typeof options !== 'object') {
            throw new TypeError('calculateDraggedPipeLayout expects an options object');
        }

        const gameHeight = finiteNumber(
            options.gameHeight === undefined ? options.viewportHeight : options.gameHeight,
            'gameHeight'
        );
        const groundHeight = finiteNumber(options.groundHeight || 0, 'groundHeight');
        const pipeGap = finiteNumber(
            options.pipeGap === undefined ? options.gap : options.pipeGap,
            'pipeGap'
        );
        const minPipeHeight = finiteNumber(
            options.minPipeHeight === undefined ? 50 : options.minPipeHeight,
            'minPipeHeight'
        );
        const desiredCenter = finiteNumber(
            options.desiredCenter === undefined ? options.centerY : options.desiredCenter,
            'desiredCenter'
        );

        if (gameHeight <= 0 || groundHeight < 0 || pipeGap < 0 || minPipeHeight < 0) {
            throw new RangeError('Dragged pipe dimensions cannot be negative and gameHeight must be positive');
        }

        const playableHeight = gameHeight - groundHeight;
        const halfGap = pipeGap / 2;
        const minCenter = minPipeHeight + halfGap;
        const maxCenter = playableHeight - minPipeHeight - halfGap;
        if (maxCenter < minCenter) return null;

        const center = Math.max(minCenter, Math.min(maxCenter, desiredCenter));
        const gapTop = center - halfGap;
        const gapBottom = center + halfGap;
        const topHeight = gapTop;
        const bottomVisibleHeight = playableHeight - gapBottom;
        const bottomHeight = groundHeight + bottomVisibleHeight;

        return Object.freeze({
            center,
            minCenter,
            maxCenter,
            topHeight,
            bottomHeight,
            bottomVisibleHeight,
            gapTop,
            gapBottom,
            pipeGap: gapBottom - gapTop,
            playableHeight
        });
    }

    /** Convert a per-second Poisson rate into a frame-sized probability. */
    function chanceForDelta(ratePerSecond, deltaMs) {
        const rateValue = finiteNumber(ratePerSecond, 'ratePerSecond');
        const elapsed = finiteNumber(deltaMs, 'deltaMs');
        if (rateValue < 0 || elapsed < 0) {
            throw new RangeError('ratePerSecond and deltaMs cannot be negative');
        }
        return 1 - Math.exp(-rateValue * elapsed / 1000);
    }

    /** Convert "probability per interval" configuration into a per-second rate. */
    function rateFromIntervalChance(probability, intervalMs) {
        const chance = finiteNumber(probability, 'probability');
        const interval = finiteNumber(intervalMs, 'intervalMs');
        if (chance < 0 || chance >= 1) {
            throw new RangeError('probability must be in the [0, 1) range');
        }
        if (interval <= 0) {
            throw new RangeError('intervalMs must be greater than zero');
        }
        return -Math.log1p(-chance) * 1000 / interval;
    }

    /**
     * Picks the mutation most strongly represented by recent play metrics.
     * Scores are normalized by their thresholds, so frequent jumps do not
     * automatically drown out rarer impacts. Returns null below all thresholds.
     */
    function chooseMutation(metrics, options) {
        const source = metrics || {};
        const settings = options || {};
        const thresholds = Object.assign({}, DEFAULT_MUTATION_THRESHOLDS, settings.thresholds);
        const priority = settings.priority || ['nearMiss', 'pipeImpact', 'groundImpact', 'jump'];
        let winner = null;
        let winnerScore = 1;

        for (const metric of priority) {
            if (!Object.prototype.hasOwnProperty.call(MUTATION_BY_METRIC, metric)) {
                continue;
            }
            const threshold = finiteNumber(thresholds[metric], `thresholds.${metric}`);
            const count = finiteNumber(source[metric] || 0, `metrics.${metric}`);
            if (threshold <= 0 || count < 0) {
                throw new RangeError('Mutation thresholds must be positive and metrics cannot be negative');
            }
            const score = count / threshold;
            if (score > winnerScore || (score === winnerScore && winner === null)) {
                winner = metric;
                winnerScore = score;
            }
        }

        return winner === null ? null : MUTATION_BY_METRIC[winner];
    }

    function copyTransitions(transitions) {
        const result = {};
        for (const mode of PRIMARY_MODES) {
            const configured = transitions && transitions[mode];
            const values = configured === undefined ? DEFAULT_TRANSITIONS[mode] : configured;
            result[mode] = new Set(values || []);
        }
        return result;
    }

    function copyCompatibility(compatibility) {
        const result = {};
        for (const modifier of MODIFIERS) {
            const configured = compatibility && compatibility[modifier];
            const values = configured === undefined
                ? DEFAULT_MODIFIER_COMPATIBILITY[modifier]
                : configured;
            result[modifier] = new Set(values || []);
        }
        return result;
    }

    class ModeStateMachine {
        constructor(options) {
            const settings = options || {};
            this._transitions = copyTransitions(settings.transitions);
            this._compatibility = copyCompatibility(settings.modifierCompatibility);
            this._listeners = new Set();
            this._revision = 0;
            this._primary = 'normal';
            this._modifier = null;

            if (settings.primary && settings.primary !== 'normal') {
                this.activate(settings.primary, { force: true, reason: 'initial-state' });
            }
            if (settings.modifier) {
                this.activate(settings.modifier, { force: Boolean(settings.forceInitialModifier), reason: 'initial-state' });
            }
        }

        get primary() {
            return this._primary;
        }

        get modifier() {
            return this._modifier;
        }

        get revision() {
            return this._revision;
        }

        snapshot() {
            return Object.freeze({
                primary: this._primary,
                modifier: this._modifier,
                revision: this._revision
            });
        }

        isActive(mode) {
            return this._primary === mode || this._modifier === mode;
        }

        canActivate(mode, options) {
            const settings = options || {};
            if (PRIMARY_MODES.includes(mode)) {
                if (mode === this._primary) {
                    return true;
                }
                return Boolean(settings.force) || this._transitions[this._primary].has(mode);
            }
            if (MODIFIERS.includes(mode)) {
                if (mode === this._modifier) {
                    return true;
                }
                return Boolean(settings.force) || this._compatibility[mode].has(this._primary);
            }
            return false;
        }

        activate(mode, options) {
            const settings = options || {};
            if (!this.canActivate(mode, settings)) {
                return false;
            }
            if (this.isActive(mode)) {
                return true;
            }

            const previous = this.snapshot();
            if (PRIMARY_MODES.includes(mode)) {
                this._primary = mode;
                if (this._modifier && !this._compatibility[this._modifier].has(mode)) {
                    this._modifier = null;
                }
            } else {
                this._modifier = mode;
            }
            this._commit(previous, settings.reason || 'activate');
            return true;
        }

        deactivate(mode, options) {
            const settings = options || {};
            if (MODIFIERS.includes(mode)) {
                if (this._modifier !== mode) {
                    return false;
                }
                const previous = this.snapshot();
                this._modifier = null;
                this._commit(previous, settings.reason || 'deactivate');
                return true;
            }

            if (!PRIMARY_MODES.includes(mode) || this._primary !== mode || mode === 'normal') {
                return false;
            }
            const previous = this.snapshot();
            this._primary = 'normal';
            if (this._modifier && !this._compatibility[this._modifier].has('normal')) {
                this._modifier = null;
            }
            this._commit(previous, settings.reason || 'deactivate');
            return true;
        }

        reset(options) {
            const settings = options || {};
            if (this._primary === 'normal' && this._modifier === null) {
                return false;
            }
            const previous = this.snapshot();
            this._primary = 'normal';
            this._modifier = null;
            this._commit(previous, settings.reason || 'reset');
            return true;
        }

        subscribe(listener) {
            if (typeof listener !== 'function') {
                throw new TypeError('listener must be a function');
            }
            this._listeners.add(listener);
            return () => this._listeners.delete(listener);
        }

        _commit(previous, reason) {
            this._revision += 1;
            const event = Object.freeze({ previous, current: this.snapshot(), reason });
            for (const listener of this._listeners) {
                listener(event);
            }
        }
    }

    return Object.freeze({
        PRIMARY_MODES,
        MODIFIERS,
        DEFAULT_TRANSITIONS,
        DEFAULT_MUTATION_THRESHOLDS,
        rectsOverlap,
        isEntityOffscreen,
        resolveHorizontalCling,
        calculatePipeLayout,
        calculateDraggedPipeLayout,
        chanceForDelta,
        rateFromIntervalChance,
        chanceToRate: rateFromIntervalChance,
        rate: rateFromIntervalChance,
        chooseMutation,
        ModeStateMachine
    });
}));
