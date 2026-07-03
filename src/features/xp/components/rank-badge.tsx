"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import type { AccountLevelInfo } from "@/features/xp/levels";
import {
  getAccountRankByLevel,
  normalizeRankTitle,
  type AccountRankKey,
} from "@/features/xp/rank-icons";

/** Account level row used by rank badge UI. */
export type AccountLevel = Pick<AccountLevelInfo, "level" | "title">;

export type RankBadgeSize = "sm" | "md" | "lg" | "xl";
export type RankBadgeSurface = "default" | "onDark";

/** Boost muted emblem colors on dark badge surfaces (canonical SVGs in /public/icons). */
const ON_DARK_ICON_FILTER: Partial<Record<AccountRankKey, string>> = {
  wanderer: "brightness(1.65) contrast(1.12) saturate(0.9)",
  seeker: "brightness(1.35) contrast(1.08)",
};

export interface RankBadgeProps {
  rank: AccountLevel;
  size?: RankBadgeSize;
  showLabel?: boolean;
  /** Background behind the label — use `dark` on marketing / rank card pages. */
  labelTone?: "light" | "dark";
  /** `onDark` uses bright vector icons + lit badge frame for dark page sections. */
  surface?: RankBadgeSurface;
  /** Pulse animation — e.g. on fresh rank achievement. */
  animate?: boolean;
  className?: string;
}

const SIZE_PX: Record<RankBadgeSize, number> = {
  sm: 24,
  md: 40,
  lg: 64,
  xl: 96,
};

export function getRankKeyFromLevel(level: number): AccountRankKey {
  return getAccountRankByLevel(level).key;
}

export function RankBadge({
  rank,
  size = "md",
  showLabel = false,
  labelTone = "light",
  surface = "default",
  animate = false,
  className,
}: RankBadgeProps) {
  const visual = getAccountRankByLevel(rank.level);
  const labelColor = labelTone === "dark" ? visual.labelOnDark : visual.labelOnLight;
  const px = SIZE_PX[size];
  const isMentrixer = visual.key === "mentrixer";
  const onDark = surface === "onDark";
  const iconFilter = onDark ? ON_DARK_ICON_FILTER[visual.key] : undefined;

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <motion.div
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          onDark &&
            "overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-slate-800/98 to-slate-950/98 ring-1 ring-white/10",
          isMentrixer &&
            (onDark
              ? "overflow-hidden rounded-2xl ring-amber-300/35"
              : "rounded-2xl ring-1 ring-[#D4A017]/45"),
        )}
        style={{
          width: px,
          height: px,
          borderColor: onDark ? `${visual.color}99` : undefined,
          boxShadow: onDark
            ? `0 0 ${Math.round(px * 0.45)}px ${visual.colorMuted}, 0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)`
            : isMentrixer
              ? `0 0 ${Math.round(px * 0.35)}px ${visual.colorMuted}`
              : undefined,
        }}
        animate={
          animate
            ? {
                scale: [1, 1.06, 1],
                rotate: [0, -2, 2, 0],
              }
            : undefined
        }
        transition={
          animate
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
        title={normalizeRankTitle(rank.title)}
      >
        {isMentrixer ? (
          <div
            className="pointer-events-none absolute inset-[10%] rounded-full"
            style={{
              background: `radial-gradient(circle, ${onDark ? "rgba(253,230,138,0.35)" : visual.colorMuted} 0%, transparent 72%)`,
            }}
          />
        ) : onDark ? (
          <div
            className="pointer-events-none absolute inset-[8%] rounded-full opacity-80"
            style={{
              background: `radial-gradient(circle, ${visual.colorMuted} 0%, transparent 70%)`,
            }}
          />
        ) : null}
        <img
          src={visual.iconSrc}
          alt=""
          aria-hidden
          className={cn(
            "relative z-[1] object-contain",
            onDark ? "h-[72%] w-[72%] drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]" : "h-full w-full",
          )}
          style={iconFilter ? { filter: iconFilter } : undefined}
        />
      </motion.div>
      {showLabel ? (
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: labelColor }}
        >
          {normalizeRankTitle(rank.title)}
        </span>
      ) : null}
    </div>
  );
}
