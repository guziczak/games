export interface RandomResult {
  readonly value: number;
  readonly state: number;
}

const FALLBACK_SEED = 0x6d2b79f5;

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return FALLBACK_SEED;
  const normalized = Math.trunc(seed) >>> 0;
  return normalized === 0 ? FALLBACK_SEED : normalized;
}

/** A serializable xorshift32 step. `value` is always in [0, 1). */
export function nextRandom(seed: number): RandomResult {
  let state = normalizeSeed(seed);
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  state >>>= 0;
  return {
    value: state / 0x1_0000_0000,
    state,
  };
}

export function randomRange(seed: number, minimum: number, maximum: number): RandomResult {
  const next = nextRandom(seed);
  return {
    value: minimum + (maximum - minimum) * next.value,
    state: next.state,
  };
}

export function randomInt(seed: number, minimum: number, maximumExclusive: number): RandomResult {
  if (!Number.isInteger(minimum) || !Number.isInteger(maximumExclusive) || maximumExclusive <= minimum) {
    throw new RangeError('randomInt expects an integer range with maximumExclusive > minimum');
  }
  const next = nextRandom(seed);
  return {
    value: minimum + Math.floor(next.value * (maximumExclusive - minimum)),
    state: next.state,
  };
}

export function shuffleSeeded<T>(seed: number, values: readonly T[]): {
  readonly values: T[];
  readonly state: number;
} {
  const shuffled = [...values];
  let state = normalizeSeed(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const next = randomInt(state, 0, index + 1);
    state = next.state;
    const swapIndex = next.value;
    const value = shuffled[index] as T;
    shuffled[index] = shuffled[swapIndex] as T;
    shuffled[swapIndex] = value;
  }
  return { values: shuffled, state };
}
