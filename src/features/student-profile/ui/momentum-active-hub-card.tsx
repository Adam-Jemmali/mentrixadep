"use client";

import Link from "next/link";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { formatMomentumRenewalLabel } from "@/features/payments/momentum-membership-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { cn } from "@/shared/core/utils";

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
      className={cn(mentrixStudent.hubSticky, "p-5 sm:p-6")}
      aria-label="Momentum membership status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <VocabSectionHeading name="momentum" label="Momentum active" surface="light" labelClassName="text-[#6366F1]" />
          <p className={cn("mt-2 text-sm", mentrixHubSurfaces.inkBody)}>
            {sessionCreditsRemaining > 0
              ? `You have ${sessionCreditsRemaining} included session credit${sessionCreditsRemaining === 1 ? "" : "s"} this month${creditExpiry ? ` — book before ${creditExpiry}` : ""}.`
              : "Your included session credit for this month is used. Extra sessions book at the member rate."}
          </p>
          {renewal ? (
            <p className={cn("mt-2 text-xs", mentrixHubSurfaces.inkMuted)}>{renewal}</p>
          ) : null}
          <p className={cn("mt-3 text-xs font-semibold", mentrixHubSurfaces.inkBody)}>
            Weekly Movement Receipt by email, priority retests, grid timeline, Loop Report, and progress archive are unlocked on your hub.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[#4F46E5]">
            <Link href="/student/progress" className="underline hover:text-[#6D28D9]">
              Progress archive
            </Link>
            <Link href="/student/loop" className="underline hover:text-[#6D28D9]">
              Loop Report
            </Link>
            <Link href="/student/receipts" className="underline hover:text-[#6D28D9]">
              Receipt archive
            </Link>
            <Link href="/student/mastery" className="underline hover:text-[#6D28D9]">
              Grid timeline
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button asChild className={mentrixStudent.hubBtnSolid}>
            <Link href="/student#browse-guides">Book a Guide session</Link>
          </Button>
          <Button asChild variant="outline" className="border-[#6366F1] text-[#4F46E5] hover:bg-[#EDE9FE]">
            <Link href="/student/subscribe">Manage plan</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
