"use client";

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
import { MasteryGridHubCard } from "@/features/mastery-grid/mastery-grid-hub-card";
import { StudentHubRealtimeRefresh } from "@/components/student-hub-realtime-refresh";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { cn } from "@/shared/core/utils";

export function StudentHomeClient({
  userId,
  data,
}: {
  userId: string;
  data: StudentHomeData;
}) {
  return (
    <div className={cn(mentrixStudent.pageBg, "relative text-[#0B1220]")}>
      <StudentHubRealtimeRefresh userId={userId} />

      <main className={cn(mentrixStudent.mainWide, "relative z-[1]")}>
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <div className="space-y-6">
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

          <aside className="hidden space-y-6 lg:block">
            <StudentRetestAlert retests={data.dueRetests} staggerIndex={2} />
            <StudentHomeUpcomingSessions
              sessions={data.upcomingSessions}
              timeZone={data.timeZone}
              staggerIndex={3}
            />
          </aside>
        </div>

        <div className="mt-8 space-y-6 lg:mt-10">
          <div className="lg:hidden">
            <StudentHomeUpcomingSessions
              sessions={data.upcomingSessions}
              timeZone={data.timeZone}
              staggerIndex={3}
            />
          </div>
          <StudentHomeQuestPerformance rows={data.recentQuests} staggerIndex={5} />
          <StudentHomeArenaPreview events={data.arenaPreview} staggerIndex={6} />
          <StudentHomeGuideRecommendation guide={data.recommendedGuide} staggerIndex={7} />
          <StudentHomeDivisionCompact division={data.division} staggerIndex={8} />
        </div>
      </main>
    </div>
  );
}
