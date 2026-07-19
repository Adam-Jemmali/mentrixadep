import { describe, expect, it } from "vitest";
import {
  buildSolidIds,
  isNodeUnlocked,
  isSolidState,
} from "@/features/skill-tree/skill-tree-unlock-pure";

describe("skill-tree unlock", () => {
  it("roots with no parents are unlocked", () => {
    expect(isNodeUnlocked("a", new Map([["a", []]]), new Set())).toBe(true);
  });

  it("requires every parent to be solid", () => {
    const parents = new Map([["c", ["a", "b"]]]);
    expect(isNodeUnlocked("c", parents, new Set(["a"]))).toBe(false);
    expect(isNodeUnlocked("c", parents, new Set(["a", "b"]))).toBe(true);
  });

  it("verified incorrect is not solid", () => {
    expect(isSolidState("weak")).toBe(false);
    expect(isSolidState("proficient")).toBe(true);
    expect(isSolidState("verified")).toBe(true);
  });

  it("buildSolidIds includes proficient and verified only", () => {
    const ids = buildSolidIds([
      { id: "1", state: "none" },
      { id: "2", state: "weak" },
      { id: "3", state: "proficient" },
      { id: "4", state: "verified" },
    ]);
    expect([...ids].sort()).toEqual(["3", "4"]);
  });
});
