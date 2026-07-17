import { describe, expect, it } from "vitest";
import {
  formatDivisionWarResultHeadline,
  isInventedLiveBoardAlias,
  resolveLiveBoardDisplayName,
  verifiedAttemptAccuracyPct,
} from "@/features/live-board/live-board-events-pure";
import {
  ARENA_FEED_VISIBLE_LIMIT,
  ARENA_PAGE_COPY,
  buildDivisionWarResultCardCopy,
  divisionWarAverageAccuracy,
  encodeDivisionWarLoserMeta,
  formatDivisionWarAccuracyLine,
  formatDivisionWarLoserNote,
  formatDivisionWarScoreLine,
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
  isDivisionWarLiveBoardEvent,
  parseDivisionWarLoserMeta,
} from "@/features/live-board/live-board-messages-pure";

describe("live board event helpers", () => {
  it("maps verified attempt accuracy to 0 or 100", () => {
    expect(verifiedAttemptAccuracyPct(true)).toBe(100);
    expect(verifiedAttemptAccuracyPct(false)).toBe(0);
  });

  it("uses real profile fields and never invents digit aliases", () => {
    expect(resolveLiveBoardDisplayName("Ada", "ada@example.com", "ada")).toBe("Ada");
    expect(resolveLiveBoardDisplayName(null, "ada@example.com", "ada")).toBe("ada");
    expect(resolveLiveBoardDisplayName(null, "ada@example.com")).toBe("ada");
    expect(resolveLiveBoardDisplayName(null, null, null)).toBe("Mentrixer");
    expect(isInventedLiveBoardAlias("A4821")).toBe(true);
    expect(isInventedLiveBoardAlias("Trapdime")).toBe(false);
  });

  it("formats division war headlines and score lines", () => {
    expect(formatDivisionWarResultHeadline("Limits Legion", "Chain Rule Crew")).toBe(
      "Limits Legion defeated Chain Rule Crew",
    );
    expect(formatDivisionWarScoreLine("Limits Legion", 842, "Chain Rule Crew", 710)).toBe(
      "Limits Legion 842 · Chain Rule Crew 710",
    );
  });

  it("encodes and parses war result card averages", () => {
    expect(divisionWarAverageAccuracy(730, 10)).toBe(73);
    expect(encodeDivisionWarLoserMeta("Chain Rule Crew", 68)).toBe("Chain Rule Crew|68");
    expect(parseDivisionWarLoserMeta("Chain Rule Crew|68")).toEqual({
      loserName: "Chain Rule Crew",
      loserAccuracyPct: 68,
    });
    expect(formatDivisionWarAccuracyLine(73)).toBe("73 percent average");
    expect(formatDivisionWarLoserNote("Chain Rule Crew", 68)).toBe(
      "Chain Rule Crew pushed hard this week. 68 percent average accuracy.",
    );

    const copy = buildDivisionWarResultCardCopy({
      node_name: "Limits Legion",
      unit_name: "Chain Rule Crew|68",
      accuracy_pct: 73,
      display_name: "Limits Legion defeated Chain Rule Crew",
    });
    expect(copy.winnerName).toBe("Limits Legion");
    expect(copy.loserName).toBe("Chain Rule Crew");
    expect(copy.winnerAccuracyPct).toBe(73);
    expect(copy.loserAccuracyPct).toBe(68);
    expect(copy.weekLabel).toBe("This week in AP Calculus AB");
  });
});

describe("arena page copy", () => {
  it("matches the public arena spec", () => {
    expect(ARENA_PAGE_COPY.title).toBe("AP Calculus AB Live Rank Arena");
    expect(ARENA_PAGE_COPY.subtitle).toContain("first attempt");
    expect(ARENA_PAGE_COPY.ctaHref).toBe("/try");
    expect(ARENA_FEED_VISIBLE_LIMIT).toBe(12);
  });
});

describe("live board feed copy", () => {
  it("renders concise per-event lines with real outcomes", () => {
    expect(
      formatLiveBoardEventDescription({
        event_type: "verified_attempt",
        node_name: "Chain Rule",
        accuracy_pct: 100,
        new_rank_tier: null,
        display_name: "Trapdime",
      }),
    ).toBe("Trapdime locked Chain Rule");

    expect(
      formatLiveBoardEventDescription({
        event_type: "verified_attempt",
        node_name: "Chain Rule",
        accuracy_pct: 0,
        new_rank_tier: null,
        display_name: "Trapdime",
      }),
    ).toBe("Trapdime missed Chain Rule");

    expect(
      formatLiveBoardEventDescription({
        event_type: "rank_advance",
        node_name: "Chain Rule",
        accuracy_pct: null,
        new_rank_tier: "SEEKER",
        display_name: "Trapdime",
      }),
    ).toBe("Trapdime → SEEKER");

    expect(
      formatLiveBoardEventDescription({
        event_type: "breakthrough",
        node_name: "Chain Rule",
        accuracy_pct: 78,
        new_rank_tier: null,
        display_name: "Trapdime",
      }),
    ).toBe("Trapdime broke through Chain Rule");
  });

  it("uses the headline for division war cards", () => {
    const headline = "Limits Legion defeated Chain Rule Crew";
    expect(
      formatLiveBoardEventDescription({
        event_type: "division_war_result",
        node_name: "Limits Legion",
        accuracy_pct: null,
        new_rank_tier: null,
        display_name: headline,
      }),
    ).toBe(headline);
    expect(isDivisionWarLiveBoardEvent("division_war_result")).toBe(true);
  });

  it("formats compact relative times", () => {
    const now = Date.parse("2026-07-11T12:00:00.000Z");
    expect(formatLiveBoardTimeAgo("2026-07-11T11:58:00.000Z", now)).toBe("2m ago");
    expect(formatLiveBoardTimeAgo("2026-07-11T10:00:00.000Z", now)).toBe("2h ago");
  });
});
