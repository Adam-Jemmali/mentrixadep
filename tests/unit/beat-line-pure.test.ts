import { describe, expect, it } from "vitest";
import { BEAT_LINE_SUMMARY, buildBeatLineView } from "@/features/divisions/beat-line-pure";

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
    expect(view?.categoryIcon).toBe("duels");
    expect(view?.ctaIcon).toBe("duels");
    expect(view?.lines.every((line) => Boolean(line.icon))).toBe(true);
  });

  it("frames rival chase with a single verdict", () => {
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
    expect(view?.categoryIcon).toBe("duels");
    expect(view?.ctaIcon).toBe("quest");
    expect(view?.lines.every((line) => Boolean(line.icon))).toBe(true);
  });

  it("exports a marketing summary", () => {
    expect(BEAT_LINE_SUMMARY).toContain("One rival");
  });
});
