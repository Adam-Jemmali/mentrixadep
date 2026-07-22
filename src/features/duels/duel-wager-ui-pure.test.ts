import { describe, expect, it } from "vitest";
import { DUEL_WAGER_STEP_COPY, duelInviteStakeCopy } from "@/features/duels/duel-wager-ui-pure";

describe("DUEL_WAGER_STEP_COPY", () => {
  it("uses product copy without decorative punctuation", () => {
    expect(DUEL_WAGER_STEP_COPY.subtitle).toBe("Optional. XP only. No real money.");
    expect(DUEL_WAGER_STEP_COPY.skipCta).toBe("Skip. No stake.");
  });
});

describe("duelInviteStakeCopy", () => {
  it("uses first name and formatted amount", () => {
    expect(duelInviteStakeCopy("Alex Rivera", 250)).toBe("Alex wants to stake 250 XP each");
  });

  it("falls back when name is empty", () => {
    expect(duelInviteStakeCopy("  ", 100)).toBe("Challenger wants to stake 100 XP each");
  });
});
