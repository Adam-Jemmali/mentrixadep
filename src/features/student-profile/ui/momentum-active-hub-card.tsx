"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { formatMomentumRenewalLabel } from "@/features/payments/momentum-membership-pure";
import { momentumCompRenewalLabel } from "@/features/entitlements/momentum-comp-members-pure";
import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { MomentumMembershipMemberChip } from "@/features/student-profile/ui/momentum-membership-member-chip";
import { MomentumMembershipPerksGrid } from "@/features/student-profile/ui/momentum-membership-perks-grid";
import { HubVocabIcon } from "@/features/student-profile/ui/hub-vocab-icon";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
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
            <HubVocabIcon name="session" title="Session credit" size={28} />
            <p className={cn("text-sm", mentrixHubSurfaces.inkBody)}>
              {sessionCreditsRemaining > 0
                ? `You have ${sessionCreditsRemaining} included session credit${sessionCreditsRemaining === 1 ? "" : "s"} this month${creditExpiry ? `. Book before ${creditExpiry}.` : "."}`
                : "Your included session credit for this month is used. Extra sessions book at the Momentum membership session rate."}
            </p>
          </div>
          {renewal ? (
            <div className="mt-2 flex items-start gap-3">
              <HubVocabIcon name="day" title="Renewal" size={28} />
              <p className={cn("text-xs", mentrixHubSurfaces.inkMuted)}>{renewal}</p>
            </div>
          ) : null}
          <MomentumMembershipPerksGrid momentumActive className="mt-4" />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button asChild className={mentrixStudent.hubBtnSolid}>
            <Link href="/student#browse-guides">Book a Guide session</Link>
          </Button>
          <Button asChild variant="outline" className="border-[var(--mx-indigo)] text-[#4F46E5] hover:bg-violet-100">
            <Link href="/student/subscribe" className="inline-flex items-center gap-2">
              <MentrixaVocabIcon name="settings" size={18} surface="light" title="Manage" />
              Manage Momentum membership
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
