"use server";

import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadGoalDashboardForViewer } from "@/features/goal-dashboard/load-goal-dashboard";
import { loadPeerVelocityForWeek } from "@/features/comparison/load-peer-velocity";
import { mondayUtcWeekKey } from "@/features/mastery-grid/grid-history-pure";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import {
  buildGoalRunwaySummary,
  buildTrajectoryPanelView,
  buildTrajectoryPeerLine,
  identifyTrajectoryBottleneck,
  type TrajectoryPanelView,
} from "@/features/momentum-hub/momentum-trajectory-enrichment-pure";
import {
  buildBottleneckGuidedAction,
  buildRetestGuidedAction,
} from "@/features/momentum-hub/momentum-value-equation-pure";
import { loadNextPendingRetest } from "@/features/intervention-retests/retest-reads";
import { projectTrajectoryLiftIfOverdueClosed } from "@/features/momentum-hub/proof-chain-pure";
import {
  computeTrajectoryIndexForUser,
  loadTrajectoryIndexHistory,
  priorWeekScoreFromHistory,
  upsertTrajectoryIndexSnapshot,
} from "@/features/trajectory-index/trajectory-index-snapshots";

export async function loadMomentumTrajectoryPanel(): Promise<TrajectoryPanelView | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);

  const trajectory = await computeTrajectoryIndexForUser(user.id);

  if (entitlements.momentumActive) {
    await upsertTrajectoryIndexSnapshot(user.id, trajectory).catch(() => undefined);
  }

  const [history, goalDashboard, masteryGrid, pendingRetest] = await Promise.all([
    entitlements.momentumActive
      ? loadTrajectoryIndexHistory(user.id, 30).catch(() => [])
      : Promise.resolve([]),
    entitlements.momentumActive
      ? loadGoalDashboardForViewer().catch(() => null)
      : Promise.resolve(null),
    loadMasteryGrid(user.id).catch(() => null),
    entitlements.momentumActive ? loadNextPendingRetest(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  let peerLine: string | null = null;
  if (entitlements.momentumActive) {
    const admin = createAdminClient();
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
    peerLine = buildTrajectoryPeerLine(peer ?? null);
  }

  const priorWeekScore = priorWeekScoreFromHistory(history);
  const totalSkillNodes =
    masteryGrid?.units.reduce((count, unit) => count + unit.nodes.length, 0) ?? 0;

  const goalRunway = buildGoalRunwaySummary({
    goal: goalDashboard
      ? {
          verifiedNodeCount: goalDashboard.verifiedNodeCount,
          daysUntilExam: goalDashboard.daysUntilExam,
        }
      : null,
    verifiedNodesGained30d: trajectory.verifiedNodesGained30d,
    totalSkillNodes,
  });

  const bottleneck = identifyTrajectoryBottleneck(trajectory);
  const counterfactual = pendingRetest?.isDue
    ? projectTrajectoryLiftIfOverdueClosed(trajectory)
    : null;
  const guidedAction = pendingRetest
    ? buildRetestGuidedAction({
        nodeName: pendingRetest.nodeName,
        skillNodeId: pendingRetest.skillNodeId,
        isDue: pendingRetest.isDue,
        counterfactual,
        closedLoops30d: trajectory.retestsCompleted30d,
        totalLoops30d: trajectory.retestsCompleted30d + trajectory.retestsDuePast30d,
      })
    : buildBottleneckGuidedAction(bottleneck, pendingRetest);

  return buildTrajectoryPanelView({
    momentumActive: entitlements.momentumActive,
    trajectory,
    priorWeekScore,
    peerLine,
    history,
    goalRunway,
    guidedAction,
  });
}
