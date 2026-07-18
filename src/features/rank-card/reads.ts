"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { buildRankCardSubjects } from "@/features/rank-card/build-rank-card";
import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import { parseReferrerSource } from "@/features/rank-card/referrer";
import type { RankCardResult } from "@/features/rank-card/types";
import { trackEvent } from "@/shared/integrations/analytics";
import { getActiveWarBadgesForUser } from "@/features/division-wars/war-notifications";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { loadPassportBreakthroughReceipts } from "@/features/rank-card/load-passport-breakthroughs";
import { loadRankPassportVerdict } from "@/features/rank-card/load-rank-passport-verdict";
import { buildPassportVerdict } from "@/features/rank-card/rank-passport-pure";
import {
  getApCalcVerifiedRankStats,
} from "@/features/xp/calibrated-rank";
import { getCurrentUser } from "@/shared/core/auth";
import { isE2ESyntheticAccount } from "@/shared/core/e2e-synthetic-account-pure";

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
  const email = authUser?.user?.email ?? null;
  const emailPrefix = email?.split("@")[0] ?? "mentrixer";
  const displayName =
    (typeof settings.display_name === "string" && settings.display_name.trim()
      ? settings.display_name.trim()
      : emailPrefix) || "Mentrixer";

  // CI/E2E synthetics stay invisible to the public; owner may still open their own passport.
  if (
    isE2ESyntheticAccount({
      email,
      displayName,
      username: settings.rank_card_username,
    })
  ) {
    const viewer = await getCurrentUser();
    if (!viewer || viewer.id !== studentId) return null;
  }

  const { data: xpRow } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", studentId)
    .maybeSingle();

  const totalXp = xpRow?.total_xp ?? 0;
  const globalRank = rankFromTotalXp(totalXp);
  const verifiedStats = await getApCalcVerifiedRankStats(studentId);
  const [subjects, warBadges, masteryGrid, breakthroughReceipts, rankDeltaVerdict] =
    await Promise.all([
    buildRankCardSubjects(studentId, totalXp),
    getActiveWarBadgesForUser(studentId),
    loadMasteryGrid(studentId).catch(() => null),
    loadPassportBreakthroughReceipts(studentId).catch(() => []),
    loadRankPassportVerdict(studentId).catch(() => null),
  ]);
  const topSubject = subjects[0] ?? null;
  const passportVerdict = buildPassportVerdict({
    verifiedCount: verifiedStats.verifiedCount,
    percentile: verifiedStats.percentile,
  });

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
    userId: studentId,
    username,
    displayName,
    globalRankTitle: globalRank.title,
    globalRankLevel: globalRank.level,
    rankTitle: globalRank.title,
    rankLevel: globalRank.level,
    totalXp,
    verifiedPercentile: verifiedStats.percentile,
    verifiedSkillCount: verifiedStats.verifiedCount,
    passportVerdict,
    breakthroughReceipts,
    subjects,
    topSubject,
    warBadges,
    masteryGrid,
    rankDeltaVerdict,
    isPrivate: false as const,
  };
}
