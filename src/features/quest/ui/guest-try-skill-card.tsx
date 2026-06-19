"use client";

import { cn } from "@/shared/core/utils";
import {
  signalLabel,
  type GuestTrySkillSummary,
} from "@/features/quest/guest-try-skill-summary";

const SIGNAL_STYLE = {
  strong: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  developing: "text-amber-200 border-amber-400/30 bg-amber-500/10",
  focus: "text-rose-200 border-rose-400/30 bg-rose-500/10",
} as const;

export function GuestTrySkillSummaryCard({
  summary,
  className,
}: {
  summary: GuestTrySkillSummary;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300/90 mb-1">
        Skill breakdown
      </p>
      <p className="text-sm font-semibold text-white mb-1">{summary.headline}</p>
      <p className="text-xs text-slate-300 leading-relaxed mb-4">{summary.skillNote}</p>
      <ul className="space-y-2">
        {summary.lines.map((line) => (
          <li
            key={line.label}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
              SIGNAL_STYLE[line.signal],
            )}
          >
            <span className="font-medium">{line.label}</span>
            <span className="shrink-0 tabular-nums text-xs font-bold uppercase tracking-wide">
              {line.correct}/{line.total}, {signalLabel(line.signal)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
