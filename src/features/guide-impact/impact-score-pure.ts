export type GuideImpactEntry = {
  subject: string;
  impactScore: number;
  sessionsCounted: number;
};

export type ImpactColorTier = "green" | "yellow" | "gray";

export function impactScoreColorTier(score: number): ImpactColorTier {
  if (score > 80) return "green";
  if (score >= 60) return "yellow";
  return "gray";
}

export function formatImpactScoreLabel(score: number): string {
  return `${Math.round(score)}/100 Impact Score`;
}

export function subjectsMatch(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/** Best matching impact row for a subject or concept needle. Concept match wins over broad subject. */
export function pickImpactForSubject(
  entries: GuideImpactEntry[],
  subjectNeedle: string,
  conceptNeedle = "",
): GuideImpactEntry | null {
  if (entries.length === 0) return null;

  const concept = conceptNeedle.trim();
  if (concept) {
    const conceptLower = concept.toLowerCase();
    const byConcept = entries
      .filter(
        (e) =>
          subjectsMatch(e.subject, concept) ||
          conceptLower.includes(e.subject.toLowerCase()) ||
          e.subject.toLowerCase().includes(conceptLower),
      )
      .sort((a, b) => b.impactScore - a.impactScore);
    if (byConcept[0]) return byConcept[0];
  }

  const bySubject = entries
    .filter((e) => subjectsMatch(e.subject, subjectNeedle))
    .sort((a, b) => b.impactScore - a.impactScore);
  if (bySubject[0]) return bySubject[0];

  return entries.reduce((top, cur) => (cur.impactScore > top.impactScore ? cur : top));
}

/** Impact for browse when a course filter is active — exact subject match preferred. */
export function impactForCourseFilter(
  entries: GuideImpactEntry[],
  courseFilter: string,
): GuideImpactEntry | null {
  if (courseFilter === "all" || entries.length === 0) return null;
  const exact = entries.find((e) => subjectsMatch(e.subject, courseFilter));
  if (exact) return exact;
  return pickImpactForSubject(entries, courseFilter);
}

export const IMPACT_SCORE_TIER_CLASS: Record<ImpactColorTier, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  yellow: "border-amber-200 bg-amber-50 text-amber-900",
  gray: "border-slate-200 bg-slate-50 text-slate-600",
};
