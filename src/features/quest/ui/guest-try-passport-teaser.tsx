"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";

export function GuestTryPassportTeaser({
  correct,
  total,
  wouldXp,
  className,
}: {
  correct: number;
  total: number;
  wouldXp: number;
  className?: string;
}) {
  const rank = getAccountRankFromTotalXp(wouldXp);
  const sampleDots = Array.from({ length: Math.min(total, 5) }, (_, i) => i < correct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.12 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F172A] via-[#131c33] to-[#1e1b4b]/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/90">
          Rank passport preview
        </span>
        <span className="font-mono text-[10px] text-slate-500">mentrixa.one/rank/you</span>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <RankBadge rank={rank} size="lg" surface="onDark" active showGlow={rank.key === "mentrixer"} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold tracking-tight text-white">Your verified passport</p>
          <p className="mt-1 text-sm text-slate-400">
            This sample is not on your card yet.{" "}
            <span className="font-semibold text-slate-200">
              {correct}/{total} correct
            </span>{" "}
            only counts after signup and first attempts.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {sampleDots.map((hit, index) => (
              <span
                key={index}
                className={cn(
                  "size-2.5 rounded-sm border transition-colors",
                  hit
                    ? "border-emerald-400/60 bg-emerald-500/80"
                    : "border-amber-400/50 bg-amber-500/70",
                )}
                aria-hidden
              />
            ))}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Sample grid
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-4 py-3 sm:px-5">
        <p className="text-xs text-slate-500">
          Starter rank:{" "}
          <span className="font-semibold" style={{ color: rank.labelOnDark }}>
            {normalizeRankTitle(rank.title)}
          </span>
          {wouldXp > 0 ? (
            <span className="text-slate-400"> · +{wouldXp} XP if saved</span>
          ) : null}
        </p>
        <Link
          href="/auth/signup"
          className="text-xs font-semibold"
          style={{ color: VERIFIED_GOLD }}
        >
          Lock first attempts →
        </Link>
      </div>
    </motion.div>
  );
}
