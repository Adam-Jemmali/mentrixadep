"use client";

import { AvailabilityBrowser } from "@/app/(app)/student/availability-browser";
import { DeferredSessionsList } from "@/app/(app)/student/student-dashboard-deferred";
import type { StudentHomeHubFooter } from "@/features/student-home/load-student-home";
import { StudentHomeStickyCard } from "@/features/student-home/student-home-sticky-card";
import { ScrollRevealSection } from "@/features/student-home/student-home-sections";
import {
  MentrixaVocabIcon,
  VOCAB_HEADING_ICON_SIZE,
} from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_BOOKING_ICON,
  CANONICAL_SESSION_ICON,
} from "@/shared/icons/vocab-canonical";

export function StudentHomeSessionsHub({
  hubFooter,
  timeZone,
  className,
  staggerIndex = 7,
}: {
  hubFooter: StudentHomeHubFooter;
  timeZone: string;
  className?: string;
  staggerIndex?: number;
}) {
  return (
    <ScrollRevealSection id="sessions-history" className={className} index={6}>
      <StudentHomeStickyCard
        variant="clip"
        icon={CANONICAL_SESSION_ICON}
        title="Sessions & week"
        compact
        staggerIndex={staggerIndex}
        headerClassName="mb-2"
      >
        <DeferredSessionsList
          upcomingSessions={hubFooter.upcomingSessions}
          pastSessions={hubFooter.pastSessions}
          sessionRequests={hubFooter.sessionRequests}
          totalXp={hubFooter.totalXp}
          streak={hubFooter.streak}
          displayTimeZone={timeZone}
          showHeroStats={false}
          embedded
        />
        <section id="browse-guides" className="scroll-mt-20 space-y-2 border-t border-[#C4B5FD]/60 pt-3">
          <div className="flex items-center gap-2">
            <MentrixaVocabIcon
              name={CANONICAL_BOOKING_ICON}
              size={VOCAB_HEADING_ICON_SIZE}
              surface="light"
              title="Browse and book"
            />
            <div>
              <h3 className="text-sm font-bold text-[#0B1220]">Browse and book</h3>
              <p className="text-[10px] leading-snug text-[#475569]">
                Weak-node impact filters below. History tab holds past packages.
              </p>
            </div>
          </div>
          <AvailabilityBrowser
            availability={hubFooter.availability}
            courses={hubFooter.availableCourses}
            studentCourseNames={hubFooter.studentCourseNames}
            tutorExpertise={hubFooter.tutorExpertise}
            syncCourseFilter={hubFooter.studentCourseNames[0] ?? "all"}
            displayTimeZone={timeZone}
            guideNodeImpactRolling={hubFooter.guideNodeImpactRolling}
            weakestRollingNode={hubFooter.weakestRollingNode}
            prefillWeakestNodeFilter={Boolean(hubFooter.weakestRollingNode)}
          />
        </section>
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}
