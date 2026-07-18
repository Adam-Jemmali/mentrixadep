/** Pure builders for resume-grade verified attempt proof cards. */

import type { VfaAttemptFormat } from "@/features/quest/vfa-free-response-pure";

export type VerifiedAttemptCardModel = {
  skillNodeId: string;
  nodeName: string;
  unitName: string;
  unitNumber: number;
  attemptFormat: VfaAttemptFormat | string;
  isCorrect: boolean;
  accuracyPct: number;
  attemptedAt: string;
  modalityLabel: string;
  proofLine: string;
  verdict: string;
  nextAction: string;
};

export function modalityLabel(format: string): string {
  switch (format) {
    case "mcq":
      return "Multiple choice";
    case "free_response":
      return "Constructed expression";
    case "complete_expression":
      return "Complete the expression";
    case "drag_order":
      return "Drag order";
    case "graph_feature":
      return "Graph feature";
    case "multi_part_part":
      return "Multi-part construction";
    default:
      return "Verified attempt";
  }
}

export function buildVerifiedAttemptCard(input: {
  skillNodeId: string;
  nodeName: string;
  unitName: string;
  unitNumber: number;
  attemptFormat: string;
  isCorrect: boolean;
  accuracyPct: number | null | undefined;
  attemptedAt: string;
}): VerifiedAttemptCardModel {
  const accuracy =
    input.accuracyPct != null && Number.isFinite(Number(input.accuracyPct))
      ? Number(input.accuracyPct)
      : input.isCorrect
        ? 1
        : 0;
  const label = modalityLabel(input.attemptFormat);
  const proofLine = input.isCorrect
    ? `Verified first construction on ${input.nodeName} via ${label.toLowerCase()}.`
    : `First encounter on ${input.nodeName} recorded. Construction incomplete.`;
  const verdict = input.isCorrect
    ? "This attempt is permanent proof of the skill under Mentrixa first-attempt rules."
    : "First attempt is locked. Practice continues; rank did not claim the skill.";
  const nextAction = input.isCorrect
    ? "Share this card or keep proving the next node."
    : "Retry in practice. Rank only moves on a future node first encounter.";

  return {
    skillNodeId: input.skillNodeId,
    nodeName: input.nodeName,
    unitName: input.unitName,
    unitNumber: input.unitNumber,
    attemptFormat: input.attemptFormat,
    isCorrect: input.isCorrect,
    accuracyPct: accuracy,
    attemptedAt: input.attemptedAt,
    modalityLabel: label,
    proofLine,
    verdict,
    nextAction,
  };
}

export function summarizeConstructionMix(
  cards: Array<{ attemptFormat: string }>,
): { constructionShare: number; label: string } {
  if (cards.length === 0) return { constructionShare: 0, label: "No verified attempts yet." };
  const construction = cards.filter((c) => c.attemptFormat !== "mcq").length;
  const share = construction / cards.length;
  return {
    constructionShare: share,
    label: `${Math.round(share * 100)}% construction modalities across ${cards.length} verified skills.`,
  };
}
