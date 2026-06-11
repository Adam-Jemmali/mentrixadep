/** Quest score as accuracy points for division war (SUM of percentages). */
export function questAccuracyPoints(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export type DivisionMatchCandidate = {
  id: string;
  key: string;
  name: string;
  memberCount: number;
  weeklyActivity: number;
};

/** Activity score for matchmaking — members + weekly XP earned. */
export function divisionActivityScore(memberCount: number, weeklyActivity: number): number {
  return memberCount * 10 + weeklyActivity;
}

/**
 * Pair divisions by similar size/activity (sorted, adjacent pairs).
 * Odd division out is skipped for the week.
 */
export function pairDivisionsForWar(
  divisions: DivisionMatchCandidate[],
): Array<[DivisionMatchCandidate, DivisionMatchCandidate]> {
  const sorted = [...divisions].sort((a, b) => {
    const scoreA = divisionActivityScore(a.memberCount, a.weeklyActivity);
    const scoreB = divisionActivityScore(b.memberCount, b.weeklyActivity);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.key.localeCompare(b.key);
  });

  const pairs: Array<[DivisionMatchCandidate, DivisionMatchCandidate]> = [];
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    pairs.push([sorted[i]!, sorted[i + 1]!]);
  }
  return pairs;
}

export function warProgressPercent(sidePoints: number, opponentPoints: number): number {
  const total = sidePoints + opponentPoints;
  if (total <= 0) return 50;
  return Math.round((sidePoints / total) * 100);
}

export function formatWarTimeRemaining(ms: number): string {
  if (ms <= 0) return "War ended";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return `${days}d ${remHours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${mins}m left`;
}
