"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { TutorCommandCenterPayload } from "@/features/tutor/command-center";
import { TutorHubRealtimeRefresh } from "@/components/tutor-hub-realtime-refresh";
import { GuideAddAvailabilityDialog } from "@/features/tutor/ui/guide-add-availability-dialog";
import { GuideHomeHeroGrid } from "@/features/tutor/ui/guide-home-hero-grid";
import { GuideHomeBelowFold } from "@/features/tutor/ui/guide-home-below-fold";
import { GuideMetricsStatRow } from "@/features/tutor/ui/guide-metrics-stat-row";
import { GuideHomeScrollSection } from "@/features/tutor/ui/guide-home-scroll-section";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { TutorWeekCalendar } from "@/app/(app)/tutor/tutor-week-calendar";
import { AvailabilityManager } from "@/app/(app)/tutor/availability-manager";
import { AutoApproveToggle } from "@/app/(app)/tutor/auto-approve-toggle";
import { CourseManager } from "@/app/(app)/tutor/course-manager";
import { TutorPayoutDashboard } from "@/app/(app)/tutor/payout-dashboard";
import { SessionRequestsList } from "@/app/(app)/tutor/session-requests-list";
import { Button } from "@/shared/ui/button";
import { Typewriter } from "@/shared/ui/typewriter";
import { TutorHeroGreeting } from "@/features/tutor/ui/tutor-hero-greeting";
import { TutorHeroDecor } from "@/features/tutor/ui/tutor-hero-decor";
import { HeroGuideBounce } from "@/features/tutor/ui/hero-guide-bounce";
import { GuideRankBadge } from "@/features/guide-rank/components/guide-rank-badge";
import { TutorAvatar } from "@/app/(app)/student/session-components/tutor-avatar";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_BOOKING_ICON, CANONICAL_PROFILE_ICON, CANONICAL_SKILLS_ICON } from "@/shared/icons/vocab-canonical";
import { GUIDE_HOME } from "@/features/tutor/guide-home-copy-pure";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { guideApCalcVerified } from "@/features/tutor/guide-ap-calc-pure";
import { cn } from "@/shared/core/utils";
import { GuideNotificationsPanel } from "@/features/notifications/guide-notifications-panel";

export function GuideHomeClient({
  data,
  greeting,
  firstName,
}: {
  data: TutorCommandCenterPayload;
  greeting: string;
  firstName: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [availabilityCourse, setAvailabilityCourse] = useState<string | null>(null);
  const [slotsCreatedNotice, setSlotsCreatedNotice] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectParam = searchParams.get("connect");
  const briefSessionId = searchParams.get("brief");
  const apCalcVerified = guideApCalcVerified(data.tutorCourses);

  useEffect(() => {
    if (!briefSessionId) return;
    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`guide-brief-${briefSessionId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 240);
    return () => window.clearTimeout(scrollTimer);
  }, [briefSessionId]);

  useEffect(() => {
    if (!slotsCreatedNotice) return;
    router.refresh();
    const scrollTimer = window.setTimeout(() => {
      document.getElementById("tutor-availability-slots")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
    const hideTimer = window.setTimeout(() => setSlotsCreatedNotice(false), 5200);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(hideTimer);
    };
  }, [slotsCreatedNotice, router]);

  return (
    <>
      <TutorHubRealtimeRefresh tutorId={data.tutorId} />
      {slotsCreatedNotice ? (
        <div
          role="alert"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[200] w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center shadow-lg"
        >
          <p className="text-sm font-semibold text-slate-900">{GUIDE_HOME.slotsToastTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{GUIDE_HOME.slotsToastSub}</p>
        </div>
      ) : null}

      <main className={cn(mentrixStudent.main, "mentrix-student-type-scope pb-10")}>
        <header className={cn(mentrixStudent.heroGradientLite, "relative mb-4 overflow-hidden p-4 sm:p-5")}>
          <TutorHeroDecor />
          <HeroGuideBounce />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-2">
              <TutorHeroGreeting greeting={greeting} firstName={firstName} tone="light" />
              <div className={cn("h-[18px] text-sm", mentrixStudent.pageSubtitle)}>
                <Typewriter text={GUIDE_HOME.heroTagline} speed={40} waitTime={5000} />
              </div>
              <div className="inline-flex flex-wrap items-center gap-2">
                <GuideRankBadge rankKey={data.guideRank} size="md" />
                <TutorAvatar
                  displayName={data.guideProfile.displayName}
                  emailPrefix={data.guideProfile.displayName}
                  avatarUrl={data.guideProfile.avatarUrl}
                  size="sm"
                />
                <span className={cn("text-sm font-semibold", mentrixStudent.textOnLight)}>
                  {data.guideProfile.displayName}
                </span>
              </div>
            </div>

            <nav
              className="flex flex-wrap items-center gap-2 lg:justify-end"
              aria-label="Guide quick actions"
            >
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 text-[10px]", mentrixStudent.hubGhostLink)}
                onClick={() => {
                  document.getElementById("skill-manager")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name={CANONICAL_SKILLS_ICON} size={14} surface="light" title="Proficiency" />
                  {GUIDE_HOME.btnProficiency}
                </span>
              </Button>
              <Button variant="outline" size="sm" className={cn("h-8 text-[10px]", mentrixStudent.hubGhostLink)} asChild>
                <Link href={`/tutor/${data.tutorId}`} className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name={CANONICAL_PROFILE_ICON} size={14} surface="light" title="Profile" />
                  {GUIDE_HOME.btnProfile}
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn("h-8 text-[10px]", mentrixStudent.hubBtnSolid)}
                onClick={() => setAddOpen(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MentrixaVocabIcon name={CANONICAL_BOOKING_ICON} size={14} surface="light" title="Add slots" />
                  {GUIDE_HOME.btnAddSlots}
                </span>
              </Button>
            </nav>
          </div>
        </header>

        <GuideAddAvailabilityDialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) setAvailabilityCourse(null);
          }}
          apCalcVerified={apCalcVerified}
          defaultTimezone={data.tutorTimezone}
          sessionDefaultDurationMinutes={data.sessionDefaultDurationMinutes}
          defaultCourse={availabilityCourse}
          onSlotsCreated={() => {
            setAddOpen(false);
            setAvailabilityCourse(null);
            setSlotsCreatedNotice(true);
          }}
        />

        {data.lateCancellationAlerts.length > 0 ? (
          <div
            className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            role="status"
          >
            <p className="font-medium">{GUIDE_HOME.lateCancelTitle}</p>
            <p className="mt-1 text-xs text-amber-900/90">{GUIDE_HOME.lateCancelBody}</p>
          </div>
        ) : null}

        <GuideMetricsStatRow data={data} />

        <GuideHomeHeroGrid
          data={data}
          onOpenAvailability={(subject) => {
            setAvailabilityCourse(subject);
            setAddOpen(true);
          }}
          onSetAvailability={() => setAddOpen(true)}
        />

        <GuideNotificationsPanel
          notifications={data.guideNotifications}
          displayTimeZone={data.tutorTimezone}
          staggerIndex={2}
        />

        <GuideHomeBelowFold data={data} autoOpenBriefSessionId={briefSessionId} />

        <div className="mt-3 space-y-3">
          {data.metrics.pendingRequestCount > 0 ? (
            <GuideHomeScrollSection id="guide-requests" index={5}>
              <GuideAnimatedSticky variant="strip" staggerIndex={8}>
                <h2 className="mb-2 text-sm font-bold text-[var(--mx-navy)]">{GUIDE_HOME.bookedRequestsTitle}</h2>
                <SessionRequestsList
                  sessionRequests={data.sessionRequests}
                  displayTimezone={data.tutorTimezone}
                />
              </GuideAnimatedSticky>
            </GuideHomeScrollSection>
          ) : null}

          <GuideHomeScrollSection id="week-schedule" index={6}>
            <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.schedule} staggerIndex={9}>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={cn("text-sm font-bold", mentrixStudent.textOnLight)}>
                    {GUIDE_HOME.weekScheduleTitle}
                  </h2>
                  <p className={cn("text-[11px] font-medium", mentrixStudent.textMutedOnLight)}>
                    {GUIDE_HOME.weekScheduleSub}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-full text-xs sm:w-auto"
                  onClick={() => setAddOpen(true)}
                >
                  {GUIDE_HOME.btnAddSlots}
                </Button>
              </div>
              <TutorWeekCalendar calendar={data.calendar} displayTimezone={data.tutorTimezone} />
            </GuideAnimatedSticky>
          </GuideHomeScrollSection>

          <div className="grid gap-3 lg:grid-cols-2">
            <GuideHomeScrollSection id="skill-manager" index={7}>
              <CourseManager courses={data.tutorCourses} />
            </GuideHomeScrollSection>

            <GuideHomeScrollSection id="tutor-availability-slots" index={8}>
              <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.availability} staggerIndex={10}>
                <h2 className={cn("mb-2 text-sm font-semibold", mentrixStudent.textOnLight)}>
                  {GUIDE_HOME.openSlotsTitle}
                </h2>
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-violet-100 pb-3">
                  <p className={cn("text-sm", mentrixStudent.textMutedOnLight)}>{GUIDE_HOME.autoApprove}</p>
                  <AutoApproveToggle initialValue={data.autoApprove} />
                </div>
                <div className="max-h-[24rem] overflow-y-auto rounded-md border border-violet-100 bg-zinc-50/90 p-2">
                  <AvailabilityManager availability={data.availability} displayTimezone={data.tutorTimezone} />
                </div>
              </GuideAnimatedSticky>
            </GuideHomeScrollSection>
          </div>

          {data.payoutData ? (
            <GuideHomeScrollSection id="payouts" index={9}>
              <TutorPayoutDashboard data={data.payoutData} connectParam={connectParam} />
            </GuideHomeScrollSection>
          ) : null}
        </div>
      </main>
    </>
  );
}
