import { describe, expect, it } from "vitest";
import {
  buildRankCardShareTweet,
  computeAccuracyPercent,
  duelWinRate,
  subjectsLooselyMatch,
  weekKeyFromDate,
} from "@/features/rank-card/calculate-pure";
import { parseReferrerSource } from "@/features/rank-card/referrer";
import {
  isValidRankCardUsername,
  slugifyRankCardUsername,
  suggestRankCardUsername,
} from "@/features/rank-card/username";

describe("rank card pure helpers", () => {
  it("computes accuracy percent", () => {
    expect(computeAccuracyPercent(7, 10)).toBe(70);
    expect(computeAccuracyPercent(0, 0)).toBe(0);
  });

  it("matches subjects loosely", () => {
    expect(subjectsLooselyMatch("Calculus", "calculus")).toBe(true);
    expect(subjectsLooselyMatch("Integration by Parts", "Integration")).toBe(true);
    expect(subjectsLooselyMatch("Physics", "Chemistry")).toBe(false);
  });

  it("calculates duel win rate", () => {
    expect(duelWinRate(3, 1)).toBe(75);
    expect(duelWinRate(0, 0)).toBe(0);
  });

  it("builds ISO week keys", () => {
    const key = weekKeyFromDate(new Date("2026-06-10T12:00:00.000Z"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds share tweet copy", () => {
    const tweet = buildRankCardShareTweet({
      subject: "Calculus",
      rankTitle: "Scholar",
      accuracy: 82,
      username: "alex-k",
      siteUrl: "https://mentrixa.one",
    });
    expect(tweet).toContain("Calculus");
    expect(tweet).toContain("Scholar");
    expect(tweet).toContain("82%");
    expect(tweet).toContain("mentrixa.one/rank/alex-k");
  });
});

describe("rank card username", () => {
  it("slugifies display names", () => {
    expect(slugifyRankCardUsername("Alex K!")).toBe("alex-k");
  });

  it("validates username format", () => {
    expect(isValidRankCardUsername("alex-k")).toBe(true);
    expect(isValidRankCardUsername("ab")).toBe(false);
    expect(isValidRankCardUsername("-bad-")).toBe(false);
  });

  it("suggests usernames from display name", () => {
    expect(suggestRankCardUsername("Alex")).toBe("alex");
    expect(suggestRankCardUsername("Alex", "2")).toBe("alex-2");
  });
});

describe("rank card referrer", () => {
  it("classifies social referrers", () => {
    expect(parseReferrerSource("https://www.linkedin.com/feed/")).toBe("linkedin");
    expect(parseReferrerSource("https://twitter.com/i/web/status/1")).toBe("twitter");
    expect(parseReferrerSource(null)).toBe("direct");
  });
});
