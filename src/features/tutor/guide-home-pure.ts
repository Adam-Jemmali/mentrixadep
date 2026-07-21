import type { GuideImpactNodeEntry } from "@/features/guide-impact/impact-score-pure";
import type { GuideImpactRollingNodeChip } from "@/features/guide-impact/impact-score-pure";

export type GuideActiveStudent = {
  studentId: string;
  displayName: string;
  sessionCount: number;
  lastSessionAt: string;
};

export type GuideStudioPendingItem = {
  sessionId: string;
  course: string;
  studentName: string;
  endTime: string;
};

type SessionLike = {
  id?: string;
  student_id?: string;
  end_time?: string;
  start_time?: string;
  student_profile?: { display_name?: string | null; email?: string | null };
  student_email?: string | null;
  student_display_name?: string | null;
};

export function guideImpactHeroTone(score: number): "gold" | "violet" | "steel" {
  if (score > 80) return "gold";
  if (score >= 60) return "violet";
  return "steel";
}

export const GUIDE_IMPACT_HERO_CLASS: Record<ReturnType<typeof guideImpactHeroTone>, string> = {
  gold: "text-[#D4A017]",
  violet: "text-[#7C3AED]",
  steel: "text-[#64748B]",
};

export function buildGuideActiveStudents(sessions: SessionLike[], limit = 8): GuideActiveStudent[] {
  const map = new Map<string, { displayName: string; count: number; lastAt: string }>();

  for (const session of sessions) {
    const studentId = session.student_id;
    if (!studentId) continue;

    const displayName =
      session.student_profile?.display_name?.trim() ||
      session.student_display_name?.trim() ||
      session.student_profile?.email?.split("@")[0] ||
      session.student_email?.split("@")[0] ||
      "Student";

    const at = session.end_time || session.start_time || "";
    const existing = map.get(studentId);
    if (!existing) {
      map.set(studentId, { displayName, count: 1, lastAt: at });
      continue;
    }
    existing.count += 1;
    if (at > existing.lastAt) existing.lastAt = at;
  }

  return [...map.entries()]
    .map(([studentId, row]) => ({
      studentId,
      displayName: row.displayName,
      sessionCount: row.count,
      lastSessionAt: row.lastAt,
    }))
    .sort((a, b) => b.lastSessionAt.localeCompare(a.lastSessionAt))
    .slice(0, limit);
}

export function toTopImpactChips(
  entries: GuideImpactNodeEntry[],
  limit = 3,
): GuideImpactRollingNodeChip[] {
  return entries.slice(0, limit).map((entry) => ({
    skillNodeId: entry.skillNodeId,
    nodeName: entry.nodeName,
    impactScore: entry.impactScore,
    sessionsCounted: entry.studentsCounted,
  }));
}

export function studentDisplayNameFromSession(session: SessionLike): string {
  return (
    session.student_profile?.display_name?.trim() ||
    session.student_display_name?.trim() ||
    session.student_profile?.email?.split("@")[0] ||
    session.student_email?.split("@")[0] ||
    "Student"
  );
}
