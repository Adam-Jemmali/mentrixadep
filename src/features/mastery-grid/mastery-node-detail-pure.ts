import type { MasteryGridNode, MasteryNodeState } from "@/features/mastery-grid/types";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";
import { MIN_PEER_COMPARISON_SAMPLE } from "@/features/comparison/comparison-context-pure";
import { SOLID_PRACTICE_PERCENT } from "@/features/quest/quest-post-step-pure";

export type MasteryNodeDetailRow = {
  label: string;
  value: string;
  gold?: boolean;
};

export function betterThanToTopPercent(betterThanPercent: number): number {
  return Math.max(1, Math.min(100, 100 - Math.round(betterThanPercent)));
}

export function masteryNodeShortStateLabel(state: MasteryNodeState): string {
  switch (state) {
    case "verified":
      return "Verified";
    case "proficient":
      return `Solid ${SOLID_PRACTICE_PERCENT}%+`;
    case "weak":
      return `Under ${SOLID_PRACTICE_PERCENT}%`;
    case "none":
      return "Open";
  }
}

/** When unlockedNodeIds is omitted, All skills keeps legacy open behavior. */
export function isMasteryNodePracticeLocked(
  nodeId: string,
  unlockedNodeIds?: ReadonlySet<string> | null,
): boolean {
  if (!unlockedNodeIds) return false;
  return !unlockedNodeIds.has(nodeId);
}

export function masteryNodeActionHref(node: Pick<MasteryGridNode, "state" | "nodeName">): string {
  if (node.state === "proficient") {
    return `/student/quest?prompt=${encodeURIComponent(node.nodeName)}`;
  }
  return practiceNodeHref(node.nodeName);
}

export function masteryNodeActionLabel(node: Pick<MasteryGridNode, "state" | "nodeName">): string {
  if (node.state === "verified") {
    return `Practice ${node.nodeName} again`;
  }
  if (node.state === "proficient") {
    return `Quest ${node.nodeName} to lock rank`;
  }
  return `Practice ${node.nodeName}`;
}

export function buildMasteryNodeDetailRows(
  node: MasteryGridNode,
  globalTopPercent: number | null | undefined,
  globalVerifiedCount: number | undefined,
): MasteryNodeDetailRow[] {
  const rows: MasteryNodeDetailRow[] = [];

  if (node.hasVerifiedAttempt) {
    rows.push({
      label: "First-answer result",
      value: node.verifiedCorrect ? "100% · locked correct" : "0% · locked miss",
      gold: node.verifiedCorrect === true,
    });
  }

  if (node.practiceAttempts > 0) {
    rows.push({
      label: "Practice accuracy",
      value: `${node.accuracyPercent ?? 0}% · ${node.practiceCorrect}/${node.practiceAttempts} right`,
    });
  } else if (!node.hasVerifiedAttempt) {
    rows.push({
      label: "Practice accuracy",
      value: "No practice runs yet",
    });
  }

  if (node.peerBetterThanPercent != null) {
    rows.push({
      label: "On this node",
      value: `Top ${betterThanToTopPercent(node.peerBetterThanPercent)}% of verified Mentrixers`,
      gold: true,
    });
  } else if (node.hasVerifiedAttempt) {
    rows.push({
      label: "On this node",
      value: `Peer standing unlocks at ${MIN_PEER_COMPARISON_SAMPLE} verified Mentrixers`,
    });
  } else {
    rows.push({
      label: "On this node",
      value: "Top % unlocks after your first verified try here",
    });
  }

  if (
    globalTopPercent != null &&
    globalVerifiedCount != null &&
    globalVerifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE
  ) {
    rows.push({
      label: "Overall rank",
      value: `Top ${globalTopPercent}% across ${globalVerifiedCount} verified skills`,
      gold: true,
    });
  }

  return rows;
}

export function buildMasteryNodeDetailVerdict(node: MasteryGridNode): string {
  if (node.state === "verified") {
    return "Rank locked on first answer. Practice keeps fluency; it will not change gold.";
  }
  if (node.hasVerifiedAttempt && node.verifiedCorrect === false) {
    return "First try missed. Rank will not move on replays. Practice until green builds fluency.";
  }
  if (node.state === "proficient") {
    return `Solid at ${node.accuracyPercent ?? SOLID_PRACTICE_PERCENT}%+ in practice. One verified quest locks rank.`;
  }
  if (node.practiceAttempts > 0) {
    return `Practice is at ${node.accuracyPercent ?? 0}%. Hit ${SOLID_PRACTICE_PERCENT}%+ to turn the square green.`;
  }
  return "No verified first answer on this node yet.";
}
