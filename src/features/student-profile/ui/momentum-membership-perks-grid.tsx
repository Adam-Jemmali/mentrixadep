"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import {
  buildMomentumMembershipExclusivePerks,
  MOMENTUM_MEMBERSHIP_ONLY_BADGE,
} from "@/features/payments/momentum-membership-perks-pure";
import {
  MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW,
  MOMENTUM_MEMBERSHIP_UNLOCK_COPY,
} from "@/features/payments/momentum-membership-pure";
import { tierComparisonFeatureIcon } from "@/features/pricing/tier-comparison-feature-icon-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { cn } from "@/shared/core/utils";

type MomentumMembershipPerksGridProps = {
  momentumActive: boolean;
  className?: string;
};

export function MomentumMembershipPerksGrid({
  momentumActive,
  className,
}: MomentumMembershipPerksGridProps) {
  const perks = buildMomentumMembershipExclusivePerks();

  return (
    <div className={className}>
      <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", mentrixHubSurfaces.inkMuted)}>
        {momentumActive ? MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW : MOMENTUM_MEMBERSHIP_ONLY_BADGE}
      </p>
      <p className={cn("mt-1 text-sm font-semibold", mentrixHubSurfaces.inkBody)}>
        {momentumActive
          ? "Every perk below is active on your account."
          : "These perks unlock only with Momentum membership."}
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {perks.map((perk) => {
          const icon = tierComparisonFeatureIcon(perk.feature);
          const inner = (
            <>
              <MentrixaVocabIcon name={icon} size={18} className="mt-0.5 shrink-0 text-[#6366F1]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{perk.feature}</p>
                  {!momentumActive ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-violet-800">
                      {MOMENTUM_MEMBERSHIP_ONLY_BADGE}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {momentumActive ? perk.memberValue : MOMENTUM_MEMBERSHIP_UNLOCK_COPY}
                </p>
              </div>
              {!momentumActive ? (
                <Lock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              ) : null}
            </>
          );

          if (momentumActive) {
            return (
              <li key={perk.id}>
                <Link
                  href={perk.href}
                  className="flex items-start gap-3 rounded-xl border border-violet-200 bg-white px-3 py-3 transition hover:border-violet-400 hover:bg-violet-50/50"
                >
                  {inner}
                </Link>
              </li>
            );
          }

          return (
            <li
              key={perk.id}
              className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3"
            >
              {inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
