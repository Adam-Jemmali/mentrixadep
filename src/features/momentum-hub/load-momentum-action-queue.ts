"use server";

import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadNextPendingRetest, loadLoopReportRows } from "@/features/intervention-retests/retest-reads";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadGuideMemoryForSession } from "@/features/guide-memory/load-guide-memory";
import { isGuideMemoryWindowOpen } from "@/features/guide-memory/guide-memory-pure";
import { computeTrajectoryIndexForUser } from "@/features/trajectory-index/trajectory-index-snapshots";
import { projectTrajectoryLiftIfOverdueClosed } from "@/features/momentum-hub/proof-chain-pure";
import {
  buildMomentumActionQueue,
  type ActionQueueItem,
} from "@/features/momentum-hub/momentum-action-queue-pure";

function formatCreditExpiry(periodMonth: string | null): string | null {
  if (!periodMonth) return null;
  try {
    const start = new Date(`${periodMonth}T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(end);
  } catch {
    return null;
  }
}

export type MomentumActionQueueData = {
  items: ActionQueueItem[];
  upsellLine: string | null;
  momentumActive: boolean;
};

export async function loadMomentumActionQueue(input?: {
  upcomingSession?: {
    tutorId: string;
    startTime: string;
    guideName: string;
  } | null;
}): Promise<MomentumActionQueueData | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRetest, loopRows, weakest, trajectory] = await Promise.all([
    loadNextPendingRetest(user.id).catch(() => null),
    loadLoopReportRows(user.id, { fullHistory: true, limit: 50 }).catch(() => []),
    getWeakestNodes(user.id, AP_CALC_AB_SUBJECT, 1).catch(() => []),
    computeTrajectoryIndexForUser(user.id),
  ]);

  let guideMemory: { guideName: string; verdict: string; nextAction: string } | null = null;
  const upcoming = input?.upcomingSession;
  if (
    entitlements.momentumActive &&
    upcoming &&
    isGuideMemoryWindowOpen(upcoming.startTime)
  ) {
    const memory = await loadGuideMemoryForSession({
      studentId: user.id,
      guideId: upcoming.tutorId,
      sessionStartTime: upcoming.startTime,
      guideName: upcoming.guideName,
    }).catch(() => null);
    if (memory) {
      guideMemory = {
        guideName: memory.guideName,
        verdict: memory.verdict,
        nextAction: memory.nextAction,
      };
    }
  }

  const closedLoops = loopRows.filter((row) => row.completedAt);
  const closedLoops30d = loopRows.filter(
    (row) => row.completedAt && row.scheduledFor >= sinceIso,
  ).length;
  const totalLoops30d = loopRows.filter((row) => row.scheduledFor >= sinceIso).length;
  const counterfactual =
    pendingRetest?.isDue ? projectTrajectoryLiftIfOverdueClosed(trajectory) : null;

  const { items, upsellLine } = buildMomentumActionQueue({
    pendingRetest,
    closedLoops,
    sessionCreditsRemaining: entitlements.sessionCreditsRemaining,
    creditExpiryLabel: formatCreditExpiry(entitlements.sessionCreditPeriodMonth),
    weakestNodeName: weakest[0]?.nodeName ?? null,
    weakestNodeId: weakest[0]?.id ?? null,
    guideMemory,
    momentumActive: entitlements.momentumActive,
    counterfactual,
    closedLoops30d,
    totalLoops30d,
  });

  if (items.length === 0) return null;

  return {
    items,
    upsellLine,
    momentumActive: entitlements.momentumActive,
  };
}
