import { describe, expect, it } from "vitest";
import {
  ACCOUNT_LEVELS,
  getAccountLevelFromTotalXp,
  getDivisionTierFromXp,
  getLevelFromXp,
  levelUpDetected,
} from "@/features/xp/levels";

describe("getAccountLevelFromTotalXp", () => {
  it("maps 0 XP to Wanderer (level 1)", () => {
    const a = getAccountLevelFromTotalXp(0);
    expect(a.level).toBe(1);
    expect(a.title).toBe("WANDERER");
    expect(a.minXp).toBe(0);
  });

  it("maps 100 XP to Wanderer (top of tier)", () => {
    const a = getAccountLevelFromTotalXp(100);
    expect(a.level).toBe(1);
    expect(a.title).toBe("WANDERER");
  });

  it("maps 101 XP to Seeker (level 2)", () => {
    const a = getAccountLevelFromTotalXp(101);
    expect(a.level).toBe(2);
    expect(a.title).toBe("SEEKER");
  });

  it("maps boundaries for each account tier", () => {
    const cases: { xp: number; level: number; title: string }[] = [
      { xp: 0, level: 1, title: "WANDERER" },
      { xp: 101, level: 2, title: "SEEKER" },
      { xp: 301, level: 3, title: "SCHOLAR" },
      { xp: 701, level: 4, title: "CONTENDER" },
      { xp: 1501, level: 5, title: "RIVAL" },
      { xp: 3001, level: 6, title: "APEX" },
      { xp: 6001, level: 7, title: "MENTRIXER" },
    ];
    for (const c of cases) {
      const a = getAccountLevelFromTotalXp(c.xp);
      expect(a.level, `xp=${c.xp}`).toBe(c.level);
      expect(a.title, `xp=${c.xp}`).toBe(c.title);
    }
  });

  it("handles exact tier upper bounds (still that tier)", () => {
    expect(getAccountLevelFromTotalXp(100).level).toBe(1);
    expect(getAccountLevelFromTotalXp(300).level).toBe(2);
    expect(getAccountLevelFromTotalXp(700).level).toBe(3);
  });

  it("clamps negative XP to 0", () => {
    const a = getAccountLevelFromTotalXp(-50);
    expect(a.level).toBe(1);
    expect(a.xpIntoLevel).toBe(0);
  });

  it("handles very large XP (Mentrixer max)", () => {
    const a = getAccountLevelFromTotalXp(9_999_999);
    expect(a.level).toBe(7);
    expect(a.title).toBe("MENTRIXER");
    expect(a.xpToNextLevel).toBeNull();
  });

  it("floors fractional XP", () => {
    const a = getAccountLevelFromTotalXp(100.9);
    expect(a.xpIntoLevel).toBe(100);
  });
});

describe("levelUpDetected", () => {
  it("is false when staying in the same level", () => {
    expect(levelUpDetected(0, 50)).toBe(false);
    expect(levelUpDetected(50, 100)).toBe(false);
  });

  it("is true when crossing from Wanderer to Seeker", () => {
    expect(levelUpDetected(100, 101)).toBe(true);
  });

  it("is false at exact boundary when both totals map to same level", () => {
    expect(levelUpDetected(100, 100)).toBe(false);
  });

  it("is false when both are already Mentrixer", () => {
    expect(levelUpDetected(10_000, 10_050)).toBe(false);
  });
});

describe("ACCOUNT_LEVELS shape", () => {
  it("has contiguous tiers with no gaps in minXp", () => {
    for (let i = 1; i < ACCOUNT_LEVELS.length; i++) {
      const prev = ACCOUNT_LEVELS[i - 1]!;
      const cur = ACCOUNT_LEVELS[i]!;
      if (prev.maxXp != null) {
        expect(cur.minXp).toBe(prev.maxXp + 1);
      }
    }
  });
});

describe("getLevelFromXp / getDivisionTierFromXp (per-division XP tiers)", () => {
  it("aliases to the same function", () => {
    expect(getLevelFromXp(50)).toEqual(getDivisionTierFromXp(50));
  });

  it("returns bronze at low XP", () => {
    expect(getDivisionTierFromXp(0).tier).toBe("bronze");
    expect(getDivisionTierFromXp(99).tier).toBe("bronze");
  });

  it("crosses to silver at 100", () => {
    expect(getDivisionTierFromXp(100).tier).toBe("silver");
  });
});
