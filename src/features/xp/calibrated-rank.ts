import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getAccountLevelFromTotalXp, MENTRIXER_MIN_XP } from "@/features/xp/levels";
import {
  getAccountRankByLevel,
  normalizeRankTitle,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";
import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import {
  AP_CALC_AB_SUBJECT,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";

export const MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE = 5;
/** Mentrixer min XP — scales percentile onto the seven account rank tiers. */
export const MAX_XP_FOR_RANK_SCALE = MENTRIXER_MIN_XP;

export type VerifiedFirstAttemptRankStats = {
  verifiedCount: number;
  accuracyPercent: number;
  percentile: number | null;
};

export type CalibratedRank = {
  title: string;
  level: number;
  visual: AccountRankVisual;
  source: "xp" | "verified_first_attempt";
  verifiedStats: VerifiedFirstAttemptRankStats | null;
};

export function rankLevelFromPercentile(percentile: number): number {
  const clamped = Math.max(0, Math.min(100, percentile));
  const virtualXp = Math.round((clamped / 100) * MAX_XP_FOR_RANK_SCALE);
  return getAccountLevelFromTotalXp(virtualXp).level;
}

/** Map first-attempt accuracy (0–100) onto rank tiers using the same XP ladder scale. */
export function rankLevelFromAccuracy(accuracyPercent: number): number {
  const clamped = Math.max(0, Math.min(100, accuracyPercent));
  const virtualXp = Math.round((clamped / 100) * MAX_XP_FOR_RANK_SCALE);
  return getAccountLevelFromTotalXp(virtualXp).level;
}

export function formatOrdinalPercentile(percentile: number): string {
  const value = Math.round(Math.max(0, Math.min(100, percentile)));
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th percentile`;
  switch (value % 10) {
    case 1:
      return `${value}st percentile`;
    case 2:
      return `${value}nd percentile`;
    case 3:
      return `${value}rd percentile`;
    default:
      return `${value}th percentile`;
  }
}

export function formatVerifiedFirstAttemptSummary(
  stats: VerifiedFirstAttemptRankStats
): string | null {
  if (stats.verifiedCount <= 0) return null;
  if (stats.percentile == null || stats.verifiedCount < MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE) {
    return null;
  }
  return `${stats.accuracyPercent} percent first attempt accuracy across ${stats.verifiedCount} verified AP Calculus AB skills, ${formatOrdinalPercentile(stats.percentile)}`;
}

/** Receipt-style verdict for email and screen readers. */
export function formatVerifiedRankVerdict(stats: VerifiedFirstAttemptRankStats): null | string {
  if (
    stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE &&
    stats.percentile != null
  ) {
    return `${stats.accuracyPercent}% accuracy · ${Math.round(stats.percentile)}th percentile · ${stats.verifiedCount} verified.`;
  }
  if (stats.verifiedCount > 0) {
    return `${stats.verifiedCount} verified · ${stats.accuracyPercent}% accuracy. Percentile unlocks at ${MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE}.`;
  }
  return null;
}

export function formatVerifiedRankNextAction(stats: VerifiedFirstAttemptRankStats): string {
  const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
  if (
    stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE &&
    stats.percentile != null
  ) {
    return "Verify next node";
  }
  if (remaining > 0 && stats.verifiedCount > 0) {
    return `Verify ${remaining} more to unlock percentile`;
  }
  return "Verify first node";
}

export async function loadVerifiedFirstAttemptRankStats(
  userId: string
): Promise<VerifiedFirstAttemptRankStats> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.rpc("get_verified_first_attempt_rank", {
      p_user_id: userId,
    });

    if (error || !data) {
      return { verifiedCount: 0, accuracyPercent: 0, percentile: null };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const verifiedCount = Number(row?.verified_count ?? 0);
    const accuracyPercent = Number(row?.accuracy_percent ?? 0);
    const rawPercentile = row?.percentile;
    const percentile =
      rawPercentile == null || Number.isNaN(Number(rawPercentile))
        ? null
        : Number(rawPercentile);

    return {
      verifiedCount: Number.isFinite(verifiedCount) ? verifiedCount : 0,
      accuracyPercent: Number.isFinite(accuracyPercent) ? accuracyPercent : 0,
      percentile:
        verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE && percentile != null
          ? percentile
          : null,
    };
  } catch {
    return { verifiedCount: 0, accuracyPercent: 0, percentile: null };
  }
}

async function loadTotalXp(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.total_xp ?? 0;
}

function calibratedRankFromStats(
  stats: VerifiedFirstAttemptRankStats
): CalibratedRank | null {
  if (stats.verifiedCount < MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE || stats.percentile == null) {
    return null;
  }

  const level = rankLevelFromPercentile(stats.percentile);
  const visual = getAccountRankByLevel(level);
  return {
    title: normalizeRankTitle(visual.title),
    level,
    visual,
    source: "verified_first_attempt",
    verifiedStats: stats,
  };
}

export async function getCalibratedRank(
  userId: string,
  subject: string
): Promise<CalibratedRank> {
  const totalXp = await loadTotalXp(userId);
  const xpRank = rankFromTotalXp(totalXp);
  const xpVisual = getAccountRankByLevel(xpRank.level);

  if (!isApCalculusAbSubject(subject)) {
    return {
      title: xpRank.title,
      level: xpRank.level,
      visual: xpVisual,
      source: "xp",
      verifiedStats: null,
    };
  }

  const stats = await loadVerifiedFirstAttemptRankStats(userId);
  const verifiedRank = calibratedRankFromStats(stats);
  if (verifiedRank) return verifiedRank;

  return {
    title: xpRank.title,
    level: xpRank.level,
    visual: xpVisual,
    source: "xp",
    verifiedStats: stats.verifiedCount > 0 ? stats : null,
  };
}

export async function getApCalcVerifiedRankStats(
  userId: string
): Promise<VerifiedFirstAttemptRankStats> {
  return loadVerifiedFirstAttemptRankStats(userId);
}

export function isApCalcSubjectName(subject: string): boolean {
  return isApCalculusAbSubject(subject) || subject.trim() === AP_CALC_AB_SUBJECT;
}
