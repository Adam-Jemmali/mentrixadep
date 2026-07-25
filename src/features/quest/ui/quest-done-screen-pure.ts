import type { MasteryNodeVisualState } from "@/components/mastery-node";
import {
  buildApReadinessBand,
  type ApReadinessBandView,
} from "@/features/student-home/ap-readiness-band-pure";
import type { MasteryGridData, QuestMasteryHighlight } from "@/features/mastery-grid/types";
import { browseGuidesWithFocusHref, practiceNodeHref } from "@/features/guidance/verdict-engine-pure";

export type QuestDonePrimaryAction = {
  label: string;
  href: string;
  kind: "share" | "guide" | "practice";
};

const VISUAL_STATE_LABEL: Record<MasteryNodeVisualState, string> = {
  unstarted: "unstarted",
  attempted: "attempted",
  practiced: "practiced",
  proficient: "proficient",
  verified: "verified",
};

/** User-facing node state words for the Playfair hero line. */
export function masteryVisualStateLabel(state: MasteryNodeVisualState): string {
  return VISUAL_STATE_LABEL[state];
}

export function domainStateToVisualLabel(state: QuestMasteryHighlight["fromState"]): string {
  switch (state) {
    case "none":
      return "unstarted";
    case "weak":
      return "practiced";
    case "proficient":
      return "proficient";
    case "verified":
      return "verified";
  }
}

export function buildQuestDoneHeroLabel(highlight: QuestMasteryHighlight): string {
  if (highlight.unchanged) {
    return `${highlight.nodeName} held steady. One more`;
  }
  const fromLabel = domainStateToVisualLabel(highlight.fromState);
  const toLabel = domainStateToVisualLabel(highlight.toState);
  return `${highlight.nodeName} moved from ${fromLabel} to ${toLabel}`;
}

export function apBandScorePercent(band: ApReadinessBandView): number {
  if (band.score == null) return 0;
  return Math.max(0, Math.min(100, (band.score / 5) * 100));
}

export function buildApBandFromGrid(grid: MasteryGridData): ApReadinessBandView {
  const rank = grid.globalRank;
  if (!rank) {
    return buildApReadinessBand({
      verifiedCount: 0,
      accuracyPercent: 0,
      percentile: null,
      eligibleCohortSize: null,
    });
  }
  return buildApReadinessBand({
    verifiedCount: rank.verifiedCount,
    accuracyPercent: rank.accuracyPercent,
    percentile: rank.topPercent != null ? 100 - rank.topPercent : null,
    eligibleCohortSize: null,
  });
}

export function buildPriorApBand(
  afterGrid: MasteryGridData,
  newVerifiedSkills: number,
): ApReadinessBandView {
  const after = buildApBandFromGrid(afterGrid);
  const rank = afterGrid.globalRank;
  if (!rank || newVerifiedSkills <= 0) return after;

  const priorVerified = Math.max(0, rank.verifiedCount - newVerifiedSkills);
  return buildApReadinessBand({
    verifiedCount: priorVerified,
    accuracyPercent: rank.accuracyPercent,
    percentile: rank.topPercent != null ? 100 - rank.topPercent : null,
    eligibleCohortSize: null,
  });
}

export function apBandImproved(before: ApReadinessBandView, after: ApReadinessBandView): boolean {
  if (after.score == null) return false;
  if (before.score == null) return after.isVerifiedPrediction;
  return after.score > before.score;
}

export function buildQuestDonePrimaryAction(input: {
  highlight: QuestMasteryHighlight;
  newVerifiedSkills?: number;
  shareHref: string;
}): QuestDonePrimaryAction {
  const { highlight, newVerifiedSkills = 0, shareHref } = input;

  if (newVerifiedSkills > 0) {
    return {
      label: "Share your progress →",
      href: shareHref,
      kind: "share",
    };
  }

  if (!highlight.unchanged && highlight.toState !== "verified") {
    return {
      label: "Book a Guide who specializes in this node →",
      href: browseGuidesWithFocusHref({
        skillNodeId: highlight.nodeId,
        nodeName: highlight.nodeName,
      }),
      kind: "guide",
    };
  }

  return {
    label: "Practice this node again →",
    href: practiceNodeHref(highlight.nodeName),
    kind: "practice",
  };
}
