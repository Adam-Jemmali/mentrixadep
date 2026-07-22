import { isValidIanaTimeZone } from "@/shared/core/timezones";

import { formatPeerStandingShort } from "@/features/xp/rank-statistics-pure";

export const VFA_STREAK_MILESTONES = [7, 30, 100] as const;
export type VfaStreakMilestone = (typeof VFA_STREAK_MILESTONES)[number];

export type VfaStreakState = {
  streakDays: number;
  lastDate: string | null;
  longest: number;
};

export type VfaStreakApplyResult = VfaStreakState & {
  changed: boolean;
  milestone: VfaStreakMilestone | null;
};

export type VfaStreakHomeDisplay =
  | { kind: "active"; days: number }
  | { kind: "broken"; endedDays: number }
  | { kind: "none" };

/** YYYY-MM-DD in the given IANA timezone. */
export function calendarDateInTimeZone(now: Date, timeZone: string): string {
  const tz = isValidIanaTimeZone(timeZone) ? timeZone.trim() : "UTC";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addCalendarDays(isoDate: string, deltaDays: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  return utc.toISOString().slice(0, 10);
}

export function applyVfaStreakOnSuccessfulInsert(
  state: VfaStreakState,
  today: string,
): VfaStreakApplyResult {
  if (state.lastDate === today) {
    return {
      streakDays: state.streakDays,
      lastDate: today,
      longest: state.longest,
      changed: false,
      milestone: null,
    };
  }

  const yesterday = addCalendarDays(today, -1);
  const streakDays = state.lastDate === yesterday ? state.streakDays + 1 : 1;
  const longest = Math.max(state.longest, streakDays);
  const milestone = (VFA_STREAK_MILESTONES as readonly number[]).includes(streakDays)
    ? (streakDays as VfaStreakMilestone)
    : null;

  return {
    streakDays,
    lastDate: today,
    longest,
    changed: true,
    milestone,
  };
}

export function resolveVfaStreakHomeDisplay(
  state: VfaStreakState,
  today: string,
): VfaStreakHomeDisplay {
  if (!state.lastDate || state.streakDays <= 0) return { kind: "none" };

  const yesterday = addCalendarDays(today, -1);
  if (state.lastDate === today || state.lastDate === yesterday) {
    return { kind: "active", days: state.streakDays };
  }

  return { kind: "broken", endedDays: state.streakDays };
}

export function vfaProofStreakLabel(_days: number): string {
  return "day proof streak";
}

export function vfaStreakBrokenCopy(endedDays: number): string {
  return `Your ${endedDays}-day proof streak ended. Start a new one.`;
}

export function vfaStreakMilestoneTitle(days: VfaStreakMilestone): string {
  return `${days}-day proof streak`;
}

export function vfaStreakMilestoneSubtitle(): string {
  return "Consecutive days with a new verified first attempt.";
}

export function vfaStreakMilestoneDaysLabel(): string {
  return "days of proving something new";
}

export function vfaStreakMilestonePeerContext(percentile: number | null): string {
  if (percentile == null) {
    return "Your streak is on the verified board.";
  }
  return `${formatPeerStandingShort(percentile)} of Mentrixers this month`;
}

export function vfaStreakBrokenBannerStorageKey(userId: string, endedDays: number): string {
  return `mentrixa:vfa-streak-broken:${userId}:${endedDays}`;
}
