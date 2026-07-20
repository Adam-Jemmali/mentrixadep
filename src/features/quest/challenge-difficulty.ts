import { z } from "zod";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  applyChallengeDifficultyOutcome,
  defaultChallengeDifficultyState,
  normalizeDifficultyRating,
  type ChallengeDifficultyState,
} from "@/features/quest/challenge-difficulty-pure";

export {
  applyChallengeDifficultyOutcome,
  CHALLENGE_DIFFICULTY_BAND,
  DEFAULT_CHALLENGE_DIFFICULTY,
  defaultChallengeDifficultyState,
  isItemNearChallengeDifficulty,
  itemDifficultyDistance,
  normalizeDifficultyRating,
  preferItemsNearChallengeDifficulty,
  type ChallengeDifficultyState,
} from "@/features/quest/challenge-difficulty-pure";

const updateSchema = z.object({
  userId: z.string().uuid(),
  skillNodeId: z.string().uuid(),
  itemDifficultyRating: z.number().finite(),
  correct: z.boolean(),
});

export type ChallengeDifficultyRow = {
  skillNodeId: string;
  currentDifficultyRating: number;
};

/** Load hidden ratings for selection. Never return these to the client UI. */
export async function loadChallengeDifficultyByNodeIds(
  userId: string,
  skillNodeIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (skillNodeIds.length === 0) return out;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("challenge_difficulty_state")
    .select("skill_node_id, current_difficulty_rating")
    .eq("user_id", userId)
    .in("skill_node_id", skillNodeIds);

  if (error || !data) return out;

  for (const row of data) {
    if (!row.skill_node_id) continue;
    out.set(row.skill_node_id, normalizeDifficultyRating(row.current_difficulty_rating));
  }
  return out;
}

async function readChallengeDifficultyState(
  userId: string,
  skillNodeId: string,
): Promise<ChallengeDifficultyState> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("challenge_difficulty_state")
    .select("current_difficulty_rating, consecutive_correct, consecutive_incorrect")
    .eq("user_id", userId)
    .eq("skill_node_id", skillNodeId)
    .maybeSingle();

  if (error || !data) return defaultChallengeDifficultyState();

  return {
    currentDifficultyRating: normalizeDifficultyRating(data.current_difficulty_rating),
    consecutiveCorrect: Number(data.consecutive_correct ?? 0),
    consecutiveIncorrect: Number(data.consecutive_incorrect ?? 0),
  };
}

/**
 * Update hidden challenge difficulty after any practice outcome.
 * Rating numbers stay server-side only — never surface to student UI.
 */
export async function updateChallengeDifficulty(input: {
  userId: string;
  skillNodeId: string;
  itemDifficultyRating: number;
  correct: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid challenge difficulty update." };
  }

  const { userId, skillNodeId, itemDifficultyRating, correct } = parsed.data;
  const prior = await readChallengeDifficultyState(userId, skillNodeId);
  const next = applyChallengeDifficultyOutcome(prior, itemDifficultyRating, correct);

  const admin = createAdminClient();
  const { error } = await admin.from("challenge_difficulty_state").upsert(
    {
      user_id: userId,
      skill_node_id: skillNodeId,
      current_difficulty_rating: next.currentDifficultyRating,
      consecutive_correct: next.consecutiveCorrect,
      consecutive_incorrect: next.consecutiveIncorrect,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "user_id,skill_node_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** @deprecated Prefer updateChallengeDifficulty — kept for existing FR callers. */
export async function updateChallengeDifficultyFromFreeResponse(input: {
  userId: string;
  skillNodeId: string;
  itemDifficultyRating: number;
  correct: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateChallengeDifficulty(input);
}
