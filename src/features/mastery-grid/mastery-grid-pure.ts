import type { MasteryGridData, MasteryGridNode, MasteryNodeState, MasteryPackNodeSnapshot, QuestMasteryHighlight } from "@/features/mastery-grid/types";

export const VERIFIED_GOLD = "#D4A017";

export function defaultMasteryNodeStats(): Pick<
  MasteryGridNode,
  | "practiceAttempts"
  | "practiceCorrect"
  | "hasVerifiedAttempt"
  | "verifiedCorrect"
  | "peerBetterThanPercent"
> {
  return {
    practiceAttempts: 0,
    practiceCorrect: 0,
    hasVerifiedAttempt: false,
    verifiedCorrect: null,
    peerBetterThanPercent: null,
  };
}

export const MASTERY_STATE_LABEL: Record<MasteryNodeState, string> = {
  none: "not started",
  weak: "under seventy percent",
  proficient: "solid in practice",
  verified: "verified",
};

const STATE_RANK: Record<MasteryNodeState, number> = {
  none: 0,
  weak: 1,
  proficient: 2,
  verified: 3,
};

export function resolveMasteryNodeState(
  verified: { isCorrect: boolean } | null,
  knowledge: { attempts: number; correct: number } | null
): { state: MasteryNodeState; accuracyPercent: number | null } {
  if (verified) {
    if (verified.isCorrect) {
      return { state: "verified", accuracyPercent: 100 };
    }
    return { state: "weak", accuracyPercent: 0 };
  }

  if (knowledge && knowledge.attempts > 0) {
    const accuracyPercent = Math.round((knowledge.correct / knowledge.attempts) * 100);
    if (accuracyPercent >= 70) {
      return { state: "proficient", accuracyPercent };
    }
    return { state: "weak", accuracyPercent };
  }

  return { state: "none", accuracyPercent: null };
}

function unitOneFirstNode(units: MasteryGridData["units"]): MasteryGridNode | null {
  const unitOne = units.find((unit) => unit.unitNumber === 1) ?? units[0];
  return unitOne?.nodes[0] ?? null;
}

export function buildMasteryGridNextAction(units: MasteryGridData["units"]): string {
  const attempted = units.flatMap((unit) => unit.nodes).filter((node) => node.state !== "none");

  if (attempted.length === 0) {
    const first = unitOneFirstNode(units);
    return first ? `Start: ${first.nodeName}` : "Start Quest.";
  }

  const weakest = [...attempted].sort((a, b) => {
    const accA = a.accuracyPercent ?? 0;
    const accB = b.accuracyPercent ?? 0;
    if (accA !== accB) return accA - accB;
    return a.displayOrder - b.displayOrder;
  })[0]!;

  return `Practice ${weakest.nodeName}`;
}

export function flattenMasteryNodes(grid: MasteryGridData): MasteryGridNode[] {
  return grid.units.flatMap((unit) => unit.nodes);
}

export function snapshotPackNodesFromGrid(
  grid: MasteryGridData,
  packNodeIds: string[]
): Record<string, MasteryPackNodeSnapshot> {
  const byId = new Map(flattenMasteryNodes(grid).map((node) => [node.id, node]));
  const out: Record<string, MasteryPackNodeSnapshot> = {};
  for (const id of packNodeIds) {
    const node = byId.get(id);
    if (node) {
      out[id] = {
        nodeName: node.nodeName,
        state: node.state,
        accuracyPercent: node.accuracyPercent,
      };
    }
  }
  return out;
}

export function pickQuestMasteryHighlight(
  before: Record<string, MasteryPackNodeSnapshot>,
  afterGrid: MasteryGridData,
  packNodeOrder: string[]
): QuestMasteryHighlight | null {
  const afterById = new Map(flattenMasteryNodes(afterGrid).map((node) => [node.id, node]));
  const uniqueOrder: string[] = [];
  const seen = new Set<string>();
  for (const id of packNodeOrder) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    uniqueOrder.push(id);
  }
  if (uniqueOrder.length === 0) return null;

  const changed: Array<{
    id: string;
    from: MasteryNodeState;
    to: MasteryNodeState;
    packIndex: number;
  }> = [];

  uniqueOrder.forEach((id, packIndex) => {
    const prior = before[id];
    const next = afterById.get(id);
    if (!prior || !next) return;
    if (prior.state !== next.state) {
      changed.push({ id, from: prior.state, to: next.state, packIndex });
    }
  });

  let pickId: string;
  let fromState: MasteryNodeState;
  let toState: MasteryNodeState;
  let unchanged: boolean;

  if (changed.length > 0) {
    const best = [...changed].sort((a, b) => {
      const deltaA = STATE_RANK[a.to] - STATE_RANK[a.from];
      const deltaB = STATE_RANK[b.to] - STATE_RANK[b.from];
      if (deltaB !== deltaA) return deltaB - deltaA;
      return b.packIndex - a.packIndex;
    })[0]!;
    pickId = best.id;
    fromState = best.from;
    toState = best.to;
    unchanged = false;
  } else {
    pickId = uniqueOrder[uniqueOrder.length - 1]!;
    const prior = before[pickId];
    const next = afterById.get(pickId);
    fromState = prior?.state ?? next?.state ?? "none";
    toState = next?.state ?? fromState;
    unchanged = true;
  }

  const nodeName = afterById.get(pickId)?.nodeName ?? before[pickId]?.nodeName ?? "This skill";
  const acc = afterById.get(pickId)?.accuracyPercent;
  const verdictLine = unchanged
    ? `${nodeName} held steady — practice until the square turns green (70%+).`
    : toState === "proficient"
      ? `${nodeName} turned solid green at ${acc ?? 70}%+ practice.`
      : toState === "verified"
        ? `${nodeName} locked for rank on first answer.`
        : toState === "weak"
          ? `${nodeName} still weak — practice until green before your next verified attempt.`
          : `${nodeName} updated on your grid.`;

  return {
    nodeId: pickId,
    nodeName,
    fromState,
    toState,
    unchanged,
    verdictLine,
  };
}

export function groupSkillNodesIntoUnits<
  T extends {
    id: string;
    unit_number: number;
    unit_name: string;
    node_name: string;
    node_slug: string;
    display_order: number;
  },
>(
  nodes: T[],
  resolveNode: (node: T) => Pick<
    MasteryGridNode,
    | "state"
    | "accuracyPercent"
    | "practiceAttempts"
    | "practiceCorrect"
    | "hasVerifiedAttempt"
    | "verifiedCorrect"
    | "peerBetterThanPercent"
  >,
): MasteryGridData["units"] {
  const byUnit = new Map<number, MasteryGridData["units"][number]>();

  for (const row of nodes) {
    const unit =
      byUnit.get(row.unit_number) ??
      {
        unitNumber: row.unit_number,
        unitName: row.unit_name,
        nodes: [],
      };
    const resolved = resolveNode(row);
    unit.nodes.push({
      id: row.id,
      nodeName: row.node_name,
      nodeSlug: row.node_slug,
      displayOrder: row.display_order,
      ...defaultMasteryNodeStats(),
      ...resolved,
    });
    byUnit.set(row.unit_number, unit);
  }

  return [...byUnit.values()]
    .sort((a, b) => a.unitNumber - b.unitNumber)
    .map((unit) => ({
      ...unit,
      nodes: [...unit.nodes].sort((a, b) => a.displayOrder - b.displayOrder),
    }));
}


export function splitMasteryGridByPinned(
  data: MasteryGridData,
  pinnedNodeIds: string[]
): {
  pinnedNodes: MasteryGridNode[];
  remainderUnits: MasteryGridData["units"];
} {
  const pinnedSet = new Set(pinnedNodeIds);
  const nodeById = new Map<string, MasteryGridNode>();
  for (const unit of data.units) {
    for (const node of unit.nodes) {
      nodeById.set(node.id, node);
    }
  }

  const pinnedNodes = pinnedNodeIds
    .map((id) => nodeById.get(id))
    .filter((node): node is MasteryGridNode => node != null);

  const remainderUnits = data.units
    .map((unit) => ({
      ...unit,
      nodes: unit.nodes.filter((node) => !pinnedSet.has(node.id)),
    }))
    .filter((unit) => unit.nodes.length > 0);

  return { pinnedNodes, remainderUnits };
}

export type MasteryGridSummary = {
  totalNodes: number;
  verifiedCount: number;
  proficientCount: number;
  weakCount: number;
  notStartedCount: number;
  progressPercent: number;
};

export function summarizeMasteryGrid(data: MasteryGridData): MasteryGridSummary {
  const nodes = flattenMasteryNodes(data);
  let verifiedCount = 0;
  let proficientCount = 0;
  let weakCount = 0;
  let notStartedCount = 0;

  for (const node of nodes) {
    if (node.state === "verified") verifiedCount += 1;
    else if (node.state === "proficient") proficientCount += 1;
    else if (node.state === "weak") weakCount += 1;
    else notStartedCount += 1;
  }

  const totalNodes = nodes.length;
  const progressPercent =
    totalNodes > 0
      ? Math.round(((verifiedCount + proficientCount) / totalNodes) * 100)
      : 0;

  return {
    totalNodes,
    verifiedCount,
    proficientCount,
    weakCount,
    notStartedCount,
    progressPercent,
  };
}

export function pickWeakestMasteryNodes(
  data: MasteryGridData,
  limit = 3,
): MasteryGridNode[] {
  return flattenMasteryNodes(data)
    .filter((node) => node.state !== "none")
    .sort((a, b) => {
      const accA = a.accuracyPercent ?? 0;
      const accB = b.accuracyPercent ?? 0;
      if (accA !== accB) return accA - accB;
      return a.displayOrder - b.displayOrder;
    })
    .slice(0, limit);
}

/** Single source of truth for hub Weakest: lowest accuracy among attempted nodes. */
export function pickPrimaryWeakestMasteryNode(
  data: MasteryGridData,
): MasteryGridNode | null {
  return pickWeakestMasteryNodes(data, 1)[0] ?? null;
}

/** Prefer the unit with the most weak nodes; otherwise the first unit. */
export function pickDefaultMasteryUnitNumber(data: MasteryGridData): number | null {
  if (data.units.length === 0) return null;

  let best = data.units[0]!;
  let bestWeak = -1;

  for (const unit of data.units) {
    const weakInUnit = unit.nodes.filter(
      (node) => node.state === "weak" || node.state === "none",
    ).length;
    if (weakInUnit > bestWeak) {
      bestWeak = weakInUnit;
      best = unit;
    }
  }

  return best.unitNumber;
}

export function filterMasteryNodesByQuery(
  data: MasteryGridData,
  query: string,
): Array<MasteryGridNode & { unitNumber: number; unitName: string }> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const matches: Array<MasteryGridNode & { unitNumber: number; unitName: string }> = [];
  for (const unit of data.units) {
    for (const node of unit.nodes) {
      if (
        node.nodeName.toLowerCase().includes(normalized) ||
        node.nodeSlug.toLowerCase().includes(normalized)
      ) {
        matches.push({
          ...node,
          unitNumber: unit.unitNumber,
          unitName: unit.unitName,
        });
      }
    }
  }

  return matches.slice(0, 24);
}
