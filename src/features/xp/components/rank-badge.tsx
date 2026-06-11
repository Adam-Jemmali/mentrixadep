"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import type { AccountLevelInfo } from "@/features/xp/levels";
import { getAccountRankByLevel, normalizeRankTitle, type AccountRankKey } from "@/features/xp/rank-icons";

/** Account level row used by rank badge UI. */
export type AccountLevel = Pick<AccountLevelInfo, "level" | "title">;

export type RankBadgeSize = "sm" | "md" | "lg" | "xl";

export interface RankBadgeProps {
  rank: AccountLevel;
  size?: RankBadgeSize;
  showLabel?: boolean;
  /** Background behind the label — use `dark` on marketing / rank card pages. */
  labelTone?: "light" | "dark";
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
  animate = false,
  className,
}: RankBadgeProps) {
  const visual = getAccountRankByLevel(rank.level);
  const labelColor = labelTone === "dark" ? visual.labelOnDark : visual.labelOnLight;
  const px = SIZE_PX[size];
  const isMentrixer = visual.key === "mentrixer";

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <motion.div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0A0A0A]/90",
          isMentrixer && "ring-1 ring-[#D4A017]/40",
        )}
        style={{
          width: px,
          height: px,
          boxShadow: isMentrixer
            ? `0 0 ${Math.round(px * 0.35)}px ${visual.colorMuted}, 0 0 0 1px ${visual.color}55`
            : `0 8px 24px -10px ${visual.colorMuted}`,
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
              background: `radial-gradient(circle, ${visual.colorMuted} 0%, transparent 72%)`,
            }}
          />
        ) : null}
        <img
          src={visual.iconSrc}
          alt=""
          aria-hidden
          className="relative z-[1] h-[72%] w-[72%] object-contain"
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
