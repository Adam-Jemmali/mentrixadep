"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import {
  CLAN_QUEST_CHALLENGE_BONUS_XP,
  CLAN_QUEST_CHALLENGE_TARGET,
} from "@/features/clans/clan-constants";

export async function recordClanQuestCompletion(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: m } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!m?.clan_id) return;

  const clanId = m.clan_id as string;
  const weekStart = getUtcWeekMondayString();

  const { data: existing } = await admin
    .from("clan_weekly_challenge")
    .select("quests_completed, bonus_awarded_at, quest_target, bonus_xp")
    .eq("clan_id", clanId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const target = existing?.quest_target ?? CLAN_QUEST_CHALLENGE_TARGET;
  const bonusXp = existing?.bonus_xp ?? CLAN_QUEST_CHALLENGE_BONUS_XP;
  const next = (existing?.quests_completed ?? 0) + 1;

  await admin.from("clan_weekly_challenge").upsert(
    {
      clan_id: clanId,
      week_start: weekStart,
      quests_completed: next,
      quest_target: target,
      bonus_xp: bonusXp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clan_id,week_start" }
  );

  if (existing?.bonus_awarded_at || next < target) {
    return;
  }

  const now = new Date().toISOString();
  const { data: locked } = await admin
    .from("clan_weekly_challenge")
    .update({ bonus_awarded_at: now })
    .eq("clan_id", clanId)
    .eq("week_start", weekStart)
    .is("bonus_awarded_at", null)
    .gte("quests_completed", target)
    .select("clan_id")
    .maybeSingle();

  if (!locked) return;

  const { data: cRow } = await admin
    .from("clans")
    .select("xp_total")
    .eq("id", clanId)
    .maybeSingle();

  const cur = Number(cRow?.xp_total ?? 0);
  await admin
    .from("clans")
    .update({
      xp_total: cur + bonusXp,
      updated_at: now,
    })
    .eq("id", clanId);

  revalidatePath(`/student/clan/${clanId}`);
}

/** Award Clan XP for winning a duel. */
export async function recordClanDuelWin(userId: string, isClanWar: boolean): Promise<void> {
  const admin = createAdminClient();
  const { data: m } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!m?.clan_id) return;

  const clanId = m.clan_id as string;
  const xpAmount = isClanWar ? 50 : 10;
  const now = new Date().toISOString();

  const { data: cRow } = await admin
    .from("clans")
    .select("xp_total")
    .eq("id", clanId)
    .maybeSingle();

  const cur = Number(cRow?.xp_total ?? 0);
  await admin
    .from("clans")
    .update({
      xp_total: cur + xpAmount,
      updated_at: now,
    })
    .eq("id", clanId);

  // If there's an active war, update that too
  const { data: activeWar } = await admin
    .from("clan_wars")
    .select("id, clan_a_id, clan_b_id, clan_a_xp, clan_b_xp")
    .or(`clan_a_id.eq.${clanId},clan_b_id.eq.${clanId}`)
    .eq("status", "active")
    .maybeSingle();

  if (activeWar) {
    if (activeWar.clan_a_id === clanId) {
      await admin.from("clan_wars").update({ clan_a_xp: Number(activeWar.clan_a_xp) + xpAmount }).eq("id", activeWar.id);
    } else {
      await admin.from("clan_wars").update({ clan_b_xp: Number(activeWar.clan_b_xp) + xpAmount }).eq("id", activeWar.id);
    }
  }

  revalidatePath(`/student/clan/${clanId}`);
}
