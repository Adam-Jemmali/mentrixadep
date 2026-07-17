import { publishVerifiedAttemptLiveBoardEvent } from "@/features/live-board/write-live-board-events";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { z } from "zod";

const uuidSchema = z.string().uuid();

type VerifiedAttemptQuestion = {
  id: string;
  skillNodeId?: string;
};

export type VerifiedFirstAttemptRecordResult = {
  recorded: boolean;
  alreadyExists: boolean;
};

/** Postgres unique_violation — row already exists for (user_id, skill_node_id). */
export function isVerifiedFirstAttemptConflict(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/**
 * Insert one immutable verified first attempt.
 * UNIQUE (user_id, skill_node_id) enforces rank honesty; conflicts are practice only.
 */
export async function recordVerifiedFirstAttemptForNode(
  userId: string,
  skillNodeId: string,
  itemId: string,
  isCorrect: boolean
): Promise<VerifiedFirstAttemptRecordResult> {
  const parsedUserId = uuidSchema.safeParse(userId);
  const parsedNodeId = uuidSchema.safeParse(skillNodeId);
  const parsedItemId = uuidSchema.safeParse(itemId);
  if (!parsedUserId.success || !parsedNodeId.success || !parsedItemId.success) {
    return { recorded: false, alreadyExists: false };
  }

  const admin = createAdminClient();

  const { error } = await admin.from("verified_first_attempts").insert({
    user_id: parsedUserId.data,
    skill_node_id: parsedNodeId.data,
    item_id: parsedItemId.data,
    is_correct: isCorrect,
  });

  if (!error) {
    void publishVerifiedAttemptLiveBoardEvent({
      userId: parsedUserId.data,
      skillNodeId: parsedNodeId.data,
      isCorrect,
    });
    return { recorded: true, alreadyExists: false };
  }

  if (isVerifiedFirstAttemptConflict(error)) {
    return { recorded: false, alreadyExists: true };
  }

  console.error("verified_first_attempts insert failed", error.message);
  return { recorded: false, alreadyExists: false };
}

/** Mark quest progress when this session recorded at least one new verified attempt. */
export async function markQuestVerifiedFirstAttemptProgress(
  userId: string,
  questId: string,
  skillNodeId: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("user_quest_progress")
    .update({
      is_first_attempt_for_node: true,
      skill_node_id: skillNodeId,
    })
    .eq("user_id", userId)
    .eq("quest_id", questId);
}

/**
 * On quest completion: attempt VFA insert for every answered question before progress is finalized.
 * Idempotent — duplicate nodes are practice only and never change rank.
 */
export async function ensureVerifiedFirstAttemptsFromSession(
  userId: string,
  questId: string,
  subject: string,
  questions: VerifiedAttemptQuestion[],
  results: boolean[]
): Promise<number> {
  if (!isApCalculusAbSubject(subject)) return 0;

  let newlyRecorded = 0;
  let firstRecordedNodeId: string | null = null;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const skillNodeId = question?.skillNodeId;
    if (!question?.id || !skillNodeId) continue;

    const outcome = await recordVerifiedFirstAttemptForNode(
      userId,
      skillNodeId,
      question.id,
      results[i] ?? false
    );
    if (outcome.recorded) {
      newlyRecorded += 1;
      if (!firstRecordedNodeId) firstRecordedNodeId = skillNodeId;
    }
  }

  if (newlyRecorded > 0 && firstRecordedNodeId) {
    await markQuestVerifiedFirstAttemptProgress(userId, questId, firstRecordedNodeId);
  }

  return newlyRecorded;
}

export async function recordVerifiedFirstAttemptsForQuest(
  userId: string,
  questId: string,
  subject: string,
  questions: VerifiedAttemptQuestion[],
  results: boolean[]
): Promise<number> {
  return ensureVerifiedFirstAttemptsFromSession(userId, questId, subject, questions, results);
}
