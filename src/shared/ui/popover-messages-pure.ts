import type { SessionPriceSplit } from "@/features/booking/booking-pricing";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import {
  formatOrdinalPercentile,
  formatVerifiedRankNextAction,
  formatVerifiedRankVerdict,
  MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE,
  type VerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import { RANK_PROOFS_LABEL } from "@/features/xp/rank-proofs-labels";
import { formatUsdFromCents } from "@/features/duels/duel-reward";

export type MentrixaPopoverMessage = {
  title: string;
  verdict: string;
  nextAction: string;
};

export function rankBreakdownPopoverMessage(
  stats: VerifiedFirstAttemptRankStats,
): MentrixaPopoverMessage {
  return {
    title: "Verified rank breakdown",
    verdict: formatVerifiedRankVerdict(stats) ?? "",
    nextAction: formatVerifiedRankNextAction(stats),
  };
}

export function rankBreakdownPopoverRows(
  stats: VerifiedFirstAttemptRankStats,
): { label: string; value: string }[] {
  const rows = [
    {
      label: RANK_PROOFS_LABEL,
      value: String(stats.verifiedCount),
    },
    {
      label: "First-attempt accuracy",
      value: stats.verifiedCount > 0 ? `${stats.accuracyPercent}%` : "Not started",
    },
  ];

  if (stats.percentile != null && stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE) {
    rows.push({
      label: "Cohort percentile",
      value: formatOrdinalPercentile(stats.percentile),
    });
  } else {
    rows.push({
      label: "Percentile status",
      value: `Unlocks at ${MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE} ${RANK_PROOFS_LABEL.toLowerCase()}`,
    });
  }

  return rows;
}

export function priceBreakdownPopoverMessage(split: SessionPriceSplit): MentrixaPopoverMessage {
  return {
    title: "Session price breakdown",
    verdict: `Stripe charges ${formatUsdFromCents(split.totalCents)} total for this session slot.`,
    nextAction: "Platform fee funds verified item bank review and rank infrastructure.",
  };
}

export function masteryNodeDetailPopoverMessage(
  nodeName: string,
  state: MasteryNodeState,
  accuracyPercent: number | null,
): MentrixaPopoverMessage {
  if (state === "verified") {
    return {
      title: nodeName,
      verdict: "Verified first attempt is locked for rank on this node.",
      nextAction: "Practice again for mastery, not to reroll rank.",
    };
  }
  if (accuracyPercent != null) {
    return {
      title: nodeName,
      verdict: `Practice accuracy is ${accuracyPercent}% but rank still waits on first attempt.`,
      nextAction: "Run a quest item from this node if you have not verified it yet.",
    };
  }
  return {
    title: nodeName,
    verdict: "No verified first attempt on record for this node.",
    nextAction: "Start a verified practice pack that includes this skill.",
  };
}

export function masteryNodeDetailStateLabel(state: MasteryNodeState): string {
  switch (state) {
    case "verified":
      return "Verified";
    case "proficient":
      return "70% or higher";
    case "weak":
      return "Under 70%";
    case "none":
      return "Not started";
  }
}
