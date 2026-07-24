import { describe, expect, it } from "vitest";
import {
  ARENA_PAGE_COPY,
  formatArenaBoardEventText,
  formatLiveBoardEventAnnouncement,
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
} from "@/features/live-board/live-board-messages-pure";

describe("arena board event text", () => {
  it("formats arena feed lines without display name", () => {
    expect(
      formatArenaBoardEventText({
        event_type: "verified_attempt",
        node_name: "Chain Rule",
        accuracy_pct: 82,
        new_rank_tier: null,
      }),
    ).toBe("scored 82% on Chain Rule first time");

    expect(
      formatArenaBoardEventText({
        event_type: "rank_advance",
        node_name: "Chain Rule",
        accuracy_pct: null,
        new_rank_tier: "Scholar",
      }),
    ).toBe("advanced to Scholar");

    expect(
      formatArenaBoardEventText({
        event_type: "breakthrough",
        node_name: "Related Rates",
        accuracy_pct: 78,
        new_rank_tier: null,
      }),
    ).toBe("broke through Related Rates");
  });
});

describe("live board messages", () => {
  const now = Date.parse("2026-07-07T18:00:00.000Z");

  it("formats verified attempt copy", () => {
    expect(
      formatLiveBoardEventDescription({
        event_type: "verified_attempt",
        node_name: "Chain Rule",
        accuracy_pct: 100,
        new_rank_tier: null,
        display_name: "Trapdime",
      }),
    ).toBe("Trapdime locked Chain Rule");
  });

  it("formats aria-live announcements from feed events", () => {
    expect(
      formatLiveBoardEventAnnouncement({
        event_type: "verified_attempt",
        node_name: "Chain Rule",
        accuracy_pct: 100,
        new_rank_tier: null,
        display_name: "Trapdime",
        unit_name: "Derivatives",
      }),
    ).toBe("Trapdime locked Chain Rule");
  });

  it("formats rank advance and breakthrough copy", () => {
    expect(
      formatLiveBoardEventDescription({
        event_type: "rank_advance",
        node_name: "Chain Rule",
        accuracy_pct: null,
        new_rank_tier: "Scholar",
        display_name: "Trapdime",
      }),
    ).toBe("Trapdime reached Scholar");

    expect(
      formatLiveBoardEventDescription({
        event_type: "breakthrough",
        node_name: "Related Rates",
        accuracy_pct: 82,
        new_rank_tier: null,
        display_name: "Trapdime",
      }),
    ).toBe("Trapdime broke through Related Rates");
  });

  it("formats relative time ago", () => {
    expect(
      formatLiveBoardTimeAgo("2026-07-07T17:58:00.000Z", now),
    ).toBe("2m ago");
    expect(formatLiveBoardTimeAgo("2026-07-07T17:59:50.000Z", now)).toBe("just now");
  });

  it("keeps arena CTA pointed at guest try", () => {
    expect(ARENA_PAGE_COPY.ctaHref).toBe("/try");
    expect(ARENA_PAGE_COPY.title).toMatch(/AP Calculus AB/i);
  });
});
