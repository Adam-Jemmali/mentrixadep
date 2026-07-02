import type { MasteryGridNode, MasteryGridUnit } from "@/features/mastery-grid/types";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

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
    title: "Questions before you compete",
    subtitle: "Verified rank, Guides, and what counts toward your percentile.",
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
  return [
    {
      id: "rank",
      title: "Rank and verified attempts",
      items: [
        {
          id: "what-counts",
          title: "What moves my rank?",
          body: "AP Calculus AB firsts set rank",
          verdict: "Practice never rewrites rank",
          nextAction: "Run unverified skill quests",
        },
        {
          id: "percentile",
          title: "When do I get a percentile?",
          body: "Your verified percentile unlocks after five distinct skill nodes have a recorded first attempt. Until then you see progress, not a public comparison number.",
          verdict: "Five rank proofs is the bar for a real percentile.",
          nextAction: "Finish onboarding quests or run practice until five nodes lock.",
        },
        {
          id: "practice-again",
          title: "Can I practice the same skill again?",
          body: "Yes. Repeat attempts help you learn but do not rewrite rank. The grid still shows weak nodes so you know where to focus.",
          verdict: "Replay is for mastery, not for rerolling rank.",
          nextAction: "Book a Guide session on a weak node that already has a verified attempt.",
        },
      ],
    },
    {
      id: "guides",
      title: "Guides and sessions",
      items: [
        {
          id: "guide-impact",
          title: "What is Guide Impact Score?",
          body: "Guide Impact measures first-attempt movement on skills you worked on in live sessions. It is not a star rating and it is not about likeability.",
          verdict: "Impact is measured on verified first-attempt lift, same category as rank.",
          nextAction: "Book a session on a node you missed on first attempt.",
        },
        {
          id: "session-prep",
          title: "What does my Guide see before we meet?",
          body: "Within two hours of start, your Guide can open your mastery grid for AP Calculus AB and see which nodes are verified, weak, or untouched.",
          verdict: "Sessions start at the real gap, not a generic worksheet.",
          nextAction: "Verify a few nodes before your session so the grid tells a clear story.",
        },
      ],
    },
    {
      id: "access",
      title: "Access and pricing",
      items: [
        {
          id: "free-tier",
          title: "What is free?",
          body: "Arena, mastery grid, public rank page, and verified practice preview are not paywalled. Momentum subscription adds session perks, not rank access.",
          verdict: "",
          nextAction: "Start with a free account and run your first verified pack.",
        },
        {
          id: "subjects",
          title: "Why only AP Calculus AB?",
          body: "Practice is scoped to one subject until a second passes the same bar: reviewed skill tree, item bank coverage, and enough first attempts for a real percentile.",
          verdict: "One subject done right beats ten subjects half-built.",
          nextAction: "Compete on AP Calculus AB now; other subjects follow the same bar.",
        },
      ],
    },
  ];
}

export function skillTreeUnitTriggerLabel(unitNumber: number, unitName: string): string {
  return `Unit ${unitNumber}: ${unitName}`;
}

export function skillTreeUnitTriggerMeta(nodes: MasteryGridNode[]): string {
  const verified = nodes.filter((n) => n.state === "verified").length;
  return `${verified}/${nodes.length} verified`;
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
