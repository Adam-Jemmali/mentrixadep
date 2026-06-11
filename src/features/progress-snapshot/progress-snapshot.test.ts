import { describe, expect, it } from "vitest";
import {
  predictNextRank,
  rankChangeDirection,
  rankFromTotalXp,
  subjectLineRankPhrase,
} from "@/features/progress-snapshot/calculate-pure";
import { pickImpactForSubject } from "@/features/guide-impact/impact-score-pure";

describe("progress snapshot pure calculations", () => {
  it("detects rank movement", () => {
    expect(
      rankChangeDirection(
        { level: 1, title: "WANDERER" },
        { level: 2, title: "SEEKER" },
      ),
    ).toBe("up");
  });

  it("predicts days to next rank from weekly pace", () => {
    const p = predictNextRank({ totalXp: 95, xpEarnedLast7Days: 70 });
    expect(p.title).toBe("SEEKER");
    expect(p.xpNeeded).toBeGreaterThan(0);
    expect(p.daysAtCurrentPace).toBeGreaterThan(0);
  });

  it("prefers concept-matched guide impact scores", () => {
    const entries = [
      { subject: "Calculus", impactScore: 72, sessionsCounted: 5 },
      { subject: "Integration by Parts", impactScore: 87, sessionsCounted: 4 },
    ];
    const pick = pickImpactForSubject(entries, "Calculus", "Integration by Parts");
    expect(pick?.impactScore).toBe(87);
  });

  it("builds subject line rank phrase", () => {
    expect(subjectLineRankPhrase("up")).toContain("moved up");
  });

  it("maps wanderer at zero xp", () => {
    expect(rankFromTotalXp(0).title).toBe("WANDERER");
  });
});
