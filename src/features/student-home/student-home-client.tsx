"use client";

import type { StudentHomeData } from "@/features/student-home/load-student-home";
import { StudentVerdictHero } from "@/features/student-home/student-verdict-hero";
import { StudentRetestAlert } from "@/features/student-home/student-retest-alert";
import {
  StudentHomeArenaPreview,
  StudentHomeDivisionCompact,
  StudentHomeGridFallback,
  StudentHomeQuestPerformance,
} from "@/features/student-home/student-home-sections";
import { StudentHomeSessionsHub } from "@/features/student-home/student-home-sessions-hub";
import { StudentRetestNotifyStrip } from "@/features/notifications/ui/student-retest-notify-strip";
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
        <div className="grid gap-3 lg:grid-cols-[3fr_2fr] lg:items-start">
          <div className="space-y-3">
            <StudentVerdictHero hero={data.heroVerdict} apBand={data.apReadinessBand} />

            {data.retestProof.length > 0 ? (
              <StudentRetestNotifyStrip items={data.retestProof} staggerIndex={0} />
            ) : null}

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

          <aside className="hidden space-y-3 lg:block">
            <StudentRetestAlert retests={data.dueRetests} staggerIndex={2} />
            <StudentHomeArenaPreview events={data.arenaPreview} staggerIndex={3} />
            <StudentHomeDivisionCompact division={data.division} staggerIndex={4} />
          </aside>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3 lg:hidden">
            <StudentHomeArenaPreview events={data.arenaPreview} staggerIndex={3} />
            <StudentHomeDivisionCompact division={data.division} staggerIndex={4} />
          </div>
          <StudentHomeQuestPerformance rows={data.recentQuests} staggerIndex={5} />
          <StudentHomeSessionsHub
            hubFooter={data.hubFooter}
            timeZone={data.timeZone}
            staggerIndex={6}
          />
        </div>
      </main>
    </div>
  );
}
