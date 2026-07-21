import {
  flattenMasteryNodes,
  resolveMasteryNodeState,
} from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryGridData, MasteryGridNode, MasteryNodeState } from "@/features/mastery-grid/types";

export type SharedSessionGridMode = "student" | "guide";

export type SharedSessionBloomEvent = {
  nodeId: string;
  fromState: MasteryNodeState;
  toState: MasteryNodeState;
};

export type SharedSessionGuideNoteEvent = {
  nodeId: string;
  nodeName: string;
  note: string;
  guideName: string;
};

export type SharedSessionBroadcastEvent =
  | { type: "grid-bloom"; payload: SharedSessionBloomEvent }
  | { type: "guide-note"; payload: SharedSessionGuideNoteEvent }
  | { type: "flag-node"; payload: { nodeId: string; flagged: boolean } }
  | {
      type: "practice-assigned";
      payload: { nodeId: string; nodeName: string; questId: string };
    }
  | { type: "impact-pulse"; payload: { nodeId: string } };

export const SHARED_SESSION_BROADCAST = {
  bloom: "shared-grid-bloom",
  note: "shared-grid-note",
  flag: "shared-grid-flag",
  practice: "shared-grid-practice",
  pulse: "shared-grid-pulse",
} as const;

export function mergePinnedAndFlaggedNodes(
  sessionTargetNodeIds: string[],
  flaggedNodeIds: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...sessionTargetNodeIds, ...flaggedNodeIds]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function findMasteryNode(
  grid: MasteryGridData,
  nodeId: string,
): MasteryGridNode | null {
  return flattenMasteryNodes(grid).find((node) => node.id === nodeId) ?? null;
}

export function applyKnowledgeRowToGrid(
  grid: MasteryGridData,
  row: { skill_node_id: string; attempts: number; correct: number },
  verifiedByNode: ReadonlyMap<string, { isCorrect: boolean }>,
): { grid: MasteryGridData; bloom: SharedSessionBloomEvent | null } {
  const nodeId = row.skill_node_id;
  const prior = findMasteryNode(grid, nodeId);
  if (!prior) return { grid, bloom: null };

  const verified = verifiedByNode.get(nodeId) ?? null;
  const knowledge = { attempts: row.attempts, correct: row.correct };
  const resolved = resolveMasteryNodeState(verified, knowledge);

  if (prior.state === resolved.state && prior.practiceAttempts === knowledge.attempts) {
    return { grid, bloom: null };
  }

  const bloom: SharedSessionBloomEvent = {
    nodeId,
    fromState: prior.state,
    toState: resolved.state,
  };

  const nextGrid: MasteryGridData = {
    ...grid,
    units: grid.units.map((unit) => ({
      ...unit,
      nodes: unit.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              state: resolved.state,
              accuracyPercent: resolved.accuracyPercent,
              practiceAttempts: knowledge.attempts,
              practiceCorrect: knowledge.correct,
              hasVerifiedAttempt: verified != null,
              verifiedCorrect: verified?.isCorrect ?? null,
            }
          : node,
      ),
    })),
  };

  return { grid: nextGrid, bloom };
}

export function sharedSessionGridVerdict(
  mode: SharedSessionGridMode,
  pinnedCount: number,
  flaggedCount: number,
): { verdict: string; nextAction: string } {
  if (mode === "guide") {
    if (flaggedCount > 0) {
      return {
        verdict: `${flaggedCount} node${flaggedCount === 1 ? "" : "s"} flagged for this session.`,
        nextAction: "Hover a node to annotate or queue the next practice item.",
      };
    }
    return {
      verdict: "You and your Mentrixer share one live mastery grid.",
      nextAction: "Flag weak nodes or assign the next verified question.",
    };
  }

  if (pinnedCount > 0) {
    return {
      verdict: `${pinnedCount} session target${pinnedCount === 1 ? "" : "s"} pinned at the top.`,
      nextAction: "Movement on these nodes updates both screens in real time.",
    };
  }

  return {
    verdict: "Your mastery grid is live in this session.",
    nextAction: "Correct answers mid session bloom here for you and your Guide.",
  };
}

export function parseSharedSessionBroadcast(
  event: string,
  payload: unknown,
): SharedSessionBroadcastEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  switch (event) {
    case SHARED_SESSION_BROADCAST.bloom: {
      const nodeId = p.nodeId;
      const fromState = p.fromState;
      const toState = p.toState;
      if (
        typeof nodeId !== "string" ||
        typeof fromState !== "string" ||
        typeof toState !== "string"
      ) {
        return null;
      }
      return {
        type: "grid-bloom",
        payload: {
          nodeId,
          fromState: fromState as MasteryNodeState,
          toState: toState as MasteryNodeState,
        },
      };
    }
    case SHARED_SESSION_BROADCAST.note: {
      const nodeId = p.nodeId;
      const nodeName = p.nodeName;
      const note = p.note;
      const guideName = p.guideName;
      if (
        typeof nodeId !== "string" ||
        typeof nodeName !== "string" ||
        typeof note !== "string" ||
        typeof guideName !== "string"
      ) {
        return null;
      }
      return {
        type: "guide-note",
        payload: { nodeId, nodeName, note, guideName },
      };
    }
    case SHARED_SESSION_BROADCAST.flag: {
      const nodeId = p.nodeId;
      const flagged = p.flagged;
      if (typeof nodeId !== "string" || typeof flagged !== "boolean") return null;
      return { type: "flag-node", payload: { nodeId, flagged } };
    }
    case SHARED_SESSION_BROADCAST.practice: {
      const nodeId = p.nodeId;
      const nodeName = p.nodeName;
      const questId = p.questId;
      if (
        typeof nodeId !== "string" ||
        typeof nodeName !== "string" ||
        typeof questId !== "string"
      ) {
        return null;
      }
      return {
        type: "practice-assigned",
        payload: { nodeId, nodeName, questId },
      };
    }
    case SHARED_SESSION_BROADCAST.pulse: {
      const nodeId = p.nodeId;
      if (typeof nodeId !== "string") return null;
      return { type: "impact-pulse", payload: { nodeId } };
    }
    default:
      return null;
  }
}
