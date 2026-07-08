"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/core/utils";
import {
  formatImpactNodeChipLabel,
  impactNodeScoreToState,
  IMPACT_NODE_SCORE_CLASS,
  type GuideImpactRollingNodeChip,
} from "@/features/guide-impact/impact-score-pure";
import { MentrixaChip } from "@/shared/ui/chip-patterns";

export function GuideBrowseImpactChips({
  chips,
  className,
}: {
  chips: GuideImpactRollingNodeChip[];
  className?: string;
}) {
  if (chips.length === 0) {
    return (
      <p className={cn("text-sm text-[#64748B]", className)}>
        Impact Score builds after counted sessions on skill nodes.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((chip) => {
        const state = impactNodeScoreToState(chip.impactScore);
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
          <span
            key={chip.skillNodeId}
            title={formatImpactNodeChipLabel(chip.nodeName, chip.impactScore)}
          >
            <MentrixaChip
              visual={visual}
              brandKind="guide"
              className="normal-case tracking-normal text-xs"
            >
              <span className="max-w-[10rem] truncate">{chip.nodeName}</span>
              <span className={cn("font-black tabular-nums", IMPACT_NODE_SCORE_CLASS[state])}>
                {Math.round(chip.impactScore)}
              </span>
              {isVerified ? (
                <Check className="h-3 w-3 shrink-0 text-[#0B1220]" strokeWidth={3} aria-hidden />
              ) : null}
            </MentrixaChip>
          </span>
        );
      })}
    </div>
  );
}
