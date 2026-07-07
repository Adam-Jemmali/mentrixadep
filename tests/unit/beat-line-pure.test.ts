import { describe, expect, it } from "vitest";
import { BEAT_LINE_SUMMARY, buildBeatLineView } from "@/features/divisions/beat-line-pure";
import type { TopRivalData } from "@/features/divisions/top-rival";

describe("buildBeatLineView", () => {
  it("returns null when user has no league XP", () => {
    expect(buildBeatLineView({ status: "no_division" })).toBeNull();
  });

  it("frames rank 1 as defend the beat line", () => {
    const view = buildBeatLineView({
      status: "rank_1",
      myRank: 1,
      myXp: 400,
      ctaLane: "duel",
    });
    expect(view?.verdict).toContain("Beat Line");
    expect(view?.ctaHref).toBe("/student/duel");
    expect(view?.chips.effort).toContain("1 tap");
  });

  it("frames rival chase with value equation chips", () => {
    const view = buildBeatLineView({
      status: "has_rival",
      myRank: 14,
      myXp: 220,
      rivalName: "Jordan Lee",
      rivalXp: 260,
      xpGap: 40,
      ctaLane: "quest",
    });
    expect(view?.verdict).toContain("Jordan");
    expect(view?.ctaLabel).toContain("Beat Jordan");
    expect(view?.chips.dreamOutcome).toContain("Pass Jordan");
    expect(view?.chips.timeDelay).toMatch(/~\d+ min/);
  });

  it("exports a marketing summary", () => {
    expect(BEAT_LINE_SUMMARY).toContain("real rival");
  });
});
