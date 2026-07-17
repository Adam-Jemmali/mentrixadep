import { describe, expect, it } from "vitest";
import {
  formatDivisionWarResultHeadline,
  resolveLiveBoardDisplayName,
  verifiedAttemptAccuracyPct,
} from "@/features/live-board/live-board-events-pure";
import {
  ARENA_PAGE_COPY,
  formatDivisionWarScoreLine,
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
  isDivisionWarLiveBoardEvent,
} from "@/features/live-board/live-board-messages-pure";

describe("live board event helpers", () => {
  it("maps verified attempt accuracy to 0 or 100", () => {
    expect(verifiedAttemptAccuracyPct(true)).toBe(100);
    expect(verifiedAttemptAccuracyPct(false)).toBe(0);
  });

  it("builds anonymized display names without email", () => {
    expect(resolveLiveBoardDisplayName("Ada", "ada@example.com", 4821)).toBe("Ada");
    expect(resolveLiveBoardDisplayName(null, "ada@example.com", 4821)).toBe("A4821");
  });

  it("formats division war headlines and score lines", () => {
    expect(formatDivisionWarResultHeadline("Limits Legion", "Chain Rule Crew")).toBe(
      "Limits Legion defeated Chain Rule Crew",
    );
    expect(formatDivisionWarScoreLine("Limits Legion", 842, "Chain Rule Crew", 710)).toBe(
      "Limits Legion 842 · Chain Rule Crew 710",
    );
  });
});

describe("arena page copy", () => {
  it("matches the public arena spec", () => {
    expect(ARENA_PAGE_COPY.title).toBe("AP Calculus AB Live Rank Arena");
    expect(ARENA_PAGE_COPY.subtitle).toContain("first attempt");
    expect(ARENA_PAGE_COPY.ctaHref).toBe("/try");
  });
});

describe("live board feed copy", () => {
  it("renders brief per-event sentences with display names", () => {
    expect(
      formatLiveBoardEventDescription({
        event_type: "verified_attempt",
        node_name: "Chain Rule",
        accuracy_pct: 100,
        new_rank_tier: null,
        display_name: "A4821",
      }),
    ).toBe("A4821 scored 100% on Chain Rule · first try");

    expect(
      formatLiveBoardEventDescription({
        event_type: "rank_advance",
        node_name: "Chain Rule",
        accuracy_pct: null,
        new_rank_tier: "SEEKER",
        display_name: "A4821",
      }),
    ).toBe("A4821 advanced to SEEKER");

    expect(
      formatLiveBoardEventDescription({
        event_type: "breakthrough",
        node_name: "Chain Rule",
        accuracy_pct: 78,
        new_rank_tier: null,
        display_name: "A4821",
      }),
    ).toBe("A4821 broke through Chain Rule");
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
