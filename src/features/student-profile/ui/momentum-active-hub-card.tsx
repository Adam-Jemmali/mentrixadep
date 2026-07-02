"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { formatMomentumRenewalLabel } from "@/features/payments/momentum-membership-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";

type MomentumActiveHubCardProps = {
  sessionCreditsRemaining: number;
  sessionCreditPeriodMonth: string | null;
  subscription: StudentSubscriptionRow | null;
};

function formatCreditExpiry(periodMonth: string | null): string | null {
  if (!periodMonth) return null;
  try {
    const start = new Date(`${periodMonth}T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(end);
  } catch {
    return null;
  }
}

export function MomentumActiveHubCard({
  sessionCreditsRemaining,
  sessionCreditPeriodMonth,
  subscription,
}: MomentumActiveHubCardProps) {
  const renewal = formatMomentumRenewalLabel(subscription);
  const creditExpiry = formatCreditExpiry(sessionCreditPeriodMonth);

  return (
    <section
      className={`${mentrixBrandUi.panelMuted} p-5 sm:p-6`}
      aria-label="Momentum membership status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-violet-300" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
              Momentum active
            </p>
          </div>
          <p className="mt-2 text-sm text-violet-100/90">
            {sessionCreditsRemaining > 0
              ? `You have ${sessionCreditsRemaining} included session credit${sessionCreditsRemaining === 1 ? "" : "s"} this month${creditExpiry ? ` — book before ${creditExpiry}` : ""}.`
              : "Your included session credit for this month is used. Extra sessions book at the member rate."}
          </p>
          {renewal ? (
            <p className="mt-2 text-xs text-violet-200/80">{renewal}</p>
          ) : null}
          <p className="mt-3 text-xs font-semibold text-violet-100">
            Weekly Movement Receipt by email, priority retests, grid timeline, Loop Report, and progress archive are unlocked on your hub.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-violet-200">
            <Link href="/student/progress" className="underline hover:text-white">
              Progress archive
            </Link>
            <Link href="/student/loop" className="underline hover:text-white">
              Loop Report
            </Link>
            <Link href="/student/mastery" className="underline hover:text-white">
              Grid timeline
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button asChild className={mentrixBrandUi.heroBtn}>
            <Link href="/student#browse-guides">Book a Guide session</Link>
          </Button>
          <Button asChild variant="outline" className="border-violet-500/35 text-violet-100">
            <Link href="/student/subscribe">Manage plan</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
