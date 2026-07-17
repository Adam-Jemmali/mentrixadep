import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  buildMasteryGridNextAction,
  groupSkillNodesIntoUnits,
  resolveMasteryNodeState,
} from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { loadMasteryGridRankVerdict } from "@/features/guidance/last-seen-rank-state";
import {
  computeBetterThanPercent,
  type AccuracyBucketRow,
} from "@/features/comparison/comparison-context-pure";
import {
  loadVerifiedFirstAttemptRankStats,
  MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE,
} from "@/features/xp/calibrated-rank";
import { peerTopPercent } from "@/features/xp/rank-statistics-pure";

type SkillNodeRow = {
  id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
  node_slug: string;
  display_order: number;
};

export async function loadMasteryGrid(userId: string): Promise<MasteryGridData> {
  const admin = createAdminClient();

  const { data: skillNodes, error: nodesError } = await admin
    .from("skill_nodes")
    .select("id, unit_number, unit_name, node_name, node_slug, display_order")
    .eq("subject", AP_CALC_AB_SUBJECT)
    .order("display_order");

  if (nodesError) throw new Error(nodesError.message);

  const nodeIds = (skillNodes ?? []).map((node) => node.id);

  const [verifiedResult, knowledgeResult, bucketResult, rankStats] = await Promise.all([
    nodeIds.length > 0
      ? admin
          .from("verified_first_attempts")
          .select("skill_node_id, is_correct")
          .eq("user_id", userId)
          .in("skill_node_id", nodeIds)
      : Promise.resolve({ data: [], error: null }),
    nodeIds.length > 0
      ? admin
          .from("student_knowledge_nodes")
          .select("skill_node_id, attempts, correct")
          .eq("user_id", userId)
          .eq("subject", AP_CALC_AB_SUBJECT)
          .in("skill_node_id", nodeIds)
      : Promise.resolve({ data: [], error: null }),
    nodeIds.length > 0
      ? admin
          .from("node_percentile_snapshot")
          .select("skill_node_id, accuracy_bucket, user_count")
          .in("skill_node_id", nodeIds)
      : Promise.resolve({ data: [], error: null }),
    loadVerifiedFirstAttemptRankStats(userId).catch(() => null),
  ]);

  if (verifiedResult.error) throw new Error(verifiedResult.error.message);
  if (knowledgeResult.error) throw new Error(knowledgeResult.error.message);
  if (bucketResult.error) throw new Error(bucketResult.error.message);

  const verifiedByNode = new Map<string, { isCorrect: boolean }>();
  for (const row of verifiedResult.data ?? []) {
    verifiedByNode.set(row.skill_node_id, { isCorrect: row.is_correct });
  }

  const knowledgeByNode = new Map<string, { attempts: number; correct: number }>();
  for (const row of knowledgeResult.data ?? []) {
    if (!row.skill_node_id) continue;
    knowledgeByNode.set(row.skill_node_id, {
      attempts: row.attempts ?? 0,
      correct: row.correct ?? 0,
    });
  }

  const bucketsByNode = new Map<string, AccuracyBucketRow[]>();
  for (const row of bucketResult.data ?? []) {
    if (!row.skill_node_id) continue;
    const list = bucketsByNode.get(row.skill_node_id) ?? [];
    list.push({
      accuracyBucket: Number(row.accuracy_bucket),
      userCount: Number(row.user_count),
    });
    bucketsByNode.set(row.skill_node_id, list);
  }

  const units = groupSkillNodesIntoUnits(skillNodes as SkillNodeRow[], (node) => {
    const verified = verifiedByNode.get(node.id) ?? null;
    const knowledge = knowledgeByNode.get(node.id) ?? null;
    const resolved = resolveMasteryNodeState(verified, knowledge);
    const practiceAttempts = knowledge?.attempts ?? 0;
    const practiceCorrect = knowledge?.correct ?? 0;

    let peerBetterThanPercent: number | null = null;
    if (verified) {
      const actorAccuracy = verified.isCorrect ? 100 : 0;
      peerBetterThanPercent = computeBetterThanPercent(
        actorAccuracy,
        bucketsByNode.get(node.id) ?? [],
      );
    }

    return {
      state: resolved.state,
      accuracyPercent: resolved.accuracyPercent,
      practiceAttempts,
      practiceCorrect,
      hasVerifiedAttempt: verified != null,
      verifiedCorrect: verified?.isCorrect ?? null,
      peerBetterThanPercent,
    };
  });

  const verdict = await loadMasteryGridRankVerdict(userId).catch(() => null);

  const globalRank =
    rankStats && rankStats.verifiedCount > 0
      ? {
          accuracyPercent: rankStats.accuracyPercent,
          verifiedCount: rankStats.verifiedCount,
          topPercent:
            rankStats.percentile != null &&
            rankStats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE
              ? peerTopPercent(rankStats.percentile)
              : null,
        }
      : undefined;

  return {
    subject: AP_CALC_AB_SUBJECT,
    units,
    globalRank,
    nextActionLine: verdict?.nextAction.label ?? buildMasteryGridNextAction(units),
    verdict: verdict ?? undefined,
  };
}
