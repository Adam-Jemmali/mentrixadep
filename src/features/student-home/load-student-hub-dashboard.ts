"use server";

import { getTutorAvailability } from "@/features/booking/browse-availability";
import { getStudentSessionsHubBundle, type StudentHubSnapshot } from "@/features/student-profile/hub-snapshot";
import {
  getGuideNodeImpactRollingBatch,
  loadWeakestRollingStatNode,
  type WeakestRollingStatNode,
} from "@/features/guide-impact/reads";
import type { GuideNodeImpactRollingBatch } from "@/features/guide-impact/impact-score-pure";
import { getGuideRematchBadgesForStudent } from "@/features/matchmaker/load-guide-rematch-badges";
import { isMomentumMemberForUser } from "@/features/entitlements/momentum-comp-members";
import { getMomentumSessionCreditsSummary } from "@/features/entitlements/session-credits";

export type StudentHubDashboardData = {
  upcomingSessions: Awaited<ReturnType<typeof getStudentSessionsHubBundle>>["upcomingSessions"];
  pastSessions: Awaited<ReturnType<typeof getStudentSessionsHubBundle>>["pastSessions"];
  sessionRequests: Awaited<ReturnType<typeof getStudentSessionsHubBundle>>["sessionRequests"];
  totalXp: number;
  streak: number;
  studentCourses: { id: string; course_name: string }[];
  availability: Awaited<ReturnType<typeof getTutorAvailability>>;
  availableCourses: string[];
  tutorExpertise: StudentHubSnapshot["tutor_expertise"];
  guideNodeImpactRolling: GuideNodeImpactRollingBatch;
  weakestRollingNode: WeakestRollingStatNode | null;
  momentumSubscriber: boolean;
  sessionCreditAvailable: boolean;
  packSprintCreditsRemaining: number;
  monthlyCreditsRemaining: number;
  rematchBadgesByTutorId: Record<string, { label: string }>;
};

function mapStudentCourses(snapshot: StudentHubSnapshot): { id: string; course_name: string }[] {
  return (snapshot.student_courses ?? [])
    .map((row) => {
      const id = String(row.id ?? "");
      const course_name = String(row.course_name ?? "").trim();
      if (!id || !course_name) return null;
      return { id, course_name };
    })
    .filter((row): row is { id: string; course_name: string } => row != null);
}

export async function loadStudentHubDashboard(
  userId: string,
  snapshot: StudentHubSnapshot,
): Promise<StudentHubDashboardData> {
  const [sessionsBundle, availability, weakestRollingNode, momentumSubscriber, credits] =
    await Promise.all([
      getStudentSessionsHubBundle(),
      getTutorAvailability().catch(() => [] as Awaited<ReturnType<typeof getTutorAvailability>>),
      loadWeakestRollingStatNode(userId).catch(() => null),
      isMomentumMemberForUser(userId).catch(() => false),
      getMomentumSessionCreditsSummary(userId).catch(() => ({
        monthlyCredit: null,
        monthlyRemaining: 0,
        packRemaining: 0,
        totalRemaining: 0,
        packSprint: null,
      })),
    ]);

  const tutorIds = Array.from(new Set(availability.map((slot) => slot.tutor_id).filter(Boolean)));
  const [guideNodeImpactRolling, rematchBadges] = await Promise.all([
    getGuideNodeImpactRollingBatch(tutorIds).catch(() => ({
      topChipsByGuideId: {},
      impactByGuideAndNode: {},
      avgImpactByGuideId: {},
    })),
    getGuideRematchBadgesForStudent(userId, tutorIds).catch(() => ({})),
  ]);

  const xpRow = snapshot.user_xp as { total_xp?: number; streak_days?: number } | null;

  const rematchBadgesByTutorId: Record<string, { label: string }> = {};
  for (const [guideId, badge] of Object.entries(rematchBadges)) {
    if (badge?.label) rematchBadgesByTutorId[guideId] = { label: badge.label };
  }

  return {
    upcomingSessions: sessionsBundle.upcomingSessions,
    pastSessions: sessionsBundle.pastSessions,
    sessionRequests: sessionsBundle.sessionRequests,
    totalXp: Number(xpRow?.total_xp ?? 0),
    streak: Number(xpRow?.streak_days ?? 0),
    studentCourses: mapStudentCourses(snapshot),
    availability,
    availableCourses: snapshot.available_courses ?? [],
    tutorExpertise: snapshot.tutor_expertise ?? {},
    guideNodeImpactRolling,
    weakestRollingNode,
    momentumSubscriber,
    sessionCreditAvailable: credits.totalRemaining > 0,
    packSprintCreditsRemaining: credits.packRemaining,
    monthlyCreditsRemaining: credits.monthlyRemaining,
    rematchBadgesByTutorId,
  };
}
