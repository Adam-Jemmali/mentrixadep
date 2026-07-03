"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  parseUUID,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/shared/core/security";
import type { SkillDuelQuestion } from "@/shared/types/database";
import { resolveFirstMissedSkillNodeId } from "@/features/intervention-retests/duel-retest";
import { scheduleDuelLossRetest } from "@/features/intervention-retests/schedule-intervention-retests";


import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import { applyDuelMetaRewards } from "@/features/duels/duel-reward";
import {
  bothSidesReady,
  isQueueStyleMatchSource,
  loadApCalcAbSkillNodeIds,
  randomAiOpponentAnswers,
  selectDuelQuestions,
  scoreAnswers,
  type DuelReadyRow,
} from "@/features/duels/duel-internal";
import {
  forfeitWinnerSide,
  padDuelAnswersForScoring,
} from "@/features/duels/duel-forfeit-pure";
import { DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE } from "@/features/duels/duel-item-bank-pure";

export async function activateSkillDuelSession(
  duelId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can start a duel." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error: fetchErr } = await admin
      .from("skill_duels")
      .select(
        "id, student_id, opponent_student_id, status, division_key, match_source, is_ai_opponent, student_ready_at, opponent_ready_at"
      )
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }
    if (duel.status !== "pending") {
      if (duel.status === "active" || duel.status === "completed") {
        return { success: true };
      }
      if (duel.status === "cancelled") {
        return { success: false, error: "This duel was cancelled." };
      }
      if (duel.status === "declined") {
        return { success: false, error: "This duel was declined." };
      }
      return { success: true };
    }

    const ms = duel.match_source as string | null;
    const isQueue = ms === "queue";
    const isAiQueue = ms === "ai_queue";
    const isQueueStyle = isQueueStyleMatchSource(ms);
    const isParticipant =
      user.id === duel.student_id ||
      user.id === duel.opponent_student_id;
    if (!isParticipant) {
      return { success: false, error: "Not a participant." };
    }
    if (!isQueue && !isAiQueue && user.id !== duel.opponent_student_id) {
      return {
        success: false,
        error: "Only the challenged learner can accept this duel.",
      };
    }

    if (isQueueStyle && duel.status === "pending" && !bothSidesReady(duel as DuelReadyRow)) {
      return {
        success: false,
        error: "Both players must accept the match before the duel starts.",
      };
    }

    const nodeIds = await loadApCalcAbSkillNodeIds(admin);
    if (!nodeIds.length) {
      return { success: false, error: DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE };
    }

    const pack = await selectDuelQuestions(id.id, nodeIds);
    if ("error" in pack) {
      return { success: false, error: pack.error };
    }

    const { questions, itemBankIds } = pack;

    const opponentAnswers =
      duel.is_ai_opponent === true ? randomAiOpponentAnswers(questions) : null;

    const { data: updated, error: upErr } = await admin
      .from("skill_duels")
      .update({
        status: "active",
        questions: questions as unknown as Record<string, unknown>,
        item_bank_ids: itemBankIds,
        ...(opponentAnswers ? { opponent_answers: opponentAnswers } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (upErr) {
      return { success: false, error: upErr.message };
    }
    if (!updated) {
      return { success: true };
    }

    revalidatePath("/student/duel");
    revalidatePath(`/student/duel/${id.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to start duel.",
    };
  }
}

export async function acceptSkillDuel(
  duelId: string
): Promise<{ success: true } | { success: false; error: string }> {
  return activateSkillDuelSession(duelId);
}

/**
 * After waiting in queue with no human match, play against a simulated opponent
 * (same question set; scores compared when you finish).
 */
/** Sparring Quest after queue timeout — duel subject comes from `duel_queue`, not this hint. */
export async function createAiDuelFromQueue(
  _divisionKeyHint: string
): Promise<{ success: true; duelId: string } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can start a duel." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelQueueJoin,
      "duel MENTRIXA match"
    );

    const admin = createAdminClient();

    const { data: mySettings } = await admin
      .from("user_settings")
      .select("duel_opt_in")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!mySettings?.duel_opt_in) {
      return {
        success: false,
        error: "Enable skill duels in Settings to use matchmaking.",
      };
    }

    const { data: qrow } = await admin
      .from("duel_queue")
      .select("division_key")
      .eq("user_id", user.id)
      .maybeSingle();

    const queuedKey =
      typeof qrow?.division_key === "string" ? qrow.division_key.trim() : "";

    if (!queuedKey) {
      return {
        success: false,
        error:
          "Join matchmaking first (pick any subject arena and tap Start Duel).",
      };
    }

    const { data: div } = await admin
      .from("divisions")
      .select("key, name")
      .eq("key", queuedKey)
      .eq("active", true)
      .maybeSingle();

    if (!div) {
      return { success: false, error: "Invalid division." };
    }

    await admin.from("duel_queue").delete().eq("user_id", user.id);

    const { data: inserted, error: insErr } = await admin
      .from("skill_duels")
      .insert({
        student_id: user.id,
        opponent_student_id: null,
        initiator_id: user.id,
        division_key: div.key,
        status: "pending",
        questions: [] as unknown as Record<string, unknown>,
        item_bank_ids: [],
        student_answers: null,
        opponent_answers: null,
        reward_amount_cents: 0,
        match_source: "ai_queue",
        is_ai_opponent: true,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return { success: false, error: insErr?.message ?? "Could not create duel." };
    }

    revalidatePath("/student/duel");
    return { success: true, duelId: inserted.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create Bot  duel.",
    };
  }
}

export async function declineSkillDuel(
  duelId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can decline." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error: fetchErr } = await admin
      .from("skill_duels")
      .select("id, opponent_student_id, status")
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }
    if (duel.status !== "pending") {
      return { success: false, error: "Duel is no longer pending." };
    }

    if (duel.opponent_student_id !== user.id) {
      return { success: false, error: "Only the challenged learner can decline." };
    }

    const { error } = await admin
      .from("skill_duels")
      .update({
        status: "declined",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id.id)
      .eq("status", "pending");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/student/duel");
    revalidatePath(`/student/duel/${id.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to decline.",
    };
  }
}

/**
 * Challenger withdraws a pending challenge. Row stays visible to the invitee as cancelled
 * (they are not left with a disappearing request).
 */
export async function withdrawPendingSkillDuel(
  duelId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can cancel a challenge." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error: fetchErr } = await admin
      .from("skill_duels")
      .select("id, student_id, status")
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }
    if (duel.status !== "pending") {
      return { success: false, error: "Only pending challenges can be withdrawn." };
    }

    if (duel.student_id !== user.id) {
      return { success: false, error: "Only the challenger can withdraw this challenge." };
    }

    const { error } = await admin
      .from("skill_duels")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id.id)
      .eq("status", "pending");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/student/duel");
    revalidatePath(`/student/duel/${id.id}`);
    revalidatePath("/student/duel/history");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to cancel challenge.",
    };
  }
}

/**
 * Remove a duel from this learner’s list (sets hidden_at).
 * Sparring Quest / pending-as-challenger: also marks cancelled so stale active rows don’t linger.
 */
export async function hideSkillDuelFromList(
  duelId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error: fetchErr } = await admin
      .from("skill_duels")
      .select("id, student_id, opponent_student_id, status, is_ai_opponent")
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }

    const isAi = (duel as { is_ai_opponent?: boolean }).is_ai_opponent === true;
    const asChallenger = duel.student_id === user.id;
    const asOpponent =
      !isAi && duel.opponent_student_id != null && duel.opponent_student_id === user.id;

    if (!asChallenger && !asOpponent) {
      return { success: false, error: "Not allowed." };
    }

    const status = duel.status ?? "";
    if (status === "active") {
      return {
        success: false,
        error: "Leave the live match first. Open the duel and tap Leave match.",
      };
    }

    if (status === "pending" && asOpponent && !isAi) {
      return {
        success: false,
        error: "Decline the challenge first, or open it to respond.",
      };
    }

    const now = new Date().toISOString();
    const patch: Record<string, string> = {
      updated_at: now,
      ...(asChallenger
        ? { challenger_hidden_at: now }
        : { opponent_hidden_at: now }),
    };

    const shouldCancel =
      (isAi && asChallenger && status === "pending") ||
      (asChallenger && status === "pending");

    if (shouldCancel) {
      patch.status = "cancelled";
    }

    const { data: updated, error } = await admin
      .from("skill_duels")
      .update(patch)
      .eq("id", id.id)
      .select("id");

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("challenger_hidden_at") || msg.includes("opponent_hidden_at")) {
        return {
          success: false,
          error:
            "Duel list cleanup is not available yet. Run database migration 046-duel-per-user-hide-cancel.sql on Supabase.",
        };
      }
      return { success: false, error: error.message };
    }

    if (!updated?.length) {
      return {
        success: false,
        error: "Could not remove this duel. Try refreshing the page.",
      };
    }

    revalidatePath("/student/duel");
    revalidatePath(`/student/duel/${id.id}`);
    revalidatePath("/student/duel/history");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to hide duel.",
    };
  }
}

async function applyDuelCompletionRewards(
  admin: ReturnType<typeof createAdminClient>,
  duelId: string,
  row: {
    student_id: string;
    opponent_student_id: string | null;
    division_key: string;
    is_ai_opponent?: boolean;
  },
  winner: "student" | "opponent" | "tie",
  questions: SkillDuelQuestion[],
  sa: number[],
  oa: number[],
  completedAt: string,
): Promise<void> {
  const isAi = row.is_ai_opponent === true;
  const div = row.division_key;
  const questionsWithNodes = questions as Array<SkillDuelQuestion & { skillNodeId?: string }>;

  if (winner === "tie") {
    await applyXpAward(row.student_id, XP.DUEL_TIE, `duel_tie:${duelId}:s`, div);
    if (!isAi && row.opponent_student_id) {
      await applyXpAward(
        row.opponent_student_id,
        XP.DUEL_TIE,
        `duel_tie:${duelId}:o`,
        div,
      );
    }
  } else if (winner === "student") {
    await applyXpAward(row.student_id, XP.DUEL_WIN, `duel_win:${duelId}`, div);
    await applyDuelMetaRewards(admin, row.student_id, duelId, div, true);
    if (!isAi && row.opponent_student_id) {
      await applyXpAward(
        row.opponent_student_id,
        XP.DUEL_LOSS,
        `duel_loss:${duelId}`,
        div,
      );
    }
  } else {
    if (isAi) {
      await applyXpAward(row.student_id, XP.DUEL_LOSS, `duel_loss:${duelId}`, div);
    } else if (row.opponent_student_id) {
      await applyXpAward(
        row.opponent_student_id,
        XP.DUEL_WIN,
        `duel_win:${duelId}`,
        div,
      );
      await applyDuelMetaRewards(
        admin,
        row.opponent_student_id,
        duelId,
        div,
        true,
      );
      await applyXpAward(row.student_id, XP.DUEL_LOSS, `duel_loss:${duelId}`, div);
    }
  }

  const scheduleLossRetest = (loserId: string, loserAnswers: number[] | null) => {
    const skillNodeId = resolveFirstMissedSkillNodeId(questionsWithNodes, loserAnswers);
    if (!skillNodeId) return;
    void scheduleDuelLossRetest({
      duelId,
      studentId: loserId,
      skillNodeId,
      completedAt,
    });
  };

  if (winner === "opponent") {
    scheduleLossRetest(row.student_id, sa);
  } else if (winner === "student" && !isAi && row.opponent_student_id) {
    scheduleLossRetest(row.opponent_student_id, oa);
  }
}

function revalidateDuelPaths(duelId: string): void {
  revalidatePath("/student/duel");
  revalidatePath(`/student/duel/${duelId}`);
  revalidatePath("/student/duel/history");
  revalidatePath("/student/division");
  revalidatePath("/student");
  revalidatePath("/student/quest");
}

async function maybeCompleteDuel(
  admin: ReturnType<typeof createAdminClient>,
  duelId: string,
  questions: SkillDuelQuestion[]
): Promise<void> {
  const { data: row } = await admin
    .from("skill_duels")
    .select(
      "student_answers, opponent_answers, student_id, opponent_student_id, division_key, status, is_ai_opponent"
    )
    .eq("id", duelId)
    .maybeSingle();

  if (!row || row.status !== "active") return;

  const sa = row.student_answers as number[] | null;
  const oa = row.opponent_answers as number[] | null;

  if (!sa || sa.length !== questions.length) return;
  if (!oa || oa.length !== questions.length) return;

  const studentScore = scoreAnswers(questions, sa);
  const opponentScore = scoreAnswers(questions, oa);

  let winner: "student" | "opponent" | "tie";
  if (studentScore > opponentScore) winner = "student";
  else if (opponentScore > studentScore) winner = "opponent";
  else winner = "tie";

  const now = new Date().toISOString();

  const { data: finalized } = await admin
    .from("skill_duels")
    .update({
      status: "completed",
      student_score: studentScore,
      opponent_score: opponentScore,
      winner,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", duelId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (!finalized) return;

  await applyDuelCompletionRewards(
    admin,
    duelId,
    row as {
      student_id: string;
      opponent_student_id: string | null;
      division_key: string;
      is_ai_opponent?: boolean;
    },
    winner,
    questions,
    sa,
    oa,
    now,
  );

  revalidateDuelPaths(duelId);
}

/**
 * Leave an active duel. Supercell-style walkover: leaver loses, opponent wins.
 * Idempotent when the duel is already completed.
 */
export async function forfeitSkillDuel(
  duelId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can leave a duel." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelSubmit,
      "duel forfeit",
    );

    const admin = createAdminClient();
    const { data: duel, error: fetchErr } = await admin
      .from("skill_duels")
      .select(
        "id, student_id, opponent_student_id, status, division_key, is_ai_opponent, questions, student_answers, opponent_answers",
      )
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }

    if (duel.status === "completed") {
      return { success: true };
    }

    if (duel.status !== "active") {
      return { success: false, error: "Only live duels can be left." };
    }

    const isAi = duel.is_ai_opponent === true;
    const isChallenger = user.id === duel.student_id;
    const isOpponent =
      !isAi &&
      duel.opponent_student_id != null &&
      user.id === duel.opponent_student_id;

    if (!isChallenger && !isOpponent) {
      return { success: false, error: "Not a participant." };
    }

    const questions = duel.questions as unknown as SkillDuelQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      return { success: false, error: "Questions not ready yet." };
    }

    const studentAnswers = padDuelAnswersForScoring(
      duel.student_answers as number[] | null,
      questions.length,
    );
    const opponentAnswers = padDuelAnswersForScoring(
      duel.opponent_answers as number[] | null,
      questions.length,
    );

    const winner = forfeitWinnerSide({
      isAiOpponent: isAi,
      forfeiterUserId: user.id,
      studentId: duel.student_id,
      opponentStudentId: duel.opponent_student_id,
    });

    const studentScore = scoreAnswers(questions, studentAnswers);
    const opponentScore = scoreAnswers(questions, opponentAnswers);
    const now = new Date().toISOString();

    const { data: finalized } = await admin
      .from("skill_duels")
      .update({
        status: "completed",
        student_answers: studentAnswers,
        opponent_answers: opponentAnswers,
        student_score: studentScore,
        opponent_score: opponentScore,
        winner,
        forfeited_by: user.id,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", id.id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (!finalized) {
      const { data: latest } = await admin
        .from("skill_duels")
        .select("status")
        .eq("id", id.id)
        .maybeSingle();
      if (latest?.status === "completed") {
        return { success: true };
      }
      return { success: false, error: "Could not leave the match. Try again." };
    }

    await applyDuelCompletionRewards(
      admin,
      id.id,
      duel as {
        student_id: string;
        opponent_student_id: string | null;
        division_key: string;
        is_ai_opponent?: boolean;
      },
      winner,
      questions,
      studentAnswers,
      opponentAnswers,
      now,
    );

    revalidateDuelPaths(id.id);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to leave duel.",
    };
  }
}

/** One question at a time (real-time duels). Use -1 for timeout / no answer. */
export async function submitSkillDuelQuestionAnswer(
  duelId: string,
  questionIndex: number,
  answerIndex: number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can submit answers." };
    }
    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelSubmit,
      "duel answer step"
    );

    const supabase = await createClient();
    const { data: duel, error: fetchErr } = await supabase
      .from("skill_duels")
      .select("*")
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }

    if (duel.status !== "active") {
      return { success: false, error: "This duel is not active." };
    }

    const questions = duel.questions as unknown as SkillDuelQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      return { success: false, error: "Questions not ready yet." };
    }

    if (
      !Number.isInteger(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= questions.length
    ) {
      return { success: false, error: "Invalid question." };
    }

    const q = questions[questionIndex];
    const n = q?.choices?.length ?? 0;
    const maxIdx = n > 0 ? n - 1 : 3;
    if (
      typeof answerIndex !== "number" ||
      !Number.isInteger(answerIndex) ||
      (answerIndex !== -1 && (answerIndex < 0 || answerIndex > maxIdx))
    ) {
      return { success: false, error: "Invalid answer index." };
    }

    const isAi = (duel as { is_ai_opponent?: boolean }).is_ai_opponent === true;
    const isChallenger = user.id === duel.student_id;
    const isOpponent =
      duel.opponent_student_id != null &&
      user.id === duel.opponent_student_id;

    if (!isChallenger && !isOpponent) {
      return { success: false, error: "Not a participant." };
    }
    if (isAi && !isChallenger) {
      return { success: false, error: "Not a participant." };
    }

    const key = isChallenger ? "student_answers" : "opponent_answers";
    const prev = (duel[key] as number[] | null) ?? [];
    if (prev.length > questionIndex) {
      return { success: true };
    }
    if (prev.length !== questionIndex) {
      return { success: false, error: "Answer questions in order." };
    }

    const next = [...prev, answerIndex];
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      [key]: next,
    };

    const { data: updated, error: upErr } = await supabase
      .from("skill_duels")
      .update(patch)
      .eq("id", id.id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (upErr) {
      return { success: false, error: upErr.message };
    }

    if (!updated) {
      const admin = createAdminClient();
      const { data: latest } = await admin
        .from("skill_duels")
        .select(`status, ${key}`)
        .eq("id", id.id)
        .maybeSingle();

      if (latest?.status === "completed") {
        return { success: true };
      }

      const latestAnswers = latest?.[key as keyof typeof latest] as number[] | null;
      if (Array.isArray(latestAnswers) && latestAnswers.length > questionIndex) {
        return { success: true };
      }

      return {
        success: false,
        error: "Could not save answer. The match may have ended.",
      };
    }

    await maybeCompleteDuel(createAdminClient(), id.id, questions);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to submit.",
    };
  }
}

export async function submitSkillDuelAnswers(
  duelId: string,
  answers: number[]
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can submit answers." };
    }
    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelSubmit,
      "duel answers"
    );

    const supabase = await createClient();
    const { data: duel, error: fetchErr } = await supabase
      .from("skill_duels")
      .select("*")
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }

    if (duel.status !== "active") {
      return { success: false, error: "This duel is not active." };
    }

    const questions = duel.questions as unknown as SkillDuelQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      return { success: false, error: "Questions not ready yet." };
    }

    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return {
        success: false,
        error: `Submit exactly ${questions.length} answers.`,
      };
    }

    for (let i = 0; i < answers.length; i++) {
      const a = answers[i];
      const q = questions[i];
      const n = q?.choices?.length ?? 0;
      const maxIdx = n > 0 ? n - 1 : 3;
      if (
        typeof a !== "number" ||
        !Number.isInteger(a) ||
        (a !== -1 && (a < 0 || a > maxIdx))
      ) {
        return { success: false, error: "Invalid answer index." };
      }
    }

    const isAi = (duel as { is_ai_opponent?: boolean }).is_ai_opponent === true;
    const isChallenger = user.id === duel.student_id;
    const isOpponent =
      duel.opponent_student_id != null &&
      user.id === duel.opponent_student_id;

    if (!isChallenger && !isOpponent) {
      return { success: false, error: "Not a participant." };
    }
    if (isAi && !isChallenger) {
      return { success: false, error: "Not a participant." };
    }

    const existing = (isChallenger
      ? duel.student_answers
      : duel.opponent_answers) as number[] | null;
    if (existing != null && existing.length > 0) {
      if (existing.length >= questions.length) {
        return { success: false, error: "You already submitted answers." };
      }
      return {
        success: false,
        error: "Finish in the timed duel view — partial answers already saved.",
      };
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (isChallenger) patch.student_answers = answers;
    else patch.opponent_answers = answers;

    const { error: upErr } = await supabase
      .from("skill_duels")
      .update(patch)
      .eq("id", id.id);

    if (upErr) {
      return { success: false, error: upErr.message };
    }

    await maybeCompleteDuel(createAdminClient(), id.id, questions);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to submit.",
    };
  }
}