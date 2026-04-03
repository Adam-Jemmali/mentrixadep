"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
          <h1 className="text-lg font-medium tracking-tight text-slate-900">Command center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bookings, payouts, and your week at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={studioHref}>Studio output</Link>
          </Button>
          <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
            Add availability
          </Button>
        </div>
      </header>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add availability</DialogTitle>
            <DialogDescription>
              Learners only see slots that match courses on your profile.
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
          <p className="mt-2 text-[11px] text-slate-500">Upcoming, this calendar week (UTC).</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Average rating
          </div>
          <div className="mt-2 text-xl font-medium tabular-nums text-slate-900">
            {metrics.avgRating != null ? metrics.avgRating.toFixed(1) : "—"}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">All-time from learners.</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Response rate
          </div>
          <div className="mt-2 text-xl font-medium tabular-nums text-slate-900">
            {metrics.responseRatePercent != null ? `${metrics.responseRatePercent.toFixed(1)}%` : "—"}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Session requests accepted or declined within 24 hours.
          </p>
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
          <p className="mt-2 text-[11px] text-slate-500">Pending your response.</p>
        </div>
      </section>

      {lateCancellationAlerts.length > 0 && (
        <div
          className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">Short-notice learner cancellation</p>
          <p className="mt-1 text-amber-900/90">
            A learner cancelled within 24 hours of the scheduled start. Refunds follow Stripe and your
            account settings—check the Stripe Dashboard for the final settlement.
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
            <h2 className="text-sm font-medium text-slate-900">This week</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Open slots (green), bookings (blue), past (gray). Click a future open slot to remove it.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full text-xs sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            Add availability
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
