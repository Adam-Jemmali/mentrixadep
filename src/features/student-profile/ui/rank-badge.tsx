"use client";

import {
  RankBadge as CanonicalRankBadge,
  RankTitle as CanonicalRankTitle,
  getRankKeyFromLevel,
  type RankBadgeProps,
  type RankBadgeSize,
  type RankBadgeSurface,
} from "@/features/xp/components/rank-badge";

type LegacySizeKey = "xs" | RankBadgeSize;

const LEGACY_SIZE: Record<LegacySizeKey, RankBadgeSize> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
};

export {
  getRankKeyFromLevel,
  type RankBadgeProps,
  type RankBadgeSize,
  type RankBadgeSurface,
};

/** @deprecated Use `animate` — kept for landing + legacy call sites. */
export function RankBadge({
  showGlow = false,
  priority: _priority = false,
  size = "md",
  active = false,
  ...props
}: RankBadgeProps & {
  showGlow?: boolean;
  priority?: boolean;
  size?: LegacySizeKey;
}) {
  return (
    <CanonicalRankBadge
      {...props}
      size={LEGACY_SIZE[size]}
      active={active}
      animate={showGlow || props.animate}
    />
  );
}

export function RankTitle(props: React.ComponentProps<typeof CanonicalRankTitle>) {
  return <CanonicalRankTitle {...props} />;
}
