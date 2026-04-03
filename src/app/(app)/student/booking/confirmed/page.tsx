import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/time-format";
import { formatDurationLabel, getSessionDurationMinutes } from "@/lib/stripe-checkout-copy";
import { AddToCalendarButton } from "./add-to-calendar-button";
import { splitSessionPriceCents } from "@/lib/booking-pricing";
import { formatUsdFromCents } from "@/lib/duel-reward";

interface PageProps {
  searchParams?: { request?: string };
}

export default async function BookingConfirmedPage({ searchParams }: PageProps) {
  const user = await requireRole(["student", "admin"]);
  const requestId = searchParams?.request?.trim();
  if (!requestId) {
    notFound();
  }

  const supabase = await createClient();

  const { data: sr, error: srErr } = await supabase
    .from("session_requests")
    .select("id, status, created_at, availability_id, tutor_id")
    .eq("id", requestId)
    .eq("student_id", user.id)
    .single();

  if (srErr || !sr) {
    notFound();
  }

  const { data: availability, error: avErr } = await supabase
    .from("availability")
    .select("course, start_time, end_time, price_per_session")
    .eq("id", sr.availability_id)
    .single();

  if (avErr || !availability) {
    notFound();
  }

  const durationMin = getSessionDurationMinutes(availability.start_time, availability.end_time);
  const price = splitSessionPriceCents(availability.price_per_session ?? 2500);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-md border border-slate-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Payment received
          </p>
          <h1 className="mt-2 text-xl font-medium tracking-tight text-slate-900">
            Session request sent
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your guide will confirm soon{sr.status === "approved" ? " — this slot is approved." : "."}{" "}
            You will get email updates. If the guide declines, Stripe refunds you automatically.
          </p>

          <div className="mt-6 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-900">{availability.course}</p>
            <p className="font-mono text-slate-700">
              {formatDate(availability.start_time)} · {formatTime(availability.start_time)} –{" "}
              {formatTime(availability.end_time)} · {formatDurationLabel(durationMin)}
            </p>
            <p className="pt-2 text-xs text-slate-500">
              Charged: {formatUsdFromCents(price.totalCents)} (session {formatUsdFromCents(price.sessionCents)}{" "}
              + platform {formatUsdFromCents(price.platformFeeCents)})
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <AddToCalendarButton
              requestId={sr.id}
              title={`Mentrixa · ${availability.course}`}
              description={`Learner session · Request ${sr.id.slice(0, 8)}… · ${formatDate(availability.start_time)}`}
              startIso={availability.start_time}
              endIso={availability.end_time}
            />
            <Button asChild variant="default" className="bg-slate-900 hover:bg-slate-800">
              <Link href="/student">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
