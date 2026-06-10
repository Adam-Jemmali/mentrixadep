import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { generateDuelQuestions } from "@/shared/integrations/ai";
import type { SkillDuelQuestion } from "@/shared/types/database";
import { DUEL_QUESTION_COUNT } from "@/features/duels/duel-constants";
import { buildSkillDuelFallbackPack } from "@/features/duels/duel-fallback-questions";

type MatchSource = "direct" | "clan" | "queue";

type QueueStyleSource = "queue" | "ai_queue";

export function isQueueStyleMatchSource(ms: string | null): ms is QueueStyleSource {
  return ms === "queue" || ms === "ai_queue";
}

export type DuelReadyRow = {
  id: string;
  student_id: string;
  opponent_student_id: string | null;
  status: string;
  match_source: string | null;
  is_ai_opponent: boolean;
  student_ready_at: string | null;
  opponent_ready_at: string | null;
};

export function bothSidesReady(duel: DuelReadyRow): boolean {
  return Boolean(duel.student_ready_at && duel.opponent_ready_at);
}

export function randomAiOpponentAnswers(questions: SkillDuelQuestion[]): number[] {
  return questions.map((q) =>
    Math.floor(Math.random() * Math.max(1, q.choices.length))
  );
}

export async function resolveDuelQuestionPack(
  divisionName: string,
  divisionKey: string,
  userId: string
): Promise<SkillDuelQuestion[]> {
  const gen = await generateDuelQuestions(
    divisionName,
    divisionKey,
    userId,
    DUEL_QUESTION_COUNT
  );
  if ("error" in gen && gen.error) {
    return buildSkillDuelFallbackPack(divisionName, divisionKey, DUEL_QUESTION_COUNT);
  }
  const list = (gen as { questions: SkillDuelQuestion[] }).questions;
  if (!Array.isArray(list) || list.length < 3) {
    return buildSkillDuelFallbackPack(divisionName, divisionKey, DUEL_QUESTION_COUNT);
  }
  return list;
}

export function scoreAnswers(
  questions: SkillDuelQuestion[],
  answers: number[] | null
): number {
  if (!answers || answers.length !== questions.length) return 0;
  let s = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const a = answers[i];
    if (q && typeof a === "number" && a >= 0 && a === q.correctIndex) s += 1;
  }
  return s;
}

export async function insertPendingSkillDuel(
  admin: ReturnType<typeof createAdminClient>,
  challengerId: string,
  opponentId: string,
  divisionKey: string,
  matchSource: MatchSource
): Promise<{ ok: true; duelId: string } | { ok: false; message: string }> {
  const { data: inserted, error: insErr } = await admin
    .from("skill_duels")
    .insert({
      student_id: challengerId,
      opponent_student_id: opponentId,
      initiator_id: challengerId,
      division_key: divisionKey,
      status: "pending",
      questions: [],
      reward_amount_cents: 0,
      match_source: matchSource,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { ok: false, message: insErr?.message ?? "Could not create duel." };
  }
  return { ok: true, duelId: inserted.id };
}
