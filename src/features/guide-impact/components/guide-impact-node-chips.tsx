"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/core/utils";
import {
  formatImpactNodeVerdict,
  impactNodeScoreToState,
  IMPACT_NODE_SCORE_CLASS,
  sortImpactNodesByLift,
  type GuideImpactNodeEntry,
} from "@/features/guide-impact/impact-score-pure";
import { MentrixaTooltip } from "@/shared/ui/tooltip-patterns";
import { MentrixaChip } from "@/shared/ui/chip-patterns";

export function GuideImpactNodeChips({
  entries,
  className,
}: {
  entries: GuideImpactNodeEntry[];
  className?: string;
}) {
  const visible = sortImpactNodesByLift(entries).filter((e) => e.studentsCounted >= 3);
  if (visible.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
          Guide Impact Score
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Verified first answers on new skill nodes after sessions with this Guide.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((entry) => {
          const state = impactNodeScoreToState(entry.impactScore);
          const isVerified = state === "verified";
          const visual =
            state === "verified"
              ? "verified"
              : state === "proficient"
                ? "success"
                : state === "weak"
                  ? "warning"
                  : "default";
          return (
            <MentrixaTooltip
              key={entry.skillNodeId}
              tone="light"
              placement="top"
              brandKind="guide"
              content={<p className="max-w-[18rem] leading-relaxed">{formatImpactNodeVerdict(entry)}</p>}
            >
              <span className="inline-flex cursor-help">
                <MentrixaChip visual={visual} brandKind="guide" className="normal-case tracking-normal text-xs">
                  <span className="max-w-[12rem] truncate">{entry.nodeName}</span>
                  <span className={cn("font-black tabular-nums", IMPACT_NODE_SCORE_CLASS[state])}>
                    {Math.round(entry.impactScore)}
                  </span>
                  {isVerified ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--mx-navy)]" strokeWidth={3} aria-hidden />
                  ) : null}
                </MentrixaChip>
              </span>
            </MentrixaTooltip>
          );
        })}
      </div>
    </section>
  );
}
