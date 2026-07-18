/** Pure helpers for admin item bank review. Keep copy short. */

export type ItemReviewStatus = "pending_review" | "approved" | "rejected";

export type ItemReviewFormat = "mcq" | "free_response" | "multi_part" | "step_trace" | string;

export type ItemReviewQueueFilter = "pending_review" | "approved" | "rejected" | "all";

export function itemFormatLabel(format: ItemReviewFormat): string {
  switch (format) {
    case "mcq":
      return "MCQ";
    case "free_response":
      return "Free response";
    case "multi_part":
      return "Multi-part";
    case "step_trace":
      return "Step trace";
    case "complete_expression":
      return "Complete expression";
    case "drag_order":
      return "Drag order";
    case "graph_feature":
      return "Graph feature";
    default:
      return String(format || "Item");
  }
}

export function itemStatusLabel(status: string): string {
  switch (status) {
    case "pending_review":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export function itemReviewQueueTitle(pendingCount: number): string {
  if (pendingCount <= 0) return "Item review";
  return `Item review · ${pendingCount} pending`;
}

export function itemReviewQueueSubtitle(pendingCount: number, approvedCount: number): string {
  return `${pendingCount} pending · ${approvedCount} approved live`;
}

export function itemReviewEmptyMessage(filter: ItemReviewQueueFilter): string {
  if (filter === "pending_review") return "Queue clear. Generate candidates to fill it.";
  if (filter === "approved") return "No approved items match.";
  if (filter === "rejected") return "No rejected items.";
  return "No items match.";
}

export function itemReviewApproveBlockedMessage(reasons: string[]): string {
  if (reasons.length === 0) return "Cannot approve this item.";
  return reasons[0]!;
}

export function itemReviewNextAction(pendingCount: number): string {
  if (pendingCount > 0) return "Approve sound items. Reject the rest.";
  return "Run npm run item-bank:generate-candidates when coverage dips.";
}

export type FreeResponseApproveInput = {
  itemFormat: string;
  answerExpression: string | null | undefined;
  solutionSteps: Array<{ expression?: string; is_critical?: boolean }>;
  difficultyRating: number | null | undefined;
  expressionParses: (expression: string) => boolean;
};

export function validateFreeResponseForApprove(input: FreeResponseApproveInput): string[] {
  if (input.itemFormat !== "free_response" && input.itemFormat !== "multi_part") {
    return [];
  }

  const reasons: string[] = [];
  const answer = (input.answerExpression ?? "").trim();
  if (!answer) {
    reasons.push("Missing answer expression.");
  } else if (!input.expressionParses(answer)) {
    reasons.push("Answer expression does not parse.");
  }

  const difficulty = Number(input.difficultyRating ?? 1000);
  if (!Number.isFinite(difficulty) || difficulty < 500 || difficulty > 2000) {
    reasons.push("Difficulty must be between 500 and 2000.");
  }

  const steps = input.solutionSteps ?? [];
  if (!steps.some((step) => step.is_critical)) {
    reasons.push("Mark at least one solution step as critical.");
  }

  for (const step of steps) {
    const expression = (step.expression ?? "").trim();
    if (expression && !input.expressionParses(expression)) {
      reasons.push("A solution step expression does not parse.");
      break;
    }
  }

  return reasons;
}

export function truncatePrompt(prompt: string, max = 120): string {
  const text = prompt.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
