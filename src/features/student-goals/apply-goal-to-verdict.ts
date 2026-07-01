/**
 * Internal goal verdict enrichment — server-only imports (verdict-engine / cron).
 * Not a server action module; never import from client components.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { loadVerifiedRankCache } from "@/features/guidance/verdict-materialized-reads";
import { VERIFIED_NODE_SUCCESS_THRESHOLD } from "@/features/student-goals/types";
import { loadActiveStudentGoalInternal } from "@/features/student-goals/load-student-goal";
import {
  applyGoalToVerdict,
  type GoalVerdictContext,
} from "@/features/student-goals/goal-verdict-pure";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";

async function countVerifiedNodesAbove70(userId: string): Promise<{
  count: number;
  totalNodes: number;
}> {
  const admin = createAdminClient();

  const { data: skillNodes } = await admin
    .from("skill_nodes")
    .select("id")
    .eq("subject", AP_CALC_AB_SUBJECT);

  const nodeIds = (skillNodes ?? []).map((row) => String(row.id));
  if (nodeIds.length === 0) return { count: 0, totalNodes: 0 };

  const [{ data: vfaRows }, { data: rollingRows }] = await Promise.all([
    admin
      .from("verified_first_attempts")
      .select("skill_node_id, is_correct")
      .eq("user_id", userId)
      .in("skill_node_id", nodeIds),
    admin
      .from("student_node_rolling_stats")
      .select("skill_node_id, rolling_accuracy")
      .eq("user_id", userId)
      .in("skill_node_id", nodeIds)
      .gte("rolling_accuracy", VERIFIED_NODE_SUCCESS_THRESHOLD),
  ]);

  const above70 = new Set<string>();
  for (const row of vfaRows ?? []) {
    if (row.is_correct) above70.add(String(row.skill_node_id));
  }
  for (const row of rollingRows ?? []) {
    above70.add(String(row.skill_node_id));
  }

  return { count: above70.size, totalNodes: nodeIds.length };
}

async function loadHighestImpactNode(
  userId: string,
): Promise<{ skillNodeId: string; nodeName: string } | null> {
  const weakest = await getWeakestNodes(userId, AP_CALC_AB_SUBJECT, 5);
  const pick = weakest[0];
  if (!pick) return null;
  return { skillNodeId: pick.id, nodeName: pick.nodeName };
}

export async function applyActiveGoalToVerdict(
  userId: string,
  verdict: Verdict,
): Promise<Verdict> {
  const goal = await loadActiveStudentGoalInternal(userId, AP_CALC_AB_SUBJECT);
  if (!goal) return verdict;

  const [rank, nodeCounts, highestImpactNode] = await Promise.all([
    loadVerifiedRankCache(userId),
    countVerifiedNodesAbove70(userId),
    loadHighestImpactNode(userId),
  ]);

  const ctx: GoalVerdictContext = {
    currentPercentile: rank.percentile,
    verifiedNodesAbove70: nodeCounts.count,
    totalSubjectNodes: nodeCounts.totalNodes,
    highestImpactNode,
  };

  return applyGoalToVerdict(verdict, goal, ctx);
}
