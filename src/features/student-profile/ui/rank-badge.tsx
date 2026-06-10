"use client";

import { cn } from "@/shared/core/utils";
import { normalizeRankTitle, type AccountRankVisual } from "@/features/xp/rank-icons";

const SIZE = {
  xs: { box: "h-8 w-8" },
  sm: { box: "h-10 w-10" },
  md: { box: "h-14 w-14" },
  lg: { box: "h-20 w-20" },
  xl: { box: "h-24 w-24 sm:h-28 sm:w-28" },
} as const;

/**
 * Renders rank emblem SVGs (square viewBox, emblem-centered).
 * Uses native img so the SVG viewBox drives scaling — crisp at any UI size.
 */
export function RankBadge({
  rank,
  size = "md",
  active = false,
  locked = false,
  showGlow = false,
  priority = false,
  className,
}: {
  rank: AccountRankVisual;
  size?: keyof typeof SIZE;
  active?: boolean;
  locked?: boolean;
  showGlow?: boolean;
  /** Eager-load emblem (hero / above-the-fold). */
  priority?: boolean;
  className?: string;
}) {
  const s = SIZE[size];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/90",
        "aspect-square",
        s.box,
        active && "border-2",
        locked && "opacity-40 grayscale",
        className,
      )}
      style={{
        borderColor: active ? rank.color : "rgba(255,255,255,0.08)",
        boxShadow: showGlow && active
          ? `0 0 32px ${rank.colorMuted}, 0 0 0 1px ${rank.color}80`
          : active
            ? `0 8px 24px -8px ${rank.colorMuted}`
            : undefined,
      }}
      title={normalizeRankTitle(rank.title)}
    >
      {showGlow && active ? (
        <div
          className="pointer-events-none absolute inset-[8%] rounded-full"
          style={{
            background: `radial-gradient(circle, ${rank.colorMuted} 0%, transparent 70%)`,
          }}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rank.iconSrc}
        alt=""
        width={260}
        height={260}
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        decoding={priority ? "sync" : "async"}
        className="relative z-[1] h-full w-full object-contain object-center p-0.5"
      />
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
  /** Use "light" on white/light dashboard surfaces for WCAG contrast. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const activeColor = tone === "light" ? rank.labelOnLight : rank.labelOnDark;

  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.14em]",
        !active && (tone === "light" ? "text-zinc-600" : "text-zinc-500"),
        className,
      )}
      style={active ? { color: activeColor } : undefined}
    >
      {normalizeRankTitle(rank.title)}
    </span>
  );
}
