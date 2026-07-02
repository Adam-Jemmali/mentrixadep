export type GuideRematchBadge = {
  guideId: string;
  nodeName: string;
  ratePercent: number;
  label: string;
};

export function buildGuideRematchBadgeLabel(ratePercent: number, nodeName: string): string | null {
  if (ratePercent < 50 || !nodeName.trim()) return null;
  return `Moved ${Math.round(ratePercent)}% of students on ${nodeName.trim()}`;
}

export function pickBestRematchBadge(
  rows: Array<{
    guideId: string;
    nodeName: string;
    ratePercent: number;
    matchesStudentNode: boolean;
  }>,
): GuideRematchBadge | null {
  const eligible = rows.filter((row) => row.ratePercent >= 50 && row.matchesStudentNode);
  const pool = eligible.length > 0 ? eligible : rows.filter((row) => row.ratePercent >= 50);
  if (pool.length === 0) return null;

  const best = pool.sort((a, b) => b.ratePercent - a.ratePercent)[0]!;
  const label = buildGuideRematchBadgeLabel(best.ratePercent, best.nodeName);
  if (!label) return null;

  return {
    guideId: best.guideId,
    nodeName: best.nodeName,
    ratePercent: best.ratePercent,
    label,
  };
}
