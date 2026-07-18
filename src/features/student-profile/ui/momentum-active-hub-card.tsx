"use client";

import Link from "next/link";
import { CalendarCheck, Settings2, Ticket } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { formatMomentumRenewalLabel } from "@/features/payments/momentum-membership-pure";
import { momentumCompRenewalLabel } from "@/features/entitlements/momentum-comp-members-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { MomentumMembershipMemberChip } from "@/features/student-profile/ui/momentum-membership-member-chip";
import { MomentumMembershipPerksGrid } from "@/features/student-profile/ui/momentum-membership-perks-grid";
import { cn } from "@/shared/core/utils";

type MomentumActiveHubCardProps = {
  sessionCreditsRemaining: number;
  sessionCreditPeriodMonth: string | null;
  subscription: StudentSubscriptionRow | null;
  momentumCompMember?: boolean;
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

function HubIconChip({ icon: Icon }: { icon: typeof Ticket }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] text-white shadow-sm">
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
    </span>
  );
}

export function MomentumActiveHubCard({
  sessionCreditsRemaining,
  sessionCreditPeriodMonth,
  subscription,
  momentumCompMember = false,
}: MomentumActiveHubCardProps) {
  const renewal =
    formatMomentumRenewalLabel(subscription, { compMember: momentumCompMember }) ??
    (momentumCompMember ? momentumCompRenewalLabel(true) : null);
  const creditExpiry = formatCreditExpiry(sessionCreditPeriodMonth);

  return (
    <section
      className={cn(mentrixStudent.hubSticky, "p-5 sm:p-6")}
      aria-label="Momentum membership status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MomentumMembershipMemberChip />
          </div>
          <div className="mt-3 flex items-start gap-3">
            <HubIconChip icon={Ticket} />
            <p className={cn("text-sm", mentrixHubSurfaces.inkBody)}>
              {sessionCreditsRemaining > 0
                ? `You have ${sessionCreditsRemaining} included session credit${sessionCreditsRemaining === 1 ? "" : "s"} this month${creditExpiry ? `. Book before ${creditExpiry}.` : "."}`
                : "Your included session credit for this month is used. Extra sessions book at the Momentum membership session rate."}
            </p>
          </div>
          {renewal ? (
            <div className="mt-2 flex items-start gap-3">
              <HubIconChip icon={CalendarCheck} />
              <p className={cn("text-xs", mentrixHubSurfaces.inkMuted)}>{renewal}</p>
            </div>
          ) : null}
          <MomentumMembershipPerksGrid momentumActive className="mt-4" />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button asChild className={mentrixStudent.hubBtnSolid}>
            <Link href="/student#browse-guides">Book a Guide session</Link>
          </Button>
          <Button asChild variant="outline" className="border-[#6366F1] text-[#4F46E5] hover:bg-[#EDE9FE]">
            <Link href="/student/subscribe" className="inline-flex items-center gap-2">
              <Settings2 className="h-4 w-4" aria-hidden />
              Manage Momentum membership
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
