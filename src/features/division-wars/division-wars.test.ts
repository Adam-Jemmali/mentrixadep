import { describe, expect, it } from "vitest";
import {
  divisionActivityScore,
  formatWarTimeRemaining,
  pairDivisionsForWar,
  questAccuracyPoints,
  warProgressPercent,
} from "@/features/division-wars/scoring-pure";
import { msUntilUtcDateEnd } from "@/features/divisions/division-week";

describe("division war scoring", () => {
  it("scores quests by accuracy percentage sum", () => {
    expect(questAccuracyPoints(9, 10)).toBe(90);
    expect(questAccuracyPoints(4, 10)).toBe(40);
    expect(questAccuracyPoints(0, 0)).toBe(0);
  });

  it("treats equal total accuracy as equal war value", () => {
    const spam = questAccuracyPoints(45, 100) * 10;
    const quality = questAccuracyPoints(90, 100) * 5;
    expect(spam).toBe(450);
    expect(quality).toBe(450);
  });

  it("pairs divisions by activity tiers", () => {
    const divisions = [
      { id: "1", key: "a", name: "A", memberCount: 50, weeklyActivity: 500 },
      { id: "2", key: "b", name: "B", memberCount: 48, weeklyActivity: 480 },
      { id: "3", key: "c", name: "C", memberCount: 10, weeklyActivity: 50 },
      { id: "4", key: "d", name: "D", memberCount: 8, weeklyActivity: 40 },
    ];
    const pairs = pairDivisionsForWar(divisions);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]![0].key).toBe("a");
    expect(pairs[0]![1].key).toBe("b");
  });

  it("computes war progress bar percent", () => {
    expect(warProgressPercent(450, 450)).toBe(50);
    expect(warProgressPercent(900, 100)).toBe(90);
  });

  it("ranks activity score", () => {
    expect(divisionActivityScore(10, 100)).toBeGreaterThan(divisionActivityScore(5, 50));
  });

  it("formats remaining war time", () => {
    expect(formatWarTimeRemaining(0)).toBe("War ended");
    expect(formatWarTimeRemaining(msUntilUtcDateEnd("2099-12-31"))).toMatch(/left/);
  });
});
