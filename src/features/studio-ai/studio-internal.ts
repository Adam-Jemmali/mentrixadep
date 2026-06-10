import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { SessionAiPackage } from "@/shared/types/database";
import type { NormalizedStudioPackage } from "@/features/studio-ai/studio-package-lib";
import {
  sendAiPackageReadyEmail,
  type SessionEmailDetails,
} from "@/shared/integrations/email";

export type SessionRowForPackage = {
  id: string;
  tutor_id: string;
  course: string;
  start_time: string;
  end_time: string;
  student_id: string;
};

export function normalizedToDbRow(
  sessionId: string,
  norm: NormalizedStudioPackage,
  generatedBy: string,
  publishedAt: string | null,
  studioRegenerateCount: number,
) {
  return {
    session_id: sessionId,
    summary: norm.summary,
    key_points: norm.keyPoints,
    flashcards: norm.flashcards,
    practice_exercises: norm.practiceExercises,
    follow_up_topics: norm.followUpTopics,
    followup_quests: norm.followupQuestPrompts.map((prompt) => ({
      prompt,
      difficulty: "medium" as const,
    })),
    generated_by: generatedBy,
    package_published_at: publishedAt,
    studio_regenerate_count: studioRegenerateCount,
  };
}

export async function sendStudioPackageReadyEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  validSessionId: string,
  course: string,
  inserted: SessionAiPackage,
) {
  try {
    const sessionFull = await adminClient
      .from("sessions")
      .select("student_id, start_time, end_time")
      .eq("id", validSessionId)
      .single();
    const studentId = sessionFull.data?.student_id;
    const row = inserted;
    const kp = Array.isArray(row.key_points) ? row.key_points.length : 0;
    const fc = Array.isArray(row.flashcards) ? row.flashcards.length : 0;
    const fq = Array.isArray(row.followup_quests) ? row.followup_quests.length : 0;
    const pe = Array.isArray(row.practice_exercises) ? row.practice_exercises.length : 0;
    const preview =
      typeof row.summary === "string" && row.summary.trim() ? row.summary.trim() : null;

    if (studentId && sessionFull.data) {
      const [studentAuthData, settingsRow] = await Promise.all([
        adminClient.auth.admin.getUserById(studentId),
        adminClient
          .from("user_settings")
          .select("display_name")
          .eq("user_id", studentId)
          .maybeSingle(),
      ]);
      const studentEmail = studentAuthData.data?.user?.email;
      if (studentEmail) {
        const details: SessionEmailDetails = {
          sessionId: validSessionId,
          course,
          startTime: sessionFull.data.start_time,
          endTime: sessionFull.data.end_time,
          studentDisplayName: settingsRow.data?.display_name ?? null,
          packageSummaryPreview: preview,
          keyPointsCount: kp,
          flashcardsCount: fc,
          followupQuestsCount: fq,
          practiceExercisesCount: pe,
        };
        void sendAiPackageReadyEmail(studentEmail, details);
      }
    }
  } catch (emailErr) {
    console.error("[Studio] email notification failed:", emailErr);
  }
}

export async function clearStudioPackageWithdrawnAt(
  adminClient: ReturnType<typeof createAdminClient>,
  sessionId: string,
): Promise<void> {
  const { error } = await adminClient
    .from("sessions")
    .update({ studio_package_withdrawn_at: null })
    .eq("id", sessionId);
  if (error) {
    console.warn("[Studio] clearStudioPackageWithdrawnAt", sessionId, error.message);
  }
}
