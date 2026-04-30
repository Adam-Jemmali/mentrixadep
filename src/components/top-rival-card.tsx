"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import type { TopRivalData } from "@/app/actions/top-rival";
import { TiltCard } from "@/components/ui/tilt-card";

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
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 hover:shadow-[0_20px_50px_-20px_rgba(79,70,229,0.15)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center">
          {/* Header/Status Section */}
          <div className={cn(
            "flex flex-col justify-center p-6 sm:w-64 shrink-0",
            isRank1 ? "bg-blue-50/50" : "bg-indigo-50/50"
          )}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {rivalData.divisionName ?? "Division"}
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {isRank1 ? "Rank #1" : `Rank #${rivalData.myRank}`}
            </h3>
            <p className="mt-1 text-xs text-slate-500 font-mono italic">
              {rivalData.myXp?.toLocaleString()} XP
            </p>
          </div>

          {/* Rival Info Section */}
          <div className="relative flex-1 p-6">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm sm:h-16 sm:w-16">
                  <Image
                    src="/icons/mentrixer.svg"
                    alt="Rival"
                    fill
                    className="absolute inset-0 w-full h-full object-contain p-2 opacity-80"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                    {isRank1 ? "CONGRATULATIONS" : "YOUR RIVAL"}
                  </p>
                  <p className="text-base font-black uppercase italic tracking-tight text-slate-900 sm:text-lg">
                    {isRank1 ? "You are at the top!" : rivalData.rivalName}
                  </p>
                  {!isRank1 && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        {rivalData.rivalXp?.toLocaleString()} XP
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="text-xs font-bold text-indigo-600">
                        {rivalData.xpGap?.toLocaleString()} XP gap
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/student/quest"
                  className={cn(
                    "inline-flex h-10 items-center rounded-xl px-5 text-xs font-bold uppercase tracking-widest transition-all",
                    isRank1 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500"
                      : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
                  )}
                >
                  {isRank1 ? "Defend Title" : "Close the gap"}
                </Link>
              </motion.div>
            </div>
            
            {/* Background Branding */}
            <div className="pointer-events-none absolute bottom-0 right-0 p-4 opacity-[0.03]">
               <Image src={MENTRIXA_LOGO_PNG} alt="" width={60} height={60} />
            </div>
          </div>
        </div>
      </TiltCard>

      {/* Decorative Glow */}
      {!isRank1 && (
        <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      )}
    </div>
  );
}