"use server";

import { requireRole } from "@/shared/core/auth";
import { getVerdict } from "@/features/guidance/verdict-engine";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import type { DuelRoundStat } from "@/features/guidance/verdict-engine-pure";

export async function fetchDuelResultVerdict(input: {
  yourScore: number;
  theirScore: number;
  total: number;
  youWon: boolean;
  tie: boolean;
  rounds: DuelRoundStat[];
}): Promise<Verdict> {
  const user = await requireRole(["student", "admin"]);
  return getVerdict({
    type: "duel_result",
    userId: user.id,
    context: {
      rounds: input.rounds,
      yourScore: input.yourScore,
      theirScore: input.theirScore,
      total: input.total,
      youWon: input.youWon,
      tie: input.tie,
    },
  });
}
