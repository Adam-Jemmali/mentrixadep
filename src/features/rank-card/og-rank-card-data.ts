import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import { buildPassportVerdict, passportVerdictPlainText } from "@/features/rank-card/rank-passport-pure";
import { supabaseRestSelect } from "@/shared/integrations/supabase/rest-fetch";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";

export type OgRankCardData =
  | { status: "not_found" }
  | { status: "private"; username: string }
  | {
      status: "ok";
      username: string;
      displayName: string;
      rankLevel: number;
      rankTitle: string;
      passportVerdictText: string;
      topPercentGold: number | null;
      verifiedSkillCount: number;
    };

type SettingsRow = {
  user_id: string;
  display_name: string | null;
  rank_card_public: boolean | null;
};

type UserRow = {
  role: string;
  approved: boolean | null;
};

type XpRow = {
  total_xp: number | null;
};

type RankCacheRow = {
  verified_count: number | null;
  percentile: number | string | null;
};

/** Edge-safe loader for OG images — avoids @supabase/supabase-js and full rank-card build. */
export async function loadOgRankCardData(rawUsername: string): Promise<OgRankCardData> {
  const username = rawUsername.trim().toLowerCase();
  if (!username) return { status: "not_found" };

  const settingsRows = await supabaseRestSelect<SettingsRow>(
    "user_settings",
    `rank_card_username=eq.${encodeURIComponent(username)}&select=user_id,display_name,rank_card_public&limit=1`,
  );

  const settings = settingsRows[0];
  if (!settings?.user_id) return { status: "not_found" };

  if (settings.rank_card_public === false) {
    return { status: "private", username };
  }

  const studentId = settings.user_id;

  const [userRows, xpRows, rankCacheRows] = await Promise.all([
    supabaseRestSelect<UserRow>(
      "users",
      `id=eq.${encodeURIComponent(studentId)}&select=role,approved&limit=1`,
    ),
    supabaseRestSelect<XpRow>(
      "user_xp",
      `user_id=eq.${encodeURIComponent(studentId)}&select=total_xp&limit=1`,
    ),
    supabaseRestSelect<RankCacheRow>(
      "ap_calc_verified_rank_cache",
      `user_id=eq.${encodeURIComponent(studentId)}&select=verified_count,percentile&limit=1`,
    ),
  ]);

  const user = userRows[0];
  if (!user || user.role !== "student" || !user.approved) {
    return { status: "not_found" };
  }

  const totalXp = xpRows[0]?.total_xp ?? 0;
  const verifiedSkillCount = Number(rankCacheRows[0]?.verified_count ?? 0);
  const rawPercentile = rankCacheRows[0]?.percentile;
  const percentile =
    rawPercentile == null || Number.isNaN(Number(rawPercentile))
      ? null
      : Number(rawPercentile);

  const passportVerdict = buildPassportVerdict({
    verifiedCount: verifiedSkillCount,
    percentile,
  });

  const rankLevel = rankFromTotalXp(totalXp).level;
  const rankVisual = getAccountRankByLevel(rankLevel);

  const displayName =
    (typeof settings.display_name === "string" && settings.display_name.trim()
      ? settings.display_name.trim()
      : username) || "Mentrixer";

  return {
    status: "ok",
    username,
    displayName,
    rankLevel,
    rankTitle: normalizeRankTitle(rankVisual.title),
    passportVerdictText: passportVerdictPlainText(passportVerdict),
    topPercentGold: passportVerdict.kind === "ranked" ? passportVerdict.topPercent : null,
    verifiedSkillCount,
  };
}
