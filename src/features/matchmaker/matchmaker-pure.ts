export type MatchmakerGuideResult = {
  guideId: string;
  displayName: string;
  avatarUrl: string | null;
  impactScore: number;
  matchScore: number;
  matchedNodes: string[];
  nextAvailableSlot: string | null;
};

export function computeGuideMatchScore(
  weakNodeIds: string[],
  breakthroughNodeIds: Set<string>,
  impactScore: number,
  options?: {
    retestNodeIds?: Set<string>;
    goalUrgent?: boolean;
  },
): { matchScore: number; matchedNodeIds: string[] } {
  const matchedNodeIds = weakNodeIds.filter((id) => breakthroughNodeIds.has(id));
  const retestBoost =
    options?.retestNodeIds != null
      ? weakNodeIds.filter((id) => options.retestNodeIds!.has(id)).length * 0.5
      : 0;
  const goalBoost = options?.goalUrgent ? 0.25 : 0;
  const matchScore = matchedNodeIds.length + impactScore / 100 + retestBoost + goalBoost;
  return { matchScore, matchedNodeIds };
}

export function formatMatchmakerVerdict(matchedCount: number, retestMatched: number): string | null {
  if (matchedCount <= 0) return null;
  if (retestMatched > 0) {
    return `Highest impact on ${retestMatched} of your due retest nodes.`;
  }
  return formatMatchedSkillsLine(matchedCount);
}

export function formatMatchedSkillsLine(matchedCount: number): string | null {
  if (matchedCount <= 0) return null;
  const noun = matchedCount === 1 ? "skill" : "skills";
  return `Matched on your ${matchedCount} weakest AP Calculus AB ${noun}`;
}

export function rankMatchmakerGuides(
  rows: Array<{
    guideId: string;
    displayName: string;
    avatarUrl: string | null;
    impactScore: number;
    matchScore: number;
    matchedNodeNames: string[];
    nextAvailableSlot: string | null;
  }>,
  limit = 3
): MatchmakerGuideResult[] {
  return rows
    .sort((a, b) => b.matchScore - a.matchScore || b.impactScore - a.impactScore)
    .slice(0, limit)
    .map((row) => ({
      guideId: row.guideId,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      impactScore: row.impactScore,
      matchScore: row.matchScore,
      matchedNodes: row.matchedNodeNames,
      nextAvailableSlot: row.nextAvailableSlot,
    }));
}
