export type GuideImpactEntry = {
  subject: string;
  impactScore: number;
  sessionsCounted: number;
};

export type GuideImpactNodeEntry = {
  skillNodeId: string;
  nodeName: string;
  subject: string;
  impactScore: number;
  studentsCounted: number;
  afterAccuracy: number;
  beforeAccuracy: number;
  impactLift: number;
};

/** Top node chips for guide browse — sourced from guide_node_impact_rolling. */
export type GuideImpactRollingNodeChip = {
  skillNodeId: string;
  nodeName: string;
  impactScore: number;
  sessionsCounted: number;
};

export type GuideNodeImpactRollingBatch = {
  topChipsByGuideId: Record<string, GuideImpactRollingNodeChip[]>;
  impactByGuideAndNode: Record<string, Record<string, number>>;
  avgImpactByGuideId: Record<string, number>;
};

/** Matches Mastery Grid node color states. */
export type ImpactNodeColorState = "none" | "weak" | "proficient" | "verified";

export function impactNodeScoreToState(score: number): ImpactNodeColorState {
  if (score >= 85) return "verified";
  if (score >= 70) return "proficient";
  if (score > 0) return "weak";
  return "none";
}

export const IMPACT_NODE_STATE_CLASS: Record<ImpactNodeColorState, string> = {
  none: "border-slate-300/80 bg-slate-100 text-slate-600",
  weak: "border-amber-300/80 bg-amber-100 text-amber-950",
  proficient: "border-emerald-300/80 bg-emerald-100 text-emerald-950",
  verified: "border-[#D4A017]/90 bg-[#D4A017]/15 text-[#0B1220]",
};

export const IMPACT_NODE_SCORE_CLASS: Record<ImpactNodeColorState, string> = {
  none: "text-slate-600",
  weak: "text-amber-900",
  proficient: "text-emerald-900",
  verified: "text-[#D4A017]",
};

export type ImpactColorTier = "green" | "yellow" | "gray";

export function impactScoreColorTier(score: number): ImpactColorTier {
  const state = impactNodeScoreToState(score);
  if (state === "verified" || state === "proficient") return "green";
  if (state === "weak") return "yellow";
  return "gray";
}

export function formatImpactScoreLabel(score: number): string {
  return `${Math.round(score)}/100 Impact Score`;
}

export function formatImpactNodeChipLabel(nodeName: string, score: number): string {
  return `${nodeName}. ${Math.round(score)}`;
}

export function formatImpactScoreVerdict(
  score: number,
  sessionsCounted: number,
  subject?: string,
): string {
  const subjectPart = subject ? ` in ${subject}` : "";
  return `Students improved first-answer accuracy on ${Math.round(score)}% of post-session skill checks${subjectPart} — based on ${sessionsCounted} completed sessions.`;
}

export function formatImpactNodeVerdict(entry: GuideImpactNodeEntry): string {
  return `${entry.nodeName}: ${Math.round(entry.afterAccuracy)}% first-answer accuracy after sessions, vs ${Math.round(entry.beforeAccuracy)}% before, across ${entry.studentsCounted} students.`;
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

export function sortImpactNodesByLift(entries: GuideImpactNodeEntry[]): GuideImpactNodeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.impactLift !== a.impactLift) return b.impactLift - a.impactLift;
    return b.impactScore - a.impactScore;
  });
}

export function pickTopImpactRollingChips(
  chips: GuideImpactRollingNodeChip[],
  limit = 3,
): GuideImpactRollingNodeChip[] {
  return [...chips].sort((a, b) => b.impactScore - a.impactScore).slice(0, limit);
}

export function averageImpactRollingScore(chips: GuideImpactRollingNodeChip[]): number | null {
  if (chips.length === 0) return null;
  const total = chips.reduce((sum, chip) => sum + chip.impactScore, 0);
  return Math.round(total / chips.length);
}

export function guideImpactOnSkillNode(
  impactByGuideAndNode: Record<string, Record<string, number>>,
  guideId: string,
  skillNodeId: string,
): number | null {
  const score = impactByGuideAndNode[guideId]?.[skillNodeId];
  return score == null ? null : score;
}
