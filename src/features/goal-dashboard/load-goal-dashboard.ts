"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import { loadActiveStudentGoalForViewer } from "@/features/student-goals/load-student-goal";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadVerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import {
  buildGoalDashboardVerdict,
  daysUntilDate,
} from "@/features/goal-dashboard/goal-dashboard-pure";
import { loadPeerVelocityForWeek } from "@/features/comparison/load-peer-velocity";
import { buildPeerVelocityLine } from "@/features/comparison/peer-velocity-pure";
import { mondayUtcWeekKey } from "@/features/mastery-grid/grid-history-pure";
import { buildPackSprintReceiptLine } from "@/features/entitlements/pack-sprint-pure";

export type GoalDashboardData = {
  goal: StudentGoal;
  verifiedNodeCount: number;
  currentPercentile: number | null;
  daysUntilExam: number | null;
  verdict: string;
  nextAction: string;
  peerTrendLine: string | null;
  packSprintLine: string | null;
};

export async function loadGoalDashboardForViewer(): Promise<GoalDashboardData | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.goal_dashboard")) {
    return null;
  }

  const goal = await loadActiveStudentGoalForViewer(AP_CALC_AB_SUBJECT);
  if (!goal) return null;

  const admin = createAdminClient();
  const [rankStats, { count }] = await Promise.all([
    loadVerifiedFirstAttemptRankStats(user.id),
    admin
      .from("verified_first_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const { verdict, nextAction } = buildGoalDashboardVerdict({
    goal,
    verifiedNodeCount: count ?? 0,
    targetPercentile: goal.targetPercentile,
    currentPercentile: rankStats.percentile,
    daysUntilExam: daysUntilDate(goal.targetDate),
  });

  let peerTrendLine: string | null = null;
  if (hasEntitlement(entitlements, "momentum.peer_trends")) {
    const weekStart = new Date(`${mondayUtcWeekKey()}T00:00:00.000Z`);
    const verifiedThisWeek = await admin
      .from("verified_first_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_correct", true)
      .gte("attempted_at", weekStart.toISOString());
    const peer = await loadPeerVelocityForWeek({
      userId: user.id,
      userVerifiedThisWeek: verifiedThisWeek.count ?? 0,
      weekStart,
    }).catch(() => null);
    if (peer) {
      peerTrendLine = buildPeerVelocityLine(peer);
    }
  }

  return {
    goal,
    verifiedNodeCount: count ?? 0,
    currentPercentile: rankStats.percentile,
    daysUntilExam: daysUntilDate(goal.targetDate),
    verdict,
    nextAction,
    peerTrendLine,
    packSprintLine:
      entitlements.packSprint && entitlements.packSprint.creditsRemaining > 0
        ? buildPackSprintReceiptLine(entitlements.packSprint)
        : null,
  };
}
