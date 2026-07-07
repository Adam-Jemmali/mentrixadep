"use client";

import { GUIDE_RANKS } from "@/features/guide-rank/constants";
import { GuideRankBadgeIcon } from "@/features/guide-rank/components/guide-rank-icons";
import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_GUIDE_LADDER } from "@/features/marketing/landing/landing-copy-pure";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";

/** Guide Impact ladder — separate from Mentrixer XP tiers. */
export function GuideRankLadderPreview({ className }: { className?: string }) {
  return (
    <LandingStickyNote variant="dog-ear" className={cn("mt-10 rotate-[0.3deg] px-4 py-5 sm:px-6", className)}>
      <p className={`text-center ${landingHub.eyebrow}`}>{LANDING_GUIDE_LADDER.eyebrow}</p>
      <p className={cn("mt-1 text-center", landingHub.title)}>{LANDING_GUIDE_LADDER.title}</p>
      <p className={cn("mt-2 text-center", landingHub.bodySm)}>{LANDING_GUIDE_LADDER.sentence}</p>
      <ol className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {GUIDE_RANKS.map((rank, index) => (
          <li key={rank.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#A5B4FC] bg-white shadow-[2px_3px_0_rgba(11,18,32,0.12)] sm:h-14 sm:w-14"
                title={rank.label}
              >
                <GuideRankBadgeIcon rankKey={rank.key} color={rank.color} className="h-8 w-8 sm:h-9 sm:w-9" />
              </div>
              <span className="max-w-[4.5rem] text-center text-[9px] font-bold uppercase tracking-wide text-[#475569] lp-body">
                {rank.label}
              </span>
            </div>
            {index < GUIDE_RANKS.length - 1 ? (
              <span className="mb-6 text-sm text-[#6366F1]/60" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </LandingStickyNote>
  );
}
