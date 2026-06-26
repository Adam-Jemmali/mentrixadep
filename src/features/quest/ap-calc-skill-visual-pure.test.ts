import { describe, expect, it } from "vitest";
import { apCalcSkillVisual, formatTrapInsightHeadline } from "@/features/quest/ap-calc-skill-visual-pure";

describe("apCalcSkillVisual", () => {
  it("maps ln derivative skills to log notation", () => {
    const visual = apCalcSkillVisual({ nodeName: "Derivative of ln x", unitNumber: 2 });
    expect(visual.glyph).toBe("d/dx ln x");
    expect(visual.hint).toBe("Log derivative");
  });

  it("maps chain rule skills to composition glyph", () => {
    const visual = apCalcSkillVisual({ nodeName: "Chain rule basics" });
    expect(visual.glyph).toBe("f(g(x))");
  });

  it("formats trap headline with sentence case", () => {
    expect(formatTrapInsightHeadline("uses quotient rule when chain rule suffices")).toBe(
      "Uses quotient rule when chain rule suffices",
    );
  });
});
