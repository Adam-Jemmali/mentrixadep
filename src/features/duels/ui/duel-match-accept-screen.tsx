"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  getAccountRankByLevel,
  getAccountRankFromTotalXp,
  normalizeRankTitle,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";
import { getAccountLevelFromTotalXp } from "@/features/xp/levels";
import { cn } from "@/shared/core/utils";

export type DuelMatchAcceptParticipant = {
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  totalXp: number | null;
  isAi?: boolean;
};

export type DuelMatchAcceptScreenProps = {
  divisionLabel: string;
  me: DuelMatchAcceptParticipant;
  opponent: DuelMatchAcceptParticipant & { isAi: boolean };
  meAccepted: boolean;
  opponentAccepted: boolean;
  acceptBusy: boolean;
  acceptError: string | null;
  onAccept: () => void;
  onDecline: () => void;
  statusLine: string;
};

/** Account rank emblem from XP; sparring bot uses Scholar tier visual. */
function resolveParticipantRank(
  person: DuelMatchAcceptParticipant,
  isAi: boolean,
): AccountRankVisual {
  if (person.totalXp != null && person.totalXp > 0) {
    return getAccountRankFromTotalXp(person.totalXp);
  }
  if (isAi) {
    return getAccountRankByLevel(3);
  }
  return getAccountRankByLevel(
    getAccountLevelFromTotalXp(person.totalXp ?? 0).level,
  );
}

function AcceptRankHero({
  rank,
  name,
  ready,
  side,
  avatarUrl,
}: {
  rank: AccountRankVisual;
  name: string;
  ready: boolean;
  side: "left" | "right";
  avatarUrl: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -48 : 48, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", damping: 16, stiffness: 200, delay: 0.12 }}
      className={cn(
        mentrixStudent.hubNotebook,
        "flex w-full max-w-[11rem] flex-col items-center gap-3 px-4 py-5 sm:max-w-[12.5rem] sm:gap-4 sm:px-5",
      )}
    >
      <div className="relative">
        {ready ? (
          <motion.div
            className="pointer-events-none absolute -inset-2 rounded-2xl ring-2 ring-[#6366F1]/70"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        ) : null}
        <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
          <RankBadge
            rank={rank}
            size="xl"
            active
            priority
            showGlow={rank.key === "mentrixer" || ready}
            className={cn(
              "!h-[5.5rem] !w-[5.5rem] sm:!h-[6.5rem] sm:!w-[6.5rem]",
              "!rounded-2xl !bg-white",
              ready && "ring-2 ring-[#6366F1]",
            )}
          />
          {avatarUrl ? (
            <div className="absolute -bottom-1 -right-1 h-10 w-10 overflow-hidden rounded-full border-2 border-[#6366F1] bg-white shadow-[2px_2px_0_#0B1220] sm:h-11 sm:w-11">
              <Image
                src={avatarUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="44px"
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="max-w-[11rem] space-y-1 text-center">
        <p className="mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.2em]">
          {normalizeRankTitle(rank.title)}
        </p>
        <p className="mx-hub-ink-title text-sm uppercase italic sm:text-base">{name}</p>
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em]",
            ready ? "mx-hub-type-ui" : "mx-hub-ink-muted",
          )}
        >
          {ready ? "Ready" : "Awaiting"}
        </p>
      </div>
    </motion.div>
  );
}

export function DuelMatchAcceptScreen({
  divisionLabel,
  me,
  opponent,
  meAccepted,
  opponentAccepted,
  acceptBusy,
  acceptError,
  onAccept,
  onDecline,
  statusLine,
}: DuelMatchAcceptScreenProps) {
  const meRank = resolveParticipantRank(me, false);
  const opponentRank = resolveParticipantRank(opponent, opponent.isAi);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-hidden",
        mentrixStudent.pageBgArena,
      )}
    >
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
          className={cn(mentrixStudent.hubNotebook, "mx-auto w-full max-w-lg px-5 py-5 text-center sm:px-6 sm:py-6")}
        >
          <p className="mx-hub-type-ui text-[10px] font-black uppercase tracking-[0.28em]">
            {divisionLabel}
          </p>
          <h1 className="mx-hub-ink-title mt-3 text-3xl uppercase italic sm:text-4xl">Match found</h1>
          <p className="mx-hub-ink-muted mt-3 text-sm font-medium leading-relaxed">
            Both sides must accept before the duel begins
            {opponent.isAi ? "" : "."}
          </p>
        </motion.div>

        <div className="mx-auto mt-6 flex w-full max-w-4xl flex-1 flex-wrap items-center justify-center gap-4 sm:mt-8 sm:gap-6 lg:gap-8">
          <AcceptRankHero
            rank={meRank}
            name={me.name}
            ready={meAccepted}
            side="left"
            avatarUrl={me.avatarUrl}
          />

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.28 }}
            className={cn(
              mentrixStudent.hubSticky,
              "relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24",
            )}
          >
            <span className="mx-hub-ink-title text-2xl uppercase italic sm:text-3xl">VS</span>
          </motion.div>

          <AcceptRankHero
            rank={opponentRank}
            name={opponent.name}
            ready={opponentAccepted}
            side="right"
            avatarUrl={opponent.isAi ? null : opponent.avatarUrl}
          />
        </div>

        {acceptError ? (
          <p className="mx-auto mt-5 max-w-md text-center text-sm font-semibold text-[#B45309]">
            {acceptError}
          </p>
        ) : null}

        <div
          className={cn(
            mentrixStudent.hubSticky,
            "mx-auto mt-6 flex w-full max-w-md flex-col items-stretch gap-3 px-5 py-5 sm:mt-8",
          )}
        >
          <Button
            type="button"
            size="lg"
            disabled={acceptBusy || meAccepted}
            onClick={onAccept}
            className={cn(
              mentrixStudent.pillPrimary,
              "h-11 w-full text-[11px] font-black uppercase tracking-[0.16em]",
              "disabled:opacity-60",
            )}
          >
            {acceptBusy ? "…" : meAccepted ? "You accepted" : "Accept match"}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            disabled={acceptBusy}
            onClick={onDecline}
            className={cn(
              mentrixStudent.hubGhostLink,
              "h-11 w-full text-[11px] font-black uppercase tracking-[0.16em]",
            )}
          >
            Decline
          </Button>
        </div>

        <motion.div
          className={cn(mentrixStudent.hubNotebook, "mx-auto mt-5 w-fit px-5 py-3")}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="mx-hub-type-ui text-center text-[10px] font-bold uppercase tracking-[0.22em]">
            {statusLine}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
