import { describe, expect, it } from "vitest";
import { isMasteryNodePracticeLocked } from "@/features/mastery-grid/mastery-node-detail-pure";

describe("isMasteryNodePracticeLocked", () => {
  it("returns false when unlocked set omitted", () => {
    expect(isMasteryNodePracticeLocked("a")).toBe(false);
    expect(isMasteryNodePracticeLocked("a", null)).toBe(false);
  });

  it("returns true when id missing from unlocked set", () => {
    expect(isMasteryNodePracticeLocked("b", new Set(["a"]))).toBe(true);
    expect(isMasteryNodePracticeLocked("a", new Set(["a"]))).toBe(false);
  });
});
