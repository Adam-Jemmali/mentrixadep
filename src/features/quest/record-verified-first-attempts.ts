import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

type VerifiedAttemptQuestion = {
  id: string;
  skillNodeId?: string;
};

export async function recordVerifiedFirstAttemptsForQuest(
  userId: string,
  questId: string,
  subject: string,
  questions: VerifiedAttemptQuestion[],
  results: boolean[]
): Promise<void> {
  if (!isApCalculusAbSubject(subject)) return;

  const admin = createAdminClient();
  let recordedNewAttempt = false;
  let firstRecordedSkillNodeId: string | null = null;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const skillNodeId = question?.skillNodeId;
    if (!question?.id || !skillNodeId) continue;

    const isCorrect = results[i] ?? false;
    const { error } = await admin.from("verified_first_attempts" as "users").insert({
      user_id: userId,
      skill_node_id: skillNodeId,
      item_id: question.id,
      is_correct: isCorrect,
    } as never);

    if (!error) {
      recordedNewAttempt = true;
      if (!firstRecordedSkillNodeId) firstRecordedSkillNodeId = skillNodeId;
      continue;
    }

    if (error.code !== "23505") {
      console.error("verified_first_attempts insert failed", error.message);
    }
  }

  await admin
    .from("user_quest_progress")
    .update({
      is_first_attempt_for_node: recordedNewAttempt,
      skill_node_id: firstRecordedSkillNodeId,
    } as {
      is_first_attempt_for_node: boolean;
      skill_node_id: string | null;
    })
    .eq("user_id", userId)
    .eq("quest_id", questId);
}
