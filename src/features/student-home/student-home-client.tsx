"use client";

import { Suspense, useMemo } from "react";
import type { StudentHomeData } from "@/features/student-home/load-student-home";
import { StudentVerdictHero } from "@/features/student-home/student-verdict-hero";
import { StudentRetestAlert } from "@/features/student-home/student-retest-alert";
import {
  StudentHomeBrowseGuides,
  StudentHomeGridFallback,
  StudentHomeGuideRecommendation,
  StudentHomeLeagueHub,
  StudentHomeQuestPerformance,
  StudentHomeSessionsShell,
  StudentHomeUpcomingSessions,
} from "@/features/student-home/student-home-sections";
import { MasteryGridHubCard } from "@/features/mastery-grid/mastery-grid-hub-card";
import { StudentHubRealtimeRefresh } from "@/components/student-hub-realtime-refresh";
import {
  DeferredSessionsList,
  DeferredStudentStudyPackageNotifier,
} from "@/app/(app)/student/student-dashboard-deferred";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";
import { cn } from "@/shared/core/utils";

type StudentHomeClientProps = {
  userId: string;
  data: StudentHomeData;
  weekRange: { startIso: string; endIso: string };
  initialOpenStudyPackageId?: string;
  initialSessionsTab?: "past" | "upcoming";
  momentumActive?: boolean;
};

export function StudentHomeClient({
  userId,
  data,
  weekRange,
  initialOpenStudyPackageId = "",
  initialSessionsTab,
  momentumActive = false,
}: StudentHomeClientProps) {
  const studyPackageSnapshots = useMemo(
    () =>
      [...data.hubDashboard.pastSessions, ...data.hubDashboard.upcomingSessions].map((session) => ({
        sessionId: String(session.id),
        course: String(session.course),
        publishedAt:
          (session as { ai_package?: { package_published_at?: string | null } | null }).ai_package
            ?.package_published_at ?? null,
      })),
    [data.hubDashboard.pastSessions, data.hubDashboard.upcomingSessions],
  );

  return (
    <div className={cn(mentrixStudent.pageBg, "student-home-canvas relative text-[#0B1220]")}>
      <StudentHubRealtimeRefresh userId={userId} />

      <main className={cn(mentrixStudent.mainHomeCompact, "relative z-[1]")}>
        <div className={cn("grid lg:grid-cols-[3fr_2fr] lg:items-start", mentrixStudent.homeGridGap)}>
          <div className={mentrixStudent.homeStack}>
            <StudentVerdictHero hero={data.heroVerdict} apBand={data.apReadinessBand} />

            {data.masteryGrid ? (
              <MasteryGridHubCard
                data={data.masteryGrid}
                compact
                stickyVariant="curl"
                staggerIndex={1}
              />
            ) : (
              <StudentHomeGridFallback />
            )}

            <div className="lg:hidden">
              <StudentRetestAlert retests={data.dueRetests} staggerIndex={2} />
            </div>
          </div>

          <aside className={cn("hidden lg:block", mentrixStudent.homeStack)}>
            <StudentRetestAlert retests={data.dueRetests} staggerIndex={2} />
            <StudentHomeUpcomingSessions
              sessions={data.upcomingSessions}
              timeZone={data.timeZone}
              staggerIndex={3}
            />
          </aside>
        </div>

        <div className={cn("mt-3", mentrixStudent.homeStack)}>
          <div className="lg:hidden">
            <StudentHomeUpcomingSessions
              sessions={data.upcomingSessions}
              timeZone={data.timeZone}
              staggerIndex={3}
            />
          </div>

          <StudentHomeQuestPerformance rows={data.recentQuests} staggerIndex={4} />

          <StudentHomeLeagueHub
            division={data.division}
            events={data.arenaPreview}
            staggerIndex={5}
          />

          <StudentHomeGuideRecommendation guide={data.recommendedGuide} staggerIndex={6} />

          <StudentHomeSessionsShell staggerIndex={7}>
            <DeferredStudentStudyPackageNotifier snapshots={studyPackageSnapshots} />
            <Suspense
              fallback={
                <BklitShimmer className="h-48 w-full rounded-lg" aria-label="Loading sessions" />
              }
            >
              <DeferredSessionsList
                upcomingSessions={data.hubDashboard.upcomingSessions}
                pastSessions={data.hubDashboard.pastSessions}
                sessionRequests={data.hubDashboard.sessionRequests}
                totalXp={data.hubDashboard.totalXp}
                streak={data.hubDashboard.streak}
                displayTimeZone={data.timeZone}
                weekRange={weekRange}
                showHeroStats={false}
                embedded
                momentumActive={momentumActive}
                initialOpenStudyPackageId={initialOpenStudyPackageId}
                initialSessionsTab={initialSessionsTab}
              />
            </Suspense>
          </StudentHomeSessionsShell>

          <StudentHomeBrowseGuides
            hub={data.hubDashboard}
            timeZone={data.timeZone}
            staggerIndex={8}
          />
        </div>
      </main>
    </div>
  );
}
