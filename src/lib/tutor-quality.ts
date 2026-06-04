/**
 * Tutor quality score — composite metric displayed on public profiles.
 *
 * Components (weighted):
 * - Average rating (40%): normalized to 0-100 from 1-5 scale
 * - Sessions completed (25%): log-scaled, caps at 100 sessions
 * - Response rate (20%): approved / (approved + rejected) session requests
 * - Low cancellation (15%): (1 - cancellationRate) * 100
 *
 * Score range: 0-100, displayed as a percentage.
 */

export interface TutorQualityInput {
  avgRating: number | null;
  ratingCount: number;
  sessionsCompleted: number;
  sessionsApproved: number;
  sessionsRejected: number;
  sessionsCancelled: number;
}

export interface TutorQualityScore {
  overall: number;
  breakdown: {
    rating: number;
    experience: number;
    responseRate: number;
    reliability: number;
  };
  badge: "new" | "rising" | "trusted" | "expert";
}

export function computeTutorQualityScore(input: TutorQualityInput): TutorQualityScore {
  const ratingScore =
    input.avgRating != null && input.ratingCount >= 3
      ? ((input.avgRating - 1) / 4) * 100
      : 50;

  const experienceScore = Math.min(100, (Math.log10(Math.max(1, input.sessionsCompleted)) / Math.log10(100)) * 100);

  const totalRequests = input.sessionsApproved + input.sessionsRejected;
  const responseRate = totalRequests > 0 ? (input.sessionsApproved / totalRequests) * 100 : 70;

  const totalForCancellation = input.sessionsCompleted + input.sessionsCancelled;
  const cancellationRate =
    totalForCancellation > 0 ? input.sessionsCancelled / totalForCancellation : 0;
  const reliabilityScore = (1 - cancellationRate) * 100;

  const overall = Math.round(
    ratingScore * 0.4 +
    experienceScore * 0.25 +
    responseRate * 0.2 +
    reliabilityScore * 0.15
  );

  let badge: TutorQualityScore["badge"];
  if (input.sessionsCompleted < 5) {
    badge = "new";
  } else if (overall >= 85) {
    badge = "expert";
  } else if (overall >= 65) {
    badge = "trusted";
  } else {
    badge = "rising";
  }

  return {
    overall: Math.max(0, Math.min(100, overall)),
    breakdown: {
      rating: Math.round(ratingScore),
      experience: Math.round(experienceScore),
      responseRate: Math.round(responseRate),
      reliability: Math.round(reliabilityScore),
    },
    badge,
  };
}

const BADGE_LABELS: Record<TutorQualityScore["badge"], string> = {
  new: "New Guide",
  rising: "Rising Guide",
  trusted: "Trusted Guide",
  expert: "Expert Guide",
};

const BADGE_COLORS: Record<TutorQualityScore["badge"], string> = {
  new: "bg-slate-100 text-slate-600",
  rising: "bg-blue-50 text-blue-700",
  trusted: "bg-green-50 text-green-700",
  expert: "bg-purple-50 text-purple-700",
};

export function getBadgeLabel(badge: TutorQualityScore["badge"]): string {
  return BADGE_LABELS[badge];
}

export function getBadgeColorClass(badge: TutorQualityScore["badge"]): string {
  return BADGE_COLORS[badge];
}
