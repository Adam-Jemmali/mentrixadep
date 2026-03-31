import { requireRole } from "@/lib/auth";
import {
  getTutorAvailability,
  getUpcomingSessions,
  getPastSessions,
  getSessionRequests,
  getAutoApprove,
  getTutorCourses,
} from "@/app/actions/tutor";
import { TutorDashboardClient } from "./tutor-dashboard-client";

export default async function TutorPage() {
  await requireRole(["tutor", "admin"]);

  /** Single clock for “this month” stats so SSR + hydration match (avoids React #425). */
  const dashboardClockIso = new Date().toISOString();

  const [availability, upcomingSessions, pastSessions, sessionRequests, autoApprove, tutorCourses] =
    await Promise.all([
      getTutorAvailability(),
      getUpcomingSessions(),
      getPastSessions(),
      getSessionRequests(),
      getAutoApprove(),
      getTutorCourses(),
    ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <TutorDashboardClient
        dashboardClockIso={dashboardClockIso}
        availability={availability}
        upcomingSessions={upcomingSessions}
        pastSessions={pastSessions}
        sessionRequests={sessionRequests}
        autoApprove={autoApprove}
        tutorCourses={tutorCourses}
      />
    </div>
  );
}
