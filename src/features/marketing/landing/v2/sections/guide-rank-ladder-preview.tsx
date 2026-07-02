"use client";

import { GUIDE_RANKS } from "@/features/guide-rank/constants";
import { GuideRankBadgeIcon } from "@/features/guide-rank/components/guide-rank-icons";
import { cn } from "@/shared/core/utils";

/** Practitioner → Elite strip for the landing For Guides path. */
export function GuideRankLadderPreview({ className }: { className?: string }) {
  return (
    <div className={cn("mt-10 rounded-2xl border border-violet-400/25 bg-violet-950/35 px-4 py-5 sm:px-6", className)}>
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
        Guide Impact ladder
      </p>
      <p className="mt-1 text-center text-xs text-violet-200/80">
        Impact Score moves you from Practitioner to Elite. Not stars. Verified movement.
      </p>
      <ol className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {GUIDE_RANKS.map((rank, index) => (
          <li key={rank.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/80 shadow-lg sm:h-14 sm:w-14"
                title={rank.label}
              >
                <GuideRankBadgeIcon rankKey={rank.key} color={rank.color} className="h-8 w-8 sm:h-9 sm:w-9" />
              </div>
              <span className="max-w-[4.5rem] text-center text-[9px] font-bold uppercase tracking-wide text-violet-200/90">
                {rank.label}
              </span>
            </div>
            {index < GUIDE_RANKS.length - 1 ? (
              <span className="mb-6 text-sm text-violet-500/60" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
