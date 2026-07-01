import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { isInterventionRetestDue } from "@/features/intervention-retests/schedule-intervention-retests-pure";
import type {
  DuelRoundStat,
  ImpactNodeStat,
  NodeRunningAverage,
  NodeSessionStat,
  RankDrivingNode,
  SkillNodeGraphRow,
} from "@/features/guidance/verdict-engine-pure";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";
import { progressSnapshotDataSchema } from "@/features/progress-snapshot/types";

type SkillNodeNameRow = { node_name: string };

/**
 * Hot path: student_node_rolling_stats + skill_nodes (PROMPT 003).
 * Never reads student_knowledge_nodes or verified_first_attempts.
 */
export async function loadNodeRunningAverages(
  userId: string,
  skillNodeIds: string[],
): Promise<NodeRunningAverage[]> {
  if (skillNodeIds.length === 0) return [];

  const admin = createAdminClient();
  const { data: stats } = await admin
    .from("student_node_rolling_stats")
    .select("skill_node_id, rolling_accuracy, attempts_in_window")
    .eq("user_id", userId)
    .in("skill_node_id", skillNodeIds);

  const { data: nodes } = await admin
    .from("skill_nodes")
    .select("id, node_name")
    .in("id", skillNodeIds);

  const nameById = new Map((nodes ?? []).map((row) => [String(row.id), String(row.node_name)]));

  return (stats ?? []).map((row) => ({
    skillNodeId: String(row.skill_node_id),
    nodeName: nameById.get(String(row.skill_node_id)) ?? "Skill node",
    accuracyPercent: Number(row.rolling_accuracy ?? 0),
    attempts: Number(row.attempts_in_window ?? 0),
  }));
}

/** Single-row read: ap_calc_verified_rank_cache (PROMPT 006 materialized rank). */
export async function loadVerifiedRankCache(userId: string): Promise<{
  accuracyPercent: number;
  percentile: number | null;
  verifiedCount: number;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ap_calc_verified_rank_cache")
    .select("accuracy_percent, percentile, verified_count")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    accuracyPercent: Number(data?.accuracy_percent ?? 0),
    percentile:
      data?.percentile == null || Number.isNaN(Number(data.percentile))
        ? null
        : Number(data.percentile),
    verifiedCount: Number(data?.verified_count ?? 0),
  };
}

/**
 * Rank delta drivers from rolling stats rows touched in the period (indexed by user + last_updated).
 * Avoids scanning verified_first_attempts.
 */
export async function loadRecentRankDrivingNodes(
  userId: string,
  sinceIso?: string,
  limit = 12,
): Promise<RankDrivingNode[]> {
  const admin = createAdminClient();
  let query = admin
    .from("student_node_rolling_stats")
    .select("skill_node_id, rolling_accuracy, last_updated")
    .eq("user_id", userId)
    .order("last_updated", { ascending: false })
    .limit(limit);

  if (sinceIso) {
    query = query.gte("last_updated", sinceIso);
  }

  const { data: stats } = await query;
  const nodeIds = (stats ?? []).map((row) => String(row.skill_node_id));
  if (nodeIds.length === 0) return [];

  const { data: nodes } = await admin
    .from("skill_nodes")
    .select("id, node_name")
    .in("id", nodeIds);

  const nameById = new Map((nodes ?? []).map((row) => [String(row.id), String(row.node_name)]));

  return (stats ?? []).map((row) => ({
    skillNodeId: String(row.skill_node_id),
    nodeName: nameById.get(String(row.skill_node_id)) ?? "Skill node",
    isCorrect: Number(row.rolling_accuracy ?? 0) >= 70,
  }));
}

/**
 * Hot path: guide_node_impact_rolling + skill_nodes (PROMPT 003).
 * Never reads guide_impact_node_scores or session aggregates.
 */
export async function loadGuideImpactNodeStats(guideId: string): Promise<ImpactNodeStat[]> {
  const admin = createAdminClient();
  const { data: stats } = await admin
    .from("guide_node_impact_rolling")
    .select(
      "skill_node_id, pre_session_accuracy_avg, post_session_accuracy_avg, sessions_counted",
    )
    .eq("guide_id", guideId)
    .gte("sessions_counted", 1)
    .order("post_session_accuracy_avg", { ascending: false });

  const nodeIds = (stats ?? []).map((row) => String(row.skill_node_id));
  if (nodeIds.length === 0) return [];

  const { data: nodes } = await admin
    .from("skill_nodes")
    .select("id, node_name")
    .in("id", nodeIds);

  const nameById = new Map((nodes ?? []).map((row) => [String(row.id), String(row.node_name)]));

  return (stats ?? []).map((row) => {
    const beforeAccuracy = Number(row.pre_session_accuracy_avg ?? 0);
    const afterAccuracy = Number(row.post_session_accuracy_avg ?? 0);
    const impactLift = Math.round((afterAccuracy - beforeAccuracy) * 100) / 100;
    return {
      skillNodeId: String(row.skill_node_id),
      nodeName: nameById.get(String(row.skill_node_id)) ?? "Skill node",
      impactScore: Math.round(Math.max(0, Math.min(100, afterAccuracy))),
      impactLift,
      afterAccuracy,
      beforeAccuracy,
    };
  });
}

/** Aggregate impact from rolling node rows (no guide_impact_scores scan). */
export async function loadGuideAggregateImpactScore(guideId: string): Promise<number | null> {
  const nodes = await loadGuideImpactNodeStats(guideId);
  if (nodes.length === 0) return null;
  const total = nodes.reduce((sum, row) => sum + row.impactScore, 0);
  return Math.round(total / nodes.length);
}

type BreakthroughRow = {
  id: string;
  subject: string;
  concept: string;
  accuracy_before: number | string;
  accuracy_after: number | string;
};

export async function loadBreakthroughEvent(
  userId: string,
  eventId?: string,
): Promise<BreakthroughRow | null> {
  const admin = createAdminClient();
  if (eventId) {
    const { data } = await admin
      .from("breakthrough_events")
      .select("id, subject, concept, accuracy_before, accuracy_after")
      .eq("id", eventId)
      .eq("student_id", userId)
      .maybeSingle();
    return data;
  }

  const { data } = await admin
    .from("breakthrough_events")
    .select("id, subject, concept, accuracy_before, accuracy_after")
    .eq("student_id", userId)
    .order("detected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function loadApCalcSkillNodeGraph(): Promise<SkillNodeGraphRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("skill_nodes")
    .select("id, node_name, display_order, prerequisites")
    .eq("subject", AP_CALC_AB_SUBJECT)
    .order("display_order", { ascending: true });

  return (data ?? []).map((row) => ({
    id: String(row.id),
    nodeName: String(row.node_name),
    displayOrder: Number(row.display_order),
    prerequisites: (row.prerequisites ?? []).map(String),
  }));
}

/** Nodes at proficient+ rolling accuracy satisfy prerequisite edges for breakthrough routing. */
export async function loadPrerequisiteSatisfiedNodeIds(userId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("student_node_rolling_stats")
    .select("skill_node_id")
    .eq("user_id", userId)
    .gte("rolling_accuracy", 70);

  return new Set((data ?? []).map((row) => String(row.skill_node_id)));
}

/**
 * Due retest lookup via intervention_retests + skill_nodes.
 */
export async function loadDueRetestNode(
  userId: string,
): Promise<{ skillNodeId: string; nodeName: string } | null> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("intervention_retests")
    .select(
      "skill_node_id, scheduled_for, skill_nodes!intervention_retests_skill_node_id_fkey(node_name)",
    )
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .limit(12);

  type RetestRow = {
    skill_node_id: string;
    scheduled_for: string | null;
    skill_nodes: SkillNodeNameRow | SkillNodeNameRow[] | null;
  };

  for (const raw of (rows ?? []) as unknown as RetestRow[]) {
    if (!isInterventionRetestDue(raw.scheduled_for)) continue;

    const skillNodes = raw.skill_nodes;
    const nodeName = Array.isArray(skillNodes)
      ? skillNodes[0]?.node_name
      : skillNodes?.node_name;

    return {
      skillNodeId: String(raw.skill_node_id),
      nodeName: nodeName ?? "Skill node",
    };
  }

  return null;
}

/** Latest progress_snapshots row for weekly_snapshot verdict. */
export async function loadLatestProgressSnapshot(
  userId: string,
): Promise<ProgressSnapshotData | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("progress_snapshots")
    .select("snapshot_data")
    .eq("student_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.snapshot_data) return null;
  const parsed = progressSnapshotDataSchema.safeParse(data.snapshot_data);
  return parsed.success ? parsed.data : null;
}

export function parseQuestSessionStats(context: unknown): NodeSessionStat[] {
  if (!context || typeof context !== "object") return [];
  const raw = (context as { sessionStats?: unknown }).sessionStats;
  if (!Array.isArray(raw)) return [];

  const out: NodeSessionStat[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const skillNodeId = typeof row.skillNodeId === "string" ? row.skillNodeId : "";
    const nodeName = typeof row.nodeName === "string" ? row.nodeName : "";
    const sessionCorrect = Number(row.sessionCorrect ?? 0);
    const sessionTotal = Number(row.sessionTotal ?? 0);
    if (!skillNodeId || !nodeName || sessionTotal <= 0) continue;
    out.push({
      skillNodeId,
      nodeName,
      sessionCorrect,
      sessionTotal,
      misconceptionTag:
        typeof row.misconceptionTag === "string" ? row.misconceptionTag : null,
    });
  }
  return out;
}

export function parseDuelRounds(context: unknown): DuelRoundStat[] {
  if (!context || typeof context !== "object") return [];
  const raw = (context as { rounds?: unknown }).rounds;
  if (!Array.isArray(raw)) return [];

  const out: DuelRoundStat[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    out.push({
      skillNodeId: typeof row.skillNodeId === "string" ? row.skillNodeId : undefined,
      nodeName: typeof row.nodeName === "string" ? row.nodeName : undefined,
      misconceptionTag:
        typeof row.misconceptionTag === "string" ? row.misconceptionTag : null,
      correctIndex: Number(row.correctIndex ?? -1),
      myAnswer: Number(row.myAnswer ?? -1),
    });
  }
  return out;
}

export function parseDuelScores(context: unknown): {
  yourScore: number;
  theirScore: number;
  total: number;
  youWon: boolean;
  tie: boolean;
} {
  const ctx = (context && typeof context === "object" ? context : {}) as Record<
    string,
    unknown
  >;
  return {
    yourScore: Number(ctx.yourScore ?? 0),
    theirScore: Number(ctx.theirScore ?? 0),
    total: Number(ctx.total ?? 0),
    youWon: ctx.youWon === true,
    tie: ctx.tie === true,
  };
}
