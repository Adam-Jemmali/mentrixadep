/** Retest notification card tone and styling. Brief copy. No hyphens as bullets. */

export type RetestNotificationTone = "gain" | "warn" | "neutral";

export const NOTIFICATION_CARD_COPY = {
  viewStudent: "View student",
  dismiss: "Dismiss",
} as const;

export const NOTIFICATION_CARD_DISMISS_MS = 8000;

export function resolveRetestNotificationTone(delta: number): RetestNotificationTone {
  if (delta >= 10) return "gain";
  if (delta < 0) return "warn";
  return "neutral";
}

export function notificationCardSurfaceClass(tone: RetestNotificationTone): string {
  switch (tone) {
    case "gain":
      return "border-l-[3px] border-l-emerald-500 bg-emerald-50/90 text-emerald-950";
    case "warn":
      return "border-l-[3px] border-l-orange-500 bg-orange-50/90 text-[#0B1220]";
    default:
      return "border-l-[3px] border-l-[#7C3AED] bg-white/95 text-[#0B1220]";
  }
}

export function notificationCardBodyClass(tone: RetestNotificationTone): string {
  switch (tone) {
    case "gain":
      return "text-emerald-900";
    case "warn":
      return "text-orange-900";
    default:
      return "text-[#0B1220]";
  }
}

export function buildGuideRetestViewStudentHref(sessionId: string): string {
  return `/tutor?brief=${sessionId}`;
}

export function buildStudentRetestProofHref(): string {
  return "/student#retest-proof";
}
