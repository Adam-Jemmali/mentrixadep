import { describe, expect, it } from "vitest";
import {
  distinctMissItemIds,
  mistakeTreasuryQuestionCount,
  shouldShowClearMissesCta,
} from "@/features/skill-tree/mistake-treasury-pure";

describe("mistake treasury pure", () => {
  it("keeps distinct approved miss item ids", () => {
    const approved = new Set(["a", "b", "c"]);
    expect(
      distinctMissItemIds(
        [
          { itemId: "a" },
          { itemId: "a" },
          { itemId: "b" },
          { itemId: "x" },
        ],
        approved,
      ),
    ).toEqual(["a", "b"]);
  });

  it("sizes packs to available misses", () => {
    expect(mistakeTreasuryQuestionCount(0)).toBe(0);
    expect(mistakeTreasuryQuestionCount(2)).toBe(2);
    expect(mistakeTreasuryQuestionCount(8, 5)).toBe(5);
  });

  it("hides clear misses when empty", () => {
    expect(shouldShowClearMissesCta(0)).toBe(false);
    expect(shouldShowClearMissesCta(3)).toBe(true);
  });
});
