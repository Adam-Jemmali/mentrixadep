"use client";

import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";
import { mxUi } from "@/components/ui/mentrixa-ui-tokens";

export type StatTrend = "up" | "down" | "flat";

export type StatCardProps = {
  eyebrow: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  trend?: StatTrend;
  trendLabel?: string;
  alert?: boolean;
  className?: string;
};

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

const trendClass = {
  up: "text-emerald-500",
  down: "text-red-500",
  flat: "text-[#94A3B8]",
} as const;

export function StatCard({
  eyebrow,
  value,
  caption,
  icon,
  trend,
  trendLabel,
  alert = false,
  className,
}: StatCardProps) {
  const TrendIcon = trend ? trendIcon[trend] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border px-3 py-3",
        "transition-shadow duration-200 cursor-default",
        alert
          ? "border-red-200 bg-red-50/80 shadow-[1px_2px_0_rgba(220,38,38,0.08)]"
          : cn(mxUi.cardLight, "shadow-[1px_2px_0_rgba(11,18,32,0.06)] hover:shadow-[2px_4px_0_rgba(124,58,237,0.08)]"),
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", mxUi.mutedLight)}>
          {eyebrow}
        </div>
        {icon ? <span className="shrink-0 opacity-80">{icon}</span> : null}
      </div>
      <div
        className={cn(
          "mt-1.5 text-2xl font-bold tabular-nums tracking-tight",
          alert ? "text-red-700" : "text-[var(--mx-navy)]",
        )}
      >
        {value}
      </div>
      {caption ? (
        <p className={cn("mt-1.5 text-[11px] font-medium leading-snug", mxUi.mutedLight)}>{caption}</p>
      ) : null}
      {trend && TrendIcon ? (
        <div className={cn("mt-2 inline-flex items-center gap-1 text-[10px] font-semibold", trendClass[trend])}>
          <TrendIcon className="h-3 w-3" aria-hidden />
          {trendLabel ? <span>{trendLabel}</span> : null}
        </div>
      ) : null}
    </motion.div>
  );
}
