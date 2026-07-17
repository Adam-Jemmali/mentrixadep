"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { isInterventionRetestDue } from "@/features/intervention-retests/schedule-intervention-retests-pure";
import {
  pickBestRematchBadge,
  type GuideRematchBadge,
} from "@/features/matchmaker/rematch-badge-pure";

export async function getGuideRematchBadgesForStudent(
  userId: string,
  guideIds: string[],
): Promise<Record<string, GuideRematchBadge>> {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "admin" && user.id !== userId) {
    throw new Error("Forbidden");
  }

  if (guideIds.length === 0) return {};

  const admin = createAdminClient();
  const weakest = await getWeakestNodes(userId, AP_CALC_AB_SUBJECT, 5);
  const studentNodeIds = new Set(weakest.map((node) => node.id));

  const { data: pendingRetests } = await admin
    .from("intervention_retests")
    .select("skill_node_id, scheduled_for")
    .eq("user_id", userId)
    .is("completed_at", null);

  for (const row of pendingRetests ?? []) {
    if (isInterventionRetestDue(String(row.scheduled_for))) {
      studentNodeIds.add(String(row.skill_node_id));
    }
  }

  const { data: nodeScores } = await admin
    .from("guide_impact_node_scores")
    .select("guide_id, skill_node_id, node_name, impact_score, students_counted, impact_lift")
    .in("guide_id", guideIds)
    .eq("subject", AP_CALC_AB_SUBJECT)
    .gte("students_counted", 3)
    .gte("impact_lift", 0);

  const byGuide = new Map<string, GuideRematchBadge>();
  const grouped = new Map<string, Array<{ guideId: string; nodeName: string; ratePercent: number; matchesStudentNode: boolean }>>();

  for (const row of nodeScores ?? []) {
    const guideId = String(row.guide_id);
    const skillNodeId = String(row.skill_node_id);
    const entry = {
      guideId,
      nodeName: String(row.node_name),
      ratePercent: Number(row.impact_score),
      matchesStudentNode: studentNodeIds.has(skillNodeId),
    };
    const list = grouped.get(guideId) ?? [];
    list.push(entry);
    grouped.set(guideId, list);
  }

  for (const [guideId, rows] of grouped) {
    const badge = pickBestRematchBadge(rows);
    if (badge) byGuide.set(guideId, badge);
  }

  return Object.fromEntries(byGuide);
}
