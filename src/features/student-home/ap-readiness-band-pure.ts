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

function apExamOutlookNextAction(score: number): string {
  if (score <= 2) return "Pick a weak skill and try it for the first time.";
  if (score === 3) return "Push your weakest skills to move this up.";
  if (score === 4) return "Stay sharp on first tries for what's left.";
  return "Keep first tries clean on new skills.";
}

/** Plain-language copy for the AP score outlook pill — readable by a 13-year-old. */
export function buildApReadinessBand(
  stats: VerifiedFirstAttemptRankStats,
): ApReadinessBandView {
  if (stats.verifiedCount <= 0) {
    return {
      score: null,
      label: "AP score outlook",
      sublabel: "Try a skill once. Your first answer starts the guess.",
      isVerifiedPrediction: false,
    };
  }

  if (stats.verifiedCount < MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE) {
    const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
    return {
      score: null,
      label: "AP score outlook",
      sublabel: `${remaining} more first ${remaining === 1 ? "try" : "tries"} until we can guess your AP score.`,
      isVerifiedPrediction: false,
    };
  }

  const accuracy = stats.accuracyPercent;
  let score = 1;
  if (accuracy >= 92) score = 5;
  else if (accuracy >= 82) score = 4;
  else if (accuracy >= 72) score = 3;
  else if (accuracy >= 58) score = 2;

  const skillWord = stats.verifiedCount === 1 ? "skill" : "skills";

  return {
    score,
    label: "AP score if the exam were today",
    sublabel: `${accuracy}% right on first try across ${stats.verifiedCount} ${skillWord}. Outlook ${score}/5. ${apExamOutlookNextAction(score)}`,
    isVerifiedPrediction: true,
  };
}
