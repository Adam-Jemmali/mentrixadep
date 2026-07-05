import { formatRetestCountdownMs } from "@/features/intervention-retests/schedule-intervention-retests-pure";

export type PendingRetestHubState = {
  nodeName: string;
  skillNodeId: string;
  scheduledFor: string;
  isDue: boolean;
  remainingMs: number;
  priorityRetest: boolean;
};

export function buildRetestHubMessages(state: PendingRetestHubState): {
  verdict: string;
  nextAction: string;
  countdownLabel: string;
} {
  const countdown = formatRetestCountdownMs(state.remainingMs);

  if (state.isDue) {
    return {
      verdict: `Retest due on ${state.nodeName}. Your first attempt here is rank-critical.`,
      nextAction: "Open Quest and take the retest now.",
      countdownLabel: "Due now",
    };
  }

  if (state.priorityRetest) {
    return {
      verdict: `Priority retest on ${state.nodeName} unlocks in ${countdown}. Momentum cut your wait in half.`,
      nextAction: "Queue a practice pack while you wait, then retest the moment it opens.",
      countdownLabel: countdown,
    };
  }

  return {
    verdict: `Retest on ${state.nodeName} unlocks in ${countdown}. Momentum members wait half as long.`,
    nextAction: "Practice related nodes in Quest while you wait.",
    countdownLabel: countdown,
  };
}
