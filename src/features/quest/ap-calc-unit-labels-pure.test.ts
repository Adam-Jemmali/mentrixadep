import { describe, expect, it } from "vitest";
import {
  AP_CALC_AB_UNIT_NAMES,
  nodeOneWordLabel,
  unitDisplayName,
} from "@/features/quest/ap-calc-unit-labels-pure";

describe("ap-calc unit labels", () => {
  it("maps unit numbers to full AP unit names", () => {
    expect(unitDisplayName(1)).toBe("Limits and Continuity");
    expect(unitDisplayName(6)).toBe("Integration and Accumulation of Change");
    expect(AP_CALC_AB_UNIT_NAMES[8]).toBe("Applications of Integration");
  });

  it("prefers live unit name from grid data when provided", () => {
    expect(unitDisplayName(1, "Limits and Continuity")).toBe("Limits and Continuity");
  });

  it("maps chain rule nodes to Chain", () => {
    expect(nodeOneWordLabel("Chain rule basics", "chain-rule-basics")).toBe("Chain");
  });
});
