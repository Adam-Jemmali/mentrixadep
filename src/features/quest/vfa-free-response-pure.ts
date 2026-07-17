/** Verified First Attempt helpers for constructed answers. Never show weights in UI. */

export const FREE_RESPONSE_ROLLING_WEIGHT = 1.5;

export type VfaAttemptFormat = "mcq" | "free_response" | "multi_part_part";

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

export function vfaRollingPoints(accuracyPct: number, attemptFormat: VfaAttemptFormat): number {
  const base = Math.max(0, Math.min(1, accuracyPct)) * 100;
  if (attemptFormat === "free_response" || attemptFormat === "multi_part_part") {
    return base * FREE_RESPONSE_ROLLING_WEIGHT;
  }
  return base;
}

export function vfaRollingWeightIncrement(attemptFormat: VfaAttemptFormat): number {
  if (attemptFormat === "free_response" || attemptFormat === "multi_part_part") {
    return FREE_RESPONSE_ROLLING_WEIGHT;
  }
  return 1;
}

export function vfaGradingKey(partKey?: string | null): string {
  return (partKey ?? "").trim();
}
