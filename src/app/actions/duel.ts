"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDuelQuestions } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import { trackEvent } from "@/lib/analytics";
import {
  parseUUID,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/lib/security";
import type { SkillDuelQuestion } from "@/lib/database.types";
import { areUsersInSameClan } from "@/app/actions/clan";
import { recordClanDuelWin } from "@/app/actions/clan-dashboard";
import { applyXpAward } from "@/app/actions/xp";
import { XP } from "@/lib/xp-constants";
import { DUEL_QUESTION_COUNT } from "@/lib/duel-constants";
import { buildSkillDuelFallbackPack } from "@/lib/duel-fallback-questions";
import { applyDuelMetaRewards } from "@/lib/duel-reward";

type MatchSource = "direct" | "clan" | "queue";

/** Prefer AI-generated duel items; on any failure use offline pack so Sparring Quest always starts. */
async function resolveDuelQuestionPack(
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

function scoreAnswers(
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

async function insertPendingSkillDuel(
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

/**
 * Challenger (current student) challenges another student by user id.
 * Opponent must have duel_opt_in enabled in Settings.
 */
export async function createSkillDuel(
  opponentStudentId: string,
  divisionKey: string
): Promise<{ success: true; duelId: string } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can start a duel." };
    }

    const oid = parseUUID(opponentStudentId);
    if (!oid.ok) return { success: false, error: "Invalid opponent." };
    if (oid.id === user.id) {
      return { success: false, error: "You cannot duel yourself." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelCreate,
      "create duel"
    );

    const admin = createAdminClient();

    const { data: opponentUser } = await admin
      .from("users")
      .select("id, role, approved")
      .eq("id", oid.id)
      .eq("role", "student")
      .eq("approved", true)
      .maybeSingle();

    if (!opponentUser) {
      return { success: false, error: "Learner not found or not eligible." };
    }

    const { data: opponentSettings } = await admin
      .from("user_settings")
      .select("duel_opt_in")
      .eq("user_id", oid.id)
      .maybeSingle();

    if (!opponentSettings?.duel_opt_in) {
      return {
        success: false,
        error:
          "This learner has not enabled skill duel challenges in Settings.",
      };
    }

    const { data: div } = await admin
      .from("divisions")
      .select("key, name")
      .eq("key", divisionKey.trim())
      .eq("active", true)
      .maybeSingle();

    if (!div) {
      return { success: false, error: "Invalid division." };
    }

    const ins = await insertPendingSkillDuel(
      admin,
      user.id,
      oid.id,
      div.key,
      "direct"
    );
    if (!ins.ok) {
      return { success: false, error: ins.message };
    }

    void trackEvent("duel_challenged", {
      userId: user.id,
      properties: { division_key: div.key, opponent_id: oid.id },
    });

    revalidatePath("/student/duel");
    return { success: true, duelId: ins.duelId };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create duel.",
    };
  }
}

/**
 * Challenge a clanmate (both must be in the same clan).
 */
export async function createClanSkillDuel(
  opponentStudentId: string,
  divisionKey: string
): Promise<{ success: true; duelId: string } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can start a duel." };
    }

    const oid = parseUUID(opponentStudentId);
    if (!oid.ok) return { success: false, error: "Invalid opponent." };
    if (oid.id === user.id) {
      return { success: false, error: "You cannot duel yourself." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelCreate,
      "create duel"
    );

    const admin = createAdminClient();

    if (!(await areUsersInSameClan(user.id, oid.id))) {
      return {
        success: false,
        error: "You can only challenge learners in your clan.",
      };
    }

    const { data: opponentUser } = await admin
      .from("users")
      .select("id, role, approved")
      .eq("id", oid.id)
      .eq("role", "student")
      .eq("approved", true)
      .maybeSingle();

    if (!opponentUser) {
      return { success: false, error: "Learner not found or not eligible." };
    }

    const { data: opponentSettings } = await admin
      .from("user_settings")
      .select("duel_opt_in")
      .eq("user_id", oid.id)
      .maybeSingle();

    if (!opponentSettings?.duel_opt_in) {
      return {
        success: false,
        error:
          "This learner has not enabled skill duel challenges in Settings.",
      };
    }

    const { data: div } = await admin
      .from("divisions")
      .select("key, name")
      .eq("key", divisionKey.trim())
      .eq("active", true)
      .maybeSingle();

    if (!div) {
      return { success: false, error: "Invalid division." };
    }

    const ins = await insertPendingSkillDuel(
      admin,
      user.id,
      oid.id,
      div.key,
      "clan"
    );
    if (!ins.ok) {
      return { success: false, error: ins.message };
    }

    revalidatePath("/student/duel");
    return { success: true, duelId: ins.duelId };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create duel.",
    };
  }
}

/** Normalize RPC row (array vs object; snake_case vs camelCase from PostgREST / clients). */
function parseDuelQueueJoinRpc(rpcData: unknown): {
  matched: boolean;
  duelId: string | null;
  opponentId: string | null;
} {
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  if (!row || typeof row !== "object") {
    return { matched: false, duelId: null, opponentId: null };
  }
  const o = row as Record<string, unknown>;
  const matched = o.matched === true || o.matched === "t" || o.matched === "true";
  const rawDuel = o.duel_id ?? o.duelId;
  const rawOpp = o.opponent_id ?? o.opponentId;
  const duelId = typeof rawDuel === "string" ? rawDuel : null;
  const opponentId = typeof rawOpp === "string" ? rawOpp : null;
  return { matched, duelId, opponentId };
}

export async function joinDuelQueue(
  divisionKey: string
): Promise<
  | { success: true; state: "matched"; duelId: string }
  | { success: true; state: "waiting" }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can join matchmaking." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelQueueJoin,
      "duel queue"
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

    const { data: div } = await admin
      .from("divisions")
      .select("key")
      .eq("key", divisionKey.trim())
      .eq("active", true)
      .maybeSingle();

    if (!div) {
      return { success: false, error: "Invalid division." };
    }

    const { data: rpcData, error: rpcErr } = await admin.rpc(
      "duel_queue_join_and_match",
      {
        p_joiner: user.id,
        p_division_key: div.key,
      }
    );

    if (rpcErr) {
      const msg = rpcErr.message ?? "";
      if (msg.includes("invalid_division")) {
        return { success: false, error: "Invalid division." };
      }
      return { success: false, error: msg || "Matchmaking failed." };
    }

    const { matched, duelId } = parseDuelQueueJoinRpc(rpcData);

    if (matched && duelId) {
      // Queue matches should be immediately playable by both participants.
      await activateSkillDuelSession(duelId);

      revalidatePath("/student/duel");
      return { success: true, state: "matched", duelId };
    }

    revalidatePath("/student/duel");
    return { success: true, state: "waiting" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Matchmaking failed.",
    };
  }
}

export async function leaveDuelQueue(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can leave the queue." };
    }

    const admin = createAdminClient();
    const { error } = await admin.from("duel_queue").delete().eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/student/duel");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to leave queue.",
    };
  }
}

export async function pollDuelQueue(divisionKey: string): Promise<
  | { state: "waiting" }
  | { state: "matched"; duelId: string }
  | { state: "idle" }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { state: "idle" };
    }

    const admin = createAdminClient();
    const key = divisionKey.trim();

    const { data: qrow } = await admin
      .from("duel_queue")
      .select("division_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (qrow) {
      if (qrow.division_key === key) {
        return { state: "waiting" };
      }
      return { state: "idle" };
    }

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: duel } = await admin
      .from("skill_duels")
      .select("id")
      .eq("match_source", "queue")
      .in("status", ["pending", "active"])
      .eq("division_key", key)
      .gte("created_at", since)
      .or(`student_id.eq.${user.id},opponent_student_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duel?.id) {
      await activateSkillDuelSession(duel.id);
      return { state: "matched", duelId: duel.id };
    }

    return { state: "idle" };
  } catch {
    return { state: "idle" };
  }
}

/**
 * Generate questions and set duel active. Queue matches: either participant may start.
 * Direct/clan: only the challenged learner (opponent) may start.
 */
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
        "id, student_id, opponent_student_id, status, division_key, match_source"
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
    const isParticipant =
      user.id === duel.student_id ||
      user.id === duel.opponent_student_id;
    if (!isParticipant) {
      return { success: false, error: "Not a participant." };
    }
    if (!isQueue && user.id !== duel.opponent_student_id) {
      return {
        success: false,
        error: "Only the challenged learner can accept this duel.",
      };
    }

    const { data: div } = await admin
      .from("divisions")
      .select("key, name")
      .eq("key", duel.division_key)
      .maybeSingle();

    const questions = await resolveDuelQuestionPack(
      div?.name ?? duel.division_key,
      duel.division_key,
      user.id
    );

    const { data: updated, error: upErr } = await admin
      .from("skill_duels")
      .update({
        status: "active",
        questions: questions as unknown as Record<string, unknown>,
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
export async function createAiDuelFromQueue(
  divisionKey: string
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

    const { data: div } = await admin
      .from("divisions")
      .select("key, name")
      .eq("key", divisionKey.trim())
      .eq("active", true)
      .maybeSingle();

    if (!div) {
      return { success: false, error: "Invalid division." };
    }

    const { data: qrow } = await admin
      .from("duel_queue")
      .select("division_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!qrow || qrow.division_key !== div.key) {
      return { success: false, error: "Join the queue for this subject first." };
    }

    await admin.from("duel_queue").delete().eq("user_id", user.id);

    const questions = await resolveDuelQuestionPack(
      div.name ?? div.key,
      div.key,
      user.id
    );
    const opponentAnswers = questions.map((q) =>
      Math.floor(Math.random() * Math.max(1, q.choices.length))
    );

    const { data: inserted, error: insErr } = await admin
      .from("skill_duels")
      .insert({
        student_id: user.id,
        opponent_student_id: null,
        initiator_id: user.id,
        division_key: div.key,
        status: "active",
        questions: questions as unknown as Record<string, unknown>,
        student_answers: null,
        opponent_answers: opponentAnswers,
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

/** Remove a finished duel from this learner’s list only; the other participant still sees it. */
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

    const terminal = new Set(["completed", "declined", "cancelled"]);
    if (!terminal.has(duel.status ?? "")) {
      return {
        success: false,
        error: "You can only remove finished duels from your list.",
      };
    }

    const now = new Date().toISOString();
    const patch = asChallenger
      ? { challenger_hidden_at: now, updated_at: now }
      : { opponent_hidden_at: now, updated_at: now };

    const { error } = await admin.from("skill_duels").update(patch).eq("id", id.id);

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
      error: e instanceof Error ? e.message : "Failed to hide duel.",
    };
  }
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

  const isAi = (row as { is_ai_opponent?: boolean }).is_ai_opponent === true;
  const sa = row.student_answers as number[] | null;
  const oa = row.opponent_answers as number[] | null;

  if (!sa || sa.length !== questions.length) return;
  if (!isAi && (!oa || oa.length !== questions.length)) return;
  if (isAi && (!oa || oa.length !== questions.length)) return;

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

  const div = row.division_key;

  if (winner === "tie") {
    await applyXpAward(row.student_id, XP.DUEL_TIE, `duel_tie:${duelId}:s`, div);
    if (!isAi && row.opponent_student_id) {
      await applyXpAward(
        row.opponent_student_id,
        XP.DUEL_TIE,
        `duel_tie:${duelId}:o`,
        div
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
        div
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
        div
      );
      await applyDuelMetaRewards(
        admin,
        row.opponent_student_id,
        duelId,
        div,
        true
      );
      await applyXpAward(row.student_id, XP.DUEL_LOSS, `duel_loss:${duelId}`, div);
    }
  }

  // Clan XP Logic
  if (winner !== "tie") {
    const winnerId = winner === "student" ? row.student_id : row.opponent_student_id;
    const loserId = winner === "student" ? row.opponent_student_id : row.student_id;
    
    if (winnerId && loserId && !isAi) {
      const sameClan = await areUsersInSameClan(winnerId, loserId);
      await recordClanDuelWin(winnerId, !sameClan);
    } else if (winnerId && isAi) {
       // Against AI, it's always a friendly boost to the clan
       await recordClanDuelWin(winnerId, false);
    }
  }

  revalidatePath("/student/duel");
  revalidatePath(`/student/duel/${duelId}`);
  revalidatePath("/student/duel/history");
  revalidatePath("/student/division");
  revalidatePath("/student");
  revalidatePath("/student/quest");
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
    if (prev.length !== questionIndex) {
      return { success: false, error: "Answer questions in order." };
    }

    const next = [...prev, answerIndex];
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      [key]: next,
    };

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

export type DuelPublicRow = {
  id: string;
  student_id: string;
  opponent_student_id: string | null;
  initiator_id: string | null;
  division_key: string;
  status: string;
  match_source: string | null;
  is_ai_opponent: boolean;
  questions: {
    prompt: string;
    choices: string[];
    type?: SkillDuelQuestion["type"];
  }[];
  fullQuestions?: SkillDuelQuestion[];
  student_answers: number[] | null;
  opponent_answers: number[] | null;
  /** Server-only derived while active — live score without exposing correct indices */
  student_running_score?: number;
  opponent_running_score?: number;
  student_score: number | null;
  opponent_score: number | null;
  winner: string | null;
  reward_amount_cents: number;
  created_at: string;
  completed_at: string | null;
};

export type DuelMatchupPreview = {
  duelId: string;
  divisionKey: string;
  me: {
    id: string;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    totalXp: number | null;
    clan: { name: string; tag: string } | null;
  };
  opponent: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    totalXp: number | null;
    isAi: boolean;
    clan: { name: string; tag: string } | null;
  };
};

export async function getLearnerPreview(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ 
  id: string; 
  name: string; 
  avatarUrl: string | null; 
  bio: string | null; 
  totalXp: number | null;
  clan: { name: string; tag: string } | null;
}> {
  const { data: settings } = await admin
    .from("user_settings")
    .select("display_name, avatar_url, bio")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: xpRow } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: membership } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .maybeSingle();

  let clan: { name: string; tag: string } | null = null;
  if (membership?.clan_id) {
    const { data: clanRow } = await admin
      .from("clans")
      .select("name, tag")
      .eq("id", membership.clan_id)
      .maybeSingle();
    if (clanRow) {
      clan = { name: clanRow.name, tag: clanRow.tag };
    }
  }

  const displayName =
    typeof settings?.display_name === "string" ? settings.display_name.trim() : "";
  const avatarUrl =
    typeof settings?.avatar_url === "string" && settings.avatar_url.trim().length > 0
      ? settings.avatar_url.trim()
      : null;
  const bio = typeof settings?.bio === "string" && settings.bio.trim().length > 0 ? settings.bio.trim() : null;
  const totalXp = typeof xpRow?.total_xp === "number" ? xpRow.total_xp : null;

  const result = { 
    id: userId, 
    name: displayName || "Learner", 
    avatarUrl, 
    bio, 
    totalXp, 
    clan 
  };

  if (displayName.length > 0) {
    return result;
  }

  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data?.user?.email ?? "";
    result.name = email ? (email.split("@")[0] ?? "").trim() : "Learner";
    return result;
  } catch {
    return result;
  }
}

export async function getDuelMatchupPreview(
  duelId: string
): Promise<{ success: true; preview: DuelMatchupPreview } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student" && user.role !== "admin") {
      return { success: false, error: "Not allowed." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error } = await admin
      .from("skill_duels")
      .select("id, student_id, opponent_student_id, division_key, is_ai_opponent")
      .eq("id", id.id)
      .maybeSingle();

    if (error || !duel) {
      return { success: false, error: "Duel not found." };
    }

    const isAi = (duel as { is_ai_opponent?: boolean }).is_ai_opponent === true;
    const isParticipant =
      duel.student_id === user.id || (!isAi && duel.opponent_student_id === user.id);
    if (!isParticipant) {
      return { success: false, error: "Not allowed." };
    }

    const meId = user.id;
    const opponentId = isAi
      ? null
      : meId === duel.student_id
        ? duel.opponent_student_id
        : duel.student_id;

    const me = await getLearnerPreview(admin, meId);
    const opponent = opponentId
      ? await getLearnerPreview(admin, opponentId)
      : {
          id: null,
          name: "Sparring Quest",
          avatarUrl: null,
          bio: "Adaptive duel sparring partner",
          totalXp: null,
          clan: null,
        };

    return {
      success: true,
      preview: {
        duelId: duel.id,
        divisionKey: duel.division_key,
        me,
        opponent: {
          ...opponent,
          isAi,
        },
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load matchup.",
    };
  }
}


export async function getDuelForUser(
  duelId: string
): Promise<DuelPublicRow | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student" && user.role !== "admin") {
      return { error: "Not allowed." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error } = await admin
      .from("skill_duels")
      .select("*")
      .eq("id", id.id)
      .maybeSingle();

    if (error || !duel) return { error: "Duel not found." };

    const isAi = (duel as { is_ai_opponent?: boolean }).is_ai_opponent === true;
    const isParticipant =
      duel.student_id === user.id ||
      (!isAi && duel.opponent_student_id === user.id);
    if (!isParticipant) {
      return { error: "Not allowed." };
    }

    const raw = duel.questions as unknown as SkillDuelQuestion[];
    const showAnswers = duel.status === "completed";

    const publicQs = Array.isArray(raw)
      ? raw.map((q) => ({
          prompt: q.prompt,
          choices: q.choices,
          type: q.type,
          ...(showAnswers ? { correctIndex: q.correctIndex } : {}),
        }))
      : [];

    const sa = duel.student_answers as number[] | null;
    const oa = duel.opponent_answers as number[] | null;
    let student_running: number | undefined;
    let opponent_running: number | undefined;
    if (duel.status === "active" && Array.isArray(raw) && raw.length > 0) {
      student_running = 0;
      if (sa && sa.length > 0) {
        for (let i = 0; i < sa.length; i++) {
          const q = raw[i];
          const a = sa[i];
          if (q && typeof a === "number" && a >= 0 && a === q.correctIndex) {
            student_running += 1;
          }
        }
      }
      opponent_running = 0;
      if (oa && oa.length > 0) {
        for (let i = 0; i < oa.length; i++) {
          const q = raw[i];
          const a = oa[i];
          if (q && typeof a === "number" && a >= 0 && a === q.correctIndex) {
            opponent_running += 1;
          }
        }
      }
    }

    return {
      id: duel.id,
      student_id: duel.student_id,
      opponent_student_id: duel.opponent_student_id,
      initiator_id: (duel as { initiator_id?: string | null }).initiator_id ?? null,
      division_key: duel.division_key,
      status: duel.status,
      match_source: (duel as { match_source?: string | null }).match_source ?? null,
      is_ai_opponent: isAi,
      questions: publicQs as DuelPublicRow["questions"],
      fullQuestions: showAnswers ? raw : undefined,
      student_answers: sa,
      opponent_answers: oa,
      student_running_score: student_running,
      opponent_running_score: opponent_running,
      student_score: duel.student_score,
      opponent_score: duel.opponent_score,
      winner: duel.winner,
      reward_amount_cents: duel.reward_amount_cents ?? 0,
      created_at: duel.created_at,
      completed_at: duel.completed_at,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listStudentDuels(): Promise<
  {
    id: string;
    student_id: string;
    opponent_student_id: string | null;
    division_key: string;
    status: string;
    created_at: string;
    initiator_id: string | null;
    is_ai_opponent: boolean;
  }[]
> {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("skill_duels")
    .select(
      "id, student_id, opponent_student_id, division_key, status, created_at, initiator_id, is_ai_opponent, challenger_hidden_at, opponent_hidden_at"
    )
    .or(`student_id.eq.${user.id},opponent_student_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(80);

  type Row = {
    id: string;
    student_id: string;
    opponent_student_id: string | null;
    division_key: string;
    status: string;
    created_at: string;
    initiator_id: string | null;
    is_ai_opponent: boolean;
    challenger_hidden_at: string | null;
    opponent_hidden_at: string | null;
  };

  const raw = (data ?? []) as Row[];
  const visible = raw.filter((r) => {
    if (r.student_id === user.id && r.challenger_hidden_at) return false;
    if (r.opponent_student_id === user.id && r.opponent_hidden_at) return false;
    return true;
  });

  return visible.slice(0, 50).map(
    ({
      challenger_hidden_at: _c,
      opponent_hidden_at: _o,
      ...rest
    }) => rest
  ) as {
    id: string;
    student_id: string;
    opponent_student_id: string | null;
    division_key: string;
    status: string;
    created_at: string;
    initiator_id: string | null;
    is_ai_opponent: boolean;
  }[];
}

export type DuelHistorySummary = {
  totalCompleted: number;
  wins: number;
  losses: number;
  ties: number;
  xpFromDuels: number;
  byDivision: { division_key: string; played: number; wins: number }[];
};

export async function getDuelHistorySummary(): Promise<DuelHistorySummary | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { error: "Not allowed." };
    }

    const admin = createAdminClient();
    const { data: duels } = await admin
      .from("skill_duels")
      .select(
        "winner, student_id, opponent_student_id, division_key, status, is_ai_opponent"
      )
      .or(`student_id.eq.${user.id},opponent_student_id.eq.${user.id}`)
      .eq("status", "completed");

    const { data: ledger } = await admin
      .from("xp_award_ledger")
      .select("xp_amount, award_key")
      .eq("user_id", user.id)
      .like("award_key", "duel_%");

    let xpFromDuels = 0;
    for (const row of ledger ?? []) {
      const k = row.award_key ?? "";
      if (
        k.startsWith("duel_win:") ||
        k.startsWith("duel_loss:") ||
        k.startsWith("duel_tie:") ||
        k.startsWith("duel_streak_fire:")
      ) {
        xpFromDuels += row.xp_amount ?? 0;
      }
    }

    let wins = 0;
    let losses = 0;
    let ties = 0;
    const divMap = new Map<string, { played: number; wins: number }>();

    for (const d of duels ?? []) {
      const asStudent = d.student_id === user.id;
      const w = d.winner;

      const cur = divMap.get(d.division_key) ?? { played: 0, wins: 0 };
      cur.played += 1;

      if (w === "tie") {
        ties += 1;
        divMap.set(d.division_key, cur);
        continue;
      }

      let iWon = false;
      if (w === "student") iWon = asStudent;
      else if (w === "opponent")
        iWon = !asStudent && d.opponent_student_id === user.id;

      if (iWon) {
        wins += 1;
        cur.wins += 1;
      } else {
        losses += 1;
      }
      divMap.set(d.division_key, cur);
    }

    const byDivision = Array.from(divMap.entries()).map(([division_key, v]) => ({
      division_key,
      played: v.played,
      wins: v.wins,
    }));

    return {
      totalCompleted: (duels ?? []).length,
      wins,
      losses,
      ties,
      xpFromDuels,
      byDivision,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}
