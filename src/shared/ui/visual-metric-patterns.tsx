"use client";

import { cn } from "@/shared/core/utils";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/** Percent / accuracy bar + vocab icon + one number — minimal text. */
export function VisualPercentBar({
  value,
  icon,
  label,
  gold,
  surface = "dark",
  className,
}: {
  value: number;
  icon: VocabIconName;
  label: string;
  gold?: boolean;
  surface?: "dark" | "light";
  className?: string;
}) {
  const isDark = surface === "dark";
  return (
    <div className={cn("flex min-w-[5rem] flex-col gap-1", className)} title={`${value}% ${label}`}>
      <div className="flex items-center gap-2">
        <MentrixaVocabIcon name={icon} size={28} gold={gold} surface={surface} title={label} />
        <span
          className={cn(
            "font-mono text-sm font-black tabular-nums",
            isDark ? "text-violet-50" : "text-zinc-900",
            gold && "text-[#D4A017]",
          )}
        >
          {value}%
        </span>
      </div>
      <div className={cn("h-1.5 w-full overflow-hidden rounded-full", isDark ? "bg-white/10" : "bg-violet-100")}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#7C3AED]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className={cn("text-[9px] font-bold uppercase tracking-[0.14em]", isDark ? "text-violet-200/80" : "text-zinc-600")}>
        {label}
      </span>
    </div>
  );
}
