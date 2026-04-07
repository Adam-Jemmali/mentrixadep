"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { TutorCommandCenterPayload } from "@/app/actions/tutor";
import { SessionRequestsList } from "./session-requests-list";
import { TutorEarningsChart } from "./tutor-earnings-chart";
import { TutorWeekCalendar } from "./tutor-week-calendar";
import { AvailabilityManager } from "./availability-manager";
import { AutoApproveToggle } from "./auto-approve-toggle";
import { CreateAvailabilityForm } from "./create-availability-form";
import { CourseManager } from "./course-manager";
import { useAdminViewContext } from "@/components/admin-view-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/time-format";
import { TutorPayoutDashboard } from "./payout-dashboard";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";


function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function TutorCommandCenterClient({ data }: { data: TutorCommandCenterPayload }) {
  const { viewingAsUserId } = useAdminViewContext();
  const [addOpen, setAddOpen] = useState(false);
  const searchParams = useSearchParams();
  const connectParam = searchParams.get("connect");
  const studioHref = viewingAsUserId
    ? `/tutor/sessions-ai?tutorId=${viewingAsUserId}`
    : "/tutor/sessions-ai";

  const { metrics, earningsLast30Days, lateCancellationAlerts, sessionRequests, calendar } = data;
  const pending = metrics.pendingRequestCount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-slate-900">Guide center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage bookings, payouts, and your week.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
            {data.guideProfile.avatarUrl ? (
              <Image
                src={data.guideProfile.avatarUrl}
                alt={data.guideProfile.displayName}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                {data.guideProfile.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-slate-700">{data.guideProfile.displayName}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href="/settings" className="inline-flex items-center gap-1.5">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={studioHref} className="inline-flex items-center gap-1.5">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
              Studio output
            </Link>
          </Button>
          <Button type="button" size="sm" className="h-8 text-xs  " onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
              Add availability
            </span>
          </Button>
        </div>
      </header>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add availability</DialogTitle>
            <DialogDescription>
              Learners only see slots that match your listed courses.
            </DialogDescription>
          </DialogHeader>
          <CreateAvailabilityForm
            tutorCourseNames={data.tutorCourses.map((c) => c.course_name)}
            defaultTimezone={data.tutorTimezone}
          />
        </DialogContent>
      </Dialog>

      {/* Metrics */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            This month&apos;s earnings
          </div>
          <div className="mt-2 text-xl font-medium tabular-nums text-slate-900">
            {formatUsd(metrics.earningsThisMonthCents)}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">{metrics.stripePayoutCaption}</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Sessions this week
          </div>
          <div className="mt-2 text-xl font-medium tabular-nums text-slate-900">
            {metrics.sessionsThisWeek}
          </div>
      
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Average rating
          </div>
          <div className="mt-2 text-xl font-medium tabular-nums text-slate-900">
            {metrics.avgRating != null ? metrics.avgRating.toFixed(1) : "—"}
          </div>
      
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Response rate
          </div>
          <div className="mt-2 text-xl font-medium tabular-nums text-slate-900">
            {metrics.responseRatePercent != null ? `${metrics.responseRatePercent.toFixed(1)}%` : "—"}
          </div>
        
        </div>

        <div
          className={`rounded-md border p-4 ${
            pending > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`text-[11px] font-medium uppercase tracking-wide ${
              pending > 0 ? "text-red-700" : "text-slate-500"
            }`}
          >
            New session requests
          </div>
          <div
            className={`mt-2 text-xl font-medium tabular-nums ${
              pending > 0 ? "text-red-800" : "text-slate-900"
            }`}
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
                {a.course} · {formatDate(a.start_time)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions + chart */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Action items</h2>
          <SessionRequestsList sessionRequests={sessionRequests} />
        </section>

        <section className="lg:col-span-5">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Earnings (last 30 days)</h2>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <TutorEarningsChart data={earningsLast30Days} />
            <p className="mt-2 text-[11px] text-slate-500">
              Totals from completed sessions (recognized when the session ends).
            </p>
          </div>
        </section>
      </div>

      {/* Calendar */}
      <section className="mt-8 rounded-md border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">This + next week</h2>
           
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full text-xs sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <span className="inline-flex items-center gap-1.5">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={16} height={16} className="h-4 w-4" />
              Add availability
            </span>
          </Button>
        </div>
        <TutorWeekCalendar calendar={calendar} />
      </section>

      {/* Expertise + availability controls */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-6">
          <CourseManager courses={data.tutorCourses} />
        </section>
        <section className="lg:col-span-6">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Open slots</h2>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <p className="text-sm text-slate-700">Auto-approve bookings</p>
              <AutoApproveToggle initialValue={data.autoApprove} />
            </div>
            <div className="max-h-[28rem] overflow-y-auto">
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
  );
}
