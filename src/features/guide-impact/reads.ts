"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { createClient } from "@/shared/integrations/supabase/server";
import type { GuideImpactEntry, GuideImpactNodeEntry } from "@/features/guide-impact/impact-score-pure";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
