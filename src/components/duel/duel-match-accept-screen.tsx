"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ClanAvatarBadge } from "@/components/clan/clan-avatar-badge";
import { RankBadge } from "@/components/student/rank-badge";
import type { DuelParticipantClan } from "@/app/actions/duel";
import { MENTRIXA_SOUND_SRC } from "@/lib/mentrixa-sounds";
import {
  getAccountRankByLevel,
  getAccountRankFromTotalXp,
  type AccountRankVisual,
} from "@/lib/rank-icons";
import { getAccountLevelFromTotalXp } from "@/lib/levels";
import { cn } from "@/lib/utils";

export type DuelMatchAcceptParticipant = {
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  totalXp: number | null;
  clan: DuelParticipantClan | null;
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

/** Hides baked-in emblem + “rank up” copy in mentrixa-rank-up.mp4; keeps the gold burst at the edges. */
const RANK_UP_VIDEO_MASK =
  "radial-gradient(ellipse 72% 62% at 50% 36%, transparent 0%, transparent 58%, black 88%)";

function AcceptRankHero({
  rank,
  name,
  ready,
  side,
  avatarUrl,
  clan,
}: {
  rank: AccountRankVisual;
  name: string;
  ready: boolean;
  side: "left" | "right";
  avatarUrl: string | null;
  clan: DuelParticipantClan | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -48 : 48, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", damping: 16, stiffness: 200, delay: 0.12 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="relative">
        {ready ? (
          <motion.div
            className="pointer-events-none absolute -inset-3 rounded-3xl"
            style={{ boxShadow: `0 0 40px ${rank.colorMuted}` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        ) : null}
        <RankBadge
          rank={rank}
          size="xl"
          active
          priority
          showGlow={rank.key === "mentrixer" || ready}
          className={cn(
            "!h-[7.5rem] !w-[7.5rem] sm:!h-[8.5rem] sm:!w-[8.5rem]",
            "!rounded-2xl !bg-slate-950/95",
            ready && "ring-2 ring-amber-300/80",
          )}
        />
        {avatarUrl ? (
          <div className="absolute -bottom-1 -right-1 h-11 w-11 overflow-hidden rounded-full border-2 border-amber-200/70 bg-slate-950 shadow-lg sm:h-12 sm:w-12">
            <Image
              src={avatarUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : null}
      </div>
      <div className="max-w-[11rem] text-center">
        <p className="text-sm font-black uppercase italic tracking-tight text-amber-50">
          {name}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px] font-black uppercase tracking-[0.2em]",
            ready ? "text-amber-300" : "text-amber-100/45",
          )}
        >
          {ready ? "Ready" : "Awaiting"}
        </p>
        {clan ? (
          <div className="mt-3 flex flex-col items-center gap-1.5 border-t border-amber-200/15 pt-3">
            <ClanAvatarBadge
              name={clan.name}
              avatarKind={clan.avatarKind}
              presetKey={clan.presetKey}
              avatarUrl={clan.avatarUrl}
              size="md"
              className="!bg-slate-950/90 border-2 border-amber-300/35 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
            />
            <p className="text-[10px] font-black uppercase italic tracking-[0.12em] text-amber-100/90">
              {clan.name}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/50">
              [{clan.tag}]
            </p>
          </div>
        ) : null}
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const meRank = resolveParticipantRank(me, false);
  const opponentRank = resolveParticipantRank(opponent, opponent.isAi);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    const play = () => {
      void el.play().catch(() => {
        /* gesture may unlock later */
      });
    };
    play();
    return () => {
      el.pause();
      el.currentTime = 0;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#050810]">
      <video
        ref={videoRef}
        src={MENTRIXA_SOUND_SRC.rankUp}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.9] saturate-[1.1] contrast-[1.04]"
        style={{
          WebkitMaskImage: RANK_UP_VIDEO_MASK,
          maskImage: RANK_UP_VIDEO_MASK,
        }}
        muted
        playsInline
        preload="auto"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_38%,rgba(251,191,36,0.22),transparent_62%),linear-gradient(180deg,rgba(5,8,16,0.2)_0%,rgba(5,8,16,0.88)_70%,rgba(5,8,16,0.96)_100%)]"
        aria-hidden
      />

      {/* Covers any remaining celebration / rank-up lettering from the MP4 */}
      <div
        className="pointer-events-none absolute left-1/2 top-[30%] z-[5] h-44 w-[min(100%,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] bg-[#050810]/92 blur-[2px] sm:h-52 sm:w-[26rem]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
          className="mb-4 text-center"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-200/80">
            {divisionLabel}
          </p>
          <h1 className="mt-3 bg-gradient-to-b from-amber-100 via-yellow-200 to-amber-500 bg-clip-text text-4xl font-black uppercase italic tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(251,191,36,0.45)] sm:text-5xl">
            Match Found
          </h1>
        </motion.div>

        <p className="mb-6 max-w-md text-center text-sm font-medium leading-relaxed text-amber-50/85">
          Both sides must accept before the duel begins
          {opponent.isAi ? "" : "."}
        </p>

        {/* Replaces the video’s center logo: each player’s account rank SVG */}
        <div className="relative flex w-full max-w-3xl items-center justify-center gap-3 sm:gap-6">
          <AcceptRankHero
            rank={meRank}
            name={me.name}
            ready={meAccepted}
            side="left"
            avatarUrl={me.avatarUrl}
            clan={me.clan}
          />

          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.28 }}
            className="relative z-10 shrink-0 bg-gradient-to-b from-amber-50 to-amber-400 bg-clip-text px-1 text-3xl font-black italic tracking-tighter text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.45)] sm:text-4xl"
          >
            VS
          </motion.span>

          <AcceptRankHero
            rank={opponentRank}
            name={opponent.name}
            ready={opponentAccepted}
            side="right"
            avatarUrl={opponent.isAi ? null : opponent.avatarUrl}
            clan={opponent.clan}
          />
        </div>

        {acceptError ? (
          <p className="mt-6 max-w-md text-center text-sm font-semibold text-rose-300">{acceptError}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            size="lg"
            disabled={acceptBusy || meAccepted}
            onClick={onAccept}
            className={cn(
              "min-w-[11rem] rounded-xl border-2 border-amber-200/80 font-black uppercase tracking-[0.18em]",
              "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-slate-950",
              "shadow-[0_8px_28px_-6px_rgba(251,191,36,0.75)] hover:from-amber-200 hover:via-amber-300 hover:to-amber-500",
              "disabled:opacity-60",
            )}
          >
            {acceptBusy ? "…" : meAccepted ? "You accepted" : "Accept match"}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={acceptBusy}
            onClick={onDecline}
            className="min-w-[11rem] rounded-xl border-amber-200/25 bg-black/40 font-bold uppercase tracking-widest text-amber-100/90 backdrop-blur-sm hover:border-amber-200/45 hover:bg-black/55 hover:text-amber-50"
          >
            Decline
          </Button>
        </div>

        <motion.p
          className="mt-6 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-amber-200/70"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {statusLine}
        </motion.p>
      </div>
    </div>
  );
}
