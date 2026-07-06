import { MASTERY_STATE_LABEL } from "@/features/mastery-grid/mastery-grid-pure";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";
import type { PassportVerdict } from "@/features/rank-card/types";

export function practiceAccuracyToMasteryStateLabel(accuracyPercent: number): string {
  const value = Math.round(accuracyPercent);
  if (value >= 70) return MASTERY_STATE_LABEL.proficient;
  if (value > 0) return MASTERY_STATE_LABEL.weak;
  return MASTERY_STATE_LABEL.none;
}

export function formatPassportReceiptDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
}

export function buildPassportVerdict(params: {
  verifiedCount: number;
  percentile: number | null;
}): PassportVerdict {
  if (
    params.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE &&
    params.percentile != null
  ) {
    const topPercent = Math.max(1, Math.min(100, Math.round(100 - params.percentile)));
    return { kind: "ranked", topPercent };
  }
  if (params.verifiedCount > 0) {
    const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - params.verifiedCount;
    return {
      kind: "accumulating",
      verifiedCount: params.verifiedCount,
      remaining: Math.max(0, remaining),
    };
  }
  return { kind: "empty" };
}

export function passportVerdictPlainText(verdict: PassportVerdict): string {
  if (verdict.kind === "ranked") {
    return `Top ${verdict.topPercent} percent of everyone verified on AP Calculus AB, first attempt only, no retakes`;
  }
  if (verdict.kind === "accumulating") {
    if (verdict.remaining > 0) {
      return `${verdict.verifiedCount} skill${verdict.verifiedCount === 1 ? "" : "s"} verified on AP Calculus AB. Peer standing unlocks after ${verdict.remaining} more first attempt${verdict.remaining === 1 ? "" : "s"}.`;
    }
    return `${verdict.verifiedCount} skills verified on AP Calculus AB. Peer standing is updating.`;
  }
  return "No verified first attempts on AP Calculus AB yet.";
}
