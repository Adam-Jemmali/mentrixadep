"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ScrollRevealCard } from "@/components/ui/card";
import type { TutorCommandCenterPayload } from "@/app/actions/tutor";
import { SessionRequestsList } from "./session-requests-list";
import { TutorWeekCalendar } from "./tutor-week-calendar";
import { AvailabilityManager } from "./availability-manager";
import { AutoApproveToggle } from "./auto-approve-toggle";
import { CreateAvailabilityCard } from "@/components/ui/create-availability-card";
import { CourseManager } from "./course-manager";
import { TutorAvatar } from "../student/session-components/tutor-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateInZone } from "@/lib/time-format";
import { TutorPayoutDashboard } from "./payout-dashboard";
import { Typewriter } from "@/components/ui/typewriter";
import { mentrixTutor } from "@/lib/mentrix-tutor-ui";
import { TutorHeroGreeting } from "@/components/tutor/tutor-hero-greeting";
import { TutorHeroDecor } from "@/components/tutor/tutor-hero-decor";
import { HeroGuideBounce } from "@/components/tutor/hero-guide-bounce";
import { TutorHubRealtimeRefresh } from "@/components/tutor-hub-realtime-refresh";

const TutorEarningsChart = dynamic(
  () => import("./tutor-earnings-chart").then((m) => m.TutorEarningsChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[220px] w-full min-w-0 animate-pulse rounded bg-slate-100"
        aria-hidden
      />
    ),
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
  const [slotsCreatedNotice, setSlotsCreatedNotice] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectParam = searchParams.get("connect");

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

  return (
    <div className={mentrixTutor.pageBg}>
    <TutorHubRealtimeRefresh tutorId={data.tutorId} />
    {slotsCreatedNotice ? (
      <div
        role="alert"
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[200] w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center shadow-lg"
      >
        <p className="text-sm font-semibold text-slate-900">Slots created</p>
        <p className="mt-1 text-xs text-slate-600">
          Taking you to your availability slots…
        </p>
      </div>
    ) : null}
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className={`${mentrixTutor.heroGradient} mb-10 p-6 sm:p-8 relative overflow-hidden`}>
        <TutorHeroDecor />
        <HeroGuideBounce />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <TutorHeroGreeting greeting={greeting} firstName={firstName} />
            <div className="mt-1 text-sm text-white/90 h-[20px]">
              <Typewriter text="Manage bookings, payouts, and your week." speed={40} waitTime={5000} />
            </div>
            
            <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm shadow-sm">
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
                document.getElementById("course-manager")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                Manage Courses
              </span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs border-white/20 bg-white/10 text-white hover:bg-white/20" asChild>
              <Link href={`/tutor/${data.tutorId}`} className="inline-flex items-center gap-1.5">
                <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                Edit Profile & Settings
              </Link>
            </Button>
            <Button type="button" size="sm" className="h-9 text-xs bg-white text-slate-900 hover:bg-slate-100" onClick={() => setAddOpen(true)}>
              <span className="inline-flex items-center gap-1.5">
                <img src="/icons/guide.svg" alt="" width={16} height={16} className="shrink-0" />
                Add availability
              </span>
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[95vh] max-w-2xl overflow-y-auto p-0 border-none bg-transparent shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Add availability</DialogTitle>
            <DialogDescription>
              Learners only see slots that match your listed courses.
            </DialogDescription>
          </DialogHeader>
          <CreateAvailabilityCard
            tutorCourseNames={data.tutorCourses.map((c) => c.course_name)}
            defaultTimezone={data.tutorTimezone}
            sessionDefaultDurationMinutes={data.sessionDefaultDurationMinutes}
            onSlotsCreated={() => {
              setAddOpen(false);
              setSlotsCreatedNotice(true);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Metrics */}
      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className={mentrixTutor.card + " p-5"}>
          <div className={mentrixTutor.sectionEyebrow}>
            This month&apos;s earnings
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
            {formatUsd(metrics.earningsThisMonthCents)}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500 font-medium">{metrics.stripePayoutCaption}</p>
        </div>

        <div className={mentrixTutor.card + " p-5"}>
          <div className={mentrixTutor.sectionEyebrow}>
            Sessions this week
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
            {metrics.sessionsThisWeek}
          </div>
        </div>

        <div className={mentrixTutor.card + " p-5"}>
          <div className={mentrixTutor.sectionEyebrow}>
            Average rating
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
            {metrics.avgRating != null ? metrics.avgRating.toFixed(1) : "—"}
          </div>
        </div>

        <div className={mentrixTutor.card + " p-5"}>
          <div className={mentrixTutor.sectionEyebrow}>
            Response rate
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900 tracking-tight">
            {metrics.responseRatePercent != null ? `${metrics.responseRatePercent.toFixed(1)}%` : "—"}
          </div>
        </div>

        <div
          className={`${mentrixTutor.card} p-5 ${
            pending > 0 ? "border-red-200 bg-red-50/50" : ""
          }`}
        >
          <div
            className={`${mentrixTutor.sectionEyebrow} ${
              pending > 0 ? "text-red-600" : ""
            }`}
          >
            New session requests
          </div>
          <div
            className={`mt-2 text-2xl font-bold tabular-nums ${
              pending > 0 ? "text-red-700" : "text-slate-900"
            } tracking-tight`}
          >
            {pending}
          </div>
        </div>
      </section>

      {lateCancellationAlerts.length > 0 && (
        <div
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">Short-notice learner cancellation</p>
          <p className="mt-1 text-amber-900/90">
            A learner cancelled within 24 hours, so check Stripe for the final refund settlement.
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-amber-900/85">
            {lateCancellationAlerts.map((a) => (
              <li key={a.id}>
                {a.course} · {formatDateInZone(a.start_time, data.tutorTimezone)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions + chart */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 min-w-0">
          <ScrollRevealCard className={mentrixTutor.card + " p-5 h-full"}>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">Requested booked sessions</h2>
            
            </div>
            <SessionRequestsList sessionRequests={sessionRequests} displayTimezone={data.tutorTimezone} />
          </ScrollRevealCard>
        </section>

        <section className="lg:col-span-5 min-w-0">
          <ScrollRevealCard className={mentrixTutor.card + " p-5 h-full"}>
            <h2 className="mb-4 text-sm font-bold text-slate-900">Earnings (last 30 days)</h2>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <TutorEarningsChart data={earningsLast30Days} />
              <p className="mt-3 text-[11px] text-slate-500 font-medium leading-relaxed">
                Totals from completed sessions (recognized when the session ends).
              </p>
            </div>
          </ScrollRevealCard>
        </section>
      </div>

      {/* Calendar */}
      <section id="week-schedule" className="mt-8 min-w-0 scroll-mt-24">
        <ScrollRevealCard className={mentrixTutor.card + " p-6"}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Week&apos;s Schedule</h2>
              <p className="text-[11px] text-slate-500 font-medium">View and manage your availability slots</p>
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
                Add availability
              </span>
            </Button>
          </div>
          <TutorWeekCalendar calendar={calendar} displayTimezone={data.tutorTimezone} />
        </ScrollRevealCard>
      </section>

      {/* Expertise + availability controls */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-6 min-w-0">
          <CourseManager courses={data.tutorCourses} />
        </section>
        <section id="tutor-availability-slots" className="scroll-mt-24 lg:col-span-6 min-w-0">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Open slots</h2>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <p className="text-sm text-slate-700">Auto-approve bookings</p>
              <AutoApproveToggle initialValue={data.autoApprove} />
            </div>
            <div className="max-h-[28rem] overflow-y-auto rounded-md border border-slate-100 bg-slate-50/90 p-2">
              <AvailabilityManager
                availability={data.availability}
                displayTimezone={data.tutorTimezone}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Payout dashboard */}
      {data.payoutData && (
        <div className="mt-8">
          <TutorPayoutDashboard
            data={data.payoutData}
            connectParam={connectParam}
          />
        </div>
      )}
      </div>
    </div>
  );
}
