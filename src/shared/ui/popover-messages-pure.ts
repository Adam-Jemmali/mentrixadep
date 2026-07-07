import type { SessionPriceSplit } from "@/features/booking/booking-pricing";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import {
  formatVerifiedRankNextAction,
  formatVerifiedRankVerdict,
  MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE,
  type VerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import {
  explainFirstAttemptAccuracy,
  explainPeerStanding,
  formatPeerStandingRow,
  peerStandingLockedLabel,
} from "@/features/xp/rank-statistics-pure";
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
  const accuracyLine =
    stats.verifiedCount > 0
      ? explainFirstAttemptAccuracy(stats.verifiedCount, stats.accuracyPercent)
      : "";
  const peerLine =
    stats.percentile != null && stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE
      ? explainPeerStanding(stats.percentile)
      : "";

  return {
    title: "",
    verdict: [accuracyLine, peerLine].filter(Boolean).join(" ") || (formatVerifiedRankVerdict(stats) ?? ""),
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
      label: "First-answer accuracy",
      value: stats.verifiedCount > 0 ? `${stats.accuracyPercent}%` : "Not started",
    },
  ];

  if (stats.percentile != null && stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE) {
    rows.push({
      label: "Peer standing",
      value: formatPeerStandingRow(stats.percentile),
    });
    rows.push({
      label: "How we count it",
      value: "Cohort math on first answers",
    });
  } else {
    rows.push({
      label: "Peer standing",
      value: peerStandingLockedLabel(MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE),
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
      verdict: "Locked for rank. Your first answer is permanent.",
      nextAction: "Practice here for fluency; it will not change your verified mark.",
    };
  }
  if (accuracyPercent != null) {
    const practiceNote =
      state === "proficient"
        ? "Practice only. Rank still waits on your first answer."
        : "Practice accuracy counts here, but rank still waits on your first answer.";
    return {
      title: nodeName,
      verdict: `${practiceNote} You are at ${accuracyPercent}% in practice runs.`,
      nextAction: "Run a quest item from this node if you have not verified it yet.",
    };
  }
  return {
    title: nodeName,
    verdict: "No locked first answer on record for this node.",
    nextAction: "Start a verified practice pack that includes this skill.",
  };
}

export function masteryNodeDetailStateLabel(state: MasteryNodeState): string {
  switch (state) {
    case "verified":
      return "Verified";
    case "proficient":
      return "Solid practice (70%+)";
    case "weak":
      return "Under 70%";
    case "none":
      return "Not started";
  }
}
