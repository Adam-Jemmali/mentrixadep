import { flattenMasteryNodes } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryGridData, MasteryGridNode, MasteryNodeState } from "@/features/mastery-grid/types";
import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

const STATE_RANK: Record<MasteryNodeState, number> = {
  none: 0,
  weak: 1,
  proficient: 2,
  verified: 3,
};

export type GuideSessionIntelligence = {
  strongestNodeName: string;
  gapNodeName: string;
  lastGuideSessionLabel: string;
  focusSignalDisplay: string;
};

export type GuideWarmupItem = {
  nodeName: string;
  prompt: string;
  options?: string[];
};

export function formatFocusSignalDisplay(frictionScore: number): string {
  const clamped = Math.min(1, Math.max(0.1, frictionScore));
  const scaled = Math.round(clamped * 100) / 10;
  return `${scaled.toFixed(1)}/10.0`;
}

function nodesWithPractice(grid: MasteryGridData): MasteryGridNode[] {
  return flattenMasteryNodes(grid).filter((node) => node.practiceAttempts > 0);
}

export function pickStrongestNodeName(grid: MasteryGridData): string {
  const attempted = nodesWithPractice(grid);
  if (attempted.length === 0) return "No practice yet";

  const best = [...attempted].sort((a, b) => {
    const accA = a.accuracyPercent ?? 0;
    const accB = b.accuracyPercent ?? 0;
    if (accB !== accA) return accB - accA;
    return b.practiceAttempts - a.practiceAttempts;
  })[0]!;

  return best.nodeName;
}

export function pickGapNodeName(grid: MasteryGridData): string {
  const attempted = nodesWithPractice(grid);
  if (attempted.length === 0) return "No practice yet";

  const gap = [...attempted].sort((a, b) => {
    if (b.practiceAttempts !== a.practiceAttempts) {
      return b.practiceAttempts - a.practiceAttempts;
    }
    const accA = a.accuracyPercent ?? 0;
    const accB = b.accuracyPercent ?? 0;
    return accA - accB;
  })[0]!;

  return gap.nodeName;
}

export function pickWeakestTargetNodeId(
  grid: MasteryGridData,
  targetNodeIds: string[],
): string | null {
  if (targetNodeIds.length === 0) return null;
  const byId = new Map(flattenMasteryNodes(grid).map((node) => [node.id, node]));
  const targets = targetNodeIds
    .map((id) => byId.get(id))
    .filter((node): node is MasteryGridNode => node != null);

  if (targets.length === 0) return targetNodeIds[0] ?? null;

  const weakest = [...targets].sort((a, b) => {
    const rankA = STATE_RANK[a.state];
    const rankB = STATE_RANK[b.state];
    if (rankA !== rankB) return rankA - rankB;
    const accA = a.accuracyPercent ?? 0;
    const accB = b.accuracyPercent ?? 0;
    return accA - accB;
  })[0]!;

  return weakest.id;
}

export function countNodesAwayFromTargetBand(
  grid: MasteryGridData,
  targetNodeIds: string[],
): number {
  if (targetNodeIds.length === 0) return 0;
  const byId = new Map(flattenMasteryNodes(grid).map((node) => [node.id, node]));
  let count = 0;
  for (const id of targetNodeIds) {
    const node = byId.get(id);
    if (!node || node.state !== "verified") count += 1;
  }
  return count;
}

export function buildWorkingTowardLine(
  band: ApReadinessBandView,
  grid: MasteryGridData,
  targetNodeIds: string[],
  verifiedCount: number,
): string {
  const nodesAway = countNodesAwayFromTargetBand(grid, targetNodeIds);

  if (band.score == null) {
    const remaining = Math.max(0, MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - verifiedCount);
    if (remaining > 0) {
      const word = remaining === 1 ? "try" : "tries";
      return `Working toward your proof tier, ${remaining} first ${word} left.`;
    }
    return `Working toward your proof tier, ${nodesAway} nodes away.`;
  }

  const targetScore = Math.min(5, band.score + 1);
  const word = nodesAway === 1 ? "node" : "nodes";
  return `Working toward proof tier ${targetScore}, ${nodesAway} ${word} away.`;
}

export function formatLastGuideSessionLabel(startTimeIso: string | null): string {
  if (!startTimeIso) return "First session";
  const date = new Date(startTimeIso);
  if (!Number.isFinite(date.getTime())) return "First session";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
