/**
 * Plain-language wrappers for verified rank statistics.
 *
 * Accuracy: correct first tries ÷ verified skills × 100 (same as Postgres cache).
 * Peer standing: CUME_DIST(first-try accuracy) across eligible Mentrixers (≥5 skills).
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

/** Share of eligible Mentrixers at or below your first-try accuracy (CUME_DIST × 100). */
export function peerBeatCount(cumeDistPercentile: number): number {
  return Math.round(Math.max(0, Math.min(100, cumeDistPercentile)));
}

/** Top X% of the eligible cohort (inverse of beat count). */
export function peerTopPercent(cumeDistPercentile: number): number {
  return Math.max(1, Math.min(100, Math.round(100 - cumeDistPercentile)));
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

/** Full peer-standing sentence — real cohort statistics, not random scores. */
export function explainPeerStanding(cumeDistPercentile: number): string {
  const beat = peerBeatCount(cumeDistPercentile);
  const top = peerTopPercent(cumeDistPercentile);
  return `You beat ${beat} out of every 100 Mentrixers on first-answer accuracy. Top ${top}%. Counted from everyone with ${MIN_VERIFIED_SKILLS_FOR_PEER_STANDING}+ verified skills.`;
}

export function formatPeerStandingShort(cumeDistPercentile: number): string {
  return `Top ${peerTopPercent(cumeDistPercentile)}%`;
}

export function formatPeerStandingRow(cumeDistPercentile: number): string {
  const beat = peerBeatCount(cumeDistPercentile);
  return `Beat ${beat}/100 · top ${peerTopPercent(cumeDistPercentile)}%`;
}

export function peerStandingLockedLabel(minSkills = MIN_VERIFIED_SKILLS_FOR_PEER_STANDING): string {
  return `Unlocks at ${minSkills} verified`;
}
