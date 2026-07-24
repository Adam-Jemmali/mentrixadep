"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { animate } from "@/shared/animation/anime";
import { cn } from "@/shared/core/utils";
import { mxUi } from "@/components/ui/mentrixa-ui-tokens";

export type ProgressRingProps = {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  verified?: boolean;
  label?: string;
  center?: ReactNode;
  className?: string;
};

export function ProgressRing({
  value,
  max = 100,
  size = 88,
  strokeWidth = 6,
  verified = false,
  label,
  center,
  className,
}: ProgressRingProps) {
  const gradId = useId();
  const displayRef = useRef<HTMLSpanElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(max, Math.max(0, value));
  const targetOffset = circumference - (clamped / max) * circumference;

  useEffect(() => {
    const el = displayRef.current;
    if (!el) return;
    if (clamped <= 0) {
      el.textContent = "—";
      return;
    }
    const proxy = { n: 0 };
    const tween = animate(proxy, {
      n: clamped,
      duration: 900,
      ease: "outExpo",
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.n));
      },
    });
    return () => {
      tween.pause();
    };
  }, [clamped]);

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      role="img"
      aria-label={label ?? `Progress ${Math.round(clamped)} of ${max}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--mx-indigo)" />
            <stop offset="100%" stopColor={verified ? "var(--mx-gold)" : "var(--mx-violet)"} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={mxUi.ringTrack}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={targetOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {center ?? (
          <span
            ref={displayRef}
            className={cn(
              "font-mono text-xl font-black tabular-nums leading-none",
              verified ? mxUi.gold : "text-[var(--mx-navy)]",
            )}
          >
            {clamped > 0 ? clamped : "—"}
          </span>
        )}
      </div>
    </div>
  );
}
