"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { buildRankCardSubjects } from "@/features/rank-card/build-rank-card";
import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import { parseReferrerSource } from "@/features/rank-card/referrer";
import type { RankCardResult } from "@/features/rank-card/types";
import { trackEvent } from "@/shared/integrations/analytics";
import { getActiveWarBadgesForUser } from "@/features/division-wars/war-notifications";

type LoadOptions = {
  referrer?: string | null;
  skipAnalytics?: boolean;
};

export async function getRankCardByUsername(
  rawUsername: string,
  options: LoadOptions = {},
): Promise<RankCardResult> {
  const username = rawUsername.trim().toLowerCase();
  if (!username) return null;

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, display_name, rank_card_public, rank_card_username")
    .ilike("rank_card_username", username)
    .maybeSingle();

  if (!settings?.user_id) return null;

  const isPublic = (settings as { rank_card_public?: boolean }).rank_card_public !== false;
  if (!isPublic) {
    return { username, isPrivate: true as const };
  }

  const studentId = settings.user_id;
  const { data: userRow } = await admin
    .from("users")
    .select("id, role, approved")
    .eq("id", studentId)
    .maybeSingle();

  if (!userRow || userRow.role !== "student" || !userRow.approved) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(studentId);
  const emailPrefix = authUser?.user?.email?.split("@")[0] ?? "mentrixer";
  const displayName =
    (typeof settings.display_name === "string" && settings.display_name.trim()
      ? settings.display_name.trim()
      : emailPrefix) || "Mentrixer";

  const { data: xpRow } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", studentId)
    .maybeSingle();

  const totalXp = xpRow?.total_xp ?? 0;
  const globalRank = rankFromTotalXp(totalXp);
  const subjects = await buildRankCardSubjects(studentId, totalXp);
  const topSubject = subjects[0] ?? null;
  const warBadges = await getActiveWarBadgesForUser(studentId);

  if (!options.skipAnalytics) {
    void trackEvent("rank_card_viewed", {
      userId: studentId,
      properties: {
        username,
        referrer_source: parseReferrerSource(options.referrer),
        subject_count: subjects.length,
      },
    });
  }

  return {
    username,
    displayName,
    globalRankTitle: globalRank.title,
    globalRankLevel: globalRank.level,
    totalXp,
    subjects,
    topSubject,
    warBadges,
    isPrivate: false as const,
  };
}
