import { isSolidState } from "@/features/skill-tree/skill-tree-unlock-pure";
import type { MasteryNodeState } from "@/features/mastery-grid/types";

export const PHOENIX_SLUMP_MIN_INCORRECT = 5;

export type PhoenixSlumpState = {
  consecutiveIncorrect: number;
  slumpPending: boolean;
};

export function defaultPhoenixSlumpState(): PhoenixSlumpState {
  return { consecutiveIncorrect: 0, slumpPending: false };
}

export function applyPhoenixSlumpOutcome(
  state: PhoenixSlumpState,
  correct: boolean,
): PhoenixSlumpState {
  if (correct) {
    return {
      consecutiveIncorrect: 0,
      slumpPending: state.slumpPending,
    };
  }

  const consecutiveIncorrect = state.consecutiveIncorrect + 1;
  const slumpPending =
    state.slumpPending || consecutiveIncorrect >= PHOENIX_SLUMP_MIN_INCORRECT;

  return { consecutiveIncorrect, slumpPending };
}

export function detectPhoenixRecovery(input: {
  priorState: MasteryNodeState;
  nextState: MasteryNodeState;
  slumpPending: boolean;
}): boolean {
  if (!input.slumpPending) return false;
  if (isSolidState(input.priorState)) return false;
  return isSolidState(input.nextState);
}

export function phoenixAwardKey(
  userId: string,
  skillNodeId: string,
  recoveryAt: Date,
): string {
  const day = recoveryAt.toISOString().slice(0, 10);
  return `phoenix_recovery:${userId}:${skillNodeId}:${day}`;
}
