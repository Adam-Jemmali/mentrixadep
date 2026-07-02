import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { resolveMasteryNodeState } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import {
  countVerifiedNodes,
  mondayUtcWeekKey,
  type GridSnapshotWeek,
} from "@/features/mastery-grid/grid-history-pure";

export async function captureMasteryGridSnapshotForUser(userId: string): Promise<"inserted" | "skipped"> {
  const admin = createAdminClient();
  const snapshotWeek = mondayUtcWeekKey();

  const { data: existing } = await admin
    .from("mastery_grid_snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("snapshot_week", snapshotWeek)
    .maybeSingle();

  if (existing) return "skipped";

  const { data: skillNodes } = await admin
    .from("skill_nodes")
    .select("id")
    .eq("subject", AP_CALC_AB_SUBJECT);

  const nodeIds = (skillNodes ?? []).map((row) => String(row.id));
  if (nodeIds.length === 0) return "skipped";

  const [verifiedResult, knowledgeResult, rollingResult] = await Promise.all([
    admin
      .from("verified_first_attempts")
      .select("skill_node_id, is_correct")
      .eq("user_id", userId)
      .in("skill_node_id", nodeIds),
    admin
      .from("student_knowledge_nodes")
      .select("skill_node_id, attempts, correct")
      .eq("user_id", userId)
      .eq("subject", AP_CALC_AB_SUBJECT)
      .in("skill_node_id", nodeIds),
    admin
      .from("student_node_rolling_stats")
      .select("skill_node_id, rolling_accuracy")
      .eq("user_id", userId)
      .in("skill_node_id", nodeIds),
  ]);

  const verifiedByNode = new Map<string, { isCorrect: boolean }>();
  for (const row of verifiedResult.data ?? []) {
    verifiedByNode.set(String(row.skill_node_id), { isCorrect: row.is_correct === true });
  }

  const knowledgeByNode = new Map<string, { attempts: number; correct: number }>();
  for (const row of knowledgeResult.data ?? []) {
    if (!row.skill_node_id) continue;
    knowledgeByNode.set(String(row.skill_node_id), {
      attempts: row.attempts ?? 0,
      correct: row.correct ?? 0,
    });
  }

  const nodeStates: Record<string, MasteryNodeState> = {};
  for (const nodeId of nodeIds) {
    nodeStates[nodeId] = resolveMasteryNodeState(
      verifiedByNode.get(nodeId) ?? null,
      knowledgeByNode.get(nodeId) ?? null,
    ).state;
  }

  const rollingAccuracy: Record<string, number> = {};
  for (const row of rollingResult.data ?? []) {
    rollingAccuracy[String(row.skill_node_id)] = Number(row.rolling_accuracy);
  }

  const verifiedCount = countVerifiedNodes(nodeStates);

  const { error } = await admin.from("mastery_grid_snapshots").insert({
    user_id: userId,
    snapshot_week: snapshotWeek,
    node_states: nodeStates,
    rolling_accuracy: rollingAccuracy,
    verified_count: verifiedCount,
  });

  if (error) {
    if (error.code === "23505") return "skipped";
    throw new Error(error.message);
  }

  return "inserted";
}

export async function captureMasteryGridSnapshotsBatch(): Promise<{
  scanned: number;
  inserted: number;
}> {
  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("verified_first_attempts")
    .select("user_id")
    .limit(5000);

  if (error) throw new Error(error.message);

  const uniqueUserIds = [...new Set((users ?? []).map((row) => String(row.user_id)))];
  let inserted = 0;

  for (const userId of uniqueUserIds) {
    const result = await captureMasteryGridSnapshotForUser(userId);
    if (result === "inserted") inserted += 1;
  }

  return { scanned: uniqueUserIds.length, inserted };
}

export async function loadMasteryGridHistory(
  userId: string,
  weeks = 12,
): Promise<GridSnapshotWeek[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mastery_grid_snapshots")
    .select("snapshot_week, node_states, verified_count")
    .eq("user_id", userId)
    .order("snapshot_week", { ascending: false })
    .limit(weeks);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    snapshotWeek: String(row.snapshot_week),
    nodeStates: (row.node_states ?? {}) as Record<string, MasteryNodeState>,
    verifiedCount: Number(row.verified_count ?? 0),
  }));
}
