import type { PackSprintState } from "@/features/entitlements/pack-sprint-pure";
import { buildPackSprintReceiptLine } from "@/features/entitlements/pack-sprint-pure";

export function buildSessionCreditsHubVerdict(input: {
  totalRemaining: number;
  monthlyRemaining: number;
  packSprint: PackSprintState | null;
  periodMonth: string | null;
}): { verdict: string; nextAction: string } | null {
  if (input.totalRemaining <= 0) {
    return {
      verdict: "No included session credits are available right now.",
      nextAction: "",
    };
  }

  const parts: string[] = [];
  if (input.packSprint) {
    parts.push(buildPackSprintReceiptLine(input.packSprint));
  }
  if (input.monthlyRemaining > 0) {
    parts.push(
      `${input.monthlyRemaining} monthly included credit${input.monthlyRemaining === 1 ? "" : "s"}${input.periodMonth ? ` for ${input.periodMonth.slice(0, 7)}` : ""}.`,
    );
  }

  const nextAction = input.packSprint
    ? "Book a sprint session on the node that still will not move before the pack expires."
    : "";

  return {
    verdict: parts.join(" "),
    nextAction,
  };
}
