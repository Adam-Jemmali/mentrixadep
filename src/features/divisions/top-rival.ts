"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  AP_CALC_AB_DIVISION_NAME,
  resolveArenaDivisionKey,
  sumArenaDivisionXp,
} from "@/features/divisions/ap-calc-ab-division";
import { AP_CALC_AB_SUBJECT_DISPLAY } from "@/features/quest/ap-calc-ab-subject";

export type TopRivalCtaLane = "duel" | "quest";

export interface TopRivalData {
  status: "no_division" | "rank_1" | "has_rival";
  divisionKey?: string;
  divisionName?: string;
  subjectDisplay?: string;
  myDisplayName?: string;
  myAvatarUrl?: string | null;
  myRank?: number;
  myXp?: number;
  rivalId?: string;
  rivalName?: string;
  rivalAvatarUrl?: string | null;
  rivalXp?: number;
  xpGap?: number;
  /** Single next lane: defend in duels when #1, close gap in quest when behind. */
  ctaLane?: TopRivalCtaLane;
}

async function loadLeagueProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ displayName: string; avatarUrl: string | null }> {
  const [{ data: settings }, { data: authUser }] = await Promise.all([
    adminClient
      .from("user_settings")
      .select("display_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle(),
    adminClient.auth.admin.getUserById(userId),
  ]);

  const emailPrefix = authUser?.user?.email?.split("@")[0]?.trim() || "Mentrixer";
  const displayName =
    typeof settings?.display_name === "string" && settings.display_name.trim()
      ? settings.display_name.trim()
      : emailPrefix;

  const avatarUrl =
    typeof settings?.avatar_url === "string" && settings.avatar_url.trim().length > 0
      ? settings.avatar_url.trim()
      : null;

  return { displayName, avatarUrl };
}

/**
 * Get the top rival (user ranked directly above) in the AP Calculus AB league.
 * League rank uses division XP earned from quest and duel wins combined.
 */
export async function getTopRival(): Promise<TopRivalData> {
  const user = await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();
  const focusedDivisionKey = resolveArenaDivisionKey();
  const subjectDisplay = AP_CALC_AB_SUBJECT_DISPLAY;

  const [{ data: userXpRow }, myProfile] = await Promise.all([
    adminClient.from("user_xp").select("division_xp").eq("user_id", user.id).single(),
    loadLeagueProfile(adminClient, user.id),
  ]);

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
      subjectDisplay,
      myDisplayName: myProfile.displayName,
      myAvatarUrl: myProfile.avatarUrl,
      myRank,
      myXp,
      ctaLane: "duel",
    };
  }

  const { data: leaderboard } = await adminClient
    .from("mv_division_leaderboard")
    .select("user_id, division_xp")
    .eq("division_key", focusedDivisionKey)
    .gt("division_xp", myXp)
    .order("division_xp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!leaderboard?.user_id) {
    return {
      status: "rank_1",
      divisionKey: focusedDivisionKey,
      divisionName,
      subjectDisplay,
      myDisplayName: myProfile.displayName,
      myAvatarUrl: myProfile.avatarUrl,
      myRank,
      myXp,
      ctaLane: "duel",
    };
  }

  const rivalProfile = await loadLeagueProfile(adminClient, leaderboard.user_id);
  const rivalXp = leaderboard.division_xp ?? 0;
  const xpGap = rivalXp - myXp;

  return {
    status: "has_rival",
    divisionKey: focusedDivisionKey,
    divisionName,
    subjectDisplay,
    myDisplayName: myProfile.displayName,
    myAvatarUrl: myProfile.avatarUrl,
    myRank,
    myXp,
    rivalId: leaderboard.user_id,
    rivalName: rivalProfile.displayName,
    rivalAvatarUrl: rivalProfile.avatarUrl,
    rivalXp,
    xpGap,
    ctaLane: "quest",
  };
}
