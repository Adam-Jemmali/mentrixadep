"use client";

import { cn } from "@/shared/core/utils";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { XP } from "@/features/xp/xp-constants";
import { TiltCard } from "@/shared/ui/tilt-card";

type GuestTryRankPreviewProps = {
  totalXp: number;
  pendingXp?: number;
  variant?: "compact" | "card" | "progression";
  beforeXp?: number;
  className?: string;
};

/** Rank + XP strip/card matching student navbar — preview mode for guest try. */
export function GuestTryRankPreview({
  totalXp,
  pendingXp = 0,
  variant = "card",
  beforeXp = 0,
  className,
}: GuestTryRankPreviewProps) {
  const rank = getAccountRankFromTotalXp(totalXp);
  const beforeRank = getAccountRankFromTotalXp(beforeXp);
  const maxPending = XP.QUEST_COMPLETE + XP.QUEST_PERFECT_BONUS;
  const levelSpan =
    rank.levelInfo.maxXp != null ? rank.levelInfo.maxXp - rank.levelInfo.minXp + 1 : 100;
  const progressPct = Math.min(100, Math.round((rank.levelInfo.xpIntoLevel / levelSpan) * 100));

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-2 py-1 shadow-sm backdrop-blur-sm",
          className,
        )}
      >
        <RankBadge rank={rank} size="sm" active showGlow={rank.key === "mentrixer"} />
        <div className="min-w-0 flex flex-col leading-tight">
          <span
            className="truncate text-[10px] font-bold uppercase tracking-wide"
            style={{ color: rank.labelOnLight }}
          >
            {normalizeRankTitle(rank.title)}
          </span>
          <span className="text-[10px] font-mono tabular-nums text-slate-600">
            {totalXp.toLocaleString()} XP
            {pendingXp > 0 ? (
              <span className="text-indigo-600">, +{pendingXp} pending</span>
            ) : null}
          </span>
        </div>
      </div>
    );
  }

  if (variant === "progression") {
    const rankUp = rank.level > beforeRank.level;
    return (
      <TiltCard
        tiltLimit={4}
        className={cn(
          "rounded-2xl border border-white/20 bg-slate-950/60 p-5 text-left backdrop-blur-md",
          className,
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-4">
          Rank preview. Sign up to save
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/20 bg-slate-900/90 p-4">
            <p className="text-[10px] uppercase tracking-wide text-slate-300 mb-3">Before</p>
            <div className="flex items-center gap-3">
              <RankBadge rank={beforeRank} size="lg" surface="onDark" />
              <div className="min-w-0">
                <p className="font-bold text-white">{normalizeRankTitle(beforeRank.title)}</p>
                <p className="text-xs font-mono text-slate-300">{beforeXp.toLocaleString()} XP</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-400/45 bg-indigo-950/70 p-4 ring-1 ring-indigo-400/20">
            <p className="text-[10px] uppercase tracking-wide text-indigo-200 mb-3">After this run</p>
            <div className="flex items-center gap-3">
              <RankBadge
                rank={rank}
                size="lg"
                active
                surface="onDark"
                showGlow={rank.key === "mentrixer" || rank.key === "apex"}
              />
              <div className="min-w-0">
                <p className="font-bold text-white">
                  {normalizeRankTitle(rank.title)}
                  {rankUp ? " ↑" : ""}
                </p>
                <p className="text-xs font-mono text-indigo-100">
                  {totalXp.toLocaleString()} XP
                  <span className="text-emerald-300"> (+{totalXp - beforeXp})</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-slate-300 mb-1">
            <span>Level progress</span>
            <span>
              {rank.levelInfo.xpToNextLevel != null
                ? `${rank.levelInfo.xpToNextLevel.toLocaleString()} XP to next rank`
                : "Max rank"}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/15 overflow-hidden ring-1 ring-white/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-cyan-300 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </TiltCard>
    );
  }

  return (
    <TiltCard
      tiltLimit={3}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3",
        className,
      )}
    >
      <RankBadge rank={rank} size="lg" active showGlow={rank.key === "mentrixer"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold uppercase tracking-wide" style={{ color: rank.labelOnLight }}>
          {normalizeRankTitle(rank.title)}
        </p>
        <p className="text-xs font-mono tabular-nums text-slate-600">
          Rank {rank.level}, {totalXp.toLocaleString()} XP
        </p>
        <p className="mt-1 text-[11px] text-indigo-800/80">
          Earn up to {maxPending} XP per pack. Same as students in Quest.
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-indigo-100 overflow-hidden">
          <div className="h-full bg-indigo-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </TiltCard>
  );
}
