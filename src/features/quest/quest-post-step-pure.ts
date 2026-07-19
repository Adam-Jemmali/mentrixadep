import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";
import { flattenMasteryNodes } from "@/features/mastery-grid/mastery-grid-pure";
import type {
  MasteryGridData,
  MasteryGridNode,
  MasteryNodeState,
  MasteryPackNodeSnapshot,
  QuestMasteryHighlight,
  QuestOpenedHighlight,
} from "@/features/mastery-grid/types";
import { skillTreeLabel } from "@/features/skill-tree/skill-tree-copy-pure";
import { buildAdjacency } from "@/features/skill-tree/skill-tree-graph-pure";
import {
  buildSolidIds,
  isNodeUnlocked,
  isSolidState,
} from "@/features/skill-tree/skill-tree-unlock-pure";

/** Practice accuracy at or above this turns a node solid green on the grid. */
export const SOLID_PRACTICE_PERCENT = 70;

export type QuestPostPackPhase =
  | "practice_to_green"
  | "quest_to_verify"
  | "next_open_node"
  | "keep_solid";

export type QuestPostPackStep = {
  phase: QuestPostPackPhase;
  changed: string;
  reason: string;
  nextAction: { label: string; href: string };
  /** Shown under the verdict — why green matters. */
  valueLine: string;
};

const STATE_PRIORITY_FOR_FOCUS: Record<MasteryNodeState, number> = {
  weak: 0,
  none: 1,
  proficient: 2,
  verified: 3,
};

type QuestOpenedNode = {
  id: string;
  nodeName: string;
  state: MasteryNodeState;
  prerequisites: string[];
};

export function pickQuestOpenedHighlight(
  before: Record<string, MasteryPackNodeSnapshot>,
  afterNodes: QuestOpenedNode[],
  packNodeOrder: string[],
): QuestOpenedHighlight | null {
  const changedToSolid = new Set(
    packNodeOrder.filter((nodeId) => {
      const prior = before[nodeId];
      const next = afterNodes.find((node) => node.id === nodeId);
      return prior && next && !isSolidState(prior.state) && isSolidState(next.state);
    }),
  );
  if (changedToSolid.size === 0) return null;

  const { parents } = buildAdjacency(afterNodes);
  const solidIds = buildSolidIds(afterNodes);
  const opened = afterNodes.find((node) => {
    const nodeParents = parents.get(node.id) ?? [];
    return (
      nodeParents.some((parentId) => changedToSolid.has(parentId)) &&
      isNodeUnlocked(node.id, parents, solidIds)
    );
  });
  if (!opened) return null;

  const label = skillTreeLabel("opened");
  return {
    kind: "opened",
    nodeId: opened.id,
    nodeName: opened.nodeName,
    icon: label.icon,
    text: label.text,
  };
}

function questPromptHref(nodeName: string): string {
  return `/student/quest?prompt=${encodeURIComponent(nodeName)}`;
}

export function pickPostPackFocusNode(
  grid: MasteryGridData,
  packNodeIds: string[],
  highlight?: QuestMasteryHighlight | null,
): MasteryGridNode | null {
  const byId = new Map(flattenMasteryNodes(grid).map((node) => [node.id, node]));

  if (highlight?.nodeId) {
    const highlighted = byId.get(highlight.nodeId);
    if (highlighted) return highlighted;
  }

  const packNodes = packNodeIds
    .map((id) => byId.get(id))
    .filter((node): node is MasteryGridNode => Boolean(node));

  if (packNodes.length === 0) return null;

  return [...packNodes].sort((a, b) => {
    const rankA = STATE_PRIORITY_FOR_FOCUS[a.state];
    const rankB = STATE_PRIORITY_FOR_FOCUS[b.state];
    if (rankA !== rankB) return rankA - rankB;
    const accA = a.accuracyPercent ?? 0;
    const accB = b.accuracyPercent ?? 0;
    if (accA !== accB) return accA - accB;
    return a.displayOrder - b.displayOrder;
  })[0]!;
}

export function pickNextOpenQuestNode(grid: MasteryGridData): MasteryGridNode | null {
  const nodes = flattenMasteryNodes(grid);
  const open = nodes.filter((node) => node.state === "none" || node.state === "weak");
  if (open.length === 0) {
    return nodes.find((node) => node.state === "proficient") ?? null;
  }
  return [...open].sort((a, b) => a.displayOrder - b.displayOrder)[0] ?? null;
}

export function buildQuestPostPackStep(node: MasteryGridNode): QuestPostPackStep {
  const name = node.nodeName;
  const acc = node.accuracyPercent;
  const href = practiceNodeHref(name);

  if (node.state === "none") {
    return {
      phase: "practice_to_green",
      changed: `${name} is still open on your grid.`,
      reason: "Run practice packs on this node until the square turns solid green at 70% or higher.",
      nextAction: {
        label: `Practice ${name} until green`,
        href,
      },
      valueLine:
        "Green means you own it in practice. Gold only locks rank on your first verified try.",
    };
  }

  if (node.state === "weak") {
    const verifiedMiss = acc === 0;
    const accLabel = verifiedMiss ? "first answer missed" : `${acc ?? 0}% in practice`;
    return {
      phase: "practice_to_green",
      changed: verifiedMiss
        ? `${name} locked weak on first answer.`
        : `${name} is ${accLabel} — not solid yet.`,
      reason: verifiedMiss
        ? "Rank will not move on replays. Practice until green builds the fluency retests and Guides expect."
        : `You need 70% practice accuracy to turn the square green. You are at ${acc ?? 0}% now.`,
      nextAction: {
        label: `Practice ${name} until green (70%+)`,
        href,
      },
      valueLine:
        "Weak squares stay on your weekly receipt until you go green in practice.",
    };
  }

  if (node.state === "proficient") {
    return {
      phase: "quest_to_verify",
      changed: `${name} is solid green at ${acc ?? SOLID_PRACTICE_PERCENT}%+ practice.`,
      reason: "You own it in drills. One verified quest attempt locks rank on this node forever.",
      nextAction: {
        label: `Quest ${name} to lock rank`,
        href: questPromptHref(name),
      },
      valueLine:
        "Solid green first, gold verified second. That order is what makes rank unforgeable.",
    };
  }

  return {
    phase: "next_open_node",
    changed: `${name} is verified for rank.`,
    reason: "Keep green nodes sharp in practice. Your next rank move is a first answer on a new skill.",
    nextAction: {
      label: "Run next verified pack",
      href: "/student/quest",
    },
    valueLine:
      "",
  };
}

export function applyQuestPostPackStepToVerdict(
  verdict: Verdict,
  grid: MasteryGridData,
  packNodeIds: string[],
  highlight?: QuestMasteryHighlight | null,
): Verdict {
  if (verdict.nextAction.label.toLowerCase().includes("retest")) {
    return verdict;
  }

  const focus = pickPostPackFocusNode(grid, packNodeIds, highlight);
  if (!focus) return verdict;

  let step = buildQuestPostPackStep(focus);

  if (step.phase === "next_open_node") {
    const nextOpen = pickNextOpenQuestNode(grid);
    if (nextOpen && nextOpen.id !== focus.id) {
      if (nextOpen.state === "proficient") {
        step = {
          ...step,
          nextAction: {
            label: `Quest ${nextOpen.nodeName} to lock rank`,
            href: questPromptHref(nextOpen.nodeName),
          },
          reason: `${focus.nodeName} is done for rank. ${nextOpen.nodeName} is green and ready for a locked first answer.`,
        };
      } else if (nextOpen.state === "none" || nextOpen.state === "weak") {
        step = {
          ...step,
          changed: `${nextOpen.nodeName} is your next open skill.`,
          reason: `Practice until green, then quest it. ${focus.nodeName} is already verified.`,
          nextAction: {
            label: `Practice ${nextOpen.nodeName} until green`,
            href: practiceNodeHref(nextOpen.nodeName),
          },
          phase: "practice_to_green",
        };
      }
    }
  }

  return {
    ...verdict,
    changed: step.changed,
    reason: step.reason,
    nextAction: step.nextAction,
    comparison: step.valueLine,
  };
}

export function inferQuestPostPackPhaseFromNextAction(label: string): QuestPostPackPhase {
  const lower = label.toLowerCase();
  if (lower.includes("retest")) return "keep_solid";
  if (lower.includes("until green")) return "practice_to_green";
  if (lower.includes("quest") && lower.includes("lock")) return "quest_to_verify";
  if (lower.includes("verified pack")) return "next_open_node";
  return "next_open_node";
}

export function questPostPackPhaseLabel(phase: QuestPostPackPhase): string {
  switch (phase) {
    case "practice_to_green":
      return "Practice until green";
    case "quest_to_verify":
      return "Lock rank on this node";
    case "next_open_node":
      return "Next rank move";
    case "keep_solid":
      return "Stay solid";
  }
}

export function parseQuestPromptParam(prompt: string): string | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;
  const stripped = trimmed
    .replace(/^practice\s+/i, "")
    .replace(/^quest\s+/i, "")
    .replace(/^retest\s+/i, "")
    .trim();
  return stripped || null;
}

export function pickAlternateQuestNode(
  grid: MasteryGridData,
  excludeNodeIds: string[],
): MasteryGridNode | null {
  const exclude = new Set(excludeNodeIds);
  const nodes = flattenMasteryNodes(grid).filter((node) => !exclude.has(node.id));
  const open = nodes.filter((node) => node.state === "none" || node.state === "weak");
  if (open.length > 0) {
    return [...open].sort((a, b) => a.displayOrder - b.displayOrder)[0] ?? null;
  }
  const green = nodes.filter((node) => node.state === "proficient");
  if (green.length > 0) {
    return [...green].sort((a, b) => a.displayOrder - b.displayOrder)[0] ?? null;
  }
  return nodes.find((node) => node.state === "verified") ?? null;
}

export type QuestPostPackChoice = {
  nodeName: string;
  label: string;
  href: string;
  hint: string;
};

export type QuestPostPackChoices = {
  sameTopic: QuestPostPackChoice;
  otherTopic: QuestPostPackChoice | null;
};

export type QuestPostPackCtaKind = "primary" | "secondary" | "ghost";

export type QuestPostPackCta = {
  key: "next" | "tree" | "home";
  label: string;
  href: string;
  kind: QuestPostPackCtaKind;
};

/** Short button labels — node name only when the action verb is clear from context. */
export function shortenPostPackCtaLabel(label: string): string {
  const trimmed = label.trim();
  const untilGreen = trimmed.match(/^Practice (.+) until green(?:\s*\(70%\+\))?$/i);
  if (untilGreen?.[1]) return `Practice ${untilGreen[1]}`;
  const questLock = trimmed.match(/^Quest (.+) to lock rank$/i);
  if (questLock?.[1]) return `Quest ${questLock[1]}`;
  const practiceAgain = trimmed.match(/^Practice (.+) again$/i);
  if (practiceAgain?.[1]) return `Practice ${practiceAgain[1]}`;
  return trimmed;
}

/** Exactly three post-pack moves: recommendation, skill tree, Home. */
export function buildQuestPostPackCtas(
  verdict: Verdict,
  openedNodeId?: string | null,
): QuestPostPackCta[] {
  const treeHref =
    openedNodeId && openedNodeId.trim().length > 0
      ? `/student/mastery?opened=${encodeURIComponent(openedNodeId.trim())}`
      : "/student/mastery";

  return [
    {
      key: "next",
      label: shortenPostPackCtaLabel(verdict.nextAction.label),
      href: verdict.nextAction.href,
      kind: "primary",
    },
    {
      key: "tree",
      label: "Skill tree",
      href: treeHref,
      kind: "secondary",
    },
    {
      key: "home",
      label: "Home",
      href: "/student",
      kind: "ghost",
    },
  ];
}

function choiceForNode(node: MasteryGridNode, kind: "same" | "other"): QuestPostPackChoice {
  const name = node.nodeName;
  if (node.state === "proficient") {
    return {
      nodeName: name,
      label: `Quest ${name}`,
      href: questPromptHref(name),
      hint:
        kind === "same"
          ? "Same topic. Lock rank on your first verified try."
          : "Different topic. This square is green and ready to verify.",
    };
  }
  if (node.state === "verified") {
    return {
      nodeName: name,
      label: `Practice ${name} again`,
      href: practiceNodeHref(name),
      hint:
        kind === "same"
          ? "Same topic. Keep verified skills sharp in practice."
          : "Different topic. Stay fluent on a verified skill.",
    };
  }
  return {
    nodeName: name,
    label: `Practice ${name} until green`,
    href: practiceNodeHref(name),
    hint:
      kind === "same"
        ? "Same topic. More reps until the square turns solid green."
        : "Different topic. Open or weak squares are where rank still moves.",
  };
}

export function buildQuestPostPackChoices(
  grid: MasteryGridData,
  packNodeIds: string[],
  highlight?: QuestMasteryHighlight | null,
): QuestPostPackChoices | null {
  const focus = pickPostPackFocusNode(grid, packNodeIds, highlight);
  if (!focus) return null;

  const sameTopic = choiceForNode(focus, "same");
  const alternate = pickAlternateQuestNode(grid, packNodeIds.length > 0 ? packNodeIds : [focus.id]);
  const otherTopic =
    alternate && alternate.id !== focus.id ? choiceForNode(alternate, "other") : null;

  return { sameTopic, otherTopic };
}
