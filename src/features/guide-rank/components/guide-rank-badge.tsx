import { cn } from "@/shared/core/utils";
import { getGuideRankDefinition, type GuideRankKey } from "@/features/guide-rank/constants";
import { GuideRankBadgeIcon } from "@/features/guide-rank/components/guide-rank-icons";

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

const ICON_SIZE_CLASS = {
  sm: "h-3.5 w-3.5 shrink-0",
  md: "h-4 w-4 shrink-0",
  lg: "h-5 w-5 shrink-0",
};

function normalizeGuideRankKey(rankKey: string): GuideRankKey {
  const keys: GuideRankKey[] = ["practitioner", "specialist", "expert", "master", "elite"];
  return keys.includes(rankKey as GuideRankKey) ? (rankKey as GuideRankKey) : "practitioner";
}

export function GuideRankBadge({
  rankKey,
  size = "md",
  showLabel = true,
  className,
}: GuideRankBadgeProps) {
  const rank = getGuideRankDefinition(rankKey);
  const key = normalizeGuideRankKey(rank.key);

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
      <GuideRankBadgeIcon rankKey={key} color={rank.color} className={ICON_SIZE_CLASS[size]} />
      {showLabel ? `${rank.label} Guide` : null}
    </span>
  );
}
