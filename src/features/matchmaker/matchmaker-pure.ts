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
  impactScore: number
): { matchScore: number; matchedNodeIds: string[] } {
  const matchedNodeIds = weakNodeIds.filter((id) => breakthroughNodeIds.has(id));
  const matchScore = matchedNodeIds.length + impactScore / 100;
  return { matchScore, matchedNodeIds };
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
