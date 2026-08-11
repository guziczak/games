import type { Vec2 } from './GameState';

export type MutationLane = 'upper' | 'lower';

/**
 * Device-independent input understood by the simulation. Pointer ownership,
 * hit testing, keyboard repeat and gesture recognition belong to the adapter.
 */
export type InputAction =
  | { readonly type: 'flap' }
  | { readonly type: 'ability-start' }
  | { readonly type: 'ability-aim'; readonly vector: Vec2 }
  | { readonly type: 'ability-release' }
  | { readonly type: 'ability-cancel' }
  | { readonly type: 'select-mutation'; readonly lane: MutationLane };

export interface SimulationInput {
  readonly actions: readonly InputAction[];
}

export const NO_INPUT: SimulationInput = Object.freeze({ actions: Object.freeze([]) });

export function normalizeSimulationInput(
  input: SimulationInput | readonly InputAction[] | undefined,
): readonly InputAction[] {
  if (!input) return NO_INPUT.actions;
  return Array.isArray(input) ? input : (input as SimulationInput).actions;
}
