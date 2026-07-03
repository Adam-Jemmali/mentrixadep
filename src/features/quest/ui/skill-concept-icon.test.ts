import { describe, expect, it } from "vitest";
import { resolveSkillConceptKind } from "@/features/quest/ui/skill-concept-icon";

describe("skill concept icons", () => {
  it("maps chain rule slugs to chain-rule concept art", () => {
    expect(resolveSkillConceptKind("Chain rule basics", "chain-rule-basics")).toBe("chain-rule");
  });

  it("maps limit skills to limit concept art", () => {
    expect(resolveSkillConceptKind("One-sided limits", "one-sided-limits")).toBe("limit");
  });
});
