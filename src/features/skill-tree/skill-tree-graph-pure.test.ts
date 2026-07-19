import { describe, expect, it } from "vitest";
import { buildAdjacency, findCycle } from "@/features/skill-tree/skill-tree-graph-pure";

describe("skill-tree graph", () => {
  it("buildAdjacency maps parents and children", () => {
    const { parents, children } = buildAdjacency([
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["a", "b"] },
    ]);

    expect(parents.get("a")).toEqual([]);
    expect(parents.get("b")).toEqual(["a"]);
    expect(parents.get("c")).toEqual(["a", "b"]);
    expect(children.get("a")).toEqual(["b", "c"]);
    expect(children.get("b")).toEqual(["c"]);
  });

  it("findCycle returns path when prerequisites loop", () => {
    const cycle = findCycle([
      { id: "a", prerequisites: ["c"] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["b"] },
    ]);
    expect(cycle).not.toBeNull();
  });

  it("findCycle returns null for acyclic graph", () => {
    const cycle = findCycle([
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["b"] },
    ]);
    expect(cycle).toBeNull();
  });
});
