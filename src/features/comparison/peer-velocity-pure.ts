export type PeerVelocitySnapshot = {
  userVerifiedThisWeek: number;
  cohortMedian: number;
  sampleSize: number;
};

const MIN_COHORT_SAMPLE = 5;

export function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function buildPeerVelocitySnapshot(input: {
  userVerifiedThisWeek: number;
  cohortCounts: number[];
}): PeerVelocitySnapshot | null {
  const activeCounts = input.cohortCounts.filter((count) => count > 0);
  if (activeCounts.length < MIN_COHORT_SAMPLE) return null;

  const cohortMedian = computeMedian(activeCounts);
  if (cohortMedian == null) return null;

  return {
    userVerifiedThisWeek: input.userVerifiedThisWeek,
    cohortMedian,
    sampleSize: activeCounts.length,
  };
}

export function formatPeerMedian(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildPeerVelocityLine(snapshot: PeerVelocitySnapshot): string {
  const median = formatPeerMedian(snapshot.cohortMedian);
  const userCount = snapshot.userVerifiedThisWeek;
  if (userCount === 0 && snapshot.cohortMedian > 0) {
    return `Active cohort averaged ${median} verified nodes this week; you have not verified a new node yet.`;
  }
  return `You verified ${userCount} node${userCount === 1 ? "" : "s"} this week; active cohort averaged ${median}.`;
}

export function buildPeerVelocityUpsellLine(): string {
  return "Momentum members see cohort velocity on every Movement Receipt.";
}
