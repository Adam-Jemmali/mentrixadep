import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { seedSessionTargetNodes } from "@/features/breakthrough-events/seed-session-target-nodes";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import type { MasteryGridData } from "@/features/mastery-grid/types";

export type SharedSessionGridPayload = {
  studentId: string;
  guideId: string;
  masteryGrid: MasteryGridData;
  sessionTargetNodeIds: string[];
  guideImpactByNodeId: Record<string, number>;
};

export async function loadSharedSessionGridPayload(
  sessionId: string,
): Promise<SharedSessionGridPayload | null> {
  const admin = createAdminClient();

  const { data: session, error: sessionError } = await admin
    .from("sessions")
    .select("student_id, tutor_id, course")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session) return null;

  const course = String(session.course);
  if (!isApCalculusAbSubject(course)) return null;

  const studentId = String(session.student_id);
  const guideId = String(session.tutor_id);

  await seedSessionTargetNodes(sessionId, studentId, course).catch(() => {});

  const [masteryGrid, targetResult, impactResult] = await Promise.all([
    loadMasteryGrid(studentId).catch(() => null),
    admin
      .from("session_target_nodes")
      .select("skill_node_id")
      .eq("session_id", sessionId)
      .order("id", { ascending: true }),
    admin
      .from("mv_guide_impact_by_node")
      .select("skill_node_id, impact_score")
      .eq("guide_id", guideId),
  ]);

  if (!masteryGrid) return null;

  const sessionTargetNodeIds = (targetResult.data ?? []).map((row) =>
    String(row.skill_node_id),
  );

  const guideImpactByNodeId: Record<string, number> = {};
  for (const row of impactResult.data ?? []) {
    guideImpactByNodeId[String(row.skill_node_id)] = Number(row.impact_score);
  }

  return {
    studentId,
    guideId,
    masteryGrid,
    sessionTargetNodeIds,
    guideImpactByNodeId,
  };
}
