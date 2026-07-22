"use client";

import { useEffect, useState } from "react";
import { HUB_FRAC } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

const FRAC_NUM =
  "font-[family-name:var(--font-playfair),serif] font-bold tabular-nums leading-none";

const FRAC_PCT =
  "font-[family-name:var(--font-playfair),serif] font-bold tabular-nums leading-none text-[#0B1220]";

/** Stacked Playfair fraction — always visible, numbers count up on mount. */
export function StudentHubAnimatedFraction({
  numerator,
  denominator,
  percent,
  unitLabel = "skills",
  compact = false,
  className,
}: {
  numerator: number;
  denominator: number;
  percent: number;
  unitLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(() =>
    reducedMotion
      ? { num: numerator, den: denominator, pct: percent }
      : { num: 0, den: 0, pct: 0 },
  );

  const numSize = compact
    ? "text-[clamp(1.5rem,3.5vw,2rem)]"
    : "text-[clamp(2rem,5vw,2.85rem)]";
  const pctSize = compact
    ? "text-[clamp(1.35rem,3vw,1.75rem)]"
    : "text-[clamp(1.75rem,4vw,2.35rem)]";

  useEffect(() => {
    if (reducedMotion) {
      setShown({ num: numerator, den: denominator, pct: percent });
      return;
    }

    let cancelled = false;

    void import("@/shared/animation/anime").then(({ animate }) => {
      if (cancelled) return;

      const obj = { num: 0, den: 0, pct: 0 };
      animate(obj, {
        num: numerator,
        den: denominator,
        pct: percent,
        duration: 1.05,
        ease: "outExpo",
        onUpdate: () => {
          setShown({
            num: Math.round(obj.num),
            den: Math.round(obj.den),
            pct: Math.round(obj.pct),
          });
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [denominator, numerator, percent, reducedMotion]);

  return (
    <div
      className={cn(HUB_FRAC.root, "flex items-center gap-3", className)}
      aria-label={`${numerator} out of ${denominator} correct, ${percent} percent`}
    >
      <div className={cn(HUB_FRAC.stack, "flex shrink-0 flex-col items-center")}>
        <span className={cn(HUB_FRAC.digit, FRAC_NUM, numSize, "text-[#7C3AED]")}>{shown.num}</span>
        <span
          className={cn(
            HUB_FRAC.bar,
            "my-1.5 h-[3px] w-full min-w-[3.25rem] rounded-full bg-[#7C3AED]",
            compact && "min-w-[2.5rem]",
          )}
          aria-hidden
        />
        <span className={cn(HUB_FRAC.digit, FRAC_NUM, numSize, "text-[#6366F1]")}>{shown.den}</span>
        <span className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#6366F1]">
          {unitLabel}
        </span>
      </div>

      <div className={cn(HUB_FRAC.tail, "flex items-center gap-2")}>
        <span className="text-[12px] font-semibold tracking-tight text-[#475569]">× 100 =</span>
        <span className={cn(HUB_FRAC.digit, FRAC_PCT, pctSize)}>{shown.pct}%</span>
      </div>
    </div>
  );
}
