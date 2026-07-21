"use client";

import { useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { useReducedMotion } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";

/** Thin 3px quest progress — anime.js width on each question advance. */
export function QuestAnimatedProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    if (reduceMotion) {
      fill.style.width = `${clamped}%`;
      return;
    }

    animate(fill, {
      width: `${clamped}%`,
      duration: 400,
      ease: "outQuart",
    });
  }, [clamped, reduceMotion]);

  return (
    <div
      className={cn("quest-progress-bar h-[3px] w-full overflow-hidden rounded-full bg-[var(--mx-navy-2)]", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Quest progress"
    >
      <div
        ref={fillRef}
        className="h-full rounded-full bg-gradient-to-r from-[var(--mx-primary)] to-[var(--mx-indigo)]"
        style={{ width: reduceMotion ? `${clamped}%` : "0%" }}
      />
    </div>
  );
}
