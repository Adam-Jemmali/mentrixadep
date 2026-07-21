import { describe, expect, it } from "vitest";
import {
  buildBreakthroughMessage,
  isGuideContextCacheFresh,
  isPreSessionContextWindowOpen,
  PRE_SESSION_CONTEXT_TTL_MS,
  PRE_SESSION_CONTEXT_WINDOW_MS,
} from "@/features/pre-session-brief/context-pure";

describe("pre-session context pure", () => {
  it("opens context window 30 minutes before session", () => {
    const start = new Date("2026-06-10T14:00:00.000Z").getTime();
    expect(isPreSessionContextWindowOpen(new Date(start).toISOString(), start - PRE_SESSION_CONTEXT_WINDOW_MS + 60000)).toBe(true);
    expect(isPreSessionContextWindowOpen(new Date(start).toISOString(), start - PRE_SESSION_CONTEXT_WINDOW_MS - 60000)).toBe(false);
  });

  it("respects 6hr cache TTL", () => {
    const now = Date.now();
    expect(isGuideContextCacheFresh(new Date(now - PRE_SESSION_CONTEXT_TTL_MS + 1000).toISOString(), now)).toBe(true);
    expect(isGuideContextCacheFresh(new Date(now - PRE_SESSION_CONTEXT_TTL_MS - 1000).toISOString(), now)).toBe(false);
  });

  it("builds breakthrough rank message", () => {
    const b = buildBreakthroughMessage({
      conceptLabel: "Integration by Parts",
      currentRankTitle: "Wanderer",
      totalXp: 50,
    });
    expect(b?.message).toContain("Integration by Parts");
    expect(b?.nextRankTitle).toBe("SEEKER");
  });
});
