import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getUpcomingSessions,
  getPastSessions,
  getTutorAvailability,
  getAvailableCourses,
  getHasPendingSessionRequests,
  getStudentCourses,
  getTutorExpertiseMap,
} from "@/app/actions/student";
import { getUserXp } from "@/app/actions/quest";
import { SessionsList } from "./sessions-list";
import { AvailabilityBrowser } from "./availability-browser";
import { CourseInterests } from "./course-interests";
import { Button } from "@/components/ui/button";
import { StudentDashboardIllustration } from "@/components/illustrations";

interface StudentPageProps {
  searchParams?: {
    booking?: string;
    reason?: string;
  };
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const user = await requireRole(["student", "admin"]);

  const [
    upcomingSessions,
    pastSessions,
    availability,
    courses,
    userXp,
    hasPendingRequests,
    studentCourses,
    tutorExpertise,
  ] = await Promise.all([
    getUpcomingSessions(),
    getPastSessions(),
    getTutorAvailability(),
    getAvailableCourses(),
    getUserXp(user.id),
    getHasPendingSessionRequests(),
    getStudentCourses(),
    getTutorExpertiseMap(),
  ]);

  const streak = userXp?.streak_days ?? 0;
  const totalXp = userXp?.total_xp ?? 0;

  const supabase = await createClient();
  const { data: settingsRow } = await supabase
    .from("user_settings")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const firstName = settingsRow?.display_name || (user.email ?? "").split("@")[0] || "there";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header row */}
        <div className="relative flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em]">
              {getGreeting(firstName)}
            </h1>
            {streak > 2 && (
              <p className="text-sm text-slate-400 mt-1">
                {streak}-day streak. Keep it going.
              </p>
            )}
          </div>
          <Button size="sm" asChild>
            <Link href="/student/quest">New quest</Link>
          </Button>
          <StudentDashboardIllustration />
        </div>

        {searchParams?.booking === "success" && (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-medium">Payment received</p>
            <p className="mt-1 text-emerald-900/90">
              {hasPendingRequests
                ? "Your session request was sent to the tutor for approval."
                : "Your session is booked — see upcoming sessions below."}
            </p>
            <p className="mt-3 text-xs text-emerald-800/80">
              <Link href="/settings" className="underline font-medium hover:text-emerald-950">
                Account settings
              </Link>
              <span className="text-emerald-700/70"> · </span>
              <span>You are on your student home with sessions and guides.</span>
            </p>
          </div>
        )}
        {searchParams?.booking === "cancelled" && (
          <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Checkout was cancelled. No charge was made.
          </div>
        )}
        {searchParams?.booking === "error" && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Payment succeeded but booking sync failed. Please refresh once or contact support.
            {searchParams.reason ? ` (${searchParams.reason})` : ""}
          </div>
        )}

        <div id="sessions" className="scroll-mt-24">
        <CourseInterests courses={studentCourses} />

        <SessionsList
          upcomingSessions={upcomingSessions}
          pastSessions={pastSessions}
          totalXp={totalXp}
          streak={streak}
        >
          <AvailabilityBrowser
            availability={availability}
            courses={courses}
            studentCourseNames={studentCourses.map((c) => c.course_name)}
            tutorExpertise={tutorExpertise}
          />
        </SessionsList>
        </div>
      </main>
    </div>
  );
}

function getGreeting(firstName: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName}.`;
  if (hour < 18) return `Good afternoon, ${firstName}.`;
  return `Good evening, ${firstName}.`;
}

