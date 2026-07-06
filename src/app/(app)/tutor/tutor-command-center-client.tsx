"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ScrollRevealCard } from "@/shared/ui/card";
import type { TutorCommandCenterPayload } from "@/features/tutor/command-center";
import { SessionRequestsList } from "./session-requests-list";
import { TutorWeekCalendar } from "./tutor-week-calendar";
import { AvailabilityManager } from "./availability-manager";
import { AutoApproveToggle } from "./auto-approve-toggle";
import { GuideAddAvailabilityDialog } from "@/features/tutor/ui/guide-add-availability-dialog";
import { CourseManager } from "./course-manager";
import { TutorAvatar } from "../student/session-components/tutor-avatar";
import { Button } from "@/shared/ui/button";
import { MentrixaDrawer } from "@/shared/ui/drawer-patterns";
import {
  guideEarningsDrawerMessage,
  guideSessionRequestsDrawerMessage,
} from "@/shared/ui/drawer-messages-pure";
import { MentrixaCountBadge } from "@/shared/ui/badge-patterns";
import { formatDateInZone } from "@/shared/core/time-format";
import { TutorPayoutDashboard } from "./payout-dashboard";
import { TutorHubRealtimeRefresh } from "@/components/tutor-hub-realtime-refresh";
import { Typewriter } from "@/shared/ui/typewriter";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { TutorHeroGreeting } from "@/features/tutor/ui/tutor-hero-greeting";
import { TutorHeroDecor } from "@/features/tutor/ui/tutor-hero-decor";
import { HeroGuideBounce } from "@/features/tutor/ui/hero-guide-bounce";
import { PreSessionContextSection } from "@/features/pre-session-brief/pre-session-context-section";
import { GuideRankProgressCard } from "@/features/guide-rank/components/guide-rank-progress-card";
import { GuideRankBadge } from "@/features/guide-rank/components/guide-rank-badge";
import { GuideDemandSignalCard } from "@/features/demand-signal/components/guide-demand-signal-card";
import { GuideImpactDisclosure } from "@/shared/ui/disclosure-patterns";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import { GuideNotificationsPanel } from "@/features/notifications/guide-notifications-panel";
import { ChartSkeleton } from "@/shared/ui/skeleton-patterns";
import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import { GUIDE_SECTION_STICKY_VARIANT, landingStickyVariantForIndex } from "@/features/tutor/guide-sticky-variants";
import { guideApCalcVerified } from "@/features/tutor/guide-ap-calc-pure";
import { GUIDE_HOME } from "@/features/tutor/guide-home-copy-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

const TutorImpactTrendChart = dynamic(
  () => import("./tutor-impact-trend-chart").then((m) => m.TutorImpactTrendChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
);

const TutorEarningsChart = dynamic(
  () => import("./tutor-earnings-chart").then((m) => m.TutorEarningsChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
);

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function TutorCommandCenterClient({ 
  data, 
  greeting, 
  firstName 
}: { 
  data: TutorCommandCenterPayload;
  greeting: string;
  firstName: string;
}) {

  const [addOpen, setAddOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [earningsOpen, setEarningsOpen] = useState(false);
  const [slotsCreatedNotice, setSlotsCreatedNotice] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectParam = searchParams.get("connect");
  const sessionRequestsCopy = guideSessionRequestsDrawerMessage();
  const earningsCopy = guideEarningsDrawerMessage();

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

  const { metrics, earningsLast30Days, lateCancellationAlerts, sessionRequests, calendar } = data;
  const pending = metrics.pendingRequestCount;
  const apCalcVerified = guideApCalcVerified(data.tutorCourses);

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
    <main className={`${mentrixStudent.main} mentrix-student-type-scope`}>
      <header className={`${mentrixStudent.heroGradientLite} relative mb-8 overflow-hidden p-6 sm:p-8`}>
        <TutorHeroDecor />
        <HeroGuideBounce />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <TutorHeroGreeting greeting={greeting} firstName={firstName} />
            <div className="mt-1 text-sm text-white/90 h-[20px]">
              <Typewriter text={GUIDE_HOME.heroTagline} speed={40} waitTime={5000} />
            </div>
            
            <div className="mt-4 inline-flex flex-wrap items-center gap-3">
              <GuideRankBadge rankKey={data.guideRank} size="md" />
              <TutorAvatar 
                displayName={data.guideProfile.displayName} 
                emailPrefix={data.guideProfile.displayName} 
                avatarUrl={data.guideProfile.avatarUrl} 
                size="sm" 
              />
              <span className="text-sm font-medium text-white">{data.guideProfile.displayName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:items-end shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20" 
              onClick={() => {
                document.getElementById("skill-manager")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                {GUIDE_HOME.btnProficiency}
              </span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link href={`/tutor/${data.tutorId}`} className="inline-flex items-center gap-1.5">
                <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                {GUIDE_HOME.btnProfile}
              </Link>
            </Button>
            <Button type="button" size="sm" className="h-9 text-xs bg-white text-slate-900 hover:bg-slate-100" onClick={() => setAddOpen(true)}>
              <span className="inline-flex items-center gap-1.5">
                <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                {GUIDE_HOME.btnAddSlots}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <GuideAddAvailabilityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        apCalcVerified={apCalcVerified}
        defaultTimezone={data.tutorTimezone}
        sessionDefaultDurationMinutes={data.sessionDefaultDurationMinutes}
        onSlotsCreated={() => {
          setAddOpen(false);
          setSlotsCreatedNotice(true);
        }}
      />

      {/* Metrics */}
      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          {
            eyebrow: GUIDE_HOME.metrics.monthEarnings,
            value: formatUsd(metrics.earningsThisMonthCents),
            caption: metrics.stripePayoutCaption,
            highlight: false,
          },
          { eyebrow: GUIDE_HOME.metrics.sessionsWeek, value: String(metrics.sessionsThisWeek), highlight: false },
          {
            eyebrow: GUIDE_HOME.metrics.avgRating,
            value: metrics.avgRating != null ? metrics.avgRating.toFixed(1) : "—",
            highlight: false,
          },
          {
            eyebrow: GUIDE_HOME.metrics.responseRate,
            value: metrics.responseRatePercent != null ? `${metrics.responseRatePercent.toFixed(1)}%` : "—",
            highlight: false,
          },
          {
            eyebrow: GUIDE_HOME.metrics.requests,
            value: String(pending),
            highlight: pending > 0,
            alert: pending > 0,
          },
        ].map((metric, index) => (
          <GuideStickyNote
            key={metric.eyebrow}
            variant={landingStickyVariantForIndex(index)}
            compact
            className={metric.alert ? "border-red-200 bg-red-50/80" : undefined}
          >
            <div className={mentrixStudent.sectionEyebrowOnLight}>{metric.eyebrow}</div>
            <div
              className={`mt-2 text-2xl font-bold tabular-nums tracking-tight ${
                metric.alert ? "text-red-700" : mentrixStudent.textOnLight
              }`}
            >
              {metric.value}
            </div>
            {metric.caption ? (
              <p className={`mt-2 text-[11px] leading-snug font-medium ${mentrixStudent.textMutedOnLight}`}>
                {metric.caption}
              </p>
            ) : null}
          </GuideStickyNote>
        ))}
      </section>

      {lateCancellationAlerts.length > 0 && (
        <div
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">{GUIDE_HOME.lateCancelTitle}</p>
          <p className="mt-1 text-amber-900/90">{GUIDE_HOME.lateCancelBody}</p>
          <ul className="mt-2 list-inside list-disc text-xs text-amber-900/85">
            {lateCancellationAlerts.map((a) => (
              <li key={a.id}>
                {a.course} · {formatDateInZone(a.start_time, data.tutorTimezone)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mb-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <GuideRankProgressCard progress={data.rankProgress} />
        </div>
        <div className="lg:col-span-7">
          <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.impact} className="h-full">
            <h2 className={`mb-4 text-sm font-bold ${mentrixStudent.textOnLight}`}>
              {GUIDE_HOME.impactTrendTitle}
            </h2>
            <div className="rounded-xl border border-violet-100 bg-zinc-50/50 p-4">
              <TutorImpactTrendChart data={data.impactHistoryLast30Days} />
            </div>
          </GuideStickyNote>
        </div>
      </section>

      <GuideDemandSignalCard
        signals={data.demandSignals}
        onOpenAvailability={() => setAddOpen(true)}
      />

      <GuideNotificationsPanel
        notifications={data.guideNotifications}
        displayTimeZone={data.tutorTimezone}
      />

      {data.upcomingSessions.length > 0 ? (
        <PreSessionContextSection
          guideId={data.tutorId}
          upcomingSessions={data.upcomingSessions}
          displayTimeZone={data.tutorTimezone}
        />
      ) : null}

      {data.impactScores.filter((s) => s.sessionsCounted >= 3).length > 0 || data.impactVerdict ? (
        <section className="mb-8">
          <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.impact}>
            <h2 className={`mb-4 flex items-center gap-2 text-sm font-bold ${mentrixStudent.textOnLight}`}>
              <MentrixaVocabIcon name="impact-score" size={16} gold surface="light" title="Guide Impact Score" />
              {GUIDE_HOME.impactScoreTitle}
            </h2>
            {data.impactVerdict ? (
              <VerdictPanel verdict={data.impactVerdict} tone="light" className="mb-5" />
            ) : null}
            <div className="mb-4">
              <GuideImpactDisclosure />
            </div>
            {data.impactScores.filter((s) => s.sessionsCounted >= 3).length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {data.impactScores
                  .filter((s) => s.sessionsCounted >= 3)
                  .slice(0, 5)
                  .map((s) => (
                    <li key={s.subject} className="flex items-center justify-between py-3 text-sm">
                      <span className="font-medium text-slate-800">{s.subject}</span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums text-slate-500">
                        <MentrixaVocabIcon
                          name="impact-score"
                          size={12}
                          gold
                          surface="light"
                          title="Guide Impact Score"
                        />
                        {Math.round(s.impactScore)}/100
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
          </GuideStickyNote>
        </section>
      ) : null}

      {/* Actions + chart */}
      <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-slate-200 text-xs"
          onClick={() => setRequestsOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            {GUIDE_HOME.mobileRequests}
            <MentrixaCountBadge count={pending} color="danger" variant="soft" />
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-slate-200 text-xs"
          onClick={() => setEarningsOpen(true)}
        >
          {GUIDE_HOME.mobileEarnings}
        </Button>
      </div>

      <MentrixaDrawer
        isOpen={requestsOpen}
        onOpenChange={setRequestsOpen}
        placement="right"
        tone="light"
        brandKind="guide"
        title={sessionRequestsCopy.title}
        description={sessionRequestsCopy.description}
        bodyClassName="p-0"
      >
        <div className="p-4">
          <SessionRequestsList sessionRequests={sessionRequests} displayTimezone={data.tutorTimezone} />
          <p className={`mt-4 text-xs leading-relaxed ${mentrixStudent.textMutedOnLight}`}>
            {sessionRequestsCopy.verdict} {sessionRequestsCopy.nextAction}
          </p>
        </div>
      </MentrixaDrawer>

      <MentrixaDrawer
        isOpen={earningsOpen}
        onOpenChange={setEarningsOpen}
        placement="right"
        tone="light"
        brandKind="guide"
        title={earningsCopy.title}
        description={earningsCopy.description}
      >
        <div className="rounded-xl border border-violet-100 bg-zinc-50/50 p-4">
          <TutorEarningsChart data={earningsLast30Days} />
        </div>
        <p className={`mt-4 text-xs leading-relaxed ${mentrixStudent.textMutedOnLight}`}>
          {earningsCopy.verdict} {earningsCopy.nextAction}
        </p>
      </MentrixaDrawer>

      <div className="hidden gap-6 lg:grid lg:grid-cols-12">
        <section className="lg:col-span-7 min-w-0">
          <ScrollRevealCard className={mentrixStudent.card + " p-5 h-full"}>
            <div className="mb-4">
              <h2 className={`text-sm font-bold ${mentrixStudent.textOnLight}`}>{GUIDE_HOME.bookedRequestsTitle}</h2>
            
            </div>
            <SessionRequestsList sessionRequests={sessionRequests} displayTimezone={data.tutorTimezone} />
          </ScrollRevealCard>
        </section>

        <section className="lg:col-span-5 min-w-0">
          <ScrollRevealCard className={mentrixStudent.card + " p-5 h-full"}>
            <h2 className={`mb-4 text-sm font-bold ${mentrixStudent.textOnLight}`}>{GUIDE_HOME.earningsTitle}</h2>
            <div className="rounded-xl border border-violet-100 bg-zinc-50/50 p-4">
              <TutorEarningsChart data={earningsLast30Days} />
              <p className={`mt-3 text-[11px] font-medium leading-relaxed ${mentrixStudent.textMutedOnLight}`}>
                {GUIDE_HOME.earningsCaption}
              </p>
            </div>
          </ScrollRevealCard>
        </section>
      </div>

      {/* Calendar */}
      <section id="week-schedule" className="mt-8 min-w-0 scroll-mt-24">
        <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.schedule}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={`text-sm font-bold ${mentrixStudent.textOnLight}`}>{GUIDE_HOME.weekScheduleTitle}</h2>
              <p className={`text-[11px] font-medium ${mentrixStudent.textMutedOnLight}`}>{GUIDE_HOME.weekScheduleSub}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-full text-xs sm:w-auto border-slate-200"
              onClick={() => setAddOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                {GUIDE_HOME.btnAddSlots}
              </span>
            </Button>
          </div>
          <TutorWeekCalendar calendar={calendar} displayTimezone={data.tutorTimezone} />
        </GuideStickyNote>
      </section>

      {/* Expertise + availability controls */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-6 min-w-0">
          <CourseManager courses={data.tutorCourses} />
        </section>
        <section id="tutor-availability-slots" className="scroll-mt-24 lg:col-span-6 min-w-0">
          <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.availability}>
            <h2 className={`mb-3 text-sm font-semibold ${mentrixStudent.textOnLight}`}>{GUIDE_HOME.openSlotsTitle}</h2>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-violet-100 pb-4">
              <p className={`text-sm ${mentrixStudent.textMutedOnLight}`}>{GUIDE_HOME.autoApprove}</p>
              <AutoApproveToggle initialValue={data.autoApprove} />
            </div>
            <div className="max-h-[28rem] overflow-y-auto rounded-md border border-violet-100 bg-zinc-50/90 p-2">
              <AvailabilityManager
                availability={data.availability}
                displayTimezone={data.tutorTimezone}
              />
            </div>
          </GuideStickyNote>
        </section>
      </div>

      {/* Payout dashboard */}
      {data.payoutData && (
        <div id="payouts" className="mt-8 scroll-mt-24">
          <TutorPayoutDashboard
            data={data.payoutData}
            connectParam={connectParam}
          />
        </div>
      )}
    </main>
    </>
  );
}
