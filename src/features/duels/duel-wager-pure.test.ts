import { describe, expect, it } from "vitest";
import {
  duelWagerPot,
  isValidDuelWagerAmount,
  maxAffordableDuelWagerXp,
  maxDuelWagerXp,
} from "@/features/duels/duel-wager-pure";

describe("maxDuelWagerXp", () => {
  it("caps at 10 percent", () => {
    expect(maxDuelWagerXp(1000)).toBe(100);
    expect(maxDuelWagerXp(55)).toBe(5);
  });
});

describe("maxAffordableDuelWagerXp", () => {
  it("respects the 50 XP floor", () => {
    expect(maxAffordableDuelWagerXp(55)).toBe(5);
    expect(maxAffordableDuelWagerXp(50)).toBe(0);
    expect(maxAffordableDuelWagerXp(40)).toBe(0);
  });
});

describe("isValidDuelWagerAmount", () => {
  it("rejects zero, over cap, and floor breaches", () => {
    expect(isValidDuelWagerAmount(0, 1000)).toBe(false);
    expect(isValidDuelWagerAmount(101, 1000)).toBe(false);
    expect(isValidDuelWagerAmount(10, 55)).toBe(false);
    expect(isValidDuelWagerAmount(5, 55)).toBe(true);
  });
});

describe("duelWagerPot", () => {
  it("sums both sides", () => {
    expect(duelWagerPot(40, 40)).toBe(80);
  });
});
