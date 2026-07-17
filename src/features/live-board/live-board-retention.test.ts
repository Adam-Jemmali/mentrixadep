import { describe, expect, it } from "vitest";
import {
  LIVE_BOARD_RETENTION_MS,
  isLiveBoardEventExpired,
  liveBoardRetentionCutoffIso,
} from "@/features/live-board/live-board-retention-pure";
import { resolveLiveBoardDisplayName } from "@/features/live-board/live-board-events-pure";

describe("live board retention", () => {
  const now = Date.parse("2026-07-11T12:00:00.000Z");

  it("uses a 48 hour window", () => {
    expect(LIVE_BOARD_RETENTION_MS).toBe(48 * 60 * 60 * 1000);
  });

  it("computes the cutoff 48h before now", () => {
    expect(liveBoardRetentionCutoffIso(now)).toBe("2026-07-09T12:00:00.000Z");
  });

  it("marks rows older than 48h as expired", () => {
    expect(isLiveBoardEventExpired("2026-07-09T11:59:00.000Z", now)).toBe(true);
    expect(isLiveBoardEventExpired("2026-07-10T12:00:00.000Z", now)).toBe(false);
  });
});

describe("live board display name privacy", () => {
  it("uses display_name when set", () => {
    expect(resolveLiveBoardDisplayName("Ada L.", "ada@example.com", 1234)).toBe("Ada L.");
  });

  it("falls back to first email letter plus 4-digit suffix, never the email", () => {
    const alias = resolveLiveBoardDisplayName(null, "ada@example.com", 4821);
    expect(alias).toBe("A4821");
    expect(alias).not.toContain("@");
    expect(alias).not.toContain("ada");
  });
});
