"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { TiltCard } from "@/shared/ui/tilt-card";
import { BubbleText } from "@/shared/ui/bubble-text";

import type { QuestAccuracyTrend } from "@/features/quest/quest-reads";
import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import { normalizeRankTitle, type AccountRankVisual } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/xp/components/rank-badge";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
};

export function StudentStatStripMotion({
  totalXp,
  streak,
  sessionsCompleted,
  avgRating,
  streakAtRisk,
  questAccuracy,
  accountRank,
}: {
  totalXp: number;
  streak: number;
  sessionsCompleted: number;
  avgRating: number;
  streakAtRisk: boolean;
  questAccuracy: QuestAccuracyTrend | null;
  accountRank: AccountRankVisual;
}) {
  const ratingLabel =
    Number.isFinite(avgRating) && avgRating > 0 ? (Math.round(avgRating * 10) / 10).toFixed(1) : "-";

  const trendArrow = questAccuracy?.direction === "up" ? "↑" : questAccuracy?.direction === "down" ? "↓" : "";
  const trendColor = questAccuracy?.direction === "up" ? "text-emerald-600" : questAccuracy?.direction === "down" ? "text-rose-600" : "text-zinc-500";
  const accountLevel = getAccountLevelFromTotalXp(totalXp);

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className="mx-surface-light flex flex-row items-center gap-3 rounded-2xl px-4 py-4 sm:px-5"
        >
          <RankBadge rank={accountLevel} size="lg" animate={accountRank.key === "mentrixer"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold uppercase tracking-wide" style={{ color: accountRank.labelOnLight }}>
              {normalizeRankTitle(accountRank.title)}
            </p>
            <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-zinc-500">
              <BubbleText text={`${totalXp.toLocaleString()} XP earned`} activeColor="text-blue-500" neighborColor="text-blue-400" />
            </span>
          </div>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className="mx-surface-light flex flex-col rounded-2xl px-4 py-4 sm:px-5"
        >
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-zinc-900">
              {questAccuracy ? `${questAccuracy.accuracyPercent}%` : "—"}
            </span>
            {trendArrow && (
              <span className={`text-lg font-bold ${trendColor}`}>{trendArrow}</span>
            )}
          </div>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500 line-clamp-1">
            <BubbleText text={`${questAccuracy?.subject || "Quest"} Accuracy`} activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className="mx-surface-light flex flex-col rounded-2xl px-4 py-4 sm:px-5"
        >
          <span className="text-2xl font-bold tabular-nums text-zinc-900">{sessionsCompleted}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
            <BubbleText text="Sessions completed" activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>
      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className="mx-surface-light flex flex-col rounded-2xl px-4 py-4 sm:px-5"
        >
          <span className="text-2xl font-bold tabular-nums text-zinc-900">{ratingLabel}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
            <BubbleText text="Avg. session rating" activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>
      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className={`flex flex-col rounded-2xl border border-zinc-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5 ${
            streakAtRisk ? "ring-2 ring-amber-300/90" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <Image
              src="/images/live.webp"
              alt="Streak"
              width={20}
              height={20}
              className={`shrink-0 ${streakAtRisk ? "opacity-100" : "opacity-60"}`}
            />
            <span className="text-2xl font-bold tabular-nums text-zinc-900">{streak}</span>
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
            <BubbleText text={streakAtRisk ? "Streak · log today" : "Day streak"} activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>
    </motion.div>
  );
}
