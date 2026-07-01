export const MIN_PEER_COMPARISON_SAMPLE = 10;

export type AccuracyBucketRow = {
  accuracyBucket: number;
  userCount: number;
};

export type ComparisonActorKind = "student" | "guide";

export function accuracyToPercentileBucket(accuracy: number): number {
  if (!Number.isFinite(accuracy)) return 0;
  if (accuracy >= 100) return 90;
  if (accuracy < 0) return 0;
  return Math.min(90, Math.floor(accuracy / 10) * 10);
}

export function computeBetterThanPercent(
  actorAccuracy: number,
  buckets: AccuracyBucketRow[],
  minSampleSize = MIN_PEER_COMPARISON_SAMPLE,
): number | null {
  const total = buckets.reduce((sum, row) => sum + row.userCount, 0);
  if (total < minSampleSize) return null;

  const actorBucket = accuracyToPercentileBucket(actorAccuracy);
  const below = buckets
    .filter((row) => row.accuracyBucket < actorBucket)
    .reduce((sum, row) => sum + row.userCount, 0);

  return Math.round((below * 100) / total);
}

export function buildComparisonSentence(
  betterThanPercent: number,
  actorKind: ComparisonActorKind,
): string {
  const value = Math.round(Math.max(0, Math.min(100, betterThanPercent)));
  if (actorKind === "guide") {
    return `Better than ${value}% of Guides teaching this node.`;
  }
  return `Better than ${value}% of everyone verified on this node.`;
}
