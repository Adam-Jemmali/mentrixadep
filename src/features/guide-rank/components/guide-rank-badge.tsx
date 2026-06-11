import { cn } from "@/shared/core/utils";
import { getGuideRankDefinition } from "@/features/guide-rank/constants";

type GuideRankBadgeProps = {
  rankKey: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

const SIZE_CLASS = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function GuideRankBadge({
  rankKey,
  size = "md",
  showLabel = true,
  className,
}: GuideRankBadgeProps) {
  const rank = getGuideRankDefinition(rankKey);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-black uppercase tracking-[0.12em]",
        rank.badgeClass,
        SIZE_CLASS[size],
        className,
      )}
      title={`${rank.label} Guide`}
    >
      {rank.key === "elite" ? (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      ) : null}
      {showLabel ? `${rank.label} Guide` : rank.label}
    </span>
  );
}
