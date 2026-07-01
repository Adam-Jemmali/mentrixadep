"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { TiltCard } from "@/shared/ui/tilt-card";
import { BubbleText } from "@/shared/ui/bubble-text";

import type { QuestAccuracyTrend } from "@/features/quest/quest-reads";
import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import { normalizeRankTitle, type AccountRankVisual } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";

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

const statCard = `${mentrixBrandUi.panel} flex rounded-2xl px-4 py-4 sm:px-5`;

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
  const trendColor =
    questAccuracy?.direction === "up"
      ? "text-emerald-400"
      : questAccuracy?.direction === "down"
        ? "text-rose-400"
        : "text-violet-300/70";
  const accountLevel = getAccountLevelFromTotalXp(totalXp);

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <TiltCard tiltLimit={12} scale={1.04} className={`${statCard} flex-row items-center gap-3`}>
          <RankBadge rank={accountLevel} size="lg" animate={accountRank.key === "mentrixer"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold uppercase tracking-wide text-violet-50">
              {normalizeRankTitle(accountRank.title)}
            </p>
            <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-violet-300/75">
              <BubbleText
                text={`${totalXp.toLocaleString()} XP earned`}
                activeColor="text-indigo-300"
                neighborColor="text-violet-400"
              />
            </span>
          </div>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard tiltLimit={12} scale={1.04} className={`${statCard} flex-col`}>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-white">
              {questAccuracy ? `${questAccuracy.accuracyPercent}%` : "—"}
            </span>
            {trendArrow && <span className={`text-lg font-bold ${trendColor}`}>{trendArrow}</span>}
          </div>
          <span className="mt-1 line-clamp-1 text-[11px] uppercase tracking-wide text-violet-300/75">
            <BubbleText
              text={`${questAccuracy?.subject || "Quest"} Accuracy`}
              activeColor="text-indigo-300"
              neighborColor="text-violet-400"
            />
          </span>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard tiltLimit={12} scale={1.04} className={`${statCard} flex-col`}>
          <span className="text-2xl font-bold tabular-nums text-white">{sessionsCompleted}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-violet-300/75">
            <BubbleText
              text="Sessions completed"
              activeColor="text-indigo-300"
              neighborColor="text-violet-400"
            />
          </span>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard tiltLimit={12} scale={1.04} className={`${statCard} flex-col`}>
          <span className="text-2xl font-bold tabular-nums text-white">{ratingLabel}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-violet-300/75">
            <BubbleText
              text="Avg. session rating"
              activeColor="text-indigo-300"
              neighborColor="text-violet-400"
            />
          </span>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className={`${statCard} flex-col ${streakAtRisk ? "ring-2 ring-amber-400/70" : ""}`}
        >
          <span className="flex items-center gap-2">
            <Image
              src="/images/live.webp"
              alt="Streak"
              width={20}
              height={20}
              className={`shrink-0 ${streakAtRisk ? "opacity-100" : "opacity-70"}`}
            />
            <span className="text-2xl font-bold tabular-nums text-white">{streak}</span>
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-violet-300/75">
            <BubbleText
              text={streakAtRisk ? "Streak · log today" : "Day streak"}
              activeColor="text-indigo-300"
              neighborColor="text-violet-400"
            />
          </span>
        </TiltCard>
      </motion.div>
    </motion.div>
  );
}
