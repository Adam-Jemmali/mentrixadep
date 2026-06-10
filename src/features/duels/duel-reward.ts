import type { SupabaseClient } from "@supabase/supabase-js";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";

/** Shared booking UI helper (kept here for historical import paths). */
export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export const DUEL_ACHIEVEMENT_ON_FIRE = "duel_on_fire";
export const DUEL_ACHIEVEMENT_SUBJECT_SPECIALIST = "duel_subject_specialist";

/** Consecutive duel wins required before the “On Fire” streak bonus can trigger (at 3, 6, 9…). */
export const DUEL_STREAK_WINS_FOR_FIRE = 3;
const WINS_PER_SUBJECT_FOR_SPECIALIST = 10;

/** Pure check — mirrors `applyDuelMetaRewards` streak bonus condition. */
export function shouldGrantDuelStreakFireBonus(consecutiveWins: number): boolean {
  return (
    consecutiveWins >= DUEL_STREAK_WINS_FOR_FIRE &&
    consecutiveWins % DUEL_STREAK_WINS_FOR_FIRE === 0
  );
}

type Admin = SupabaseClient;

function userWonDuel(
  row: {
    winner: string | null;
    student_id: string;
    opponent_student_id: string | null;
  },
  userId: string,
): boolean {
  if (row.winner === "tie" || !row.winner) return false;
  const asStudent = row.student_id === userId;
  if (asStudent) return row.winner === "student";
  return row.winner === "opponent";
}

/**
 * After a duel completes, grant streak / mastery badges and bonus XP (idempotent keys).
 */
export async function applyDuelMetaRewards(
  admin: Admin,
  userId: string,
  duelId: string,
  divisionKey: string,
  won: boolean,
): Promise<void> {
  if (!won) return;

  const streak = await countConsecutiveWins(admin, userId);
  if (shouldGrantDuelStreakFireBonus(streak)) {
    await applyXpAward(
      userId,
      XP.DUEL_STREAK_ON_FIRE_BONUS,
      `duel_streak_fire:${duelId}`,
      divisionKey,
    );
    const { data: dup } = await admin
      .from("user_achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("achievement_type", DUEL_ACHIEVEMENT_ON_FIRE)
      .contains("meta", { duel_id: duelId })
      .maybeSingle();
    if (!dup) {
      await admin.from("user_achievements").insert({
        user_id: userId,
        achievement_type: DUEL_ACHIEVEMENT_ON_FIRE,
        title: "On Fire",
        meta: { duel_id: duelId, streak },
      });
    }
  }

  const winsInSubject = await countWinsInDivision(admin, userId, divisionKey);
  if (winsInSubject === WINS_PER_SUBJECT_FOR_SPECIALIST) {
    const { data: existing } = await admin
      .from("user_achievements")
      .select("id")
      .eq("user_id", userId)
      .eq("achievement_type", DUEL_ACHIEVEMENT_SUBJECT_SPECIALIST)
      .contains("meta", { division_key: divisionKey })
      .maybeSingle();
    if (!existing) {
      await admin.from("user_achievements").insert({
        user_id: userId,
        achievement_type: DUEL_ACHIEVEMENT_SUBJECT_SPECIALIST,
        title: "Subject Specialist",
        meta: {
          division_key: divisionKey,
          wins: WINS_PER_SUBJECT_FOR_SPECIALIST,
        },
      });
    }
  }
}

async function countConsecutiveWins(admin: Admin, userId: string): Promise<number> {
  const { data: rows } = await admin
    .from("skill_duels")
    .select("winner, student_id, opponent_student_id")
    .or(`student_id.eq.${userId},opponent_student_id.eq.${userId}`)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(40);

  if (!rows?.length) return 0;

  let streak = 0;
  for (const r of rows) {
    if (userWonDuel(r, userId)) streak += 1;
    else break;
  }
  return streak;
}

async function countWinsInDivision(
  admin: Admin,
  userId: string,
  divisionKey: string,
): Promise<number> {
  const { data: rows } = await admin
    .from("skill_duels")
    .select("winner, student_id, opponent_student_id, division_key")
    .eq("division_key", divisionKey)
    .eq("status", "completed")
    .or(`student_id.eq.${userId},opponent_student_id.eq.${userId}`);

  let n = 0;
  for (const r of rows ?? []) {
    if (userWonDuel(r, userId)) n += 1;
  }
  return n;
}

/** Head-to-head: completed human vs human duels */
export async function getHeadToHeadSummary(
  admin: SupabaseClient,
  myId: string,
  otherId: string,
): Promise<{ played: number; myWins: number; theirWins: number; ties: number }> {
  const { data: rows } = await admin
    .from("skill_duels")
    .select("winner, student_id, opponent_student_id")
    .eq("status", "completed")
    .eq("is_ai_opponent", false);

  const relevant =
    rows?.filter(
      (r) =>
        (r.student_id === myId && r.opponent_student_id === otherId) ||
        (r.student_id === otherId && r.opponent_student_id === myId),
    ) ?? [];

  let myWins = 0;
  let theirWins = 0;
  let ties = 0;
  for (const r of relevant) {
    if (r.winner === "tie") {
      ties += 1;
      continue;
    }
    if (userWonDuel(r, myId)) myWins += 1;
    else theirWins += 1;
  }
  return {
    played: relevant.length,
    myWins,
    theirWins,
    ties,
  };
}
