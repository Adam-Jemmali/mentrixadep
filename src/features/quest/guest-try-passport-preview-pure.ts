import { buildPassportVerdict, practiceAccuracyToMasteryStateLabel } from "@/features/rank-card/rank-passport-pure";
import type { RankCardData, RankPassportReceipt } from "@/features/rank-card/types";
import { getAccountRankFromTotalXp } from "@/features/xp/rank-icons";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

/** AP Calculus AB skill tree size — used when mastery grid is not loaded. */
export const AP_CALC_AB_SKILL_NODE_TOTAL = 24;

export function buildGuestTryPassportPreview(params: {
  correct: number;
  total: number;
  wouldXp: number;
  breakthroughReceipts?: RankPassportReceipt[];
}): RankCardData {
  const accuracy = params.total > 0 ? Math.round((params.correct / params.total) * 100) : 0;
  const rank = getAccountRankFromTotalXp(params.wouldXp);
  const verifiedCount = Math.max(0, Math.min(params.correct, params.total));

  return {
    userId: "00000000-0000-0000-0000-000000000000",
    username: "you",
    displayName: "You",
    globalRankTitle: rank.title,
    globalRankLevel: rank.level,
    rankTitle: rank.title,
    rankLevel: rank.level,
    totalXp: params.wouldXp,
    verifiedPercentile: null,
    verifiedSkillCount: verifiedCount,
    verifiedAccuracyPercent: accuracy,
    passportVerdict: buildPassportVerdict({ verifiedCount, percentile: null }),
    breakthroughReceipts: params.breakthroughReceipts ?? [],
    subjects: [],
    topSubject: {
      subject: AP_CALC_AB_SUBJECT,
      rankTitle: rank.title,
      rankLevel: rank.level,
      accuracyTrend: [],
      currentAccuracy: accuracy,
      duelWinRate: 0,
      peerDuelWinRate: null,
      guideSessionsCompleted: 0,
      breakthroughs: [],
      lastActivityAt: null,
      questCount: 1,
      verifiedFirstAttemptSummary: null,
    },
    warBadges: [],
    masteryGrid: null,
    rankDeltaVerdict: null,
    passportDivision: {
      status: "no_division",
      divisionName: AP_CALC_AB_SUBJECT,
      myRank: null,
      myXp: 0,
    },
    isPrivate: false,
    identity: {
      avatarUrl: null,
      bio: null,
      timezone: "UTC",
      memberSince: new Date().toISOString().slice(0, 10),
      sex: null,
      signature: null,
      role: "student",
    },
  };
}

export function buildGuestTryBreakthroughReceipts(
  nodes: Array<{ nodeName?: string | null; correct: boolean }>,
): RankPassportReceipt[] {
  const today = new Date().toISOString().slice(0, 10);
  return nodes
    .filter((entry) => entry.correct && entry.nodeName)
    .slice(0, 3)
    .map((entry) => ({
      nodeName: entry.nodeName!,
      beforeState: "Weak",
      afterState: practiceAccuracyToMasteryStateLabel(100),
      date: today,
    }));
}
