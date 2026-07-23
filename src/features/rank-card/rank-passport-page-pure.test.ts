import { describe, expect, it } from "vitest";
import {
  formatBreakthroughReceiptLine,
  passportFirstTryWatermark,
  pickBestPassportBreakthroughReceipt,
  rankPassportAccuracyHeadline,
  rankPassportBandCaption,
  rankPassportBandFootnote,
  rankPassportBreakthroughConciseVerdict,
  rankPassportBreakthroughVerdict,
  rankPassportPeerValue,
  rankPassportRecordVerdict,
  resolvePassportVerifiedMetrics,
  summarizePassportBreakthroughs,
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

  it("first try watermark uses correct count not verified skill total", () => {
    const data = mockRankCard({ verifiedSkillCount: 54, verifiedAccuracyPercent: 44 });
    expect(passportFirstTryWatermark(data)).toBe(24);
    expect(passportFirstTryWatermark(data)).not.toBe(data.verifiedSkillCount);
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

  it("summarizes breakthrough receipts with lift metrics", () => {
    const summary = summarizePassportBreakthroughs([
      {
        nodeName: "Chain rule",
        beforeState: "weak",
        afterState: "verified",
        date: "Jul 1",
        prePercent: 40,
        postPercent: 88,
      },
      {
        nodeName: "Product rule",
        beforeState: "weak",
        afterState: "verified",
        date: "Jul 2",
        prePercent: 52,
        postPercent: 70,
      },
      {
        nodeName: "Limits",
        beforeState: "weak",
        afterState: "verified",
        date: "Jul 3",
      },
    ]);

    expect(summary.count).toBe(3);
    expect(summary.receiptsWithPercent).toBe(2);
    expect(summary.bestLift).toBe(48);
    expect(summary.bestLiftNodeName).toBe("Chain rule");
    expect(summary.avgLift).toBe(33);
    expect(rankPassportBreakthroughVerdict(summary)).toContain("best jump +48% on Chain rule");
  });

  it("picks best breakthrough receipt by percent lift", () => {
    const receipts = [
      {
        nodeName: "Product rule",
        beforeState: "weak",
        afterState: "verified",
        date: "Jul 2",
        prePercent: 52,
        postPercent: 70,
      },
      {
        nodeName: "Chain rule",
        beforeState: "weak",
        afterState: "verified",
        date: "Jul 1",
        prePercent: 40,
        postPercent: 88,
      },
    ];
    expect(pickBestPassportBreakthroughReceipt(receipts)?.nodeName).toBe("Chain rule");
    expect(rankPassportBreakthroughConciseVerdict(receipts[1], receipts.length)).toContain(
      "40% to 88%",
    );
  });

  it("formats live record verdict with best and current streak", () => {
    expect(rankPassportRecordVerdict(12, 4)).toContain("12 day best streak");
    expect(rankPassportRecordVerdict(12, 4)).toContain("4 day proof streak active");
    expect(rankPassportRecordVerdict(5, 0)).toBe("5 day best streak on record.");
  });
});
