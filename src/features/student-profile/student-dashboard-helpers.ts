/**
 * Pure helpers for the learner command center (server + tests).
 */

export function getLocalHour(now: Date, timeZone: string): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).formatToParts(now)
      .find((p) => p.type === "hour")?.value;
    const n = h ? parseInt(h, 10) : NaN;
    return Number.isFinite(n) ? n : now.getHours();
  } catch {
    return now.getHours();
  }
}

export function greetingForHour(hour: number, firstName: string): string {
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

export function firstNameFromDisplayName(displayName: string | null | undefined, emailFallback: string): string {
  const raw = (displayName ?? "").trim();
  if (raw) {
    const part = raw.split(/\s+/)[0];
    return part ? part.slice(0, 48) : "there";
  }
  const local = emailFallback.split("@")[0] ?? "";
  return local ? local.slice(0, 48) : "there";
}

/** Streak is “at risk” if the learner has a streak but has not logged activity today (calendar day in their TZ). */
export function isStreakAtRisk(
  streakDays: number,
  lastActivityDate: string | null | undefined,
  todayYmdInTz: string
): boolean {
  if (streakDays <= 0) return false;
  if (!lastActivityDate) return false;
  if (lastActivityDate === todayYmdInTz) return false;
  return true;
}


export function isStreakAtRisk18h(
  streakDays: number,
  lastActivityAt: string | null | undefined,
): boolean {
  if (streakDays <= 0) return false;
  if (!lastActivityAt) return false;
  const hours = (Date.now() - new Date(lastActivityAt).getTime()) / 3600000;
  return hours >= 18;
}

export function todayYmdInTimeZone(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export type RecommendedGuide = {
  tutorId: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  coursesMatched: number;
  hasOpenSlot: boolean;
};

export function rankRecommendedGuides(
  studentCourseNames: string[],
  tutorExpertise: Record<string, { course_name: string; verified: boolean }[]>,
  availability: {
    tutor_id: string;
    tutor?: {
      email?: string;
      display_name?: string | null;
      avatar_url?: string | null;
      bio?: string | null;
    } | null;
  }[]
): RecommendedGuide[] {
  const want = new Set(studentCourseNames.map((c) => c.toLowerCase().trim()).filter(Boolean));
  if (want.size === 0) return [];

  const tutorIds = new Set(availability.map((a) => a.tutor_id));
  const slotByTutor = new Set<string>();
  for (const a of availability) slotByTutor.add(a.tutor_id);

  const scored: RecommendedGuide[] = [];
  for (const tid of Array.from(tutorIds)) {
    const rows = tutorExpertise[tid] ?? [];
    let coursesMatched = 0;
    for (const row of rows) {
      if (!row.verified) continue;
      if (want.has(row.course_name.toLowerCase().trim())) coursesMatched++;
    }
    if (coursesMatched === 0) continue;
    const slot = availability.find((a) => a.tutor_id === tid);
    const email = slot?.tutor?.email ?? "";
    const displayName = slot?.tutor?.display_name?.trim() || (email ? email.split("@")[0] ?? "Guide" : "Guide");
    scored.push({
      tutorId: tid,
      displayName,
      avatarUrl: slot?.tutor?.avatar_url ?? null,
      bio: slot?.tutor?.bio ?? null,
      coursesMatched,
      hasOpenSlot: slotByTutor.has(tid),
    });
  }

  return scored
    .sort((a, b) => b.coursesMatched - a.coursesMatched || (b.hasOpenSlot ? 1 : 0) - (a.hasOpenSlot ? 1 : 0))
    .slice(0, 8);
}
