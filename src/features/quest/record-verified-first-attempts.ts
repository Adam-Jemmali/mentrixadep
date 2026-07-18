import { completeDueInterventionRetests } from "@/features/intervention-retests/complete-intervention-retests";
import { publishVerifiedAttemptLiveBoardEvent } from "@/features/live-board/write-live-board-events";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import {
  vfaAccuracyPct,
  vfaGradingKey,
  vfaIsCorrectFromAccuracy,
  type VfaAttemptFormat,
} from "@/features/quest/vfa-free-response-pure";
import { updateVfaStreakAfterSuccessfulInsert } from "@/features/vfa-streak/update-vfa-streak";
import { loadVerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import { maybeIssueOrReinstateCertification } from "@/features/certifications/issue-certification";
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

  const accuracyPct = isCorrect ? 1 : 0;
  const beforeStats = await loadVerifiedFirstAttemptRankStats(parsedUserId.data);

  const { error } = await admin.from("verified_first_attempts").insert({
    user_id: parsedUserId.data,
    skill_node_id: parsedNodeId.data,
    item_id: parsedItemId.data,
    is_correct: isCorrect,
    accuracy_pct: accuracyPct,
    attempt_format: "mcq",
  });

  // Close due intervention retests on this attempt (first or practice).
  void completeDueInterventionRetests({
    userId: parsedUserId.data,
    skillNodeId: parsedNodeId.data,
    postAccuracy: accuracyPct,
  });

  if (!error) {
    void publishVerifiedAttemptLiveBoardEvent({
      userId: parsedUserId.data,
      skillNodeId: parsedNodeId.data,
      isCorrect,
    });
    void updateVfaStreakAfterSuccessfulInsert(parsedUserId.data);
    void maybeIssueOrReinstateCertification({
      userId: parsedUserId.data,
      previousPercentile: beforeStats.percentile,
    }).catch((err) => {
      console.error(
        "[certification] after VFA",
        err instanceof Error ? err.message : String(err),
      );
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

export type VerifiedFirstGradingInput = {
  userId: string;
  itemId: string;
  skillNodeId: string;
  partKey?: string | null;
  attemptFormat: VfaAttemptFormat;
  isCorrect: boolean;
  partialCreditFraction?: number | null;
};

/**
 * Record VFA on the first grading call for (user, item, part).
 * Fires before the student sees the result. Retries skip via grading key.
 */
export async function recordVerifiedFirstAttemptFromGrading(
  input: VerifiedFirstGradingInput,
): Promise<VerifiedFirstAttemptRecordResult> {
  const parsedUserId = uuidSchema.safeParse(input.userId);
  const parsedItemId = uuidSchema.safeParse(input.itemId);
  const parsedNodeId = uuidSchema.safeParse(input.skillNodeId);
  if (!parsedUserId.success || !parsedItemId.success || !parsedNodeId.success) {
    return { recorded: false, alreadyExists: false };
  }

  const partKey = vfaGradingKey(input.partKey);
  const admin = createAdminClient();
  const beforeStats = await loadVerifiedFirstAttemptRankStats(parsedUserId.data);
  const accuracyPct = vfaAccuracyPct({
    correct: input.isCorrect,
    partialCreditFraction: input.partialCreditFraction,
  });

  const closeRetests = () =>
    completeDueInterventionRetests({
      userId: parsedUserId.data,
      skillNodeId: parsedNodeId.data,
      postAccuracy: accuracyPct,
    });

  const { error: keyError } = await admin.from("verified_first_grading_keys").insert({
    user_id: parsedUserId.data,
    item_id: parsedItemId.data,
    part_key: partKey,
  });

  if (keyError) {
    if (isVerifiedFirstAttemptConflict(keyError)) {
      // Practice retry after first grading — still closes due retests.
      void closeRetests();
      return { recorded: false, alreadyExists: true };
    }
    console.error("verified_first_grading_keys insert failed", keyError.message);
    return { recorded: false, alreadyExists: false };
  }

  const isCorrect = vfaIsCorrectFromAccuracy(accuracyPct);

  const { error } = await admin.from("verified_first_attempts").insert({
    user_id: parsedUserId.data,
    skill_node_id: parsedNodeId.data,
    item_id: parsedItemId.data,
    is_correct: isCorrect,
    accuracy_pct: accuracyPct,
    part_key: partKey || null,
    attempt_format: input.attemptFormat,
  });

  void closeRetests();

  if (!error) {
    void publishVerifiedAttemptLiveBoardEvent({
      userId: parsedUserId.data,
      skillNodeId: parsedNodeId.data,
      isCorrect,
    });
    void updateVfaStreakAfterSuccessfulInsert(parsedUserId.data);
    void maybeIssueOrReinstateCertification({
      userId: parsedUserId.data,
      previousPercentile: beforeStats.percentile,
    }).catch((err) => {
      console.error(
        "[certification] after grading VFA",
        err instanceof Error ? err.message : String(err),
      );
    });
    return { recorded: true, alreadyExists: false };
  }

  if (isVerifiedFirstAttemptConflict(error)) {
    return { recorded: false, alreadyExists: true };
  }

  console.error("verified_first_attempts insert failed", error.message);
  return { recorded: false, alreadyExists: false };
}
