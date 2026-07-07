import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export type MentrixaDisclosureKind =
  | "verified_first_attempt"
  | "guide_impact"
  | "guide_demand_signal"
  | "momentum_subscription"
  | "momentum_loop_sla"
  | "exam_stakes";

export type MentrixaDisclosureMessage = {
  triggerLabel: string;
  body: string;
  verdict: string;
  nextAction: string;
};

function atMostFourWords(text: string): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
}

export function verifiedFirstAttemptDisclosureMessage(
  subjectLabel: string,
): MentrixaDisclosureMessage {
  const subject = subjectLabel.trim() || "AP Calculus AB";
  return {
    triggerLabel: "Why verified attempts matter",
    body: atMostFourWords(`${subject} firsts set rank`),
    verdict: "Practice never rewrites rank",
    nextAction: "Treat each skill seriously",
  };
}

export function guideImpactDisclosureMessage(): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Why Guide Impact matters",
    body: "Sessions move verified rank",
    verdict: "Movement not likeability",
    nextAction: "Target missed first answers",
  };
}

export function guideDemandSignalDisclosureMessage(): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Why demand signal matters",
    body: "Weak nodes need Guides",
    verdict: "Red grid needs slots",
    nextAction: "Open weak node slots",
  };
}

export function momentumSubscriptionDisclosureMessage(): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Why Momentum stays free",
    body: "Rank never moves paywalled",
    verdict: "Rank proof stays free",
    nextAction: "Start free in arena",
  };
}

export function momentumLoopSlaDisclosureMessage(): MentrixaDisclosureMessage {
  return {
    triggerLabel: "Loop SLA guarantee",
    body: "Credit restored if loop fails",
    verdict: "Book with credit, retest in 24h, and if verified movement does not improve within 7 days your credit comes back.",
    nextAction: "Use your included session on your weakest open node.",
  };
}

export function examStakesDisclosureMessage(examStakes: string): MentrixaDisclosureMessage {
  const detail = atMostFourWords(examStakes);
  return {
    triggerLabel: "Why this skill matters",
    body: detail || "Maps to AP exam",
    verdict: "Misses cost exam points",
    nextAction: "Verify node rank first",
  };
}

export function disclosureVocabIcon(kind: MentrixaDisclosureKind): VocabIconName {
  switch (kind) {
    case "verified_first_attempt":
      return "verified";
    case "guide_impact":
      return "impact-score";
    case "guide_demand_signal":
      return "guide-session";
    case "momentum_subscription":
      return "momentum";
    case "momentum_loop_sla":
      return "loop-report";
    case "exam_stakes":
      return "quest";
  }
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
    case "momentum_loop_sla":
      return momentumLoopSlaDisclosureMessage();
    case "exam_stakes":
      return examStakesDisclosureMessage(context?.examStakes ?? "");
  }
}
