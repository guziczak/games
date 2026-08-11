import type { ModeId, MutationModeId } from './GameState';

export interface EventStamp {
  readonly tick: number;
  readonly time: number;
}

export type ScoreKind =
  | 'obstacle-pass'
  | 'coin'
  | 'near-miss'
  | 'frog-catapult'
  | 'rubber-ricochet'
  | 'steel-break'
  | 'ghost-phase'
  | 'stork-vault';

export type ModeAction =
  | 'frog-cling'
  | 'frog-launch'
  | 'rubber-aim'
  | 'rubber-launch'
  | 'rubber-bounce'
  | 'steel-critical'
  | 'steel-overheat'
  | 'ghost-phase-start'
  | 'ghost-phase-end'
  | 'stork-lock'
  | 'stork-vault-start'
  | 'stork-vault-end';

export type GameEvent =
  | (EventStamp & { readonly type: 'flap'; readonly mode: ModeId })
  | (EventStamp & { readonly type: 'obstacle-spawned'; readonly obstacleId: string })
  | (EventStamp & { readonly type: 'coin-spawned'; readonly coinId: string; readonly obstacleId: string })
  | (EventStamp & { readonly type: 'obstacle-passed'; readonly obstacleId: string })
  | (EventStamp & { readonly type: 'coin-collected'; readonly coinId: string; readonly obstacleId: string })
  | (EventStamp & { readonly type: 'near-miss'; readonly obstacleId: string; readonly clearance: number })
  | (EventStamp & { readonly type: 'collision'; readonly entityId: string; readonly outcome: 'fatal' | 'cling' | 'bounce' | 'destroy' | 'phase' | 'vault' | 'shielded' })
  | (EventStamp & { readonly type: 'score-awarded'; readonly kind: ScoreKind; readonly entityId: string; readonly basePoints: number; readonly awardedPoints: number; readonly multiplier: number })
  | (EventStamp & { readonly type: 'combo-changed'; readonly links: number; readonly multiplier: number })
  | (EventStamp & { readonly type: 'combo-expired' })
  | (EventStamp & { readonly type: 'dna-changed'; readonly value: number; readonly delta: number })
  | (EventStamp & { readonly type: 'mutation-offered'; readonly offerId: string; readonly upper: MutationModeId; readonly lower: MutationModeId })
  | (EventStamp & { readonly type: 'mutation-selected'; readonly offerId: string; readonly mode: MutationModeId; readonly lane: 'upper' | 'lower' })
  | (EventStamp & { readonly type: 'mode-entered'; readonly mode: MutationModeId; readonly duration: number })
  | (EventStamp & { readonly type: 'mode-exited'; readonly mode: MutationModeId; readonly reason: 'timer' | 'overheat' | 'replaced' })
  | (EventStamp & { readonly type: 'mode-action'; readonly mode: MutationModeId; readonly action: ModeAction; readonly entityId?: string })
  | (EventStamp & { readonly type: 'game-over'; readonly reason: 'boundary' | 'obstacle'; readonly entityId?: string });
