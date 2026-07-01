"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import type { TopRivalData } from "@/features/divisions/top-rival";
import { AP_CALC_AB_DIVISION_NAME } from "@/features/divisions/ap-calc-ab-division";
import { mentrixProfileType, mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { TiltCard } from "@/shared/ui/tilt-card";

interface Props {
  rivalData: TopRivalData;
  className?: string;
}

export function TopRivalCard({ rivalData, className }: Props) {
  if (rivalData.status === "no_division") return null;

  const isRank1 = rivalData.status === "rank_1";

  return (
    <div className={cn("relative group", className)}>
      <TiltCard
        tiltLimit={3}
        className={`overflow-hidden ${mentrixStudent.card} shadow-[0_8px_30px_-12px_rgba(79,70,229,0.45)] transition-all duration-500 hover:shadow-[0_20px_50px_-20px_rgba(124,58,237,0.55)]`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div
            className={cn(
              "flex flex-col justify-center border-b border-violet-500/25 p-6 sm:w-64 sm:shrink-0 sm:border-b-0 sm:border-r",
              isRank1
                ? "bg-gradient-to-br from-violet-600/40 to-indigo-900/60"
                : "bg-gradient-to-br from-indigo-950/80 to-[#0B1220]/90",
            )}
          >
            <p className={mentrixProfileType.labelOnDark}>{AP_CALC_AB_DIVISION_NAME} league</p>
            <h3 className="mt-1 font-mono text-lg font-black italic tracking-tight text-white">
              {isRank1 ? "Rank #1" : `Rank #${rivalData.myRank}`}
            </h3>
            <p className={`mt-1 font-mono text-xs font-black tabular-nums text-violet-200`}>
              {rivalData.myXp?.toLocaleString()} XP
            </p>
          </div>

          <div className="relative flex-1 p-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-violet-400/50 bg-indigo-950/80 shadow-sm sm:h-16 sm:w-16">
                  <Image
                    src="/icons/mentrixer.svg"
                    alt="Rival"
                    fill
                    className="absolute inset-0 h-full w-full object-contain p-2 opacity-90"
                  />
                </div>
                <div>
                  <p className={mentrixProfileType.labelOnDark}>
                    {isRank1 ? "CONGRATULATIONS" : "YOUR RIVAL"}
                  </p>
                  <p className="text-base font-black uppercase italic tracking-tight text-white sm:text-lg">
                    {isRank1 ? "You are at the top!" : rivalData.rivalName}
                  </p>
                  {!isRank1 && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-violet-200/80">
                        {rivalData.rivalXp?.toLocaleString()} XP
                      </span>
                      <span className="h-1 w-1 rounded-full bg-violet-400/60" />
                      <span className="text-xs font-bold text-indigo-300">
                        {rivalData.xpGap?.toLocaleString()} XP gap
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={isRank1 ? "/student/duel" : "/student/quest"}
                  className={cn(
                    "inline-flex h-10 items-center rounded-xl px-5 transition-all",
                    mentrixProfileType.cta,
                    "bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white shadow-lg shadow-violet-600/30 hover:brightness-110",
                  )}
                >
                  {isRank1 ? "Defend Title" : "Close the gap"}
                </Link>
              </motion.div>
            </div>

            <div className="pointer-events-none absolute bottom-0 right-0 p-4 opacity-[0.06]">
              <Image src={MENTRIXA_LOGO_PNG} alt="" width={60} height={60} />
            </div>
          </div>
        </div>
      </TiltCard>

      {!isRank1 && (
        <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-r from-violet-500/0 via-violet-500/15 to-indigo-500/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      )}
    </div>
  );
}
