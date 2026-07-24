"use client";

import type { ReactNode } from "react";
import { motion } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";
import { mxUi } from "@/components/ui/mentrixa-ui-tokens";

export type TimelineItem = {
  id: string;
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
  verified?: boolean;
};

export type TimelineProps = {
  items: TimelineItem[];
  tone?: "dark" | "light";
  className?: string;
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Timeline({ items, tone = "light", className }: TimelineProps) {
  const isDark = tone === "dark";

  if (items.length === 0) return null;

  return (
    <ol className={cn("relative space-y-0", className)} aria-label="Activity timeline">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <motion.li
            key={item.id}
            custom={index}
            variants={rowVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-8% 0px" }}
            className="relative flex gap-3 pb-4 last:pb-0"
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  item.verified
                    ? "border-[var(--mx-gold)]/50 bg-[var(--mx-gold)]/10"
                    : isDark
                      ? "border-white/15 bg-white/5"
                      : "border-[#C4B5FD] bg-[#EDE9FE]/60",
                )}
              >
                {item.icon}
              </span>
              {!last ? (
                <span
                  className={cn(
                    "mt-1 w-px flex-1 min-h-[1.25rem]",
                    isDark ? "bg-white/10" : "bg-[#C4B5FD]/60",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug",
                    item.verified ? mxUi.gold : isDark ? "text-slate-100" : "text-[var(--mx-navy)]",
                  )}
                >
                  {item.title}
                </p>
                {item.meta ? (
                  <span className={cn("text-[11px] font-mono", isDark ? mxUi.muted : mxUi.mutedLight)}>
                    {item.meta}
                  </span>
                ) : null}
              </div>
              {item.body ? (
                <p className={cn("mt-0.5 text-xs leading-snug", isDark ? mxUi.muted : mxUi.mutedLight)}>
                  {item.body}
                </p>
              ) : null}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
