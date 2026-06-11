import { describe, expect, it } from "vitest";
import { getRankKeyFromLevel } from "@/features/xp/components/rank-badge";
import { ACCOUNT_RANK_VISUALS } from "@/features/xp/rank-icons";

describe("RankBadge rank keys", () => {
  it("maps each account level to the correct rank key", () => {
    for (const rank of ACCOUNT_RANK_VISUALS) {
      expect(getRankKeyFromLevel(rank.level)).toBe(rank.key);
    }
  });

  it("uses slate wanderer at level 1", () => {
    const wanderer = ACCOUNT_RANK_VISUALS.find((r) => r.key === "wanderer");
    expect(wanderer?.color).toBe("#64748B");
  });

  it("uses gold only for mentrixer", () => {
    const goldRanks = ACCOUNT_RANK_VISUALS.filter((r) => r.color === "#D4A017");
    expect(goldRanks).toHaveLength(1);
    expect(goldRanks[0]?.key).toBe("mentrixer");
  });
});
