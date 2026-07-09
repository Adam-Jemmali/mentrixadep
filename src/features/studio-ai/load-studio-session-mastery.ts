"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { validateUUID } from "@/shared/core/security";
import { seedSessionTargetNodes } from "@/features/breakthrough-events/seed-session-target-nodes";
import {
  resolveCoveredSkillNodeIds,
  type SkillNodeTopicRef,
} from "@/features/breakthrough-events/schedule-session-retests-pure";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export type StudioSessionMasteryContext = {
  studentDisplayName: string;
  masteryGrid: MasteryGridData;
  coveredNodeIds: string[];
};

export async function getStudioSessionMasteryContext(
  sessionId: string,
  followUpTopics: string[] = [],
  onBehalfOfTutorId?: string,
): Promise<StudioSessionMasteryContext | null> {
  const user = await requireRole(["tutor", "admin"]);
  const validSessionId = validateUUID(sessionId);
  const admin = createAdminClient();

  const { data: session, error: sessionError } = await admin
    .from("sessions")
    .select("id, tutor_id, student_id, course")
    .eq("id", validSessionId)
    .maybeSingle();

  if (sessionError || !session) return null;

  const targetTutorId =
    user.role === "admin" && onBehalfOfTutorId ? onBehalfOfTutorId : user.id;
  if (session.tutor_id !== targetTutorId && user.role !== "admin") return null;
  if (!isApCalculusAbSubject(String(session.course))) return null;

  const studentId = String(session.student_id);
  await seedSessionTargetNodes(validSessionId, studentId, String(session.course)).catch(() => {});

  const [{ data: targetRows }, { data: skillNodes }, { data: studentSettings }, masteryGrid] =
    await Promise.all([
      admin
        .from("session_target_nodes")
        .select("skill_node_id")
        .eq("session_id", validSessionId),
      admin
        .from("skill_nodes")
        .select("id, node_name, node_slug")
        .eq("subject", AP_CALC_AB_SUBJECT),
      admin
        .from("user_settings")
        .select("display_name")
        .eq("user_id", studentId)
        .maybeSingle(),
      loadMasteryGrid(studentId).catch(() => null),
    ]);

  if (!masteryGrid) return null;

  const coveredNodeIds = resolveCoveredSkillNodeIds(
    (targetRows ?? []).map((row) => String(row.skill_node_id)),
    followUpTopics,
    (skillNodes ?? []) as SkillNodeTopicRef[],
  );

  if (coveredNodeIds.length === 0) return null;

  let studentDisplayName = studentSettings?.display_name?.trim() ?? "";
  if (!studentDisplayName) {
    const { data: authUser } = await admin.auth.admin.getUserById(studentId);
    const email = authUser?.user?.email ?? "";
    studentDisplayName = email.split("@")[0] || "Student";
  }

  return {
    studentDisplayName,
    masteryGrid,
    coveredNodeIds,
  };
}
