"use client";

import { cn } from "@/shared/core/utils";
import { STREAK_RISK_MESSAGE } from "@/features/xp/streak-risk-pure";

type StreakRiskPopupProps = {
  onDismiss?: () => void;
  className?: string;
  /** When true, anchor below a stat column instead of fixed bottom bar. */
  inline?: boolean;
};

export function StreakRiskPopup({ onDismiss, className, inline = false }: StreakRiskPopupProps) {
  return (
    <div
      className={cn(
        inline
          ? "absolute left-1/2 top-full z-30 mt-2 flex w-max min-w-[11.5rem] max-w-[16rem] -translate-x-1/2 items-start gap-1 rounded-md border border-amber-200 bg-amber-50 py-2 pl-3 pr-1 shadow-sm"
          : "flex max-w-lg items-start gap-2 rounded-md border border-amber-200 bg-amber-50 py-2.5 pl-4 pr-2 shadow-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p
        className={cn(
          "min-w-0 flex-1 text-xs leading-snug text-amber-950",
          inline ? "text-left" : "text-center",
        )}
      >
        {STREAK_RISK_MESSAGE}
      </p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-md text-amber-800 transition hover:bg-amber-100 hover:text-amber-950"
          aria-label="Dismiss streak reminder"
        >
          <span className="text-lg leading-none" aria-hidden>
            ×
          </span>
        </button>
      ) : null}
    </div>
  );
}
