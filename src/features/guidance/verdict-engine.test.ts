import { describe, expect, it } from "vitest";
import {
  buildBreakthroughVerdict,
  buildDuelResultVerdict,
  buildImpactScoreVerdict,
  buildQuestResultVerdict,
  buildRankDeltaVerdict,
  buildWeeklySnapshotVerdict,
  findNextReviewNodeAfterBreakthrough,
  roundAccuracyPercent,
} from "@/features/guidance/verdict-engine-pure";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";

describe("roundAccuracyPercent", () => {
  it("rounds correct ratio", () => {
    expect(roundAccuracyPercent(3, 4)).toBe(75);
    expect(roundAccuracyPercent(0, 0)).toBe(0);
  });
});

describe("buildQuestResultVerdict", () => {
  it("names the largest negative delta and recommends practice", () => {
    const verdict = buildQuestResultVerdict(
      [
        {
          skillNodeId: "a",
          nodeName: "Chain Rule",
          sessionCorrect: 1,
          sessionTotal: 4,
          misconceptionTag: "product-rule-in-quotient",
        },
        {
          skillNodeId: "b",
          nodeName: "Limits",
          sessionCorrect: 4,
          sessionTotal: 4,
        },
      ],
      [
        {
          skillNodeId: "a",
          nodeName: "Chain Rule",
          accuracyPercent: 72,
          attempts: 10,
        },
        {
          skillNodeId: "b",
          nodeName: "Limits",
          accuracyPercent: 80,
          attempts: 5,
        },
      ],
    );

    expect(verdict.changed).toContain("Chain Rule");
    expect(verdict.changed).toContain("-47");
    expect(verdict.reason).toContain("product-rule-in-quotient");
    expect(verdict.nextAction.label).toContain("Practice Chain Rule");
    expect(verdict.nextAction.href).toContain("/student/quest");
  });

  it("prioritizes due retest over practice", () => {
    const verdict = buildQuestResultVerdict(
      [
        {
          skillNodeId: "a",
          nodeName: "Chain Rule",
          sessionCorrect: 2,
          sessionTotal: 4,
        },
      ],
      [],
      { skillNodeId: "due", nodeName: "U-Substitution" },
    );

    expect(verdict.nextAction.label).toContain("Retest U-Substitution");
  });
});

describe("buildDuelResultVerdict", () => {
  it("surfaces the missed node regardless of win", () => {
    const verdict = buildDuelResultVerdict(
      [
        {
          nodeName: "Related Rates",
          correctIndex: 1,
          myAnswer: 1,
        },
        {
          nodeName: "Implicit Differentiation",
          misconceptionTag: "forget-chain",
          correctIndex: 2,
          myAnswer: 0,
        },
      ],
      { yourScore: 4, theirScore: 3, total: 5, youWon: true, tie: false },
    );

    expect(verdict.changed).toContain("won");
    expect(verdict.reason).toContain("Implicit Differentiation");
    expect(verdict.reason).toContain("forget-chain");
    expect(verdict.nextAction.label).toContain("Implicit Differentiation");
  });
});

describe("buildRankDeltaVerdict", () => {
  it("names driving verified attempts", () => {
    const verdict = buildRankDeltaVerdict(
      { accuracyPercent: 72, percentile: 55, verifiedCount: 8 },
      { accuracyPercent: 68, percentile: 48 },
      [
        { nodeName: "Chain Rule", isCorrect: true },
        { nodeName: "L'Hôpital", isCorrect: false },
      ],
    );

    expect(verdict.changed).toContain("68%");
    expect(verdict.changed).toContain("72%");
    expect(verdict.reason).toContain("Chain Rule");
    expect(verdict.nextAction.label).toContain("L'Hôpital");
  });
});

describe("buildImpactScoreVerdict", () => {
  it("names the node with largest lift movement", () => {
    const verdict = buildImpactScoreVerdict(
      [
        {
          skillNodeId: "a",
          nodeName: "Integration by Parts",
          impactScore: 88,
          impactLift: 22,
          afterAccuracy: 88,
          beforeAccuracy: 66,
        },
        {
          skillNodeId: "b",
          nodeName: "Volumes",
          impactScore: 70,
          impactLift: -8,
          afterAccuracy: 62,
          beforeAccuracy: 70,
        },
      ],
      84,
      78,
    );

    expect(verdict.changed).toContain("Integration by Parts");
    expect(verdict.reason).toContain("66%");
    expect(verdict.reason).toContain("88%");
    expect(verdict.nextAction.href).toContain("/tutor/sessions-ai");
  });
});

describe("findNextReviewNodeAfterBreakthrough", () => {
  const graph = [
    {
      id: "n1",
      nodeName: "Limits",
      displayOrder: 1,
      prerequisites: [],
    },
    {
      id: "n2",
      nodeName: "Chain Rule",
      displayOrder: 2,
      prerequisites: ["n1"],
    },
    {
      id: "n3",
      nodeName: "Implicit Differentiation",
      displayOrder: 3,
      prerequisites: ["n2"],
    },
  ];

  it("picks the next node whose prerequisites are verified", () => {
    const next = findNextReviewNodeAfterBreakthrough(
      graph,
      new Set(["n1", "n2"]),
      "Chain Rule",
    );
    expect(next?.nodeName).toBe("Implicit Differentiation");
  });
});

describe("buildBreakthroughVerdict", () => {
  it("routes to the next prerequisite-eligible node", () => {
    const verdict = buildBreakthroughVerdict(
      "Chain Rule",
      42,
      78,
      {
        id: "n3",
        nodeName: "Implicit Differentiation",
        displayOrder: 3,
        prerequisites: ["n2"],
      },
    );

    expect(verdict.changed).toContain("42%");
    expect(verdict.changed).toContain("78%");
    expect(verdict.nextAction.label).toContain("Implicit Differentiation");
  });
});

describe("buildWeeklySnapshotVerdict", () => {
  it("combines week signals into one decision", () => {
    const data: ProgressSnapshotData = {
      firstName: "Alex",
      subject: "AP Calculus AB",
      divisionKey: "calculus",
      rankChange: {
        direction: "up",
        previous: { level: 2, title: "Pathfinder" },
        current: { level: 3, title: "Climber" },
      },
      accuracyThisWeek: 78,
      accuracyDelta: 6,
      duelsWon: 2,
      duelsLost: 1,
      divisionRank: { current: 12, previous: 15, delta: 3 },
      weakestConcept: { label: "Integration by Parts", accuracyPercent: 52 },
      predictedNextRank: { title: "Strategist", xpNeeded: 400, daysAtCurrentPace: 9 },
      recommendedGuide: {
        tutorId: "00000000-0000-4000-8000-000000000001",
        displayName: "Jordan",
        impactScore: 87,
        impactSubject: "Integration by Parts",
        bookingUrl: "/student?guide=1#browse-guides",
      },
      bookingCtaUrl: "/student?guide=1#browse-guides",
    };

    const verdict = buildWeeklySnapshotVerdict(data);
    expect(verdict.changed).toContain("78%");
    expect(verdict.changed).toContain("Pathfinder");
    expect(verdict.reason).toContain("Integration by Parts");
    expect(verdict.nextAction.label).toContain("Jordan");
    expect(verdict.nextAction.href).toBe("/student?guide=1#browse-guides");
  });
});
