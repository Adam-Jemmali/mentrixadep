import type { TrajectoryCounterfactual } from "@/features/momentum-hub/proof-chain-pure";
import type { PendingRetestHubState } from "@/features/intervention-retests/retest-hub-pure";
import type { TrajectoryBottleneck } from "@/features/momentum-hub/momentum-trajectory-enrichment-pure";

/** Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort) */
export type MomentumValueChips = {
  dreamOutcome: string;
  perceivedLikelihood: string;
  timeDelay: string;
  effort: string;
};

export type MomentumGuidedAction = {
  label: string;
  href: string;
  chips: MomentumValueChips;
  verdict: string;
  nextAction: string;
};

export function retestQuestHref(nodeName: string, skillNodeId: string): string {
  return `/student/quest?prompt=${encodeURIComponent(`Retest ${nodeName}`)}&retestNode=${encodeURIComponent(skillNodeId)}`;
}

export function practiceQuestHref(nodeName: string, skillNodeId?: string): string {
  const base = `/student/quest?prompt=${encodeURIComponent(`Practice ${nodeName}`)}`;
  if (!skillNodeId) return base;
  return `${base}&focusNode=${encodeURIComponent(skillNodeId)}`;
}

export function bookGuideWithCreditHref(weakestNodeName?: string | null): string {
  if (weakestNodeName) {
    return `/student?subject=${encodeURIComponent("AP Calculus AB")}&focus=${encodeURIComponent(weakestNodeName)}#browse-guides`;
  }
  return "/student#browse-guides";
}

export function buildRetestGuidedAction(input: {
  nodeName: string;
  skillNodeId: string;
  isDue: boolean;
  counterfactual: TrajectoryCounterfactual | null;
  closedLoops30d: number;
  totalLoops30d: number;
}): MomentumGuidedAction {
  const lift = input.counterfactual?.lift ?? 0;
  const closureRate =
    input.totalLoops30d > 0
      ? Math.round((input.closedLoops30d / input.totalLoops30d) * 100)
      : null;

  return {
    label: input.isDue ? `Start retest: ${input.nodeName}` : `Queue practice: ${input.nodeName}`,
    href: input.isDue
      ? retestQuestHref(input.nodeName, input.skillNodeId)
      : practiceQuestHref(input.nodeName, input.skillNodeId),
    chips: {
      dreamOutcome:
        lift > 0
          ? `Trajectory +${lift} when this loop closes`
          : "Permanent verified movement on your grid",
      perceivedLikelihood:
        closureRate != null
          ? `You closed ${closureRate}% of loops this month`
          : "First-attempt retest is rank-critical proof",
      timeDelay: input.isDue ? "~4 min to finish" : "Unlocks when window opens",
      effort: "1 tap — Quest opens on this node",
    },
    verdict:
      lift > 0
        ? `Closing ${input.nodeName} moves Trajectory ${input.counterfactual!.currentScore} → ${input.counterfactual!.projectedScore}.`
        : `Rank is frozen on ${input.nodeName} until first retest.`,
    nextAction: input.isDue
      ? `Tap below. Quest loads ${input.nodeName} retest immediately.`
      : `Practice related items until the retest unlocks, then return here.`,
  };
}

export function buildCreditGuidedAction(input: {
  creditsRemaining: number;
  creditExpiryLabel: string | null;
  weakestNodeName: string | null;
}): MomentumGuidedAction {
  return {
    label: input.weakestNodeName
      ? `Book Guide on ${input.weakestNodeName} ($0)`
      : "Book included Guide session ($0)",
    href: bookGuideWithCreditHref(input.weakestNodeName),
    chips: {
      dreamOutcome: "Live coaching loop + priority retest in 24h",
      perceivedLikelihood: `${input.creditsRemaining} credit${input.creditsRemaining === 1 ? "" : "s"} ready at checkout`,
      timeDelay: input.creditExpiryLabel ? `Book before ${input.creditExpiryLabel}` : "Use this month",
      effort: "Pick a slot — credit applies at checkout",
    },
    verdict: "Your included session is the fastest path to a new Proof Chain.",
    nextAction: "Book on your weakest open node so the Guide targets what still will not move.",
  };
}

export function buildBottleneckGuidedAction(
  bottleneck: TrajectoryBottleneck,
  pendingRetest: PendingRetestHubState | null,
): MomentumGuidedAction | null {
  if (bottleneck.component === "retest" && pendingRetest) {
    return buildRetestGuidedAction({
      nodeName: pendingRetest.nodeName,
      skillNodeId: pendingRetest.skillNodeId,
      isDue: pendingRetest.isDue,
      counterfactual: null,
      closedLoops30d: 0,
      totalLoops30d: 0,
    });
  }

  if (bottleneck.component === "verified") {
    return {
      label: "Verify next skill in Quest",
      href: "/student/quest?mode=verify",
      chips: {
        dreamOutcome: "Lift Verified nodes component on Trajectory Index",
        perceivedLikelihood: "Item bank is reviewed — first attempt counts",
        timeDelay: "~8 min for a focused pack",
        effort: "One Quest pack on an unverified node",
      },
      verdict: bottleneck.fixAction,
      nextAction: "Pick a node you have not verified yet. First attempt is permanent.",
    };
  }

  return null;
}

export type MomentumPlaybook = {
  primary: MomentumGuidedAction;
  rank: "retest_due" | "credit_expiring" | "bottleneck" | "velocity";
};

export function buildMomentumPlaybook(input: {
  pendingRetest: PendingRetestHubState | null;
  counterfactual: TrajectoryCounterfactual | null;
  sessionCreditsRemaining: number;
  creditExpiryLabel: string | null;
  weakestNodeName: string | null;
  bottleneck: TrajectoryBottleneck | null;
  closedLoops30d: number;
  totalLoops30d: number;
  creditExpiresWithinDays: number | null;
}): MomentumPlaybook | null {
  if (input.pendingRetest?.isDue) {
    return {
      rank: "retest_due",
      primary: buildRetestGuidedAction({
        nodeName: input.pendingRetest.nodeName,
        skillNodeId: input.pendingRetest.skillNodeId,
        isDue: true,
        counterfactual: input.counterfactual,
        closedLoops30d: input.closedLoops30d,
        totalLoops30d: input.totalLoops30d,
      }),
    };
  }

  if (
    input.sessionCreditsRemaining > 0 &&
    input.creditExpiresWithinDays != null &&
    input.creditExpiresWithinDays <= 10
  ) {
    return {
      rank: "credit_expiring",
      primary: buildCreditGuidedAction({
        creditsRemaining: input.sessionCreditsRemaining,
        creditExpiryLabel: input.creditExpiryLabel,
        weakestNodeName: input.weakestNodeName,
      }),
    };
  }

  if (input.pendingRetest) {
    return {
      rank: "retest_due",
      primary: buildRetestGuidedAction({
        nodeName: input.pendingRetest.nodeName,
        skillNodeId: input.pendingRetest.skillNodeId,
        isDue: false,
        counterfactual: null,
        closedLoops30d: input.closedLoops30d,
        totalLoops30d: input.totalLoops30d,
      }),
    };
  }

  if (input.sessionCreditsRemaining > 0) {
    return {
      rank: "credit_expiring",
      primary: buildCreditGuidedAction({
        creditsRemaining: input.sessionCreditsRemaining,
        creditExpiryLabel: input.creditExpiryLabel,
        weakestNodeName: input.weakestNodeName,
      }),
    };
  }

  if (input.bottleneck) {
    const guided = buildBottleneckGuidedAction(input.bottleneck, input.pendingRetest);
    if (guided) {
      return { rank: "bottleneck", primary: guided };
    }
  }

  return null;
}

export function daysUntilCreditExpiry(periodMonth: string | null, now = new Date()): number | null {
  if (!periodMonth) return null;
  try {
    const start = new Date(`${periodMonth}T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}
