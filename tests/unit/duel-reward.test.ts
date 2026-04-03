import { describe, expect, it } from "vitest";
import { XP } from "@/lib/xp-constants";
import {
  DUEL_STREAK_WINS_FOR_FIRE,
  shouldGrantDuelStreakFireBonus,
} from "@/lib/duel-reward";

describe("duel XP amounts", () => {
  it("win reward is 150 XP", () => {
    expect(XP.DUEL_WIN).toBe(150);
  });

  it("loss participation is 50 XP", () => {
    expect(XP.DUEL_LOSS).toBe(50);
  });

  it("tie reward is 50 XP", () => {
    expect(XP.DUEL_TIE).toBe(50);
  });

  it("streak fire bonus is 100 XP", () => {
    expect(XP.DUEL_STREAK_ON_FIRE_BONUS).toBe(100);
  });
});

describe("shouldGrantDuelStreakFireBonus", () => {
  it("is false below 3 wins", () => {
    expect(shouldGrantDuelStreakFireBonus(0)).toBe(false);
    expect(shouldGrantDuelStreakFireBonus(1)).toBe(false);
    expect(shouldGrantDuelStreakFireBonus(2)).toBe(false);
  });

  it("is true at 3, 6, 9 consecutive wins", () => {
    expect(shouldGrantDuelStreakFireBonus(3)).toBe(true);
    expect(shouldGrantDuelStreakFireBonus(6)).toBe(true);
    expect(shouldGrantDuelStreakFireBonus(9)).toBe(true);
  });

  it("is false at 4, 5, 7 wins", () => {
    expect(shouldGrantDuelStreakFireBonus(4)).toBe(false);
    expect(shouldGrantDuelStreakFireBonus(5)).toBe(false);
    expect(shouldGrantDuelStreakFireBonus(7)).toBe(false);
  });

  it("uses DUEL_STREAK_WINS_FOR_FIRE as the modulus", () => {
    expect(DUEL_STREAK_WINS_FOR_FIRE).toBe(3);
  });
});
