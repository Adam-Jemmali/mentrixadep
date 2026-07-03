import { describe, expect, it } from "vitest";
import {
  landingFaqCategories,
  landingFaqSectionHeading,
  skillTreeUnitAccordionFooter,
  skillTreeUnitTriggerMeta,
} from "@/shared/ui/accordion-messages-pure";

describe("accordion messages", () => {
  it("returns Mentrixa FAQ categories with verdict copy", () => {
    const categories = landingFaqCategories();
    expect(categories.length).toBeGreaterThanOrEqual(3);
    const first = categories[0]!.items[0]!;
    expect(first.verdict).toBeTruthy();
    expect(first.nextAction).toBeTruthy();
  });

  it("frames landing FAQ heading around verified rank", () => {
    const heading = landingFaqSectionHeading();
    expect(heading.title).toMatch(/question/i);
    expect(heading.subtitle).toMatch(/verified/i);
  });

  it("summarizes skill tree unit verification counts", () => {
    const meta = skillTreeUnitTriggerMeta([
      { id: "a", nodeName: "Limits", nodeSlug: "limits", displayOrder: 1, state: "verified", accuracyPercent: 100 },
      { id: "b", nodeName: "Derivatives", nodeSlug: "derivatives", displayOrder: 2, state: "none", accuracyPercent: null },
    ]);
    expect(meta).toBe("1/2");
  });

  it("nudges unverified nodes in skill tree unit footer", () => {
    const footer = skillTreeUnitAccordionFooter({
      unitNumber: 1,
      unitName: "Limits and Continuity",
      nodes: [
        { id: "a", nodeName: "Limits", nodeSlug: "limits", displayOrder: 1, state: "none", accuracyPercent: null },
      ],
    });
    expect(footer.verdict).toMatch(/verified first attempt/i);
    expect(footer.nextAction).toMatch(/quest practice/i);
  });
});
