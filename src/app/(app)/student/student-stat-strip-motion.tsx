"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TiltCard } from "@/shared/ui/tilt-card";

import type { QuestAccuracyTrend } from "@/features/quest/quest-reads";
import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import { normalizeRankTitle, type AccountRankVisual } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

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

function StatValue({
  icon,
  children,
  iconClassName,
  iconSize = 28,
}: {
  icon: VocabIconName;
  children: ReactNode;
  iconClassName?: string;
  iconSize?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <MentrixaVocabIcon
        name={icon}
        size={iconSize}
        className={iconClassName ?? "shrink-0 text-violet-200"}
      />
      {children}
    </div>
  );
}

function StatFootIcon({
  icon,
  label,
  gold,
  iconClassName,
}: {
  icon: VocabIconName;
  label: string;
  gold?: boolean;
  iconClassName?: string;
}) {
  return (
    <span className="mt-2 flex justify-center">
      <MentrixaVocabIcon
        name={icon}
        size={24}
        gold={gold}
        className={iconClassName ?? "text-violet-300"}
        title={label}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

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
            <span className="mt-0.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-violet-300/75">
              <span className="font-mono text-sm font-bold tabular-nums text-violet-100">
                {totalXp.toLocaleString()}
              </span>
              <MentrixaVocabIcon name="xp" size={22} className="shrink-0 text-violet-200" title="XP earned" />
              <span className="sr-only">XP earned</span>
            </span>
          </div>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard tiltLimit={12} scale={1.04} className={`${statCard} flex-col`}>
          <StatValue icon="quest">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums text-white">
                {questAccuracy ? `${questAccuracy.accuracyPercent}%` : "—"}
              </span>
              {trendArrow ? <span className={`text-lg font-bold ${trendColor}`}>{trendArrow}</span> : null}
            </div>
          </StatValue>
          <StatFootIcon icon="quest" label={`${questAccuracy?.subject || "Quest"} accuracy`} />
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard tiltLimit={12} scale={1.04} className={`${statCard} flex-col`}>
          <StatValue icon="session">
            <span className="text-2xl font-bold tabular-nums text-white">{sessionsCompleted}</span>
          </StatValue>
          <StatFootIcon icon="session" label="Sessions completed" />
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard tiltLimit={12} scale={1.04} className={`${statCard} flex-col`}>
          <StatValue icon="session">
            <span className="text-2xl font-bold tabular-nums text-white">{ratingLabel}</span>
          </StatValue>
          <StatFootIcon icon="session" label="Average session rating" />
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className={`${statCard} flex-col ${streakAtRisk ? "ring-2 ring-amber-400/70" : ""}`}
        >
          <StatValue
            icon="streak"
            iconClassName={cnStreakIcon(streakAtRisk)}
          >
            <span className="text-2xl font-bold tabular-nums text-white">{streak}</span>
          </StatValue>
          <StatFootIcon
            icon="streak"
            label={streakAtRisk ? "Streak · log today" : "Day streak"}
            iconClassName={cnStreakIcon(streakAtRisk)}
          />
        </TiltCard>
      </motion.div>
    </motion.div>
  );
}

function cnStreakIcon(streakAtRisk: boolean) {
  return streakAtRisk ? "shrink-0 text-amber-300" : "shrink-0 text-violet-300 opacity-80";
}
