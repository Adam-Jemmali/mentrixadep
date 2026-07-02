export type GuideRankKey =
  | "practitioner"
  | "specialist"
  | "expert"
  | "master"
  | "elite";

export type GuideRankDefinition = {
  key: GuideRankKey;
  label: string;
  minSessions: number;
  minImpactScore: number | null;
  topPercentile: boolean;
  color: string;
  iconSrc: string;
  badgeClass: string;
};

/** Square crop centered on emblem (matches all Guide rank SVG root viewBox). */
export const GUIDE_RANK_SVG_VIEWBOX = "210 25 260 260";

export const GUIDE_RANKS: GuideRankDefinition[] = [
  {
    key: "practitioner",
    label: "PRACTITIONER",
    minSessions: 5,
    minImpactScore: null,
    topPercentile: false,
    color: "#64748B",
    iconSrc: "/icons/guide-ranks/practitioner.svg",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    key: "specialist",
    label: "SPECIALIST",
    minSessions: 20,
    minImpactScore: 70,
    topPercentile: false,
    color: "#2563EB",
    iconSrc: "/icons/guide-ranks/specialist.svg",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    key: "expert",
    label: "EXPERT",
    minSessions: 50,
    minImpactScore: 80,
    topPercentile: false,
    color: "#4F46E5",
    iconSrc: "/icons/guide-ranks/expert.svg",
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
  },
  {
    key: "master",
    label: "MASTER",
    minSessions: 100,
    minImpactScore: 90,
    topPercentile: false,
    color: "#7C3AED",
    iconSrc: "/icons/guide-ranks/master.svg",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-900",
  },
  {
    key: "elite",
    label: "ELITE",
    minSessions: 200,
    minImpactScore: null,
    topPercentile: true,
    color: "#D4A017",
    iconSrc: "/icons/guide-ranks/elite.svg",
    badgeClass: "border-amber-300/80 bg-amber-50 text-amber-950 ring-1 ring-amber-200/60",
  },
];

export function getGuideRankDefinition(key: string): GuideRankDefinition {
  return GUIDE_RANKS.find((r) => r.key === key) ?? GUIDE_RANKS[0]!;
}
