import { describe, it, expect } from "vitest";
import { getLevelFromXp } from "@/lib/levels";

describe("getLevelFromXp", () => {
  it("assigns bronze at 0 XP", () => {
    expect(getLevelFromXp(0).tier).toBe("bronze");
  });

  it("assigns silver in mid range", () => {
    expect(getLevelFromXp(150).tier).toBe("silver");
  });

  it("assigns platinum at high XP", () => {
    expect(getLevelFromXp(800).tier).toBe("platinum");
    expect(getLevelFromXp(800).xpToNextLevel).toBeNull();
  });

  it("clamps negative XP to bronze", () => {
    expect(getLevelFromXp(-10).tier).toBe("bronze");
  });
});
