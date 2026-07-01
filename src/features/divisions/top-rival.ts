"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  AP_CALC_AB_DIVISION_NAME,
  resolveArenaDivisionKey,
  sumArenaDivisionXp,
} from "@/features/divisions/ap-calc-ab-division";

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
 * Get the top rival (user ranked directly above) in the AP Calculus AB league.
 * Used to show "Your rival this week" card on the dashboard.
 */
export async function getTopRival(): Promise<TopRivalData> {
  const user = await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();
  const focusedDivisionKey = resolveArenaDivisionKey();

  const { data: userXpRow } = await adminClient
    .from("user_xp")
    .select("division_xp")
    .eq("user_id", user.id)
    .single();

  const divisionXp = (userXpRow?.division_xp as Record<string, number>) ?? {};
  const myXp = sumArenaDivisionXp(divisionXp);

  if (myXp <= 0) {
    return { status: "no_division" };
  }

  const divisionName = AP_CALC_AB_DIVISION_NAME;

  const { count: rankCount } = await adminClient
    .from("mv_division_leaderboard")
    .select("*", { count: "exact", head: true })
    .eq("division_key", focusedDivisionKey)
    .gt("division_xp", myXp);

  const myRank = (rankCount ?? 0) + 1;

  if (myRank === 1) {
    return {
      status: "rank_1",
      divisionKey: focusedDivisionKey,
      divisionName,
      myRank,
      myXp,
    };
  }

  const { data: leaderboard } = await adminClient
    .from("mv_division_leaderboard")
    .select("user_id, user_display_name, division_xp")
    .eq("division_key", focusedDivisionKey)
    .gt("division_xp", myXp)
    .order("division_xp", { ascending: false })
    .limit(1)
    .single();

  if (!leaderboard) {
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
