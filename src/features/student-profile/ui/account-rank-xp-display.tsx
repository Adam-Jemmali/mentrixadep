"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import {
  ACCOUNT_RANK_VISUALS,
  getAccountRankFromTotalXp,
  normalizeRankTitle,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";

function XpIcon({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <motion.div
      className={cn("relative shrink-0", className)}
      animate={{ y: [0, -3, 0], rotate: [0, 4, 0, -4, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <Image
        src="/images/xp.webp"
        alt=""
        width={size}
        height={size}
        unoptimized
        className="drop-shadow-[0_2px_8px_rgba(250,204,21,0.45)]"
      />
    </motion.div>
  );
}

function XpAmount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.12, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={cn("font-mono text-lg font-black tabular-nums tracking-tight sm:text-xl", className)}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

function XpMetricCard({
  tone,
  children,
  className,
}: {
  tone: "arena" | "light";
  children: ReactNode;
  className?: string;
}) {
  const isArena = tone === "arena";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3",
        isArena
          ? "border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-white shadow-sm",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function AccountRankXpDisplay({
  totalXp,
  tone = "arena",
  className,
}: {
  totalXp: number;
  tone?: "arena" | "light";
  className?: string;
}) {
  const { levelInfo, ...current } = getAccountRankFromTotalXp(totalXp);
  const isArena = tone === "arena";
  const xpToNext = levelInfo.xpToNextLevel;
  const nextRank: AccountRankVisual | undefined =
    current.level < 7
      ? ACCOUNT_RANK_VISUALS.find((r) => r.level === current.level + 1)
      : undefined;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <RankBadge
            rank={current}
            size="xl"
            active
            showGlow={current.key === "mentrixer"}
            priority
          />
          <div className="min-w-0">
            <p
              className={cn(
                "text-[10px] font-black uppercase tracking-[0.22em]",
                isArena ? "text-violet-300/90" : "text-violet-700",
              )}
            >
              Account rank
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <h2
                className={cn(
                  "text-xl font-bold tracking-tight sm:text-2xl",
                  isArena ? "text-white" : "text-zinc-950",
                )}
                style={isArena ? undefined : { color: current.labelOnLight }}
              >
                {normalizeRankTitle(current.title)}
              </h2>

            </div>
          </div>
        </div>

        {nextRank ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-2xl border px-3 py-2.5 sm:px-4",
              isArena
                ? "border-violet-400/25 bg-violet-500/10"
                : "border-violet-200 bg-violet-50/80",
            )}
          >
            <div className="text-right sm:text-left">
              <p
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.2em]",
                  isArena ? "text-violet-300/80" : "text-violet-600",
                )}
              >
                Next rank
              </p>
              <p
                className="text-sm font-bold uppercase tracking-wide"
                style={{ color: isArena ? nextRank.labelOnDark : nextRank.labelOnLight }}
              >
                {normalizeRankTitle(nextRank.title)}
              </p>
            </div>
            <RankBadge
              rank={nextRank}
              size="lg"
              active
              showGlow={nextRank.key === "mentrixer"}
              className="!h-[4.5rem] !w-[4.5rem] sm:!h-20 sm:!w-20"
            />
          </div>
        ) : (
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              isArena ? "text-amber-200/90" : "text-amber-700",
            )}
          >
            Max rank
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
        <XpMetricCard tone={tone}>
          <XpIcon size={24} />
          <div className="min-w-0">
            <p
              className={cn(
                "text-[9px] font-black uppercase tracking-[0.18em]",
                isArena ? "text-zinc-400" : "text-zinc-500",
              )}
            >
              Total XP
            </p>
            <div className="flex items-baseline gap-1">
              <XpAmount
                value={totalXp}
                className={isArena ? "text-amber-200" : "text-violet-900"}
              />
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  isArena ? "text-amber-200/70" : "text-violet-600",
                )}
              >
                XP
              </span>
            </div>
          </div>
        </XpMetricCard>

        {xpToNext != null && nextRank ? (
          <XpMetricCard tone={tone}>
            <XpIcon size={24} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.18em]",
                  isArena ? "text-zinc-400" : "text-zinc-500",
                )}
              >
                To next rank
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-baseline gap-1">
                  <XpAmount
                    value={xpToNext}
                    className={isArena ? "text-cyan-200" : "text-cyan-800"}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      isArena ? "text-cyan-200/70" : "text-cyan-700",
                    )}
                  >
                    XP
                  </span>
                </div>

              </div>
            </div>
          </XpMetricCard>
        ) : null}
      </div>
    </div>
  );
}
