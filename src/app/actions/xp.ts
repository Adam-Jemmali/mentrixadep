"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUtcWeekMondayString } from "@/lib/division-week";
import { getAccountLevelFromTotalXp } from "@/lib/levels";
import { XP } from "@/lib/xp-constants";
import { countReferralRewardsThisMonth } from "@/lib/referral-monthly-cap";
import { MAX_REFERRAL_REWARDS_PER_MONTH } from "@/lib/referral-constants";

export type ApplyXpAwardResult = {
  awarded: boolean;
  skipped: boolean;
  totalXp: number;
  streakDays: number;
  levelUp?: { fromLevel: number; toLevel: number; title: string };
  streakBroken?: boolean;
};

/**
 * Idempotent XP award: ledger insert → user_xp update → optional level-up row.
 * Use distinct award_key per logical event (e.g. session_complete:{uuid}).
 */
export async function applyXpAward(
  userId: string,
  amount: number,
  awardKey: string,
  divisionKey?: string | null,
): Promise<ApplyXpAwardResult> {
  if (amount === 0) {
    return { awarded: false, skipped: true, totalXp: 0, streakDays: 0 };
  }

  const admin = createAdminClient();

  const { error: ledgerErr } = await admin.from("xp_award_ledger").insert({
    user_id: userId,
    award_key: awardKey,
    xp_amount: amount,
  });

  if (ledgerErr) {
    if (ledgerErr.code === "23505") {
      const { data: row } = await admin
        .from("user_xp")
        .select("total_xp, streak_days")
        .eq("user_id", userId)
        .maybeSingle();
      return {
        awarded: false,
        skipped: true,
        totalXp: row?.total_xp ?? 0,
        streakDays: row?.streak_days ?? 0,
      };
    }
    throw new Error(ledgerErr.message);
  }

  const { data: existing } = await admin
    .from("user_xp")
    .select("total_xp, streak_days, last_activity_date, last_activity_at, division_xp")
    .eq("user_id", userId)
    .maybeSingle();

  const oldTotal = existing?.total_xp ?? 0;
  const oldLevel = getAccountLevelFromTotalXp(oldTotal);
  const newTotal = oldTotal + amount;

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastDate = (existing?.last_activity_date as string | null) ?? null;
  const oldStreak = existing?.streak_days ?? 0;

  let streakBroken = false;
  let newStreak = oldStreak;

  if (lastDate === todayStr) {
    // already active today — streak unchanged
  } else if (lastDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (lastDate === yStr) {
      newStreak = oldStreak + 1;
    } else {
      if (oldStreak > 0) streakBroken = true;
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const nowIso = new Date().toISOString();

  const currentDivXp = (existing?.division_xp as Record<string, number>) ?? {};
  const newDivXp: Record<string, number> = { ...currentDivXp };
  if (divisionKey) {
    newDivXp[divisionKey] = (newDivXp[divisionKey] ?? 0) + amount;
  }

  if (existing) {
    await admin
      .from("user_xp")
      .update({
        total_xp: newTotal,
        streak_days: newStreak,
        last_activity_date: todayStr,
        last_activity_at: nowIso,
        division_xp: newDivXp,
      })
      .eq("user_id", userId);
  } else {
    await admin.from("user_xp").insert({
      user_id: userId,
      total_xp: newTotal,
      streak_days: newStreak,
      last_activity_date: todayStr,
      last_activity_at: nowIso,
      division_xp: newDivXp,
    });
  }

  if (divisionKey) {
    const weekStart = getUtcWeekMondayString();
    const { data: wRow } = await admin
      .from("division_weekly_xp")
      .select("xp_earned")
      .eq("user_id", userId)
      .eq("division_key", divisionKey)
      .eq("week_start", weekStart)
      .maybeSingle();
    const nextWeekly = (wRow?.xp_earned ?? 0) + amount;
    const { error: wErr } = await admin.from("division_weekly_xp").upsert(
      {
        user_id: userId,
        division_key: divisionKey,
        week_start: weekStart,
        xp_earned: nextWeekly,
        updated_at: nowIso,
      },
      { onConflict: "user_id,division_key,week_start" },
    );
    if (wErr) throw new Error(wErr.message);
  }

  const newLevel = getAccountLevelFromTotalXp(newTotal);
  let levelUp: ApplyXpAwardResult["levelUp"];

  if (newLevel.level > oldLevel.level) {
    levelUp = {
      fromLevel: oldLevel.level,
      toLevel: newLevel.level,
      title: newLevel.title,
    };
    await admin.from("user_achievements").insert({
      user_id: userId,
      achievement_type: "level_up",
      from_level: oldLevel.level,
      to_level: newLevel.level,
      title: newLevel.title,
      meta: { total_xp: newTotal, previous_title: oldLevel.title },
    });
  }

  return {
    awarded: true,
    skipped: false,
    totalXp: newTotal,
    streakDays: newStreak,
    levelUp,
    streakBroken: streakBroken || undefined,
  };
}

/** Process completed sessions: session XP, daily bonus, welcome, referral. Called from cron (service role). */
export async function processPendingSessionXpAwards(): Promise<{
  processed: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let processed = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions, error: sErr } = await admin
    .from("sessions")
    .select("id, student_id, end_time, completed, status")
    .eq("completed", true)
    .gte("end_time", thirtyDaysAgo.toISOString())
    .order("end_time", { ascending: true })
    .limit(500);

  if (sErr || !sessions?.length) {
    return { processed: 0, errors: sErr ? [sErr.message] : [] };
  }

  const eligible = sessions.filter(
    (s) => String(s.status ?? "").toLowerCase() !== "cancelled",
  );

  const keys = eligible.map((s) => `session_complete:${s.id}`);
  const { data: existingLedger } = await admin
    .from("xp_award_ledger")
    .select("award_key")
    .in("award_key", keys);

  const done = new Set((existingLedger ?? []).map((r) => r.award_key));

  for (const s of eligible) {
    const ak = `session_complete:${s.id}`;
    if (done.has(ak)) continue;

    try {
      const sid = s.student_id;
      const sessionEnd = new Date(s.end_time);
      const dayStr = sessionEnd.toISOString().slice(0, 10);

      await applyXpAward(sid, XP.SESSION_COMPLETE, ak, null);

      const { data: sessionRows } = await admin
        .from("sessions")
        .select("id, status")
        .eq("student_id", sid)
        .eq("completed", true);
      const completedCount =
        sessionRows?.filter((r) => String(r.status ?? "").toLowerCase() !== "cancelled")
          .length ?? 0;

      if (completedCount === 1) {
        await applyXpAward(sid, XP.WELCOME_FIRST_SESSION, `welcome_first_session:${sid}`, null);

        const { data: userRow } = await admin
          .from("users")
          .select("referred_by")
          .eq("id", sid)
          .maybeSingle();

        const ref = userRow?.referred_by;
        if (ref) {
          const monthlyCount = await countReferralRewardsThisMonth(ref);
          if (monthlyCount < MAX_REFERRAL_REWARDS_PER_MONTH) {
            await applyXpAward(
              ref,
              XP.REFERRAL_FIRST_BOOKING,
              `referral_first_booking:${sid}`,
              null,
            );
            const { data: existingRef } = await admin
              .from("referral_rewards")
              .select("id")
              .eq("referrer_id", ref)
              .eq("referred_id", sid)
              .maybeSingle();
            if (!existingRef) {
              await admin.from("referral_rewards").insert({
                referrer_id: ref,
                referred_id: sid,
                reward_xp: XP.REFERRAL_FIRST_BOOKING,
                reward_credited: true,
              });
            }
          }
        }
      }

      const dayStart = `${dayStr}T00:00:00.000Z`;
      const dayEnd = `${dayStr}T23:59:59.999Z`;
      const { data: sameDayEarlier } = await admin
        .from("sessions")
        .select("id")
        .eq("student_id", sid)
        .eq("completed", true)
        .gte("end_time", dayStart)
        .lte("end_time", dayEnd)
        .lt("end_time", s.end_time);

      if (!sameDayEarlier?.length) {
        await applyXpAward(
          sid,
          XP.DAILY_FIRST_SESSION_BONUS,
          `daily_session_bonus:${sid}:${dayStr}`,
          null,
        );
      }

      processed += 1;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { processed, errors };
}

export async function getStreakUiState(userId: string): Promise<{
  streakDays: number;
  atRisk: boolean;
  hoursSinceAction: number | null;
}> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("user_xp")
    .select("streak_days, last_activity_at")
    .eq("user_id", userId)
    .maybeSingle();

  const streakDays = row?.streak_days ?? 0;
  const lastAt = row?.last_activity_at ? new Date(row.last_activity_at as string) : null;
  let hoursSinceAction: number | null = null;
  if (lastAt) {
    hoursSinceAction = (Date.now() - lastAt.getTime()) / 3600000;
  }

  const atRisk =
    streakDays > 0 && hoursSinceAction != null && hoursSinceAction >= 24;

  return { streakDays, atRisk, hoursSinceAction };
}
