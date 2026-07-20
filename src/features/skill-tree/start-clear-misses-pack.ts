"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/shared/core/auth";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { createPracticeQuest } from "@/features/quest/practice-quest";
import { loadMistakeTreasuryItemIds } from "@/features/skill-tree/load-mistake-treasury";
import { mistakeTreasuryQuestionCount } from "@/features/skill-tree/mistake-treasury-pure";

export async function startClearMissesPack(): Promise<
  | { ok: true; questId: string; timeLimitSec: number }
  | { ok: false; error: string }
> {
  const user = await requireRole(["student", "admin"]);
  const missItemIds = await loadMistakeTreasuryItemIds(user.id);
  if (missItemIds.length === 0) {
    return { ok: false, error: "No misses to clear." };
  }

  const questionCount = mistakeTreasuryQuestionCount(missItemIds.length);
  const created = await createPracticeQuest({
    subject: AP_CALC_AB_SUBJECT,
    difficulty: "intermediate",
    packType: "mixed",
    questionCount,
    mistakeTreasuryItemIds: missItemIds,
  });

  if (!created.success) {
    return { ok: false, error: created.error };
  }

  revalidatePath("/student/mastery");
  return {
    ok: true,
    questId: created.questId,
    timeLimitSec: created.timeLimitSec,
  };
}
