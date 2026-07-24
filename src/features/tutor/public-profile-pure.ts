import { impactNodeScoreToState } from "@/features/guide-impact/impact-score-pure";

export type GuidePublicImpactChip = {
  skillNodeId: string;
  nodeName: string;
  subject: string;
  impactScore: number;
  studentsCounted: number;
};

/** Mastery Grid aligned chip surface: green / yellow / gray. */
export type GuideImpactChipVisual = "high" | "moderate" | "limited";

export function guideImpactChipVisual(
  impactScore: number,
  studentsCounted: number,
): GuideImpactChipVisual {
  if (studentsCounted < 3 || impactScore <= 0) return "limited";
  const state = impactNodeScoreToState(impactScore);
  if (state === "verified" || state === "proficient") return "high";
  return "moderate";
}

export const GUIDE_IMPACT_CHIP_CLASS: Record<GuideImpactChipVisual, string> = {
  high: "border-emerald-500/70 bg-emerald-400/20 text-[var(--mx-navy)]",
  moderate: "border-amber-400/70 bg-amber-300/25 text-[var(--mx-navy)]",
  limited: "border-slate-400/50 bg-slate-200/40 text-[#475569]",
};

export function guideImpactChipHoverCopy(studentsCounted: number, nodeName: string): string {
  const n = Math.max(0, Math.round(studentsCounted));
  const noun = n === 1 ? "student" : "students";
  return `${n} ${noun} improved on ${nodeName} after sessions with this Guide.`;
}

export function computeGuideShowUpRatePercent(params: {
  completed: number;
  cancelled: number;
}): number | null {
  const total = params.completed + params.cancelled;
  if (total === 0) return null;
  return Math.round((params.completed / total) * 1000) / 10;
}

export const GUIDE_PUBLIC_COPY = {
  impactHeading: "Verified teaching impact",
  portfolioHeading: "Before and after",
  bookingHeading: "Book a session",
  bookingCta: "Book a session →",
  reviewsHeading: "Session reviews",
  responseRate: (pct: number) => `${pct}% response rate`,
  showUpRate: (pct: number) => `${pct}% show-up rate`,
  ratesMuted: "Response and reliability from completed Mentrixa sessions.",
} as const;
