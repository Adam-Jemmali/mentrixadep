import {
  FREE_TIER_PAYWALL_COMMITMENT,
  PRICING_SECTION_NEXT_ACTION,
  PRICING_SECTION_VERDICT,
} from "@/features/pricing/pricing-tiers-pure";

export type MentrixaDisclosureKind =
  | "verified_first_attempt"
  | "guide_impact"
  | "guide_demand_signal"
  | "momentum_subscription"
  | "exam_stakes";

export type MentrixaDisclosureMessage = {
  triggerLabel: string;
  body: string;
  verdict: string;
  nextAction: string;
};

export function verifiedFirstAttemptDisclosureMessage(
  subjectLabel: string,
): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Why verified first attempt matters",
    body: `Your rank on ${subjectLabel} moves only on the first time you see a question from each skill node. That attempt is stored permanently and compared to every other Mentrixer on the same node.`,
    verdict: "Practice after the first encounter never rewrites rank.",
    nextAction: "Treat each new skill like a one-shot proof, not a drill to grind.",
  };
}

export function guideImpactDisclosureMessage(): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Why Guide Impact Score matters",
    body: "Guide Impact measures verified first-attempt lift on skills you worked on in live sessions. It is the same category of proof as Mentrixer rank, not a star rating.",
    verdict: "Impact is earned on movement, not on likeability.",
    nextAction: "Target nodes where the student missed on first attempt.",
  };
}

export function guideDemandSignalDisclosureMessage(): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Why demand signal matters",
    body: "Demand signal ranks skill nodes where Mentrixers are weak this week and have no open Guide availability. It is refreshed from verified attempt patterns, not search volume.",
    verdict: "Learners need Guides where the grid is red, not where you already have slots.",
    nextAction: "Open availability on the highest weak-count node you can teach.",
  };
}

export function momentumSubscriptionDisclosureMessage(): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Why Momentum does not paywall rank",
    body: `Momentum adds session perks and subscription billing convenience. ${PRICING_SECTION_VERDICT} ${FREE_TIER_PAYWALL_COMMITMENT}.`,
    verdict: "Rank proof stays free to earn and free to share.",
    nextAction: PRICING_SECTION_NEXT_ACTION,
  };
}

export function examStakesDisclosureMessage(examStakes: string): MentrixaDisclosureMessage {
  const detail = examStakes.trim();
  return {
    triggerLabel: "Why this skill matters on the exam",
    body: detail || "This node maps to a College Board skill that shows up on the AP Calculus AB exam.",
    verdict: "Exam stakes tell you where a miss costs points, not where rank is still open.",
    nextAction: "If you have not verified this node yet, treat the first attempt as rank-critical.",
  };
}

export function mentrixaDisclosureMessage(
  kind: MentrixaDisclosureKind,
  context?: { subjectLabel?: string; examStakes?: string },
): MentrixaDisclosureMessage {
  switch (kind) {
    case "verified_first_attempt":
      return verifiedFirstAttemptDisclosureMessage(context?.subjectLabel?.trim() || "AP Calculus AB");
    case "guide_impact":
      return guideImpactDisclosureMessage();
    case "guide_demand_signal":
      return guideDemandSignalDisclosureMessage();
    case "momentum_subscription":
      return momentumSubscriptionDisclosureMessage();
    case "exam_stakes":
      return examStakesDisclosureMessage(context?.examStakes ?? "");
  }
}
