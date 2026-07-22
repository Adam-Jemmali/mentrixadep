import type { VerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

export type ApReadinessBandView = {
  /** Proof tier 1–5 from verified first-try accuracy — not an exam prediction. */
  score: number | null;
  label: string;
  scoreCaption: string;
  scoreSuffix: string;
  sublabel: string;
  isVerifiedPrediction: boolean;
};

export const VERIFIED_SKILL_PROOF_LABEL = "Verified skill proof";
/** @deprecated Use VERIFIED_SKILL_PROOF_LABEL */
export const AP_CALC_READINESS_LABEL = VERIFIED_SKILL_PROOF_LABEL;
/** @deprecated Use VERIFIED_SKILL_PROOF_LABEL */
export const CALC_READINESS_LABEL = VERIFIED_SKILL_PROOF_LABEL;

export const VERIFIED_SKILL_TIER_CAPTION = "From locked first tries";
/** @deprecated Use VERIFIED_SKILL_TIER_CAPTION */
export const AP_EXAM_SCORE_CAPTION = VERIFIED_SKILL_TIER_CAPTION;

export const VERIFIED_SKILL_TIER_SUFFIX = "of 5 proof tiers";

function proofTierNextAction(score: number): string {
  if (score <= 2) return "Verify a weak skill you have not tried yet.";
  if (score === 3) return "Lock more first tries on your weakest skills.";
  if (score === 4) return "Keep first tries clean on what is left.";
  return "Stay sharp on new first tries.";
}

/** Proof tier from verified first tries — separate from practice reps or exam framing. */
export function buildApReadinessBand(
  stats: VerifiedFirstAttemptRankStats,
): ApReadinessBandView {
  const base = {
    label: VERIFIED_SKILL_PROOF_LABEL,
    scoreCaption: VERIFIED_SKILL_TIER_CAPTION,
    scoreSuffix: VERIFIED_SKILL_TIER_SUFFIX,
  };

  if (stats.verifiedCount <= 0) {
    return {
      ...base,
      score: null,
      sublabel: `Try one ${AP_CALC_AB_SUBJECT} skill once. Your first answer becomes proof.`,
      isVerifiedPrediction: false,
    };
  }

  if (stats.verifiedCount < MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE) {
    const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
    return {
      ...base,
      score: null,
      sublabel: `${remaining} more first ${remaining === 1 ? "try" : "tries"} unlock your proof tier.`,
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
    ...base,
    score,
    sublabel: proofTierNextAction(score),
    isVerifiedPrediction: true,
  };
}
