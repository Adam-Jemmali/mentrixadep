"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import type {
  DivisionWarContributor,
  DivisionWarPanel,
  DivisionWarPanelPayload,
} from "@/features/division-wars/types";

async function loadDisplayNames(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data } = await admin
    .from("user_settings")
    .select("user_id, display_name")
    .in("user_id", userIds);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const name =
      typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name.trim()
        : "Mentrixer";
    map.set(row.user_id, name);
  }
  return map;
}

async function buildSide(
  admin: ReturnType<typeof createAdminClient>,
  warId: string,
  division: { id: string; key: string; name: string },
): Promise<DivisionWarPanel["sideA"]> {
  const { data: rows } = await admin
    .from("division_war_contributions")
    .select("student_id, total_accuracy_points, quests_completed")
    .eq("war_id", warId)
    .eq("division_id", division.id)
    .order("total_accuracy_points", { ascending: false })
    .limit(50);

  const contribs = rows ?? [];
  const userIds = contribs.map((r) => r.student_id);
  const names = await loadDisplayNames(admin, userIds);

  const topContributors: DivisionWarContributor[] = contribs.slice(0, 5).map((r) => ({
    studentId: r.student_id,
    displayName: names.get(r.student_id) ?? "Mentrixer",
    accuracyPoints: Number(r.total_accuracy_points ?? 0),
    questsCompleted: r.quests_completed ?? 0,
  }));

  const totalAccuracyPoints = contribs.reduce(
    (s, r) => s + Number(r.total_accuracy_points ?? 0),
    0,
  );

  return {
    divisionId: division.id,
    divisionKey: division.key,
    divisionName: division.name,
    totalAccuracyPoints,
    topContributors,
  };
}

export async function getDivisionWarPanel(
  divisionKey: string,
  userId: string,
): Promise<DivisionWarPanelPayload> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const weekStart = getUtcWeekMondayString();

  const { data: division } = await admin
    .from("divisions")
    .select("id, key, name")
    .eq("key", divisionKey.trim())
    .maybeSingle();

  if (!division) {
    return { war: null, myContribution: null, showInactiveBanner: false };
  }

  const { data: warRow } = await admin
    .from("division_wars")
    .select(
      "id, subject, week_start, week_end, status, winner_division_id, division_a_id, division_b_id",
    )
    .eq("week_start", weekStart)
    .or(`division_a_id.eq.${division.id},division_b_id.eq.${division.id}`)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!warRow) {
    return { war: null, myContribution: null, showInactiveBanner: false };
  }

  const [{ data: divA }, { data: divB }] = await Promise.all([
    admin.from("divisions").select("id, key, name").eq("id", warRow.division_a_id).single(),
    admin.from("divisions").select("id, key, name").eq("id", warRow.division_b_id).single(),
  ]);

  if (!divA || !divB) {
    return { war: null, myContribution: null, showInactiveBanner: false };
  }

  const [sideA, sideB] = await Promise.all([
    buildSide(admin, warRow.id, divA),
    buildSide(admin, warRow.id, divB),
  ]);

  let mySide: "a" | "b" | null = null;
  if (division.id === divA.id) mySide = "a";
  else if (division.id === divB.id) mySide = "b";

  const { data: myRow } = await admin
    .from("division_war_contributions")
    .select("total_accuracy_points, quests_completed")
    .eq("war_id", warRow.id)
    .eq("student_id", userId)
    .maybeSingle();

  const myPoints = Number(myRow?.total_accuracy_points ?? 0);
  const myQuests = myRow?.quests_completed ?? 0;

  const { data: membership } = await admin
    .from("user_divisions")
    .select("division_key")
    .eq("user_id", userId)
    .eq("division_key", divisionKey.trim())
    .maybeSingle();

  const showInactiveBanner =
    Boolean(membership) &&
    warRow.status === "active" &&
    myQuests === 0;

  const war: DivisionWarPanel = {
    warId: warRow.id,
    subject: warRow.subject,
    weekStart: String(warRow.week_start),
    weekEnd: String(warRow.week_end),
    status: warRow.status as "active" | "completed",
    sideA,
    sideB,
    mySide,
    winnerDivisionId: warRow.winner_division_id ?? null,
  };

  return {
    war,
    myContribution:
      myRow != null
        ? { accuracyPoints: myPoints, questsCompleted: myQuests }
        : null,
    showInactiveBanner,
  };
}

export async function getDivisionWarTotals(warId: string): Promise<{
  sideA: number;
  sideB: number;
} | null> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const { data: war } = await admin
    .from("division_wars")
    .select("division_a_id, division_b_id")
    .eq("id", warId)
    .maybeSingle();

  if (!war) return null;

  const { data: rows } = await admin
    .from("division_war_contributions")
    .select("division_id, total_accuracy_points")
    .eq("war_id", warId);

  let sideA = 0;
  let sideB = 0;
  for (const row of rows ?? []) {
    const pts = Number(row.total_accuracy_points ?? 0);
    if (row.division_id === war.division_a_id) sideA += pts;
    else if (row.division_id === war.division_b_id) sideB += pts;
  }
  return { sideA, sideB };
}
