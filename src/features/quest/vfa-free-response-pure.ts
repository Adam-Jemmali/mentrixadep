/** Verified First Attempt helpers for constructed answers. Never show weights in UI. */

export const FREE_RESPONSE_ROLLING_WEIGHT = 1.5;

export type VfaAttemptFormat =
  | "mcq"
  | "free_response"
  | "multi_part_part"
  | "complete_expression"
  | "drag_order"
  | "graph_feature";

export function vfaAccuracyPct(input: {
  correct: boolean;
  partialCreditFraction?: number | null;
}): number {
  if (input.correct) return 1;
  const partial = input.partialCreditFraction;
  if (partial != null && partial > 0 && partial < 1) return partial;
  return 0;
}

export function vfaIsCorrectFromAccuracy(accuracyPct: number): boolean {
  return accuracyPct >= 1;
}

const FR_FAMILY: ReadonlySet<VfaAttemptFormat> = new Set([
  "free_response",
  "multi_part_part",
  "complete_expression",
  "drag_order",
  "graph_feature",
]);

export function vfaRollingPoints(accuracyPct: number, attemptFormat: VfaAttemptFormat): number {
  const base = Math.max(0, Math.min(1, accuracyPct)) * 100;
  if (FR_FAMILY.has(attemptFormat)) {
    return base * FREE_RESPONSE_ROLLING_WEIGHT;
  }
  return base;
}

export function vfaRollingWeightIncrement(attemptFormat: VfaAttemptFormat): number {
  if (FR_FAMILY.has(attemptFormat)) {
    return FREE_RESPONSE_ROLLING_WEIGHT;
  }
  return 1;
}

export function vfaGradingKey(partKey?: string | null): string {
  return (partKey ?? "").trim();
}
