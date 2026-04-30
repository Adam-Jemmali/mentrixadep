import Link from "next/link";
import Image from "next/image";
import { StudentHeroGreeting } from "@/components/student/student-hero-greeting";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTutorAvailability,
  getStudentHubSnapshot,
  getStudentSessionsHubBundle,
} from "@/app/actions/student";
import { getTopRival } from "@/app/actions/top-rival";
import { 
  getStudentDivisionStats, 
  getDivisionLeaderboard, 
  getQuestAccuracyTrend 
} from "@/app/actions/quest";
import type { StudentCourse, UserXp } from "@/lib/database.types";
import { getAccountLevelFromTotalXp } from "@/lib/levels";


import { getWeekRangeUTC } from "@/lib/time-format";
import { MentrixHeroDecor } from "@/components/student/mentrix-hero-decor";
import { HeroMentrixerBounce } from "@/components/student/hero-mentrixer-bounce";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { Typewriter } from "@/components/ui/typewriter";
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
import { TopRivalCard } from "@/components/top-rival-card";
import { Button } from "@/components/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

interface StudentPageProps {
  searchParams?: {
    booking?: string;
    reason?: string;
  };
}

async function tutorEmailPrefixByTutorId(tutorIds: string[]): Promise<Map<string, string>> {
  if (tutorIds.length === 0) return new Map();
  
  const adminClient = createAdminClient();
  const map = new Map<string, string>();
  
  // ELITE SPEED: Fetch all profiles in ONE batch query instead of a slow loop
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, display_name")
    .in("id", tutorIds);

  tutorIds.forEach(id => {
    const profile = profiles?.find(p => p.id === id);
    map.set(id, profile?.display_name ? profile.display_name.split(" ")[0]! : "Guide");
  });
  
  return map;
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const user = await requireRole(["student", "admin"]);
  const now = new Date();

  const [snapshot, sessionsBundle, divisionStats, sessionBriefs, availability, rivalData, questAccuracy] = await Promise.all([
    getStudentHubSnapshot(),
    getStudentSessionsHubBundle(),
    getStudentDivisionStats(user.id),
    getUpcomingSessionBriefs().catch(() => []),
    getTutorAvailability(),
    getTopRival(),
    getQuestAccuracyTrend(user.id),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.completed || s.status === "completed",
  ).length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRatings = pastSessions.flatMap((s: any) => s.ratings ?? []);
  const avgRating =
    allRatings.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? allRatings.reduce((acc: number, r: any) => acc + r.rating, 0) / allRatings.length
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tutorIds = Array.from(new Set(upcomingSessions.map((s: any) => s.tutor_id))) as string[];
  const prefixByTutor = await tutorEmailPrefixByTutorId(tutorIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingForClient = upcomingSessions.map((s: any) => ({
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

  const weekRange = getWeekRangeUTC(now);

  return (
    <div className={mentrixStudent.pageBg}>
      <main className={mentrixStudent.main}>
        <div className={`${mentrixStudent.heroGradient} mb-8 p-6 sm:p-8 relative overflow-hidden`}>
          <MentrixHeroDecor />
          <HeroMentrixerBounce />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-4">
              <div>
                <StudentHeroGreeting greeting={greeting} firstName={firstName} />
                <div className="mt-2 text-sm text-white/90 h-[20px]">
                  <Typewriter text="Keep your streak. Keep proving what you know." speed={40} waitTime={5000} />
                </div>
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
                    ? "Keep your streak alive !"
                    : `${streak}-day streak active`}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end shrink-0">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20" asChild>
                  <Link href={`/student/${user.id}`} className="inline-flex items-center gap-1.5">
                    <Image src="/icons/mentrixer.svg" alt="" width={14} height={14} className="h-3.5 w-3.5 opacity-80" />
                    Profile & Settings
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20" asChild>
                  <Link href="/student/quest" className="inline-flex items-center gap-1.5 text-white">
                    <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
                    Daily quest
                  </Link>
                </Button>
                <Button size="sm" className="h-8 text-xs bg-white text-slate-900 hover:bg-slate-100" asChild>
                  <Link href="#browse-guides" className="inline-flex items-center gap-1.5">
                    <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
                    Book session
                  </Link>
                </Button>
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
          questAccuracy={questAccuracy}
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sessionBriefs.map((brief: any) => (
              <PreSessionBriefCard key={brief.id} brief={brief} />
            ))}
          </div>
        )}

        <div className="mt-10 space-y-10">
          <TopRivalCard rivalData={rivalData} />

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
                sessionRequests={sessionsBundle.sessionRequests}
                totalXp={totalXp}
                streak={streak}
                displayTimeZone={timeZone}
                weekRange={weekRange}
                showHeroStats={false}
              />
          </div>
        </div>
      </main>
    </div>
  );
}
