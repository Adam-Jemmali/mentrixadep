"use client";

import type { CSSProperties } from "react";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import { VERIFIED_GOLD } from "@/features/mastery-grid/mastery-grid-pure";
import { MASTERY_GRID_LEGEND } from "@/features/mastery-grid/mastery-grid-legend-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

const STATE_SQUARE_CLASS: Record<MasteryNodeState, string> = {
  none: "bg-slate-200/90 border-slate-300/80",
  weak: "bg-amber-300/90 border-amber-400/70",
  proficient: "bg-green-600/90 border-green-700/70",
  verified: "border-[var(--mx-gold)]/90",
};

function squareStyle(state: MasteryNodeState): CSSProperties | undefined {
  return state === "verified" ? { backgroundColor: `${VERIFIED_GOLD}E6` } : undefined;
}

function LegendGlyph({ state }: { state: MasteryNodeState }) {
  if (state === "verified") {
    return (
      <span
        className={cn(
          "inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border",
          STATE_SQUARE_CLASS.verified,
        )}
        style={squareStyle("verified")}
        aria-hidden
      >
        <MentrixaVocabIcon name="verified" size={9} gold className="text-[var(--mx-navy)]" />
      </span>
    );
  }
  return (
    <span
      className={cn("h-2.5 w-2.5 shrink-0 rounded-[2px] border", STATE_SQUARE_CLASS[state])}
      style={squareStyle(state)}
      aria-hidden
    />
  );
}

export function MasteryGridLegend({
  surface = "light",
  compact = false,
  className,
}: {
  surface?: "light" | "dark";
  compact?: boolean;
  className?: string;
}) {
  const isDark = surface === "dark";

  return (
    <div
      role="list"
      aria-label="Mastery grid color key"
      className={cn(
        compact ? "flex flex-wrap gap-x-3 gap-y-1.5" : "grid gap-2 sm:grid-cols-2",
        className,
      )}
    >
      {MASTERY_GRID_LEGEND.map((item) => (
        <div
          key={item.state}
          role="listitem"
          className={cn(
            "inline-flex min-w-0 items-start gap-2",
            compact && "max-w-[11rem]",
          )}
        >
          <LegendGlyph state={item.state} />
          <p
            className={cn(
              "min-w-0 text-[11px] leading-snug",
              isDark ? "text-white/80" : "text-[#475569]",
            )}
          >
            <span
              className={cn(
                "font-bold uppercase tracking-[0.08em]",
                isDark ? "text-white" : "text-[#334155]",
              )}
            >
              {item.label}
            </span>
            <span className={isDark ? "text-white/55" : "text-[#64748B]"}> · </span>
            <span>{item.hint}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
