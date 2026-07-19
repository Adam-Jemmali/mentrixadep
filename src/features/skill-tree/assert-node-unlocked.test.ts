import { describe, expect, it } from "vitest";
import {
  assertNodeIdsUnlocked,
  LOCKED_NODE_ERROR,
} from "@/features/skill-tree/assert-node-unlocked";

describe("assertNodeIdsUnlocked", () => {
  const parents = new Map<string, string[]>([
    ["root", []],
    ["child", ["root"]],
    ["multi", ["root", "other"]],
    ["other", []],
  ]);

  it("allows roots without Solid nodes", () => {
    expect(() => assertNodeIdsUnlocked(["root"], parents, new Set())).not.toThrow();
  });

  it("allows a child when every parent is Solid", () => {
    expect(() =>
      assertNodeIdsUnlocked(["multi"], parents, new Set(["root", "other"])),
    ).not.toThrow();
  });

  it("rejects a child when any parent is not Solid", () => {
    expect(() =>
      assertNodeIdsUnlocked(["multi"], parents, new Set(["root"])),
    ).toThrow(LOCKED_NODE_ERROR);
  });

  it("rejects the whole target set when one node is locked", () => {
    expect(() =>
      assertNodeIdsUnlocked(["root", "child"], parents, new Set()),
    ).toThrow(LOCKED_NODE_ERROR);
  });

  it("rejects an unknown target node", () => {
    expect(() =>
      assertNodeIdsUnlocked(["missing"], parents, new Set(["root", "other"])),
    ).toThrow(LOCKED_NODE_ERROR);
  });
});
