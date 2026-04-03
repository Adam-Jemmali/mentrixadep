import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTutorAvailability,
  getStudentHubSnapshot,
  getStudentSessionsHubBundle,
} from "@/app/actions/student";
import { getStudentDivisionStats, getDivisionLeaderboard } from "@/app/actions/quest";
import type { StudentCourse, UserXp } from "@/lib/database.types";
import { getAccountLevelFromTotalXp } from "@/lib/levels";

const ACCOUNT_LEVEL_BADGE: Record<number, string> = {
  1: "border-slate-200 bg-slate-100 text-slate-800",
  2: "border-emerald-200 bg-emerald-50 text-emerald-950",
  3: "border-sky-200 bg-sky-50 text-sky-950",
  4: "border-violet-200 bg-violet-50 text-violet-950",
  5: "border-amber-200 bg-amber-50 text-amber-950",
  6: "border-orange-200 bg-orange-50 text-orange-950",
  7: "border-rose-200 bg-rose-50 text-rose-950",
  8: "border-slate-800 bg-slate-900 text-white",
};
import { Button } from "@/components/ui/button";
import { StudentDashboardIllustration } from "@/components/illustrations";
import { SessionsList } from "./sessions-list";
import { StudentStatStripMotion } from "./student-stat-strip-motion";
import { StudentCommandCenterClient } from "./student-command-center-client";
import {
  firstNameFromDisplayName,
  getLocalHour,
  greetingForHour,
  isStreakAtRisk18h,
  rankRecommendedGuides,
} from "@/lib/student-dashboard-helpers";
import { getUpcomingSessionBriefs } from "@/app/actions/pre-session-brief";
import { PreSessionBriefCard } from "@/components/pre-session-brief-card";

interface StudentPageProps {
  searchParams?: {
    booking?: string;
    reason?: string;
  };
}

async function tutorEmailPrefixByTutorId(tutorIds: string[]): Promise<Map<string, string>> {
  const adminClient = createAdminClient();
  const map = new Map<string, string>();
  await Promise.all(
    tutorIds.map(async (id) => {
      try {
        const { data } = await adminClient.auth.admin.getUserById(id);
        const email = data?.user?.email ?? "";
        map.set(id, email ? email.split("@")[0]! : "Guide");
      } catch {
        map.set(id, "Guide");
      }
    }),
  );
  return map;
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const user = await requireRole(["student", "admin"]);
  const now = new Date();

  const [snapshot, sessionsBundle, divisionStats, sessionBriefs, availability] = await Promise.all([
    getStudentHubSnapshot(),
    getStudentSessionsHubBundle(),
    getStudentDivisionStats(user.id),
    getUpcomingSessionBriefs().catch(() => []),
    getTutorAvailability(),
  ]);

  const { upcomingSessions, pastSessions } = sessionsBundle;

  const userXp = (snapshot.user_xp as UserXp | null) ?? null;
  const hasPendingRequests = snapshot.has_pending_requests;
  const studentCourses = snapshot.student_courses as unknown as StudentCourse[];
  const tutorExpertise = snapshot.tutor_expertise;
  const courses = snapshot.available_courses;

  const settingsRow = snapshot.user_settings;
  const timeZone = settingsRow?.timezone?.trim() || "UTC";
  const firstName = firstNameFromDisplayName(settingsRow?.display_name, user.email ?? "");
  const hour = getLocalHour(now, timeZone);
  const greeting = greetingForHour(hour, firstName);
  const totalXp = userXp?.total_xp ?? 0;
  const streak = userXp?.streak_days ?? 0;
  const lastActivityAt = (userXp?.last_activity_at as string | null | undefined) ?? null;
  const streakAtRisk = isStreakAtRisk18h(streak, lastActivityAt);

  const accountLevel = getAccountLevelFromTotalXp(totalXp);
  const tierBadgeClass = ACCOUNT_LEVEL_BADGE[accountLevel.level] ?? ACCOUNT_LEVEL_BADGE[1]!;
  const levelProgressDenom =
    accountLevel.xpToNextLevel != null
      ? accountLevel.xpIntoLevel + accountLevel.xpToNextLevel
      : 1;
  const tierProgressPct =
    accountLevel.xpToNextLevel != null && levelProgressDenom > 0
      ? Math.min(100, Math.round((accountLevel.xpIntoLevel / levelProgressDenom) * 100))
      : 100;

  const sessionsCompleted = pastSessions.filter(
    (s) => s.completed || s.status === "completed",
  ).length;

  const allRatings = pastSessions.flatMap((s) => s.ratings ?? []);
  const avgRating =
    allRatings.length > 0
      ? allRatings.reduce((acc, r) => acc + r.rating, 0) / allRatings.length
      : 0;

  const sortedDivisions = [...divisionStats].sort((a, b) => b.xp - a.xp);
  const focusedDivisionKey =
    (typeof settingsRow?.focused_division_key === "string" && settingsRow.focused_division_key.trim()) ||
    sortedDivisions[0]?.divisionKey ||
    "general";

  const divisionName =
    sortedDivisions.find((d) => d.divisionKey === focusedDivisionKey)?.divisionName ??
    focusedDivisionKey.replace(/-/g, " ");

  const myRank =
    sortedDivisions.find((d) => d.divisionKey === focusedDivisionKey)?.rank ?? null;

  const leaderboardTop = await getDivisionLeaderboard(focusedDivisionKey, user.id);

  const tutorIds = Array.from(new Set(upcomingSessions.map((s) => s.tutor_id)));
  const prefixByTutor = await tutorEmailPrefixByTutorId(tutorIds);
  const upcomingForClient = upcomingSessions.map((s) => ({
    id: s.id,
    course: s.course,
    start_time: s.start_time,
    end_time: s.end_time,
    tutor_email_prefix: prefixByTutor.get(s.tutor_id) ?? "Guide",
  }));

  const recommendedGuides = rankRecommendedGuides(
    studentCourses.map((c) => c.course_name),
    tutorExpertise,
    availability,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-4">
              <div>
                <p className="text-lg font-medium tracking-tight text-slate-900">{greeting}</p>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Sessions, divisions, and practice quests in one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tierBadgeClass}`}
                >
                  {accountLevel.title}
                </span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {totalXp.toLocaleString()} XP
                  {accountLevel.xpToNextLevel != null
                    ? ` · ${accountLevel.xpToNextLevel} to next level`
                    : " · max level"}
                </span>
              </div>

              <div className="max-w-md space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Level progress</span>
                  <span className="tabular-nums">{tierProgressPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-[width] duration-300 ease-out"
                    style={{ width: `${tierProgressPct}%` }}
                  />
                </div>
              </div>

              {streak > 0 && (
                <p
                  className={`text-sm ${streakAtRisk ? "text-amber-900" : "text-slate-600"}`}
                >
                  {streakAtRisk
                    ? "Hey Mentrixer, don't break your streak! Do a session, quest, or rating today!"
                    : `${streak}-day streak.`}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
              <div className="flex flex-wrap gap-2">
                {user.role === "student" && (
                  <Button size="sm" variant="outline" className="border-slate-300" asChild>
                    <Link href={`/student/${user.id}`}>Profile</Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-slate-300" asChild>
                  <Link href="/student/quest">New quest</Link>
                </Button>
              </div>
              <div className="hidden sm:block opacity-90 [&_svg]:max-h-24">
                <StudentDashboardIllustration />
              </div>
            </div>
          </div>
        </div>

        <StudentStatStripMotion
          totalXp={totalXp}
          streak={streak}
          sessionsCompleted={sessionsCompleted}
          avgRating={avgRating}
          streakAtRisk={streakAtRisk}
        />

        {searchParams?.booking === "success" && (
          <div className="mt-8 mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-medium">Payment received</p>
            <p className="mt-1 text-emerald-900/90">
              {hasPendingRequests
                ? "Your session request was sent to the Guide for approval."
                : "Your session is booked — see upcoming sessions below."}
            </p>
            <p className="mt-3 text-xs text-emerald-800/80">
              <Link href="/settings" className="underline font-medium hover:text-emerald-950">
                Account settings
              </Link>
            </p>
          </div>
        )}
        {searchParams?.booking === "cancelled" && (
          <div className="mt-8 mb-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Checkout was cancelled. No charge was made.
          </div>
        )}
        {searchParams?.booking === "error" && (
          <div className="mt-8 mb-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Payment succeeded but booking sync failed. Please refresh once or contact support.
            {searchParams.reason ? ` (${searchParams.reason})` : ""}
          </div>
        )}

        {sessionBriefs.length > 0 && (
          <div className="mt-6 space-y-3">
            {sessionBriefs.map((brief) => (
              <PreSessionBriefCard key={brief.id} brief={brief} />
            ))}
          </div>
        )}

        <div className="mt-10 space-y-10">
          <StudentCommandCenterClient
            studentCourses={studentCourses}
            upcomingSessions={upcomingForClient}
            availability={availability}
            availableCourses={courses}
            tutorExpertise={tutorExpertise}
            divisionName={divisionName}
            myRank={myRank}
            leaderboardTop={leaderboardTop}
            recommendedGuides={recommendedGuides}
          />

          <div id="sessions-history" className="scroll-mt-24 pt-8 border-t border-slate-200">
            <h2 className="text-sm font-medium text-slate-900 mb-4">Session history</h2>
            <SessionsList
              upcomingSessions={upcomingSessions}
              pastSessions={pastSessions}
              totalXp={totalXp}
              streak={streak}
              showHeroStats={false}
            >
              {null}
            </SessionsList>
          </div>
        </div>
      </main>
    </div>
  );
}
