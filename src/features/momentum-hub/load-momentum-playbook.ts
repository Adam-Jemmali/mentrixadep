"use server";

import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadNextPendingRetest, loadLoopReportRows } from "@/features/intervention-retests/retest-reads";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { computeTrajectoryIndexForUser } from "@/features/trajectory-index/trajectory-index-snapshots";
import { identifyTrajectoryBottleneck } from "@/features/momentum-hub/momentum-trajectory-enrichment-pure";
import {
  projectTrajectoryLiftIfOverdueClosed,
} from "@/features/momentum-hub/proof-chain-pure";
import {
  buildMomentumPlaybook,
  daysUntilCreditExpiry,
  type MomentumPlaybook,
} from "@/features/momentum-hub/momentum-value-equation-pure";

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

export async function loadMomentumPlaybook(): Promise<MomentumPlaybook | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!entitlements.momentumActive) return null;

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingRetest, loopRows, weakest, trajectory] = await Promise.all([
    loadNextPendingRetest(user.id).catch(() => null),
    loadLoopReportRows(user.id, { fullHistory: true, limit: 50 }).catch(() => []),
    getWeakestNodes(user.id, AP_CALC_AB_SUBJECT, 1).catch(() => []),
    computeTrajectoryIndexForUser(user.id),
  ]);

  const closedLoops30d = loopRows.filter((row) => row.completedAt && row.scheduledFor >= sinceIso);
  const counterfactual = pendingRetest?.isDue
    ? projectTrajectoryLiftIfOverdueClosed(trajectory)
    : null;

  const creditExpiry = formatCreditExpiry(entitlements.sessionCreditPeriodMonth);

  return buildMomentumPlaybook({
    pendingRetest,
    counterfactual,
    sessionCreditsRemaining: entitlements.sessionCreditsRemaining,
    creditExpiryLabel: creditExpiry,
    weakestNodeName: weakest[0]?.nodeName ?? null,
    bottleneck: identifyTrajectoryBottleneck(trajectory),
    closedLoops30d: closedLoops30d.length,
    totalLoops30d: loopRows.filter((row) => row.scheduledFor >= sinceIso).length,
    creditExpiresWithinDays: daysUntilCreditExpiry(entitlements.sessionCreditPeriodMonth),
  });
}
