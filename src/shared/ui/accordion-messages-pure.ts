import type { MasteryGridNode, MasteryGridUnit } from "@/features/mastery-grid/types";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { unitDisplayName } from "@/features/quest/ap-calc-unit-labels-pure";
import { LANDING_FAQ } from "@/features/marketing/landing/landing-copy-pure";

export type MentrixaAccordionFaqItem = {
  id: string;
  title: string;
  body: string;
  verdict: string;
  nextAction: string;
};

export type MentrixaAccordionFaqCategory = {
  id: string;
  title: string;
  items: MentrixaAccordionFaqItem[];
};

export function landingFaqSectionHeading(): { title: string; subtitle: string } {
  return {
    title: LANDING_FAQ.title,
    subtitle: LANDING_FAQ.subtitle,
  };
}

export function landingFaqCategoryVocabIcon(categoryId: string): VocabIconName {
  switch (categoryId) {
    case "rank":
      return "rank-proof";
    case "guides":
      return "guide-session";
    case "access":
      return "momentum";
    default:
      return "quest";
  }
}

export function landingFaqCategories(): MentrixaAccordionFaqCategory[] {
  return LANDING_FAQ.categories.map((category) => ({
    id: category.id,
    title: category.title,
    items: category.items.map((item) => ({ ...item })),
  }));
}

export function skillTreeUnitTriggerLabel(unitNumber: number, unitName?: string): string {
  return unitDisplayName(unitNumber, unitName);
}

export function skillTreeUnitTriggerMeta(nodes: MasteryGridNode[]): string {
  const verified = nodes.filter((n) => n.state === "verified").length;
  return `${verified}/${nodes.length}`;
}

export function skillTreeUnitAccordionFooter(unit: MasteryGridUnit): {
  verdict: string;
  nextAction: string;
} {
  const weak = unit.nodes.filter((n) => n.state === "weak" || n.state === "none").length;
  if (weak > 0) {
    return {
      verdict: `${weak} skill${weak === 1 ? "" : "s"} in this unit still need a verified first attempt.`,
      nextAction: "Run quest practice.",
    };
  }
  return {
    verdict: "Every skill in this unit has a verified first attempt on record.",
    nextAction: "Book a Guide session to lift weak accuracy on verified nodes.",
  };
}
