import { describe, expect, it } from "vitest";
import {
  formatImpactScoreLabel,
  impactForCourseFilter,
  impactScoreColorTier,
  pickImpactForSubject,
} from "@/features/guide-impact/impact-score-pure";

describe("guide impact score", () => {
  it("assigns color tiers", () => {
    expect(impactScoreColorTier(87)).toBe("green");
    expect(impactScoreColorTier(70)).toBe("yellow");
    expect(impactScoreColorTier(40)).toBe("gray");
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
});
