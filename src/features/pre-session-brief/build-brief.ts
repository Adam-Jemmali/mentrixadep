import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { loadGuideImpactNodeStats } from "@/features/guidance/verdict-materialized-reads";
import {
  mapReceiptToPreSessionBrief,
  mergeLastAttemptAt,
  pickSuggestedStartingNode,
  type DeterministicPreSessionBriefReceipt,
  type GuideStrengthReceipt,
  type VerifiedGapReceipt,
  type WarmupItemReceipt,
} from "@/features/pre-session-brief/build-brief-pure";
import type { PreSessionBrief } from "@/features/pre-session-brief/brief-types";

type BuildBriefParams = {
  studentId: string;
  guideId: string | null;
  course: string;
};

async function loadWeakestRollingGaps(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  limit = 3,
): Promise<VerifiedGapReceipt[]> {
  const { data: stats } = await admin
    .from("student_node_rolling_stats")
    .select("skill_node_id, rolling_accuracy, last_updated")
    .eq("user_id", studentId)
    .order("rolling_accuracy", { ascending: true })
    .limit(limit * 3);

  if (!stats?.length) return [];

  const nodeIds = [...new Set(stats.map((row) => String(row.skill_node_id)))];
  const { data: nodes } = await admin
    .from("skill_nodes")
    .select("id, node_name, subject")
    .in("id", nodeIds)
    .eq("subject", AP_CALC_AB_SUBJECT);

  const nodeById = new Map((nodes ?? []).map((node) => [String(node.id), node]));

  const gaps: VerifiedGapReceipt[] = [];
  for (const row of stats) {
    const node = nodeById.get(String(row.skill_node_id));
    if (!node) continue;
    gaps.push({
      skillNodeId: String(row.skill_node_id),
      nodeName: String(node.node_name),
      accuracy: Number(row.rolling_accuracy ?? 0),
      lastAttemptAt: row.last_updated ? String(row.last_updated) : null,
    });
    if (gaps.length >= limit) break;
  }

  return gaps;
}

async function loadRecentAttemptsForNodes(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  nodeIds: string[],
  limit = 3,
) {
  if (nodeIds.length === 0) return [];

  const { data } = await admin
    .from("user_quest_progress")
    .select("skill_node_id, last_attempt_at")
    .eq("user_id", studentId)
    .in("skill_node_id", nodeIds)
    .not("last_attempt_at", "is", null)
    .order("last_attempt_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

async function loadWarmupItems(
  admin: ReturnType<typeof createAdminClient>,
  skillNodeId: string,
  limit = 2,
): Promise<WarmupItemReceipt[]> {
  const { data } = await admin
    .from("item_bank")
    .select("id, prompt, explanation")
    .eq("status", "approved")
    .eq("skill_node_id", skillNodeId)
    .order("difficulty_rating", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    prompt: String(row.prompt),
    explanation: String(row.explanation ?? ""),
  }));
}

export async function buildDeterministicPreSessionBrief(
  params: BuildBriefParams,
): Promise<
  { ok: true; receipt: DeterministicPreSessionBriefReceipt; brief: PreSessionBrief } | { ok: false; reason: string }
> {
  if (!isApCalculusAbSubject(params.course)) {
    return {
      ok: false,
      reason: "Pre-session brief receipts are limited to AP Calculus AB verified practice.",
    };
  }

  const admin = createAdminClient();
  const baseGaps = await loadWeakestRollingGaps(admin, params.studentId);
  if (baseGaps.length === 0) {
    return {
      ok: false,
      reason: "No verified rolling stats yet. Complete AP Calculus AB practice before the session.",
    };
  }

  const nodeIds = baseGaps.map((gap) => gap.skillNodeId);
  const recentAttempts = await loadRecentAttemptsForNodes(admin, params.studentId, nodeIds);
  const verifiedGaps = mergeLastAttemptAt(baseGaps, recentAttempts);

  const guideStrengths: GuideStrengthReceipt[] = params.guideId
    ? (await loadGuideImpactNodeStats(params.guideId))
        .slice(0, 3)
        .map((row) => ({
          skillNodeId: row.skillNodeId,
          nodeName: row.nodeName,
          impactScore: row.impactScore,
        }))
    : [];

  const suggested = pickSuggestedStartingNode(verifiedGaps, guideStrengths);
  if (!suggested) {
    return { ok: false, reason: "Could not resolve a verified starting node for this brief." };
  }

  const warmupItems = await loadWarmupItems(admin, suggested.nodeId);
  if (warmupItems.length < 1) {
    return {
      ok: false,
      reason: `No approved item-bank warm-up exists yet for ${suggested.nodeName}.`,
    };
  }

  const receipt: DeterministicPreSessionBriefReceipt = {
    verifiedGaps,
    guideStrengths,
    suggestedStartingNode: suggested.nodeName,
    suggestedStartingNodeId: suggested.nodeId,
    warmupItems,
  };

  return { ok: true, receipt, brief: mapReceiptToPreSessionBrief(receipt) };
}
