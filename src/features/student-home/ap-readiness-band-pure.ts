import type { VerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

export type ApReadinessBandView = {
  /** Predicted AP score band 1–5 when enough verified evidence exists. */
  score: number | null;
  label: string;
  sublabel: string;
  /** True when band uses verified first-attempt evidence (gold eligible). */
  isVerifiedPrediction: boolean;
};

export function buildApReadinessBand(
  stats: VerifiedFirstAttemptRankStats,
): ApReadinessBandView {
  if (stats.verifiedCount <= 0) {
    return {
      score: null,
      label: "AP readiness building",
      sublabel: "Your first verified answer unlocks the band.",
      isVerifiedPrediction: false,
    };
  }

  if (stats.verifiedCount < MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE) {
    const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
    return {
      score: null,
      label: "AP readiness forming",
      sublabel: `${remaining} more verified node${remaining === 1 ? "" : "s"} for a scored band.`,
      isVerifiedPrediction: false,
    };
  }

  const accuracy = stats.accuracyPercent;
  let score = 1;
  if (accuracy >= 92) score = 5;
  else if (accuracy >= 82) score = 4;
  else if (accuracy >= 72) score = 3;
  else if (accuracy >= 58) score = 2;

  return {
    score,
    label: `AP ${score} readiness band`,
    sublabel: `${accuracy}% verified first-attempt accuracy across ${stats.verifiedCount} nodes.`,
    isVerifiedPrediction: true,
  };
}
