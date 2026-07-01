"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Info, Users } from "lucide-react";
import type { DivisionHubCard } from "@/features/divisions/divisions";
import { joinDivision } from "@/features/divisions/divisions";
import { getDivisionTheme } from "@/features/divisions/division-ui";
import { AP_CALC_AB_DIVISION_NAME } from "@/features/divisions/ap-calc-ab-division";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  arenaDivisionFocus,
  arenaDivisionCardClasses,
  arenaDivisionPanelClasses,
} from "@/features/divisions/arena-division-focus";

export function DivisionHubClient({ initialCards }: { initialCards: DivisionHubCard[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (key: string) => {
    setError(null);
    startTransition(async () => {
      const r = await joinDivision(key);
      if (!r.success) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 rounded-2xl border border-slate-900/20 bg-slate-900/10 p-4 text-xs font-bold uppercase tracking-widest text-slate-900"
        >
          <Info className="h-4 w-4" />
          {error}
        </motion.div>
      )}

      <div className={cn(mentrixStudent.cardArena, arenaDivisionPanelClasses())}>
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.22em]",
            arenaDivisionFocus.eyebrow,
          )}
        >
          {AP_CALC_AB_DIVISION_NAME} league
        </p>
        <p className={cn("mt-1 text-xs", arenaDivisionFocus.hint)}>
          Join to climb the weekly board. The{" "}
          <span className="font-semibold text-cyan-300">cyan outline</span> marks your home
          focus.
        </p>

        {initialCards.length === 0 ? (
          <p className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Arena is syncing. Refresh in a moment or contact support if this persists.
          </p>
        ) : null}

        <motion.ul
          layout
          className="mt-5 grid gap-5 overflow-visible sm:grid-cols-2 lg:grid-cols-3"
        >
          {initialCards.map((c, i) => {
            const t = getDivisionTheme(c.key);
            const isFocused = c.isFocused;

            return (
              <motion.li
                key={c.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-visible p-1"
              >
                <div className={arenaDivisionCardClasses({ isSelected: isFocused })}>
                  {isFocused ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-2 rounded-t-[1.35rem] bg-cyan-400"
                      aria-hidden
                    />
                  ) : null}

                  {isFocused ? (
                    <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
                      <span className="rounded-full border-2 border-amber-200 bg-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-md shadow-amber-900/30">
                        Your focus
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={cn(
                          "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-lg transition-transform group-hover:scale-110",
                          t.gradient,
                        )}
                      >
                        {t.emoji}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black uppercase italic leading-none tracking-tighter text-slate-900">
                          {c.name.replace(/\s+Division$/i, "")}
                        </h2>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            <Users className="h-3 w-3 opacity-50" />
                            {c.memberCount.toLocaleString()}
                          </div>
                          {c.weeklyRank != null ? (
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              <span>| Rank #{c.weeklyRank}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 flex-1 text-xs font-medium leading-relaxed text-slate-500">
                    {c.description || "Compete in this division and climb the global leaderboards."}
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                      asChild
                    >
                      <Link href={`/student/division/${encodeURIComponent(c.key)}`}>
                        Enter Arena
                      </Link>
                    </Button>

                    {!c.isMember ? (
                      <Button
                        disabled={isPending}
                        onClick={() => handleJoin(c.key)}
                        className={cn(
                          "h-10 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                          isFocused
                            ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/35 ring-2 ring-cyan-300/80 hover:bg-cyan-500"
                            : "bg-slate-100 text-slate-800 hover:bg-slate-200",
                        )}
                      >
                        Join
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-800">
                          Joined
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pointer-events-none absolute -bottom-2 -right-2 p-2 opacity-[0.02] grayscale transition-opacity group-hover:opacity-[0.05]">
                    <Image src="/mentrixalogo/logo.webp" alt="" width={80} height={80} />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </div>
  );
}
