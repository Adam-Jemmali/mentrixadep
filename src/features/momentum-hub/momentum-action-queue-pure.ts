import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";
import type { PendingRetestHubState } from "@/features/intervention-retests/retest-hub-pure";
import {
  DUEL_LOSS_RETEST_DELAY_MS,
  MOMENTUM_DUEL_LOSS_RETEST_DELAY_MS,
  MOMENTUM_STUDIO_INTERVENTION_RETEST_DELAY_MS,
  STUDIO_INTERVENTION_RETEST_DELAY_MS,
  formatRetestCountdownMs,
} from "@/features/intervention-retests/schedule-intervention-retests-pure";
import { buildLoopReportRowVerdict } from "@/features/loop-report/loop-report-pure";
import {
  bookGuideWithCreditHref,
  buildCreditGuidedAction,
  buildRetestGuidedAction,
  practiceQuestHref,
} from "@/features/momentum-hub/momentum-value-equation-pure";
import type { TrajectoryCounterfactual } from "@/features/momentum-hub/proof-chain-pure";

export type ActionQueueItemKind =
  | "retest_due"
  | "retest_scheduled"
  | "session_credit"
  | "guide_memory"
  | "weakest_node"
  | "closed_loop_followup";

export type ActionQueueItem = {
  kind: ActionQueueItemKind;
  priority: number;
  headline: string;
  evidence: string;
  countdownLabel?: string;
  hoursSaved?: number;
  ctaHref: string;
  ctaLabel: string;
};

export type GuideMemoryQueueInput = {
  guideName: string;
  verdict: string;
  nextAction: string;
};

export function retestHoursSavedVsBreakthrough(sourceType: string): number {
  const freeMs =
    sourceType === "duel_loss" ? DUEL_LOSS_RETEST_DELAY_MS : STUDIO_INTERVENTION_RETEST_DELAY_MS;
  const momentumMs =
    sourceType === "duel_loss"
      ? MOMENTUM_DUEL_LOSS_RETEST_DELAY_MS
      : MOMENTUM_STUDIO_INTERVENTION_RETEST_DELAY_MS;
  return Math.round((freeMs - momentumMs) / (60 * 60 * 1000));
}

function filterClosedLoops(
  loops: LoopReportRow[],
  pendingRetest: PendingRetestHubState | null,
): LoopReportRow[] {
  return loops.filter((row) => {
    if (!row.completedAt) return false;
    if (pendingRetest && row.skillNodeId === pendingRetest.skillNodeId) return false;
    return true;
  });
}

export function buildMomentumActionQueue(input: {
  pendingRetest: PendingRetestHubState | null;
  closedLoops: LoopReportRow[];
  sessionCreditsRemaining: number;
  creditExpiryLabel: string | null;
  weakestNodeName: string | null;
  weakestNodeId: string | null;
  guideMemory: GuideMemoryQueueInput | null;
  momentumActive: boolean;
  counterfactual: TrajectoryCounterfactual | null;
  closedLoops30d: number;
  totalLoops30d: number;
  maxItems?: number;
}): { items: ActionQueueItem[]; upsellLine: string | null } {
  const items: ActionQueueItem[] = [];
  const closedLoops = filterClosedLoops(input.closedLoops, input.pendingRetest);

  if (input.pendingRetest) {
    const retest = input.pendingRetest;
    const countdown = retest.isDue ? "Due now" : formatRetestCountdownMs(retest.remainingMs);
    const guided = buildRetestGuidedAction({
      nodeName: retest.nodeName,
      skillNodeId: retest.skillNodeId,
      isDue: retest.isDue,
      counterfactual: retest.isDue ? input.counterfactual : null,
      closedLoops30d: input.closedLoops30d,
      totalLoops30d: input.totalLoops30d,
    });
    items.push({
      kind: retest.isDue ? "retest_due" : "retest_scheduled",
      priority: retest.isDue ? 1 : 2,
      headline: retest.isDue ? `Retest due on ${retest.nodeName}` : `Priority retest on ${retest.nodeName}`,
      evidence: guided.verdict,
      countdownLabel: countdown,
      hoursSaved: !retest.isDue && retest.priorityRetest ? 24 : undefined,
      ctaHref: guided.href,
      ctaLabel: guided.label,
    });
  }

  if (input.momentumActive && input.sessionCreditsRemaining > 0) {
    const guided = buildCreditGuidedAction({
      creditsRemaining: input.sessionCreditsRemaining,
      creditExpiryLabel: input.creditExpiryLabel,
      weakestNodeName: input.weakestNodeName,
    });
    items.push({
      kind: "session_credit",
      priority: 3,
      headline: `${input.sessionCreditsRemaining} included session credit${input.sessionCreditsRemaining === 1 ? "" : "s"} left`,
      evidence: guided.verdict,
      ctaHref: guided.href,
      ctaLabel: guided.label,
    });
  }

  if (input.momentumActive && input.guideMemory) {
    items.push({
      kind: "guide_memory",
      priority: 4,
      headline: `Guide memory: ${input.guideMemory.guideName}`,
      evidence: input.guideMemory.verdict,
      ctaHref: "/student?sessionsTab=upcoming#sessions-history",
      ctaLabel: "View upcoming session",
    });
  }

  if (input.weakestNodeName) {
    items.push({
      kind: "weakest_node",
      priority: 5,
      headline: `Weakest open node: ${input.weakestNodeName}`,
      evidence: "Target in Quest or book a Guide.",
      ctaHref: input.weakestNodeId
        ? practiceQuestHref(input.weakestNodeName, input.weakestNodeId)
        : bookGuideWithCreditHref(input.weakestNodeName),
      ctaLabel: input.weakestNodeId
        ? `Practice ${input.weakestNodeName}`
        : `Book Guide on ${input.weakestNodeName}`,
    });
  }

  const latestClosed = closedLoops[0];
  if (latestClosed && input.momentumActive) {
    items.push({
      kind: "closed_loop_followup",
      priority: 6,
      headline: "Latest closed loop",
      evidence: buildLoopReportRowVerdict(latestClosed),
      ctaHref: "/student/loop",
      ctaLabel: "View loop history",
    });
  }

  items.sort((a, b) => a.priority - b.priority);

  const maxItems = input.momentumActive ? (input.maxItems ?? 5) : 1;
  const trimmed = items.slice(0, maxItems);

  const upsellLine =
    !input.momentumActive && items.length > 0
      ? "Momentum unlocks the full queue and priority retests."
      : null;

  return { items: trimmed, upsellLine };
}
