"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { createClient } from "@/shared/integrations/supabase/server";
import type {
  GuideImpactEntry,
  GuideImpactNodeEntry,
  GuideImpactRollingNodeChip,
  GuideNodeImpactRollingBatch,
} from "@/features/guide-impact/impact-score-pure";

function mapRow(row: {
  subject: string;
  impact_score: number | string;
  sessions_counted: number;
}): GuideImpactEntry {
  return {
    subject: row.subject,
    impactScore: Number(row.impact_score),
    sessionsCounted: row.sessions_counted,
  };
}

function mapNodeRow(row: {
  skill_node_id: string;
  node_name: string;
  subject: string;
  impact_score: number | string;
  students_counted: number;
  after_accuracy: number | string;
  before_accuracy: number | string;
  impact_lift: number | string;
}): GuideImpactNodeEntry {
  return {
    skillNodeId: row.skill_node_id,
    nodeName: row.node_name,
    subject: row.subject,
    impactScore: Number(row.impact_score),
    studentsCounted: row.students_counted,
    afterAccuracy: Number(row.after_accuracy),
    beforeAccuracy: Number(row.before_accuracy),
    impactLift: Number(row.impact_lift),
  };
}

export async function getGuideImpactNodeScoresForTutor(
  guideId: string,
): Promise<GuideImpactNodeEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guide_impact_node_scores")
    .select(
      "skill_node_id, node_name, subject, impact_score, students_counted, after_accuracy, before_accuracy, impact_lift"
    )
    .eq("guide_id", guideId)
    .gte("students_counted", 3)
    .order("impact_lift", { ascending: false })
    .order("impact_score", { ascending: false });

  if (error) return [];
  return (data ?? []).map(mapNodeRow);
}

export async function getGuideImpactScoresForTutor(guideId: string): Promise<GuideImpactEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guide_impact_scores")
    .select("subject, impact_score, sessions_counted")
    .eq("guide_id", guideId)
    .order("impact_score", { ascending: false });

  if (error) {
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function getGuideImpactScoresMap(
  guideIds: string[],
): Promise<Record<string, GuideImpactEntry[]>> {
  if (guideIds.length === 0) return {};

  await requireRole(["student", "admin", "tutor"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guide_impact_scores")
    .select("guide_id, subject, impact_score, sessions_counted")
    .in("guide_id", guideIds);

  if (error) {
    return {};
  }

  const map: Record<string, GuideImpactEntry[]> = {};
  for (const row of data ?? []) {
    const id = row.guide_id as string;
    if (!map[id]) map[id] = [];
    map[id]!.push(mapRow(row));
  }
  for (const id of Object.keys(map)) {
    map[id]!.sort((a, b) => b.impactScore - a.impactScore);
  }
  return map;
}

export type WeakestRollingStatNode = {
  skillNodeId: string;
  nodeName: string;
  rollingAccuracy: number;
};

const EMPTY_ROLLING_BATCH: GuideNodeImpactRollingBatch = {
  topChipsByGuideId: {},
  impactByGuideAndNode: {},
  avgImpactByGuideId: {},
};

function mapRollingRow(
  row: {
    guide_id: string;
    skill_node_id: string;
    post_session_accuracy_avg: number | string;
    sessions_counted: number;
  },
  nameById: Map<string, string>,
): { guideId: string; chip: GuideImpactRollingNodeChip } {
  const guideId = String(row.guide_id);
  const skillNodeId = String(row.skill_node_id);
  const impactScore = Math.round(
    Math.max(0, Math.min(100, Number(row.post_session_accuracy_avg ?? 0))),
  );
  return {
    guideId,
    chip: {
      skillNodeId,
      nodeName: nameById.get(skillNodeId) ?? "Skill node",
      impactScore,
      sessionsCounted: Number(row.sessions_counted ?? 0),
    },
  };
}

/** Batch load top-3 rolling node chips per guide for browse discovery. */
export async function getGuideNodeImpactRollingBatch(
  guideIds: string[],
): Promise<GuideNodeImpactRollingBatch> {
  if (guideIds.length === 0) return EMPTY_ROLLING_BATCH;

  await requireRole(["student", "admin", "tutor"]);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guide_node_impact_rolling")
    .select("guide_id, skill_node_id, post_session_accuracy_avg, sessions_counted")
    .in("guide_id", guideIds)
    .gte("sessions_counted", 1);

  if (error || !data?.length) return EMPTY_ROLLING_BATCH;

  const nodeIds = Array.from(new Set(data.map((row) => String(row.skill_node_id))));
  const { data: nodes } = await admin
    .from("skill_nodes")
    .select("id, node_name")
    .in("id", nodeIds);

  const nameById = new Map((nodes ?? []).map((row) => [String(row.id), String(row.node_name)]));

  const allChipsByGuide: Record<string, GuideImpactRollingNodeChip[]> = {};
  const impactByGuideAndNode: Record<string, Record<string, number>> = {};

  for (const row of data) {
    const { guideId, chip } = mapRollingRow(row, nameById);
    if (!allChipsByGuide[guideId]) allChipsByGuide[guideId] = [];
    allChipsByGuide[guideId]!.push(chip);
    if (!impactByGuideAndNode[guideId]) impactByGuideAndNode[guideId] = {};
    impactByGuideAndNode[guideId]![chip.skillNodeId] = chip.impactScore;
  }

  const topChipsByGuideId: Record<string, GuideImpactRollingNodeChip[]> = {};
  const avgImpactByGuideId: Record<string, number> = {};

  for (const [guideId, chips] of Object.entries(allChipsByGuide)) {
    chips.sort((a, b) => b.impactScore - a.impactScore);
    topChipsByGuideId[guideId] = chips.slice(0, 3);
    const total = chips.reduce((sum, chip) => sum + chip.impactScore, 0);
    avgImpactByGuideId[guideId] = Math.round(total / chips.length);
  }

  return { topChipsByGuideId, impactByGuideAndNode, avgImpactByGuideId };
}

/** Current weakest skill node from student_node_rolling_stats (lowest rolling accuracy). */
export async function loadWeakestRollingStatNode(
  userId: string,
): Promise<WeakestRollingStatNode | null> {
  const admin = createAdminClient();
  const { data: stat } = await admin
    .from("student_node_rolling_stats")
    .select("skill_node_id, rolling_accuracy, attempts_in_window")
    .eq("user_id", userId)
    .gt("attempts_in_window", 0)
    .order("rolling_accuracy", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!stat) return null;

  const { data: node } = await admin
    .from("skill_nodes")
    .select("node_name")
    .eq("id", stat.skill_node_id)
    .maybeSingle();

  return {
    skillNodeId: String(stat.skill_node_id),
    nodeName: String(node?.node_name ?? "Skill node"),
    rollingAccuracy: Number(stat.rolling_accuracy ?? 0),
  };
}

/** Distinct quest course names a student has completed (for browse default sort). */
export async function getStudentQuestCourseNames(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_quest_progress")
    .select("quests!inner(metadata)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .limit(200);

  const names = new Set<string>();
   
  for (const row of (data as any[]) ?? []) {
    const quest = Array.isArray(row.quests) ? row.quests[0] : row.quests;
    const course = quest?.metadata?.course;
    if (typeof course === "string" && course.trim()) {
      names.add(course.trim());
    }
  }
  return Array.from(names).sort();
}

export async function getGuideImpactScoresForTutorsAdmin(
  guideIds: string[],
): Promise<Record<string, GuideImpactEntry[]>> {
  if (guideIds.length === 0) return {};
  const admin = createAdminClient();
  const { data } = await admin
    .from("guide_impact_scores")
    .select("guide_id, subject, impact_score, sessions_counted")
    .in("guide_id", guideIds);

  const map: Record<string, GuideImpactEntry[]> = {};
  for (const row of data ?? []) {
    const id = row.guide_id as string;
    if (!map[id]) map[id] = [];
    map[id]!.push(mapRow(row));
  }
  return map;
}
