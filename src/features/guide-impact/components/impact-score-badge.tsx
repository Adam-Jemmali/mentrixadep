import { cn } from "@/shared/core/utils";
import {
  formatImpactScoreLabel,
  impactScoreColorTier,
  IMPACT_SCORE_TIER_CLASS,
  type GuideImpactEntry,
} from "@/features/guide-impact/impact-score-pure";

type ImpactScoreBadgeProps = {
  impactScore: number;
  sessionsCounted: number;
  subject?: string;
  size?: "sm" | "md";
  className?: string;
};

export function ImpactScoreBadge({
  impactScore,
  sessionsCounted,
  subject,
  size = "md",
  className,
}: ImpactScoreBadgeProps) {
  if (sessionsCounted < 3) return null;

  const tier = impactScoreColorTier(impactScore);
  const sizeClass = size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs";

  return (
    <div className={cn("inline-flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full border font-semibold tabular-nums",
          IMPACT_SCORE_TIER_CLASS[tier],
          sizeClass,
        )}
      >
        {formatImpactScoreLabel(impactScore)}
        {subject ? ` · ${subject}` : ""}
      </span>
      <span className="text-[10px] text-slate-500">
        Based on {sessionsCounted} student accuracy improvements
      </span>
    </div>
  );
}

export function ImpactScoreBreakdown({ entries }: { entries: GuideImpactEntry[] }) {
  const visible = entries.filter((e) => e.sessionsCounted >= 3);
  if (visible.length <= 1) return null;

  return (
    <ul className="space-y-2">
      {visible.map((entry) => {
        const tier = impactScoreColorTier(entry.impactScore);
        return (
          <li key={entry.subject} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-slate-700">{entry.subject}</span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-semibold tabular-nums",
                IMPACT_SCORE_TIER_CLASS[tier],
              )}
            >
              {Math.round(entry.impactScore)}/100
            </span>
          </li>
        );
      })}
    </ul>
  );
}
