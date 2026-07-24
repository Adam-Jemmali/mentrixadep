"use client";

import Link from "next/link";
import type { TutorCommandCenterPayload } from "@/features/tutor/command-center";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { GuideHomeScrollSection } from "@/features/tutor/ui/guide-home-scroll-section";
import { GuidePreSessionContextPanel } from "@/features/pre-session-brief/guide-context-panel";
import { GuideEarningsForecastPanel } from "@/features/tutor/earnings-forecast";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_BREAKTHROUGH_ICON,
  CANONICAL_BRIEF_ICON,
  CANONICAL_PROFILE_ICON,
} from "@/shared/icons/vocab-canonical";
import { GUIDE_HOME } from "@/features/tutor/guide-home-copy-pure";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { formatDateInZone } from "@/shared/core/time-format";
import { studentDisplayNameFromSession } from "@/features/tutor/guide-home-pure";
import { cn } from "@/shared/core/utils";
import { GuideRosterTable } from "@/features/tutor/ui/guide-roster-table";
import { GuideBreakthroughTimeline } from "@/features/tutor/ui/guide-breakthrough-timeline";

export function GuideHomeBelowFold({
  data,
  autoOpenBriefSessionId = null,
}: {
  data: TutorCommandCenterPayload;
  autoOpenBriefSessionId?: string | null;
}) {
  const upcoming = data.upcomingSessions.slice(0, 3);

  return (
    <div className="space-y-3">
      {upcoming.length > 0 ? (
        <GuideHomeScrollSection id="guide-session-briefs" index={0}>
          <GuideAnimatedSticky variant="clip" staggerIndex={3}>
            <div className="mb-2 flex items-center gap-2">
              <MentrixaVocabIcon name={CANONICAL_BRIEF_ICON} size={18} surface="light" title="Briefs" />
              <h2 className="text-sm font-bold text-[var(--mx-navy)]">Session briefs</h2>
            </div>
            <div className="space-y-2">
              {upcoming.map((session) => (
                <div key={session.id} id={`guide-brief-${session.id}`} className="scroll-mt-24">
                  <GuidePreSessionContextPanel
                    sessionId={session.id}
                    guideId={data.tutorId}
                    course={session.course}
                    startTime={session.start_time}
                    endTime={session.end_time}
                    studentName={studentDisplayNameFromSession(session)}
                    studentId={session.student_id}
                    displayTimeZone={data.tutorTimezone}
                    autoOpen={autoOpenBriefSessionId === session.id}
                  />
                </div>
              ))}
            </div>
          </GuideAnimatedSticky>
        </GuideHomeScrollSection>
      ) : null}

      <GuideHomeScrollSection id="guide-roster" index={1}>
        <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.home} staggerIndex={4}>
          <div className="mb-2 flex items-center gap-2">
            <MentrixaVocabIcon name={CANONICAL_PROFILE_ICON} size={18} surface="light" title="Roster" />
            <h2 className="text-sm font-bold text-[var(--mx-navy)]">{GUIDE_HOME.rosterTitle}</h2>
          </div>
          {data.activeStudents.length === 0 ? (
            <p className="text-sm text-[#475569]">{GUIDE_HOME.rosterEmpty}</p>
          ) : (
            <GuideRosterTable students={data.activeStudents} displayTimeZone={data.tutorTimezone} />
          )}
        </GuideAnimatedSticky>
      </GuideHomeScrollSection>

      <GuideHomeScrollSection id="guide-earnings-forecast" index={2}>
        <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.payouts} staggerIndex={5}>
          <GuideEarningsForecastPanel forecast={data.earningsForecast} />
        </GuideAnimatedSticky>
      </GuideHomeScrollSection>

      <GuideHomeScrollSection id="guide-studio-pending" index={3}>
        <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.studio} staggerIndex={6}>
          <div className="mb-2 flex items-center gap-2">
            <MentrixaVocabIcon name={CANONICAL_BRIEF_ICON} size={18} surface="light" title="Studio" />
            <h2 className="text-sm font-bold text-[var(--mx-navy)]">{GUIDE_HOME.studioPendingTitle}</h2>
          </div>
          {data.studioPendingReview.length === 0 ? (
            <p className="text-sm text-[#475569]">{GUIDE_HOME.studioPendingEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {data.studioPendingReview.map((item) => (
                <li
                  key={item.sessionId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-white/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--mx-navy)]">{item.studentName}</p>
                    <p className="text-[11px] text-[#475569]">
                      {item.course}. {formatDateInZone(item.endTime, data.tutorTimezone)}
                    </p>
                  </div>
                  <Link
                    href="/tutor/sessions-ai"
                    className={cn(mentrixStudent.hubGhostLink, "shrink-0 px-2 py-1 text-[10px] font-bold")}
                  >
                    Review →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GuideAnimatedSticky>
      </GuideHomeScrollSection>

      <GuideHomeScrollSection id="guide-breakthroughs" index={4}>
        <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.impact} staggerIndex={7}>
          <div className="mb-2 flex items-center gap-2">
            <MentrixaVocabIcon
              name={CANONICAL_BREAKTHROUGH_ICON}
              size={18}
              gold
              surface="light"
              title="Breakthrough"
            />
            <h2 className="text-sm font-bold text-[var(--mx-navy)]">{GUIDE_HOME.breakthroughTitle}</h2>
          </div>
          {data.breakthroughs.length === 0 ? (
            <p className="text-sm text-[#475569]">{GUIDE_HOME.breakthroughEmpty}</p>
          ) : (
            <GuideBreakthroughTimeline rows={data.breakthroughs} />
          )}
        </GuideAnimatedSticky>
      </GuideHomeScrollSection>
    </div>
  );
}
