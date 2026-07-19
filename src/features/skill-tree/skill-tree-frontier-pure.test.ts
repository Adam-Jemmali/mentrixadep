import { describe, expect, it } from "vitest";
import { buildFrontier } from "@/features/skill-tree/skill-tree-frontier-pure";

describe("buildFrontier", () => {
  it("includes focus, parents, and capped children", () => {
    const states = new Map([
      ["focus", "weak"],
      ["p1", "proficient"],
      ["c1", "none"],
      ["c2", "none"],
      ["c3", "none"],
      ["c4", "none"],
    ] as const);
    const parents = new Map([["focus", ["p1"]]]);
    const children = new Map([["focus", ["c1", "c2", "c3", "c4"]]]);
    const unlocked = new Set(["focus", "p1", "c1", "c2"]);

    const view = buildFrontier({
      focusId: "focus",
      parents,
      children,
      states,
      unlocked,
      maxChildren: 3,
    });

    expect(view.focusId).toBe("focus");
    expect(view.focus.id).toBe("focus");
    expect(view.parents.map((node) => node.id)).toEqual(["p1"]);
    expect(view.children).toHaveLength(3);
  });

  it("marks unlocked on each node", () => {
    const states = new Map([
      ["focus", "weak"],
      ["p1", "proficient"],
      ["c1", "none"],
    ] as const);
    const parents = new Map([["focus", ["p1"]]]);
    const children = new Map([["focus", ["c1"]]]);
    const unlocked = new Set(["focus", "p1"]);

    const view = buildFrontier({
      focusId: "focus",
      parents,
      children,
      states,
      unlocked,
    });

    expect(view.focus.unlocked).toBe(true);
    expect(view.parents[0]?.unlocked).toBe(true);
    expect(view.children[0]?.unlocked).toBe(false);
  });

  it("sorts unlocked children before locked", () => {
    const states = new Map([
      ["focus", "proficient"],
      ["locked1", "none"],
      ["unlocked1", "none"],
      ["locked2", "none"],
    ] as const);
    const parents = new Map([["focus", []]]);
    const children = new Map([["focus", ["locked1", "unlocked1", "locked2"]]]);
    const unlocked = new Set(["focus", "unlocked1"]);

    const view = buildFrontier({
      focusId: "focus",
      parents,
      children,
      states,
      unlocked,
    });

    expect(view.children.map((node) => node.id)).toEqual(["unlocked1", "locked1", "locked2"]);
  });
});
