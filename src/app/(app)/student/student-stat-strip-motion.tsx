"use client";

import { motion } from "framer-motion";
import Image from "next/image";

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
    Number.isFinite(avgRating) && avgRating > 0 ? (Math.round(avgRating * 10) / 10).toFixed(1) : "-";

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={item}
        className="flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5"
      >
        <span className="text-2xl font-bold tabular-nums text-blue-700">
          {totalXp.toLocaleString()}
        </span>
        <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Total XP
        </span>
      </motion.div>
      <motion.div
        variants={item}
        className="flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5"
      >
        <span className="text-2xl font-bold tabular-nums text-slate-900">{sessionsCompleted}</span>
        <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Sessions completed
        </span>
      </motion.div>
      <motion.div
        variants={item}
        className="flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.1)] sm:px-5"
      >
        <span className="text-2xl font-bold tabular-nums text-slate-900">{ratingLabel}</span>
        <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Avg. session rating
        </span>
      </motion.div>
      <motion.div
        variants={item}
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
        <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {streakAtRisk ? "Streak · log today" : "Day streak"}
        </span>
      </motion.div>
    </motion.div>
  );
}
