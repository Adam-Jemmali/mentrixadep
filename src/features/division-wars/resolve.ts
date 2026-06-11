"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import { notifyDivisionWarMembers } from "@/features/division-wars/war-notifications";
import { processDivisionWarMatchmaking } from "@/features/division-wars/matchmaking";

const BADGE_DAYS = 7;

export async function processDivisionWarResolution(asOf: Date = new Date()): Promise<{
  weekClosed: string;
  warsResolved: number;
  xpGranted: number;
  errors: string[];
}> {
  const weekStart = getUtcWeekMondayString(asOf);
  const admin = createAdminClient();
  const errors: string[] = [];
  let warsResolved = 0;
  let xpGranted = 0;

  const { data: wars } = await admin
    .from("division_wars")
    .select("id, division_a_id, division_b_id, week_start, week_end, status")
    .eq("week_start", weekStart)
    .eq("status", "active");

  for (const war of wars ?? []) {
    try {
      const result = await resolveSingleWar(admin, war, asOf);
      warsResolved += result.resolved ? 1 : 0;
      xpGranted += result.xpGranted;
    } catch (e) {
      errors.push(`${war.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { weekClosed: weekStart, warsResolved, xpGranted, errors };
}

async function resolveSingleWar(
  admin: ReturnType<typeof createAdminClient>,
  war: {
    id: string;
    division_a_id: string;
    division_b_id: string;
    week_start: string;
    week_end: string;
  },
  asOf: Date,
): Promise<{ resolved: boolean; xpGranted: number }> {
  const { data: contribs } = await admin
    .from("division_war_contributions")
    .select("division_id, total_accuracy_points")
    .eq("war_id", war.id);

  let pointsA = 0;
  let pointsB = 0;
  for (const row of contribs ?? []) {
    const pts = Number(row.total_accuracy_points ?? 0);
    if (row.division_id === war.division_a_id) pointsA += pts;
    else if (row.division_id === war.division_b_id) pointsB += pts;
  }

  let winnerId: string | null = null;
  if (pointsA > pointsB) winnerId = war.division_a_id;
  else if (pointsB > pointsA) winnerId = war.division_b_id;

  await admin
    .from("division_wars")
    .update({ status: "completed", winner_division_id: winnerId })
    .eq("id", war.id);

  if (!winnerId) {
    return { resolved: true, xpGranted: 0 };
  }

  const { data: winnerDiv } = await admin
    .from("divisions")
    .select("id, key, name")
    .eq("id", winnerId)
    .single();

  const { data: activeContribs } = await admin
    .from("division_war_contributions")
    .select("student_id, quests_completed")
    .eq("war_id", war.id)
    .eq("division_id", winnerId)
    .gt("quests_completed", 0);

  const { data: allContribUsers } = await admin
    .from("division_war_contributions")
    .select("student_id")
    .eq("war_id", war.id);

  const expiresAt = new Date(asOf);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + BADGE_DAYS);

  let xpGranted = 0;
  const notifyIds: string[] = [];

  for (const row of activeContribs ?? []) {
    const uid = row.student_id;
    notifyIds.push(uid);

    const awardKey = `division_war_win:${war.id}:${uid}`;
    const award = await applyXpAward(uid, XP.DIVISION_WAR_WIN, awardKey, winnerDiv?.key ?? null);
    if (award.awarded) xpGranted += 1;

    await admin.from("division_war_badges").upsert(
      {
        user_id: uid,
        war_id: war.id,
        division_id: winnerId,
        division_name: winnerDiv?.name ?? "Division",
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "user_id,war_id" },
    );
  }

  const [{ data: divA }, { data: divB }] = await Promise.all([
    admin.from("divisions").select("name").eq("id", war.division_a_id).single(),
    admin.from("divisions").select("name").eq("id", war.division_b_id).single(),
  ]);

  const winnerName = winnerDiv?.name ?? "Your division";
  const uniqueParticipants = Array.from(
    new Set((allContribUsers ?? []).map((r) => r.student_id)),
  );

  await notifyDivisionWarMembers(uniqueParticipants, {
    title: "Division War results",
    body: `${divA?.name ?? "Division A"} vs ${divB?.name ?? "Division B"} — ${winnerName} wins! +${XP.DIVISION_WAR_WIN} XP for active warriors.`,
    warId: war.id,
  });

  return { resolved: true, xpGranted };
}

/** Sunday resolution + optional next-week prep (matchmaking runs Monday cron). */
export async function processDivisionWarWeeklyCycle(asOf: Date = new Date()) {
  const resolution = await processDivisionWarResolution(asOf);
  return resolution;
}

/** Called from Monday division-weekly cron after leaderboard awards. */
export async function processDivisionWarWeeklyStart(asOf: Date = new Date()) {
  return processDivisionWarMatchmaking(asOf);
}
