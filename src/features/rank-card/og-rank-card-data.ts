import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import { buildPassportVerdict, passportVerdictPlainText } from "@/features/rank-card/rank-passport-pure";
import { loadMasteryGrid } from "@/features/mastery-grid/load-mastery-grid";
import { buildApReadinessBand } from "@/features/student-home/ap-readiness-band-pure";
import { supabaseRestSelect } from "@/shared/integrations/supabase/rest-fetch";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { isE2ESyntheticAccount } from "@/shared/core/e2e-synthetic-account-pure";
export type OgRankCardData =
  | { status: "not_found" }
  | { status: "private"; username: string }
  | {
      status: "ok";
      username: string;
      userId: string;
      displayName: string;
      rankLevel: number;
      rankTitle: string;
      passportVerdictText: string;
      topPercentGold: number | null;
      verifiedSkillCount: number;
      proofTier: number | null;
      accuracyPercent: number;
      topNodes: { name: string; verified: boolean }[];
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
  accuracy_percent: number | string | null;
};

/** Edge-safe loader for OG images — avoids @supabase/supabase-js and full rank-card build. */
export async function loadOgRankCardData(rawUsername: string): Promise<OgRankCardData> {
  const username = rawUsername.trim().toLowerCase();
  if (!username) return { status: "not_found" };
  if (isE2ESyntheticAccount({ username })) return { status: "not_found" };

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
      `user_id=eq.${encodeURIComponent(studentId)}&select=verified_count,percentile,accuracy_percent&limit=1`,
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
  const accuracyPercent = Number(rankCacheRows[0]?.accuracy_percent ?? 0);

  const proofBand = buildApReadinessBand({
    verifiedCount: verifiedSkillCount,
    accuracyPercent,
    percentile,
    eligibleCohortSize: null,
  });

  let topNodes: { name: string; verified: boolean }[] = [];
  try {
    const grid = await loadMasteryGrid(studentId);
    topNodes = grid.units
      .flatMap((unit) => unit.nodes)
      .slice(0, 6)
      .map((node) => ({
        name: node.nodeName,
        verified: node.state === "verified",
      }));
  } catch {
    topNodes = [];
  }

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

  if (isE2ESyntheticAccount({ displayName, username })) {
    return { status: "not_found" };
  }

  return {
    status: "ok",
    username,
    userId: studentId,
    displayName,
    rankLevel,
    rankTitle: normalizeRankTitle(rankVisual.title),
    passportVerdictText: passportVerdictPlainText(passportVerdict),
    topPercentGold: passportVerdict.kind === "ranked" ? passportVerdict.topPercent : null,
    verifiedSkillCount,
    proofTier: proofBand.score,
    accuracyPercent,
    topNodes,
  };
}
