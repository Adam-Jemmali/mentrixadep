"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPreviousUtcWeekMondayString } from "@/lib/division-week";
import { applyXpAward } from "@/app/actions/xp";
import { XP } from "@/lib/xp-constants";

const BONUS: Record<1 | 2 | 3, number> = {
  1: XP.WEEKLY_DIVISION_TOP_1,
  2: XP.WEEKLY_DIVISION_TOP_2,
  3: XP.WEEKLY_DIVISION_TOP_3,
};

/**
 * Finalize the UTC week that ended most recently: top 3 per division get bonus XP,
 * rows archived in division_winners. Idempotent per (week, division, rank).
 * Intended to run shortly after Monday 00:00 UTC (or on a schedule).
 */
export async function processDivisionWeeklyAwards(asOf: Date = new Date()): Promise<{
  weekClosed: string;
  winnersInserted: number;
  errors: string[];
}> {
  const weekToClose = getPreviousUtcWeekMondayString(asOf);
  const admin = createAdminClient();
  const errors: string[] = [];
  let winnersInserted = 0;

  const { data: divisions } = await admin
    .from("divisions")
    .select("key")
    .eq("active", true);

  for (const d of divisions ?? []) {
    const divisionKey = d.key;
    const { data: rows } = await admin
      .from("division_weekly_xp")
      .select("user_id, xp_earned")
      .eq("division_key", divisionKey)
      .eq("week_start", weekToClose)
      .gt("xp_earned", 0)
      .order("xp_earned", { ascending: false })
      .order("user_id", { ascending: true })
      .limit(3);

    const top = rows ?? [];
    for (let i = 0; i < top.length; i++) {
      const rankNum = i + 1;
      if (rankNum < 1 || rankNum > 3) continue;
      const rank = rankNum as 1 | 2 | 3;
      const row = top[i];
      if (!row) continue;
      const uid = row.user_id;
      const weeklyXp = row.xp_earned;
      const bonus = BONUS[rank];

      const { data: existing } = await admin
        .from("division_winners")
        .select("id")
        .eq("week_start", weekToClose)
        .eq("division_key", divisionKey)
        .eq("rank", rank)
        .maybeSingle();

      if (existing) continue;

      const awardKey = `division_weekly_bonus:${weekToClose}:${divisionKey}:rank${rank}:${uid}`;
      try {
        const result = await applyXpAward(uid, bonus, awardKey, divisionKey);
        if (result.awarded) {
          const { error: insErr } = await admin.from("division_winners").insert({
            week_start: weekToClose,
            division_key: divisionKey,
            rank,
            user_id: uid,
            weekly_xp: weeklyXp,
            bonus_xp: bonus,
          });
          if (insErr) {
            errors.push(`${divisionKey} rank ${rank}: ${insErr.message}`);
          } else {
            winnersInserted += 1;
          }
        }
      } catch (e) {
        errors.push(
          `${divisionKey} rank ${rank}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  return { weekClosed: weekToClose, winnersInserted, errors };
}
