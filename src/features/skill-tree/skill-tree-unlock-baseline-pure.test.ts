import { describe, expect, it } from "vitest";
import {
  diffNewlyUnlockedIds,
  parseUnlockedBaseline,
  serializeUnlockedBaseline,
} from "@/features/skill-tree/skill-tree-unlock-baseline-pure";

describe("skill-tree unlock baseline", () => {
  it("diffNewlyUnlockedIds returns only new ids", () => {
    expect(diffNewlyUnlockedIds(["a"], ["a", "b", "c"])).toEqual(["b", "c"]);
    expect(diffNewlyUnlockedIds(["a", "b"], ["a", "b"])).toEqual([]);
    expect(diffNewlyUnlockedIds([], ["a"])).toEqual(["a"]);
  });

  it("round-trips baseline json", () => {
    const raw = serializeUnlockedBaseline(["x", "y"]);
    expect(parseUnlockedBaseline(raw)).toEqual(["x", "y"]);
    expect(parseUnlockedBaseline(null)).toEqual([]);
    expect(parseUnlockedBaseline("{not-json")).toEqual([]);
  });
});
