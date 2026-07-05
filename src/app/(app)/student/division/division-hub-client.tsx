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
import { MentrixaVocabIcon, VOCAB_HEADING_ICON_SIZE } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_LEAGUE_ICON } from "@/shared/icons/vocab-canonical";

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
          className="flex items-center gap-3 rounded-2xl border border-[#A5B4FC] bg-[#EDE9FE] p-4 text-xs font-bold uppercase tracking-widest text-[#4F46E5]"
        >
          <Info className="h-4 w-4" />
          {error}
        </motion.div>
      )}

      <div className={cn(mentrixStudent.cardArena, arenaDivisionPanelClasses())}>
        <p
          className={cn(
            "inline-flex items-center gap-3 mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.22em]",
            arenaDivisionFocus.eyebrow,
          )}
        >
          <MentrixaVocabIcon name={CANONICAL_LEAGUE_ICON} size={VOCAB_HEADING_ICON_SIZE} surface="light" title="Weekly board" />
          {arenaLeaguePanelEyebrow()}
        </p>
        <p className={cn("mt-1 text-xs", arenaDivisionFocus.hint)}>
          {arenaLeaguePanelHint()}
        </p>

        {initialCards.length === 0 ? (
          <p className={`mt-5 ${mentrixStudent.hubEmpty} text-sm`}>
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
                <div
                  className={cn(
                    arenaDivisionCardClasses({ isSelected: isFocused }),
                    isFocused && "pt-7",
                  )}
                >
                  {isFocused ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-2 rounded-t-[1.35rem] bg-[#6366F1]"
                      aria-hidden
                    />
                  ) : null}

                  {isFocused ? (
                    <div className="mb-4 flex justify-end pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#6366F1] bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#4F46E5] shadow-[2px_2px_0_#0B1220] mx-hub-type-ui">
                        <MentrixaVocabIcon name="focus-ring" size={14} surface="light" title="Your focus" />
                        Your focus
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[#6366F1] bg-[#7C3AED] text-xl font-bold text-white shadow-[2px_2px_0_#0B1220] transition-transform group-hover:scale-110",
                      )}
                    >
                      {t.emoji}
                    </div>
                    <div className="min-w-0 flex-1 pr-1">
                      <h2 className="text-lg font-black uppercase italic leading-snug tracking-tighter text-[#0B1220]">
                        {c.name.replace(/\s+Division$/i, "")}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="inline-flex items-center gap-1.5 mx-hub-type-ui text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                          <MentrixaVocabIcon
                            name={CANONICAL_LEAGUE_ICON}
                            size={16}
                            surface="light"
                            title="League members"
                          />
                          {c.memberCount.toLocaleString()}
                        </div>
                        {c.weeklyRank != null ? (
                          <div className="inline-flex items-center gap-1.5 mx-hub-type-ui text-[10px] font-black uppercase tracking-widest text-[#6366F1]">
                            <MentrixaVocabIcon name="rank-proof" size={16} surface="light" title="Rank" />
                            <span>#{c.weeklyRank}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 flex-1 text-xs font-medium leading-relaxed text-[#475569]">
                    {arenaLeagueCardDescriptionFallback()}
                  </p>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      className={`h-10 flex-1 ${mentrixStudent.hubGhostLink} text-[10px] font-black uppercase tracking-widest active:scale-95`}
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
                          "h-10 flex-1 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                          isFocused
                            ? mentrixStudent.pillPrimary
                            : mentrixStudent.hubGhostLink,
                        )}
                      >
                        Join
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl border border-[#A5B4FC] bg-[#EDE9FE] px-3 py-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#6366F1]">
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
