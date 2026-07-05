"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import type { AccountLevelInfo } from "@/features/xp/levels";
import {
  getAccountRankByLevel,
  normalizeRankTitle,
  type AccountRankKey,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";
import { RANK_BADGE_SIZE_PX } from "@/features/xp/rank-display-tokens";

/** Account level row used by rank badge UI. */
export type AccountLevel = Pick<AccountLevelInfo, "level" | "title">;

export type RankBadgeSize = "sm" | "md" | "lg" | "xl";
export type RankBadgeSurface = "default" | "light" | "onDark";

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
  /** `onDark` = landing arena; `light` = student hub paper; `default` → `light`. */
  surface?: RankBadgeSurface;
  /** Stronger frame glow (landing active rail + hero). */
  active?: boolean;
  /** Pulse animation — apex / mentrixer highlights. */
  animate?: boolean;
  /** Dim locked future ranks on ladders. */
  locked?: boolean;
  className?: string;
}

export function getRankKeyFromLevel(level: number): AccountRankKey {
  return getAccountRankByLevel(level).key;
}

function resolveSurface(surface: RankBadgeSurface): "light" | "onDark" {
  return surface === "onDark" ? "onDark" : "light";
}

function shouldPulse(key: AccountRankKey, animate: boolean): boolean {
  return animate && (key === "mentrixer" || key === "apex");
}

export function RankBadge({
  rank,
  size = "md",
  showLabel = false,
  labelTone = "light",
  surface = "light",
  active = false,
  animate = false,
  locked = false,
  className,
}: RankBadgeProps) {
  const visual = getAccountRankByLevel(rank.level);
  const resolvedSurface = resolveSurface(surface);
  const onDark = resolvedSurface === "onDark";
  const labelColor = labelTone === "dark" ? visual.labelOnDark : visual.labelOnLight;
  const px = RANK_BADGE_SIZE_PX[size];
  const isMentrixer = visual.key === "mentrixer";
  const isApex = visual.key === "apex";
  const iconFilter = onDark ? ON_DARK_ICON_FILTER[visual.key] : undefined;
  const glow = active || shouldPulse(visual.key, animate);

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <motion.div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2",
          onDark
            ? "bg-gradient-to-b from-slate-800/98 to-slate-950/98 ring-1 ring-white/10"
            : "bg-white/95 ring-1 ring-black/[0.04]",
          isMentrixer && onDark && "ring-amber-300/35",
          isMentrixer && !onDark && "ring-[#D4A017]/35",
          locked && (onDark ? "opacity-70 saturate-[0.65]" : "opacity-45 grayscale"),
          !locked && !active && "opacity-95",
        )}
        style={{
          width: px,
          height: px,
          borderColor: onDark
            ? active
              ? `${visual.color}99`
              : `${visual.color}55`
            : active
              ? `${visual.color}88`
              : `${visual.color}44`,
          boxShadow: onDark
            ? glow
              ? `0 0 ${Math.round(px * 0.55)}px ${visual.colorMuted}, 0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)`
              : `0 0 ${Math.round(px * 0.28)}px ${visual.colorMuted}, inset 0 1px 0 rgba(255,255,255,0.1)`
            : glow
              ? `0 0 ${Math.round(px * 0.42)}px ${visual.colorMuted}, 0 4px 14px rgba(15,23,42,0.08)`
              : `0 0 ${Math.round(px * 0.2)}px ${visual.colorMuted}`,
        }}
        animate={
          shouldPulse(visual.key, animate)
            ? {
                scale: [1, 1.06, 1],
                rotate: [0, -2, 2, 0],
              }
            : undefined
        }
        transition={
          shouldPulse(visual.key, animate)
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
        title={normalizeRankTitle(rank.title)}
      >
        {(isMentrixer || isApex) && glow ? (
          <div
            className="pointer-events-none absolute inset-[10%] rounded-full"
            style={{
              background: `radial-gradient(circle, ${onDark ? (isMentrixer ? "rgba(253,230,138,0.35)" : visual.colorMuted) : visual.colorMuted} 0%, transparent 72%)`,
            }}
          />
        ) : glow ? (
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
            "h-[72%] w-[72%]",
            onDark && "drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]",
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

export function RankTitle({
  rank,
  active = true,
  tone = "dark",
  className,
}: {
  rank: AccountRankVisual;
  active?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const activeColor = tone === "light" ? rank.labelOnLight : rank.labelOnDark;

  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.14em]",
        !active && (tone === "light" ? "text-zinc-500" : "text-zinc-500"),
        className,
      )}
      style={active ? { color: activeColor } : undefined}
    >
      {normalizeRankTitle(rank.title)}
    </span>
  );
}
