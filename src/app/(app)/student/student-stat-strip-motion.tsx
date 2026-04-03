"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

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
}: {
  totalXp: number;
  streak: number;
  sessionsCompleted: number;
  avgRating: number;
  streakAtRisk: boolean;
}) {
  const ratingLabel =
    Number.isFinite(avgRating) && avgRating > 0 ? (Math.round(avgRating * 10) / 10).toFixed(1) : "—";

  return (
    <motion.div
      className="grid grid-cols-2 gap-px rounded-md border border-slate-200 bg-slate-200 md:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={item}
        className="flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4"
      >
        <span className="text-2xl font-medium tabular-nums text-slate-900">
          {totalXp.toLocaleString()}
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Total XP
        </span>
      </motion.div>
      <motion.div
        variants={item}
        className="flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4"
      >
        <span className="text-2xl font-medium tabular-nums text-slate-900">{sessionsCompleted}</span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Sessions completed
        </span>
      </motion.div>
      <motion.div
        variants={item}
        className="flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4"
      >
        <span className="text-2xl font-medium tabular-nums text-slate-900">{ratingLabel}</span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Avg. session rating
        </span>
      </motion.div>
      <motion.div
        variants={item}
        className={`flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4 ${
          streakAtRisk ? "ring-inset ring-1 ring-amber-200/80" : ""
        }`}
      >
        <span className="flex items-center gap-2">
          <Flame
            className={`h-5 w-5 shrink-0 ${streakAtRisk ? "text-amber-600" : "text-slate-400"}`}
            aria-hidden
          />
          <span className="text-2xl font-medium tabular-nums text-slate-900">{streak}</span>
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {streakAtRisk ? "Streak · log today" : "Day streak"}
        </span>
      </motion.div>
    </motion.div>
  );
}
