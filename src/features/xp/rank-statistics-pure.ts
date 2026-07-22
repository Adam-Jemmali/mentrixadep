/**
 * Plain-language wrappers for verified rank statistics.
 *
 * Accuracy: correct first tries ÷ verified skills × 100 (same as Postgres cache).
 * Peer standing: PERCENT_RANK(first-try accuracy) across eligible Mentrixers (≥5 skills).
 */

/** Minimum verified skills before peer standing is published. */
export const MIN_VERIFIED_SKILLS_FOR_PEER_STANDING = 5;

/** Reconstruct correct count from rounded accuracy — mirrors ap_calc_verified_rank_cache. */
export function estimateCorrectFirstAttempts(
  accuracyPercent: number,
  verifiedCount: number,
): number {
  if (verifiedCount <= 0) return 0;
  const clamped = Math.max(0, Math.min(100, accuracyPercent));
  return Math.round((clamped / 100) * verifiedCount);
}

/** Percentile rank on the 0–100 scale from Postgres. */
export function peerBeatCount(cumeDistPercentile: number): number {
  return Math.round(Math.max(0, Math.min(100, cumeDistPercentile)));
}

/** Top X% of the eligible cohort (inverse of beat count). */
export function peerTopPercent(cumeDistPercentile: number): number {
  return Math.max(1, Math.min(100, Math.round(100 - cumeDistPercentile)));
}

/** Head count ahead of you in the real eligible cohort — never invent 100. */
export function peerAheadCount(percentile: number, cohortSize: number): number {
  if (cohortSize <= 0) return 0;
  return Math.min(cohortSize, Math.max(0, Math.round((peerBeatCount(percentile) / 100) * cohortSize)));
}

/** One-line accuracy math a student can check by hand. */
export function explainFirstAttemptAccuracy(
  verifiedCount: number,
  accuracyPercent: number,
): string {
  if (verifiedCount <= 0) {
    return "No first answers yet.";
  }
  const correct = estimateCorrectFirstAttempts(accuracyPercent, verifiedCount);
  return `${correct} right out of ${verifiedCount} first answers. ${correct} ÷ ${verifiedCount} × 100 = ${accuracyPercent}%.`;
}

export function formatPeerStandingWithCohort(
  percentile: number,
  cohortSize: number,
  verifiedCount: number,
): { value: string; detail: string } {
  const poolMin = MIN_VERIFIED_SKILLS_FOR_PEER_STANDING;
  const ahead = peerAheadCount(percentile, cohortSize);

  if (cohortSize <= 0) {
    return {
      value: "Pool forming",
      detail: `Peer rank compares Mentrixers with ${poolMin}+ first tries. The pool is still building.`,
    };
  }

  if (cohortSize === 1) {
    return {
      value: "1 in the pool",
      detail: `You are the only Mentrixer with ${poolMin}+ first tries so far. You have ${verifiedCount}.`,
    };
  }

  const topLine =
    peerBeatCount(percentile) >= 50
      ? ` Top ${peerTopPercent(percentile)}% of that pool.`
      : "";

  return {
    value: `${ahead} of ${cohortSize} Mentrixers`,
    detail: `Ahead of ${ahead} of ${cohortSize} Mentrixers with ${poolMin}+ first tries.${topLine} You have ${verifiedCount}.`,
  };
}

/** Full peer-standing sentence — real cohort statistics, not random scores. */
export function explainPeerStanding(
  cumeDistPercentile: number,
  cohortSize?: number | null,
  verifiedCount?: number,
): string {
  if (cohortSize != null && cohortSize > 0 && verifiedCount != null) {
    return formatPeerStandingWithCohort(cumeDistPercentile, cohortSize, verifiedCount).detail;
  }

  const beat = peerBeatCount(cumeDistPercentile);
  const poolMin = MIN_VERIFIED_SKILLS_FOR_PEER_STANDING;
  if (beat <= 0) {
    return `At the bottom of eligible Mentrixers on first-try accuracy. Pool: ${poolMin}+ first tries.`;
  }
  const topLine = beat >= 50 ? ` Top ${peerTopPercent(cumeDistPercentile)}%.` : "";
  return `Ahead on first-try accuracy.${topLine} Pool: ${poolMin}+ first tries.`;
}

export function formatPeerStandingShort(
  cumeDistPercentile: number,
  cohortSize?: number | null,
): string {
  if (cohortSize != null && cohortSize > 0) {
    return `${peerAheadCount(cumeDistPercentile, cohortSize)} of ${cohortSize}`;
  }
  const beat = peerBeatCount(cumeDistPercentile);
  if (beat <= 0) return "Bottom of pool";
  if (beat >= 50) return `Top ${peerTopPercent(cumeDistPercentile)}%`;
  return `Top ${peerTopPercent(cumeDistPercentile)}%`;
}

export function formatPeerStandingRow(
  cumeDistPercentile: number,
  cohortSize?: number | null,
): string {
  if (cohortSize != null && cohortSize > 0) {
    const ahead = peerAheadCount(cumeDistPercentile, cohortSize);
    return `${ahead} of ${cohortSize} Mentrixers. top ${peerTopPercent(cumeDistPercentile)}%`;
  }
  return `Top ${peerTopPercent(cumeDistPercentile)}% of eligible Mentrixers`;
}

export function peerStandingLockedLabel(minSkills = MIN_VERIFIED_SKILLS_FOR_PEER_STANDING): string {
  return `Unlocks at ${minSkills} verified`;
}
