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
import { HOME_MOUNT_PANEL_CLASS } from "@/features/student-home/student-home-sticky-card";
import { useStudentHomeMount } from "@/features/student-home/use-student-home-mount";
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
              <MasteryGridHubCard
                data={data.masteryGrid}
                compact
                stickyVariant="curl"
                className={HOME_MOUNT_PANEL_CLASS}
              />
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
