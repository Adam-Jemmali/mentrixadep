import { describe, expect, it } from "vitest";
import {
  formatBreakthroughReceiptLine,
  rankPassportAccuracyHeadline,
  rankPassportBandCaption,
  rankPassportBandFootnote,
  rankPassportPeerValue,
  resolvePassportVerifiedMetrics,
} from "@/features/rank-card/rank-passport-page-pure";
import type { RankCardData } from "@/features/rank-card/types";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

function mockRankCard(overrides: Partial<RankCardData> = {}): RankCardData {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    username: "trapdime",
    displayName: "Trapdime",
    globalRankTitle: "Rising",
    globalRankLevel: 3,
    rankTitle: "Rising",
    rankLevel: 3,
    totalXp: 1200,
    verifiedPercentile: 44,
    verifiedSkillCount: 54,
    verifiedAccuracyPercent: 54,
    passportVerdict: { kind: "ranked", topPercent: 12 },
    breakthroughReceipts: [],
    subjects: [],
    topSubject: {
      subject: "General",
      rankTitle: "Rising",
      rankLevel: 3,
      accuracyTrend: [],
      currentAccuracy: 100,
      duelWinRate: 0,
      peerDuelWinRate: null,
      guideSessionsCompleted: 0,
      breakthroughs: [],
      lastActivityAt: null,
      questCount: 20,
    },
    warBadges: [],
    masteryGrid: null,
    passportDivision: {
      status: "has_rival",
      divisionName: AP_CALC_AB_SUBJECT,
      myRank: 4,
      myXp: 800,
    },
    identity: {
      avatarUrl: null,
      bio: null,
      timezone: "UTC",
      memberSince: "2024-01-01T00:00:00.000Z",
      sex: null,
      signature: null,
      role: "student",
    },
    isPrivate: false,
    ...overrides,
  };
}

describe("rank passport page copy", () => {
  it("formats band caption and footnote", () => {
    expect(rankPassportBandCaption(4)).toBe("Proof tier 4 on AP Calculus AB");
    expect(rankPassportBandCaption(null)).toContain("Building proof");
    expect(rankPassportBandFootnote()).toBe("");
  });

  it("resolves verified metrics from verifiedAccuracyPercent not topSubject", () => {
    const data = mockRankCard();
    const metrics = resolvePassportVerifiedMetrics(data);
    expect(metrics.correct).toBe(29);
    expect(data.topSubject?.currentAccuracy).toBe(100);
    expect(data.verifiedAccuracyPercent).toBe(54);
  });

  it("first try display uses correct count out of verified skills", () => {
    const data = mockRankCard({ verifiedSkillCount: 54, verifiedAccuracyPercent: 44 });
    const metrics = resolvePassportVerifiedMetrics(data);
    expect(metrics.correct).toBe(24);
  });

  it("formats accuracy headline", () => {
    expect(rankPassportAccuracyHeadline(71, 1)).toBe("71% first try Top 1%");
    expect(rankPassportAccuracyHeadline(71, null)).toBe("71% first try");
  });

  it("formats peer value", () => {
    expect(rankPassportPeerValue({ kind: "ranked", topPercent: 1 }, 99)).toBe("1%");
  });

  it("formats breakthrough receipt without separators", () => {
    expect(
      formatBreakthroughReceiptLine({
        nodeName: "Chain rule",
        beforeState: "weak",
        afterState: "verified",
        date: "Jul 1",
        prePercent: 40,
        postPercent: 88,
      }),
    ).toBe("Chain rule 40% to 88% Jul 1");
  });
});
