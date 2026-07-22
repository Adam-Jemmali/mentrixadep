import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import type { VerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";
import {
  estimateCorrectFirstAttempts,
  formatPeerStandingWithCohort,
  MIN_VERIFIED_SKILLS_FOR_PEER_STANDING,
  peerAheadCount,
} from "@/features/xp/rank-statistics-pure";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { formatFirstTryAccuracyFormula } from "@/shared/core/copy-format";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export type StudentHomeAccuracyFraction = {
  correct: number;
  total: number;
  percent: number;
};

export type StudentHomeVerdictMetric = {
  icon: VocabIconName;
  label: string;
  value: string;
  detail: string;
  gold?: boolean;
  watermark: string | number;
  numericEnd: number;
  numericSuffix?: string;
  displayValue?: string;
};

export type StudentHomeVerdictView = {
  headline: string;
  accuracyFraction?: StudentHomeAccuracyFraction;
  accuracyDetail?: string;
  peerSummary?: string;
  metrics: StudentHomeVerdictMetric[];
  cta: { label: string; href: string };
};

function defaultCta(): { label: string; href: string } {
  return { label: "Open Quest", href: "/student/quest" };
}

/** Checkable first-try accuracy line from cached verified_first_attempts stats. */
export function formatStudentHomeAccuracyMath(
  verifiedCount: number,
  accuracyPercent: number,
): { correct: number; headline: string; detail: string; value: string } {
  const correct = estimateCorrectFirstAttempts(accuracyPercent, verifiedCount);
  const formula = formatFirstTryAccuracyFormula(correct, verifiedCount, accuracyPercent);
  const skillWord = verifiedCount === 1 ? "skill" : "skills";
  return {
    correct,
    headline: `${correct} right on ${verifiedCount} first ${skillWord} in ${AP_CALC_AB_SUBJECT}`,
    detail: `${correct} right out of ${verifiedCount} ${skillWord}. Each first try is permanent.`,
    value: formula,
  };
}

/** Peer standing from real cohort size — never invent 100 Mentrixers. */
export function formatStudentHomePeerMetric(
  percentile: number,
  verifiedCount: number,
  cohortSize: number | null,
): { label: string; value: string; detail: string } {
  const peer = formatPeerStandingWithCohort(
    percentile,
    cohortSize ?? 0,
    verifiedCount,
  );
  return {
    label: "Peer rank",
    value: peer.value,
    detail: peer.detail,
  };
}

export function buildStudentHomePeerSummary(
  stats: VerifiedFirstAttemptRankStats,
): string | undefined {
  if (
    stats.verifiedCount < MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE ||
    stats.percentile == null
  ) {
    const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
    if (remaining > 0) {
      return `${remaining} more first ${remaining === 1 ? "try" : "tries"} unlock peer rank`;
    }
    return undefined;
  }

  const cohortSize = stats.eligibleCohortSize ?? 0;
  if (cohortSize <= 0) {
    return "Peer pool is still forming among Mentrixers with 5+ first tries";
  }

  const ahead = peerAheadCount(stats.percentile, cohortSize);
  if (cohortSize === 1) {
    return "You are the only Mentrixer in the peer pool so far";
  }

  return `${ahead} of ${cohortSize} Mentrixers ahead on first-try accuracy`;
}

/**
 * Home hero copy from one source of truth (rankStats RPC / rank cache).
 * Never invent percentages — always show the division behind the %.
 */
export function buildStudentHomeVerdictHero(
  stats: VerifiedFirstAttemptRankStats,
  nextAction?: Verdict["nextAction"] | null,
): StudentHomeVerdictView {
  const cta = nextAction ?? defaultCta();

  if (stats.verifiedCount <= 0) {
    return {
      headline: `Try one ${AP_CALC_AB_SUBJECT} skill once to start your verified rank.`,
      metrics: [],
      cta,
    };
  }

  const accuracy = formatStudentHomeAccuracyMath(stats.verifiedCount, stats.accuracyPercent);
  const accuracyFraction: StudentHomeAccuracyFraction = {
    correct: accuracy.correct,
    total: stats.verifiedCount,
    percent: stats.accuracyPercent,
  };

  const metrics: StudentHomeVerdictMetric[] = [
    {
      icon: "verified",
      label: "First-try accuracy",
      value: accuracy.value,
      displayValue: accuracy.value,
      detail: accuracy.detail,
      gold: stats.accuracyPercent >= 70,
      watermark: stats.verifiedCount,
      numericEnd: accuracy.correct,
      numericSuffix: `/${stats.verifiedCount}`,
    },
  ];

  const peerEligible =
    stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE && stats.percentile != null;

  if (peerEligible) {
    const cohortSize = stats.eligibleCohortSize ?? 0;
    const ahead = peerAheadCount(stats.percentile!, cohortSize);
    const peer = formatStudentHomePeerMetric(
      stats.percentile!,
      stats.verifiedCount,
      stats.eligibleCohortSize,
    );
    metrics.push({
      icon: "percentile",
      label: peer.label,
      value: peer.value,
      displayValue: peer.value,
      detail: peer.detail,
      gold: cohortSize > 0 && ahead >= Math.max(1, Math.floor(cohortSize * 0.9)),
      watermark: ahead,
      numericEnd: ahead,
      numericSuffix: cohortSize > 0 ? `/${cohortSize}` : "",
    });

    return {
      headline: accuracy.headline,
      accuracyFraction,
      accuracyDetail: accuracy.detail,
      peerSummary: buildStudentHomePeerSummary(stats),
      metrics,
      cta,
    };
  }

  const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
  if (remaining > 0) {
    return {
      headline: accuracy.headline,
      accuracyFraction,
      accuracyDetail: accuracy.detail,
      peerSummary: buildStudentHomePeerSummary(stats),
      metrics: [
        ...metrics,
        {
          icon: "rank-proof",
          label: "Peer rank",
          value: `${remaining} to go`,
          displayValue: `${remaining} to go`,
          detail: `${remaining} more first ${remaining === 1 ? "try" : "tries"} unlock peer rank among Mentrixers with ${MIN_VERIFIED_SKILLS_FOR_PEER_STANDING}+ first tries`,
          watermark: remaining,
          numericEnd: remaining,
        },
      ],
      cta,
    };
  }

  return {
    headline: accuracy.headline,
    accuracyFraction,
    accuracyDetail: accuracy.detail,
    metrics,
    cta,
  };
}
