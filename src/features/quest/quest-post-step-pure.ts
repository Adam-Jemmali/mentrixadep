import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";
import { flattenMasteryNodes } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryGridData, MasteryGridNode, MasteryNodeState, QuestMasteryHighlight } from "@/features/mastery-grid/types";

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
    const accLabel = verifiedMiss ? "first try missed" : `${acc ?? 0}% in practice`;
    return {
      phase: "practice_to_green",
      changed: verifiedMiss
        ? `${name} locked weak on first try.`
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
    reason: "Keep green nodes sharp in practice. Your next rank move is a first try on a new skill.",
    nextAction: {
      label: "Run next verified pack",
      href: "/student/quest",
    },
    valueLine:
      "Duels pull from your solid nodes. Open squares are where rank still moves.",
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
          reason: `${focus.nodeName} is done for rank. ${nextOpen.nodeName} is green and ready for a verified first try.`,
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
