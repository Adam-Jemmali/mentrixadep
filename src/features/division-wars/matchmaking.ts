/**
 * Internal division war matchmaking — server-only imports (cron).
 * Not a server action module; never import from client components.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUtcWeekMondayString, getUtcWeekSundayString } from "@/features/divisions/division-week";
import { pairDivisionsForWar, type DivisionMatchCandidate } from "@/features/division-wars/scoring-pure";
import { notifyDivisionWarMembers } from "@/features/division-wars/war-notifications";

/** Internal only — pairs active divisions for the current war week. */
export async function processDivisionWarMatchmaking(asOf: Date = new Date()): Promise<{
  weekStart: string;
  warsCreated: number;
  errors: string[];
}> {
  const weekStart = getUtcWeekMondayString(asOf);
  const weekEnd = getUtcWeekSundayString(asOf);
  const admin = createAdminClient();
  const errors: string[] = [];
  let warsCreated = 0;

  const { data: divisions } = await admin
    .from("divisions")
    .select("id, key, name")
    .eq("active", true);

  if (!divisions || divisions.length < 2) {
    return { weekStart, warsCreated: 0, errors };
  }

  const candidates: DivisionMatchCandidate[] = [];

  for (const div of divisions) {
    const [{ count: memberCount }, { data: weekRows }] = await Promise.all([
      admin
        .from("user_divisions")
        .select("*", { count: "exact", head: true })
        .eq("division_key", div.key),
      admin
        .from("division_weekly_xp")
        .select("xp_earned")
        .eq("division_key", div.key)
        .eq("week_start", weekStart)
        .gt("xp_earned", 0),
    ]);

    const weeklyActivity = (weekRows ?? []).reduce((s, r) => s + (r.xp_earned ?? 0), 0);
    if ((memberCount ?? 0) < 2) continue;

    candidates.push({
      id: div.id,
      key: div.key,
      name: div.name,
      memberCount: memberCount ?? 0,
      weeklyActivity,
    });
  }

  const pairs = pairDivisionsForWar(candidates);

  for (const [a, b] of pairs) {
    const { data: existing } = await admin
      .from("division_wars")
      .select("id")
      .eq("week_start", weekStart)
      .or(
        `and(division_a_id.eq.${a.id},division_b_id.eq.${b.id}),and(division_a_id.eq.${b.id},division_b_id.eq.${a.id})`,
      )
      .maybeSingle();

    if (existing) continue;

    const { data: war, error } = await admin
      .from("division_wars")
      .insert({
        division_a_id: a.id,
        division_b_id: b.id,
        subject: a.name,
        week_start: weekStart,
        week_end: weekEnd,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !war) {
      errors.push(`${a.key} vs ${b.key}: ${error?.message ?? "insert failed"}`);
      continue;
    }

    warsCreated += 1;

    const memberIds = await loadDivisionMemberIds(admin, [a.key, b.key]);
    await notifyDivisionWarMembers(memberIds, {
      title: "Division War started",
      body: `${a.name} vs ${b.name}. Your quests this week count double. Go.`,
      warId: war.id,
    });
  }

  return { weekStart, warsCreated, errors };
}

async function loadDivisionMemberIds(
  admin: ReturnType<typeof createAdminClient>,
  divisionKeys: string[],
): Promise<string[]> {
  const { data } = await admin
    .from("user_divisions")
    .select("user_id")
    .in("division_key", divisionKeys);
  return Array.from(new Set((data ?? []).map((r) => r.user_id)));
}
