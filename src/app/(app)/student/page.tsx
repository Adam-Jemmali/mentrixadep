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


import { MentrixHeroDecor } from "@/components/student/mentrix-hero-decor";
import { HeroMentrixerBounce } from "@/components/student/hero-mentrixer-bounce";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
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
    <div className={mentrixStudent.pageBg}>
      <main className={mentrixStudent.main}>
        <div className={`${mentrixStudent.heroGradient} mb-8 p-6 sm:p-8`}>
          <MentrixHeroDecor />
          <HeroMentrixerBounce />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-4">
              <div>
                
                <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{greeting}</p>
                <p className="mt-2 text-sm text-white/90">Keep your streak. Keep proving what you know.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-amber-300/50 bg-amber-400/25 px-3 py-1 text-xs font-bold text-amber-50 shadow-sm backdrop-blur-sm">
                  {accountLevel.title}
                </span>
                <span className="text-xs font-mono tabular-nums text-white/85">
                  {totalXp.toLocaleString()} XP
                  {accountLevel.xpToNextLevel != null
                    ? ` · ${accountLevel.xpToNextLevel} to next level`
                    : " · max level"}
                </span>
              </div>

              <div className="max-w-md space-y-2">
                <div className="flex justify-between text-xs text-white/80">
                  <span>Level progress</span>
                  <span className="tabular-nums">{tierProgressPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-300 ease-out shadow-sm"
                    style={{ width: `${tierProgressPct}%` }}
                  />
                </div>
              </div>

              {streak > 0 && (
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${streakAtRisk ? "text-amber-100" : "text-white/90"}`}>
                  {streakAtRisk
                    ? "Streak at risk :(  Play now"
                    : `${streak}-day streak active`}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
              <div className="flex flex-wrap gap-2">
                
                
              
              
              
            
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
          <div className="mt-8 mb-2 rounded-2xl border border-emerald-200/80 bg-white px-5 py-4 text-sm text-emerald-900 shadow-sm">
            <p className="font-medium">Payment received</p>
            <p className="mt-1 text-emerald-900/90">
              {hasPendingRequests
                ? "Your session request was sent to the Guide for approval."
                : "Session booked see upcoming."}
            </p>
            <p className="mt-3 text-xs text-emerald-800/80">
              <Link href={`/student/${user.id}`} className="underline font-medium hover:text-emerald-950">
                Profile settings
              </Link>
            </p>
          </div>
        )}
        {searchParams?.booking === "cancelled" && (
          <div className="mt-8 mb-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
            Checkout was cancelled. No charge was made.
          </div>
        )}
        {searchParams?.booking === "error" && (
          <div className="mt-8 mb-2 rounded-2xl border border-red-200/80 bg-white px-5 py-4 text-sm text-red-700 shadow-sm">
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
            displayTimeZone={timeZone}
          />

          <div id="sessions-history" className="scroll-mt-24 border-t border-slate-200/80 pt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live coaching</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Sessions</h2>
            <p className="mt-1 mb-5 text-sm text-slate-600">Upcoming past guide calls.</p>
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
