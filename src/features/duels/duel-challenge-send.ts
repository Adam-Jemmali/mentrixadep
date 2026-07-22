"use server";

import { z } from "zod";
import { createSkillDuel } from "@/features/duels/duel-create";
import { proposeDuelXpWager } from "@/features/duels/duel-wager";

const sendSchema = z.object({
  opponentStudentId: z.string().uuid(),
  divisionKey: z.string().min(1).max(64),
  wagerAmount: z.number().int().nonnegative(),
});

export type SendDuelChallengeResult =
  | { success: true; duelId: string; wagerError?: string }
  | { success: false; error: string };

/** Create a direct duel challenge and optionally attach an XP stake. */
export async function sendDuelChallengeWithWager(input: {
  opponentStudentId: string;
  divisionKey: string;
  wagerAmount: number;
}): Promise<SendDuelChallengeResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid challenge." };
  }

  const created = await createSkillDuel(
    parsed.data.opponentStudentId,
    parsed.data.divisionKey,
  );
  if (!created.success) {
    return created;
  }

  if (parsed.data.wagerAmount <= 0) {
    return { success: true, duelId: created.duelId };
  }

  const wager = await proposeDuelXpWager(created.duelId, parsed.data.wagerAmount);
  if (!wager.success) {
    return { success: true, duelId: created.duelId, wagerError: wager.error };
  }

  return { success: true, duelId: created.duelId };
}
