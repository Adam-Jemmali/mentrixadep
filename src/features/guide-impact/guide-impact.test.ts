import { describe, expect, it } from "vitest";
import {
  formatImpactScoreLabel,
  impactForCourseFilter,
  impactNodeScoreToState,
  impactScoreColorTier,
  pickImpactForSubject,
  sortImpactNodesByLift,
} from "@/features/guide-impact/impact-score-pure";

describe("guide impact score", () => {
  it("assigns mastery-aligned color tiers", () => {
    expect(impactNodeScoreToState(87)).toBe("verified");
    expect(impactNodeScoreToState(75)).toBe("proficient");
    expect(impactNodeScoreToState(55)).toBe("weak");
    expect(impactNodeScoreToState(0)).toBe("none");
    expect(impactScoreColorTier(87)).toBe("green");
    expect(impactScoreColorTier(70)).toBe("green");
    expect(impactScoreColorTier(40)).toBe("yellow");
  });

  it("formats display label", () => {
    expect(formatImpactScoreLabel(87.4)).toBe("87/100 Impact Score");
  });

  it("picks subject-matched impact for recommendation", () => {
    const entries = [
      { subject: "Calculus", impactScore: 60, sessionsCounted: 5 },
      { subject: "Integration by Parts", impactScore: 87, sessionsCounted: 4 },
    ];
    const pick = pickImpactForSubject(entries, "Calculus", "Integration by Parts");
    expect(pick?.subject).toBe("Integration by Parts");
    expect(pick?.impactScore).toBe(87);
  });

  it("filters browse impact by course", () => {
    const entries = [
      { subject: "Physics", impactScore: 55, sessionsCounted: 3 },
      { subject: "Calculus", impactScore: 92, sessionsCounted: 6 },
    ];
    expect(impactForCourseFilter(entries, "Calculus")?.impactScore).toBe(92);
  });

  it("sorts node impact by lift descending", () => {
    const sorted = sortImpactNodesByLift([
      {
        skillNodeId: "a",
        nodeName: "A",
        subject: "AP Calculus AB",
        impactScore: 80,
        studentsCounted: 3,
        afterAccuracy: 80,
        beforeAccuracy: 50,
        impactLift: 30,
      },
      {
        skillNodeId: "b",
        nodeName: "B",
        subject: "AP Calculus AB",
        impactScore: 90,
        studentsCounted: 4,
        afterAccuracy: 90,
        beforeAccuracy: 40,
        impactLift: 50,
      },
    ]);
    expect(sorted[0]?.nodeName).toBe("B");
  });
});
