import { describe, expect, it } from "vitest";
import {
  detectVerifiedRankTierAdvance,
  resolveLiveBoardDisplayName,
  verifiedAttemptAccuracyPct,
} from "@/features/live-board/live-board-events-pure";

describe("live board events pure", () => {
  it("maps a verified attempt to 0 or 100 accuracy", () => {
    expect(verifiedAttemptAccuracyPct(true)).toBe(100);
    expect(verifiedAttemptAccuracyPct(false)).toBe(0);
  });

  it("uses settings display name when set", () => {
    expect(resolveLiveBoardDisplayName("  Alex K  ", "secret@example.com", 1234)).toBe("Alex K");
  });

  it("anonymizes with first email letter and suffix when display name missing", () => {
    expect(resolveLiveBoardDisplayName(null, "mentrixer@example.com", 4821)).toBe("M4821");
    expect(resolveLiveBoardDisplayName("", "  z@x.com", 1000)).toBe("Z1000");
  });

  it("detects verified rank tier advance from aggregate accuracy", () => {
    const before = detectVerifiedRankTierAdvance(40, 45);
    expect(before.advanced).toBe(false);

    const after = detectVerifiedRankTierAdvance(40, 72);
    expect(after.advanced).toBe(true);
    expect(after.newLevel).toBeGreaterThan(1);
  });
});
