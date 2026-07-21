"use client";

import { Suspense } from "react";
import { MasteryGrid } from "@/components/mastery-grid";
import type { StudentHomeData } from "@/features/student-home/load-student-home";
import { StudentVerdictHero } from "@/features/student-home/student-verdict-hero";
import { StudentRetestAlert } from "@/features/student-home/student-retest-alert";
import {
  StudentHomeArenaPreview,
  StudentHomeDivisionCompact,
  StudentHomeGuideRecommendation,
  StudentHomeGridFallback,
  StudentHomeQuestPerformance,
  StudentHomeUpcomingSessions,
} from "@/features/student-home/student-home-sections";
import {
  StudentHomeStickyCard,
} from "@/features/student-home/student-home-sticky-card";
import { useStudentHomeMount } from "@/features/student-home/use-student-home-mount";
import { StudentHubRealtimeRefresh } from "@/components/student-hub-realtime-refresh";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { CANONICAL_MASTERY_GRID_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

export function StudentHomeClient({
  userId,
  data,
}: {
  userId: string;
  data: StudentHomeData;
}) {
  useStudentHomeMount();

  return (
    <div className={cn(mentrixStudent.pageBg, "relative text-[#0B1220]")}>
      <StudentHubRealtimeRefresh userId={userId} />

      <main className={cn(mentrixStudent.mainWide, "relative z-[1]")}>
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <div className="space-y-6">
            <StudentVerdictHero
              verdict={data.verdict}
              fallbackLine={data.verdictFallback}
              apBand={data.apReadinessBand}
            />

            {data.masteryGrid ? (
              <Suspense fallback={<StudentHomeGridFallback />}>
                <StudentHomeStickyCard
                  variant="curl"
                  icon={CANONICAL_MASTERY_GRID_ICON}
                  title="Mastery grid"
                  className={cn(mentrixStudent.hubNotebook, "p-4 sm:p-5")}
                >
                  <MasteryGrid
                    userId={userId}
                    subject={data.subject}
                    mode="student"
                    compact={false}
                    initialData={data.masteryGrid}
                    showVerdict={false}
                    className="mt-1"
                  />
                </StudentHomeStickyCard>
              </Suspense>
            ) : (
              <StudentHomeGridFallback />
            )}

            <div className="lg:hidden">
              <StudentRetestAlert retests={data.dueRetests} />
            </div>
          </div>

          <aside className="hidden space-y-6 lg:block">
            <StudentRetestAlert retests={data.dueRetests} />
            <StudentHomeUpcomingSessions
              sessions={data.upcomingSessions}
              timeZone={data.timeZone}
            />
          </aside>
        </div>

        <div className="mt-8 space-y-6 lg:mt-10">
          <div className="lg:hidden">
            <StudentHomeUpcomingSessions
              sessions={data.upcomingSessions}
              timeZone={data.timeZone}
            />
          </div>
          <StudentHomeQuestPerformance rows={data.recentQuests} />
          <StudentHomeArenaPreview events={data.arenaPreview} />
          <StudentHomeGuideRecommendation guide={data.recommendedGuide} />
          <StudentHomeDivisionCompact division={data.division} />
        </div>
      </main>
    </div>
  );
}
