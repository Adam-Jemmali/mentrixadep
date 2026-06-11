"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStudentDivisionStats } from "@/features/divisions/leaderboard";

export interface TopRivalData {
  status: "no_division" | "rank_1" | "has_rival";
  divisionKey?: string;
  divisionName?: string;
  myRank?: number;
  myXp?: number;
  rivalId?: string;
  rivalName?: string;
  rivalXp?: number;
  xpGap?: number;
}

/**
 * Get the top rival (user ranked directly above) in the student's focused division.
 * Used to show "Your rival this week" card on the dashboard.
 */
export async function getTopRival(): Promise<TopRivalData> {
  const user = await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  // Get user's settings to find focused division
  const { data: settingsRow } = await adminClient
    .from("user_settings")
    .select("focused_division_key, display_name")
    .eq("user_id", user.id)
    .single();

  let focusedDivisionKey =
    typeof settingsRow?.focused_division_key === "string" &&
    settingsRow.focused_division_key.trim()
      ? settingsRow.focused_division_key.trim()
      : null;

  if (!focusedDivisionKey) {
    const divisionStats = await getStudentDivisionStats(user.id);
    focusedDivisionKey =
      [...divisionStats].sort((a, b) => b.xp - a.xp)[0]?.divisionKey ?? null;
  }

  if (!focusedDivisionKey) {
    return { status: "no_division" };
  }

  // Get division info
  const { data: divisionRow } = await adminClient
    .from("divisions")
    .select("name")
    .eq("key", focusedDivisionKey)
    .single();

  const divisionName = divisionRow?.name ?? focusedDivisionKey.replace(/-/g, " ");

  // Get user's current XP in the division
  const { data: userXpRow } = await adminClient
    .from("user_xp")
    .select("division_xp")
    .eq("user_id", user.id)
    .single();

  const divisionXp = (userXpRow?.division_xp as Record<string, number>) ?? {};
  const myXp = divisionXp[focusedDivisionKey] ?? 0;

  // Get user's rank in the division
  const { count: rankCount } = await adminClient
    .from("mv_division_leaderboard")
    .select("*", { count: "exact", head: true })
    .eq("division_key", focusedDivisionKey)
    .gt("division_xp", myXp);

  const myRank = (rankCount ?? 0) + 1;

  // If rank 1, return special status
  if (myRank === 1) {
    return {
      status: "rank_1",
      divisionKey: focusedDivisionKey,
      divisionName,
      myRank,
      myXp,
    };
  }

  // Get the user ranked directly above (rank = myRank - 1)
  // Query leaderboard and find the one with the highest XP below our threshold
  const { data: leaderboard } = await adminClient
    .from("mv_division_leaderboard")
    .select("user_id, user_display_name, division_xp")
    .eq("division_key", focusedDivisionKey)
    .gt("division_xp", myXp)
    .order("division_xp", { ascending: false })
    .limit(1)
    .single();

  if (!leaderboard) {
    // Shouldn't happen, but fallback to rank_1 if we can't find anyone above us
    return {
      status: "rank_1",
      divisionKey: focusedDivisionKey,
      divisionName,
      myRank,
      myXp,
    };
  }

  const rivalXp = leaderboard.division_xp ?? 0;
  const xpGap = rivalXp - myXp;

  return {
    status: "has_rival",
    divisionKey: focusedDivisionKey,
    divisionName,
    myRank,
    myXp,
    rivalId: leaderboard.user_id,
    rivalName: leaderboard.user_display_name ?? "Mysterious Challenger",
    rivalXp,
    xpGap,
  };
}
