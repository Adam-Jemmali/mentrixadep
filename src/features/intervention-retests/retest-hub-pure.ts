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
      nextAction: `Tap Start retest — Quest loads ${state.nodeName} immediately.`,
      countdownLabel: "Due now",
    };
  }

  if (state.priorityRetest) {
    return {
      verdict: `Priority retest on ${state.nodeName} unlocks in ${countdown}. Momentum cut your wait in half.`,
      nextAction: `Queue practice on ${state.nodeName} until the window opens, then retest.`,
      countdownLabel: countdown,
    };
  }

  return {
    verdict: `Retest on ${state.nodeName} unlocks in ${countdown}. Momentum membership members wait half as long.`,
    nextAction: `Practice ${state.nodeName} in Quest while you wait, then return here to retest.`,
    countdownLabel: countdown,
  };
}
