import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import type { VerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";
import {
  estimateCorrectFirstAttempts,
  peerBeatCount,
  peerTopPercent,
} from "@/features/xp/rank-statistics-pure";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export type StudentHomeVerdictMetric = {
  icon: VocabIconName;
  label: string;
  value: string;
  detail: string;
  gold?: boolean;
};

export type StudentHomeVerdictView = {
  /** Playfair rank-reveal line — always grounded in rankStats math. */
  headline: string;
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
  const skillWord = verifiedCount === 1 ? "skill" : "skills";
  return {
    correct,
    headline: `${correct} right on ${verifiedCount} first ${skillWord} = ${accuracyPercent}%`,
    detail: `${correct} ÷ ${verifiedCount} × 100 = ${accuracyPercent}%`,
    value: `${correct}/${verifiedCount}`,
  };
}

/** Peer standing only when cohort rules are met — beat count, not vague hype. */
export function formatStudentHomePeerMetric(
  percentile: number,
): { label: string; value: string; detail: string } {
  const beat = peerBeatCount(percentile);
  const top = peerTopPercent(percentile);
  return {
    label: "Peer standing",
    value: `Beat ${beat}/100`,
    detail: `Top ${top}% of Mentrixers with 5+ verified skills`,
  };
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
      headline: "Try a skill once to start your verified rank.",
      metrics: [],
      cta,
    };
  }

  const accuracy = formatStudentHomeAccuracyMath(stats.verifiedCount, stats.accuracyPercent);
  const metrics: StudentHomeVerdictMetric[] = [
    {
      icon: "verified",
      label: "First tries",
      value: accuracy.value,
      detail: accuracy.detail,
      gold: stats.accuracyPercent >= 70,
    },
  ];

  const peerEligible =
    stats.verifiedCount >= MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE && stats.percentile != null;

  if (peerEligible) {
    const peer = formatStudentHomePeerMetric(stats.percentile!);
    metrics.push({
      icon: "percentile",
      label: peer.label,
      value: peer.value,
      detail: peer.detail,
      gold: peerBeatCount(stats.percentile!) >= 90,
    });
    return {
      headline: `${accuracy.headline} · ${peer.value} Mentrixers`,
      metrics,
      cta,
    };
  }

  const remaining = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE - stats.verifiedCount;
  if (remaining > 0) {
    return {
      headline: accuracy.headline,
      metrics: [
        ...metrics,
        {
          icon: "rank-proof",
          label: "Peer standing",
          value: `${remaining} to go`,
          detail: `${remaining} more first ${remaining === 1 ? "try" : "tries"} unlock peer rank`,
        },
      ],
      cta,
    };
  }

  return {
    headline: accuracy.headline,
    metrics,
    cta,
  };
}
