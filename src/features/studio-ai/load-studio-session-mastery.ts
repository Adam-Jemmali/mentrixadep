"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { validateUUID } from "@/shared/core/security";
import type { SkillNodeTopicRef } from "@/features/breakthrough-events/schedule-session-retests-pure";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import {
  resolveStudioCallCoveredNodeIds,
  resolveStudioMasteryPanelMode,
  type StudioMasteryPanelMode,
} from "@/features/studio-ai/studio-mastery-match-pure";

export type StudioSessionMasteryContext = {
  studentDisplayName: string;
  masteryGrid: MasteryGridData;
  coveredNodeIds: string[];
  mode: StudioMasteryPanelMode;
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

  const isApCalc = isApCalculusAbSubject(String(session.course));
  if (!isApCalc) return null;

  const studentId = String(session.student_id);

  const [{ data: pkg }, { data: skillNodes }, { data: studentSettings }, masteryGrid] =
    await Promise.all([
      admin
        .from("session_ai_packages")
        .select("summary, key_points, follow_up_topics, practice_exercises, flashcards, followup_quests")
        .eq("session_id", validSessionId)
        .maybeSingle(),
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

  const practiceExercises = Array.isArray(pkg?.practice_exercises)
    ? (pkg.practice_exercises as Array<{ title?: string; prompt?: string }>)
    : [];
  const flashcards = Array.isArray(pkg?.flashcards)
    ? (pkg.flashcards as Array<{ q?: string; a?: string }>)
    : [];
  const followupQuests = Array.isArray(pkg?.followup_quests)
    ? (pkg.followup_quests as Array<{ prompt?: string }>)
    : [];

  const coveredNodeIds = resolveStudioCallCoveredNodeIds(
    {
      summary: typeof pkg?.summary === "string" ? pkg.summary : null,
      keyPoints: Array.isArray(pkg?.key_points) ? pkg.key_points.map(String) : [],
      followUpTopics: [
        ...followUpTopics,
        ...(Array.isArray(pkg?.follow_up_topics) ? pkg.follow_up_topics.map(String) : []),
      ],
      practiceTitles: practiceExercises.map((ex) => String(ex.title ?? "")),
      flashcardQuestions: flashcards.map((card) => String(card.q ?? "")),
      practicePrompts: [
        ...practiceExercises.map((ex) => String(ex.prompt ?? "")),
        ...followupQuests.map((quest) => String(quest.prompt ?? "")),
      ],
    },
    (skillNodes ?? []) as SkillNodeTopicRef[],
  );

  const mode = resolveStudioMasteryPanelMode({
    isApCalc: true,
    coveredNodeIds,
    hasMasteryGrid: true,
  });

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
    mode,
  };
}
