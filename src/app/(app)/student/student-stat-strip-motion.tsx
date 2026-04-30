"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { TiltCard } from "@/components/ui/tilt-card";
import { BubbleText } from "@/components/ui/bubble-text";

import type { QuestAccuracyTrend } from "@/app/actions/quest";

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
}: {
  totalXp: number;
  streak: number;
  sessionsCompleted: number;
  avgRating: number;
  streakAtRisk: boolean;
  questAccuracy: QuestAccuracyTrend | null;
}) {
  const ratingLabel =
    Number.isFinite(avgRating) && avgRating > 0 ? (Math.round(avgRating * 10) / 10).toFixed(1) : "-";

  const trendArrow = questAccuracy?.direction === "up" ? "↑" : questAccuracy?.direction === "down" ? "↓" : "";
  const trendColor = questAccuracy?.direction === "up" ? "text-emerald-600" : questAccuracy?.direction === "down" ? "text-rose-600" : "text-slate-400";

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
          className="flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5"
        >
          <span className="text-2xl font-bold tabular-nums text-blue-700">
            {totalXp.toLocaleString()}
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            <BubbleText text="Total XP" activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className="flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5"
        >
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums text-slate-900">
              {questAccuracy ? `${questAccuracy.accuracyPercent}%` : "—"}
            </span>
            {trendArrow && (
              <span className={`text-lg font-bold ${trendColor}`}>{trendArrow}</span>
            )}
          </div>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500 line-clamp-1">
            <BubbleText text={`${questAccuracy?.subject || "Quest"} Accuracy`} activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>

      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className="flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5"
        >
          <span className="text-2xl font-bold tabular-nums text-slate-900">{sessionsCompleted}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            <BubbleText text="Sessions completed" activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>
      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className="flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5"
        >
          <span className="text-2xl font-bold tabular-nums text-slate-900">{ratingLabel}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            <BubbleText text="Avg. session rating" activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>
      <motion.div variants={item}>
        <TiltCard
          tiltLimit={12}
          scale={1.04}
          className={`flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5 ${
            streakAtRisk ? "ring-2 ring-amber-300/90" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <Image
              src="/images/live.png"
              alt="Streak"
              width={20}
              height={20}
              className={`shrink-0 ${streakAtRisk ? "opacity-100" : "opacity-60"}`}
            />
            <span className="text-2xl font-bold tabular-nums text-slate-900">{streak}</span>
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            <BubbleText text={streakAtRisk ? "Streak · log today" : "Day streak"} activeColor="text-blue-500" neighborColor="text-blue-400" />
          </span>
        </TiltCard>
      </motion.div>
    </motion.div>
  );
}
