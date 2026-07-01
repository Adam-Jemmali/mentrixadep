"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import {
  ACCOUNT_RANK_VISUALS,
  getAccountRankFromTotalXp,
} from "@/features/xp/rank-icons";
import { RankBadge, RankTitle } from "@/features/student-profile/ui/rank-badge";
import { AccountRankXpDisplay } from "@/features/student-profile/ui/account-rank-xp-display";
import { XpTierProgressBar } from "@/shared/ui/progress-bar-patterns";

/**
 * Valorant-inspired account rank rail: locked past = earned glow,
 * current = hero slot, future = dimmed lock silhouettes.
 */
export function AccountRankLadder({
  totalXp,
  variant = "arena",
  className,
}: {
  totalXp: number;
  variant?: "arena" | "dashboard";
  className?: string;
}) {
  const { levelInfo, ...current } = getAccountRankFromTotalXp(totalXp);
  const isArena = variant === "arena";

  const xpToNext = levelInfo.xpToNextLevel;
  const progressPct =
    xpToNext != null && levelInfo.xpToNextLevel != null
      ? Math.min(
          100,
          Math.round(
            (levelInfo.xpIntoLevel /
              (levelInfo.xpIntoLevel + levelInfo.xpToNextLevel)) *
              100,
          ),
        )
      : 100;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        isArena
          ? "border-violet-500/25 bg-slate-950/60 shadow-[0_20px_50px_-24px_rgba(79,70,229,0.45)]"
          : "mx-panel-brand border-violet-500/30",
        className,
      )}
    >
      {isArena ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${current.colorMuted}, transparent 65%)`,
          }}
        />
      ) : null}

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        <AccountRankXpDisplay totalXp={totalXp} tone="arena" />

        {/* Progress to next */}
        {xpToNext != null ? (
          <div className="mt-5">
            <XpTierProgressBar
              value={progressPct}
              tone="dark"
              fillStyle={{
                background: `linear-gradient(90deg, ${current.color}99, ${current.color})`,
                boxShadow: `0 0 12px ${current.colorMuted}`,
              }}
            />
          </div>
        ) : null}

        {/* Valorant-style rank rail */}
        <div className="mt-6 overflow-x-auto pb-1 -mx-1 px-1">
          <ol className="flex min-w-max items-end justify-center gap-1 sm:gap-2">
            {ACCOUNT_RANK_VISUALS.map((rank) => {
              const earned = levelInfo.level >= rank.level;
              const isCurrent = levelInfo.level === rank.level;
              const locked = !earned;

              return (
                <li
                  key={rank.key}
                  className={cn(
                    "flex flex-col items-center",
                    isCurrent ? "z-10 -mt-2 px-1" : "px-0.5",
                  )}
                >
                  <RankBadge
                    rank={rank}
                    size={isCurrent ? "lg" : earned ? "sm" : "xs"}
                    active={isCurrent}
                    locked={locked}
                    surface={isArena ? "onDark" : "onDark"}
                    showGlow={isCurrent}
                  />
                  <RankTitle
                    rank={rank}
                    active={earned}
                    tone={isArena ? "dark" : "dark"}
                    className={cn(
                      "mt-2 max-w-[4.5rem] truncate text-center",
                      isCurrent && "text-[11px] font-black",
                      !earned && "opacity-50",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-0.5 font-mono text-[9px] tabular-nums",
                      isArena ? "text-zinc-500" : "text-violet-300/70",
                      isCurrent && (isArena ? "text-zinc-300" : "text-violet-100"),
                    )}
                  >
                    {rank.level}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {isArena && current.level < 7 ? (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-violet-200/70">
            <span className="font-semibold" style={{ color: "#F5D76E" }}>
              Become a Mentrixer
            </span>{" "}
            
          </p>
        ) : null}

        {!isArena ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/student/quest"
              className="rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#6366F1] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
            >
              Earn XP in Quest
            </Link>
            <Link
              href="/student/duel"
              className="rounded-lg border border-violet-400/45 bg-violet-950/50 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:border-violet-300/60 hover:bg-violet-900/55"
            >
              Compete in Duels
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
