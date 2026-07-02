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
import type { StudentGoal } from "@/features/student-goals/types";

export type GoalDashboardData = {
  goal: StudentGoal;
  verifiedNodeCount: number;
  currentPercentile: number | null;
  daysUntilExam: number | null;
  verdict: string;
  nextAction: string;
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

  return {
    goal,
    verifiedNodeCount: count ?? 0,
    currentPercentile: rankStats.percentile,
    daysUntilExam: daysUntilDate(goal.targetDate),
    verdict,
    nextAction,
  };
}
