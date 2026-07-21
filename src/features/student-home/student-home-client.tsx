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
import { StudentHubRealtimeRefresh } from "@/components/student-hub-realtime-refresh";
import { cn } from "@/shared/core/utils";

export function StudentHomeClient({
  userId,
  data,
}: {
  userId: string;
  data: StudentHomeData;
}) {
  return (
    <div className="mx-shell-workbench min-h-screen text-slate-100">
      <StudentHubRealtimeRefresh userId={userId} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          <div className="space-y-6">
            <StudentVerdictHero
              verdict={data.verdict}
              fallbackLine={data.verdictFallback}
              apBand={data.apReadinessBand}
            />

            {data.masteryGrid ? (
              <Suspense fallback={<StudentHomeGridFallback />}>
                <MasteryGrid
                  userId={userId}
                  subject={data.subject}
                  mode="student"
                  compact={false}
                  initialData={data.masteryGrid}
                  showVerdict={false}
                  className="rounded-[var(--radius-card)] border border-white/10 bg-[var(--mx-surface-2)]/40 p-4"
                />
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

        <div className={cn("mt-8 space-y-6 lg:mt-10")}>
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
