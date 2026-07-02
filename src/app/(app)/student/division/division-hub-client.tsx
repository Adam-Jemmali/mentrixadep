"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import type { DivisionHubCard } from "@/features/divisions/divisions";
import { joinDivision } from "@/features/divisions/divisions";
import { getDivisionTheme } from "@/features/divisions/division-ui";
import {
  arenaLeagueCardDescriptionFallback,
  arenaLeaguePanelEyebrow,
  arenaLeaguePanelHint,
} from "@/features/divisions/arena-hub-messages-pure";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  arenaDivisionFocus,
  arenaDivisionCardClasses,
  arenaDivisionPanelClasses,
} from "@/features/divisions/arena-division-focus";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

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
          className="flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-indigo-950/45 p-4 text-xs font-bold uppercase tracking-widest text-violet-100"
        >
          <Info className="h-4 w-4" />
          {error}
        </motion.div>
      )}

      <div className={cn(mentrixStudent.cardArena, arenaDivisionPanelClasses())}>
        <p
          className={cn(
            "inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]",
            arenaDivisionFocus.eyebrow,
          )}
        >
          <MentrixaVocabIcon name="league" size={14} className="text-violet-300" title="League" />
          <MentrixaVocabIcon name="arena" size={14} className="text-cyan-300" title="Arena" />
          {arenaLeaguePanelEyebrow()}
        </p>
        <p className={cn("mt-1 text-xs", arenaDivisionFocus.hint)}>
          {arenaLeaguePanelHint()}
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
                      className="pointer-events-none absolute inset-x-0 top-0 h-2 rounded-t-[1.35rem] bg-gradient-to-r from-[#7C3AED] to-[#6366F1]"
                      aria-hidden
                    />
                  ) : null}

                  {isFocused ? (
                    <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-amber-200 bg-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-md shadow-amber-900/30">
                        <MentrixaVocabIcon name="focus-ring" size={12} className="text-[#22D3EE]" title="Your focus" />
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
                        <h2 className="truncate text-lg font-black uppercase italic leading-none tracking-tighter text-violet-50">
                          {c.name.replace(/\s+Division$/i, "")}
                        </h2>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-violet-300/70">
                            <MentrixaVocabIcon name="arena" size={12} className="opacity-80" title="Arena members" />
                            {c.memberCount.toLocaleString()}
                          </div>
                          {c.weeklyRank != null ? (
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-200/80">
                              <MentrixaVocabIcon name="rank-proof" size={12} className="text-violet-200/80" title="Rank" />
                              <span>| #{c.weeklyRank}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 flex-1 text-xs font-medium leading-relaxed text-violet-200/75">
                    {arenaLeagueCardDescriptionFallback()}
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-violet-500/35 bg-indigo-950/50 text-[10px] font-black uppercase tracking-widest text-violet-100 transition-all hover:border-violet-400/50 hover:bg-violet-900/45 active:scale-95"
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
                            ? "bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white shadow-lg shadow-violet-600/30 ring-2 ring-violet-400/60 hover:brightness-110"
                            : "border border-indigo-500/35 bg-indigo-950/50 text-violet-100 hover:border-violet-400/45 hover:bg-violet-900/45",
                        )}
                      >
                        Join
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-950/45 px-3 py-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-violet-200">
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
