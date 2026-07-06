"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { joinDuelQueue, leaveDuelQueue, pollDuelQueue, acceptQueueMatch, declineQueueMatch, getQueueMatchAcceptance } from "@/features/duels/duel-queue";
import { createAiDuelFromQueue } from "@/features/duels/duel-gameplay";
import { getDuelMatchupPreview } from "@/features/duels/duel-reads";
import { DUEL_AI_QUEUE_WAIT_MS } from "@/features/duels/duel-constants";
import { Button } from "@/shared/ui/button";
import { Info } from "lucide-react";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { MentrixaLogoLoader } from "@/components/mentrixa-logo";
import { DuelMatchAcceptScreen } from "@/features/duels/ui/duel-match-accept-screen";
import { getDivisionTheme } from "@/features/divisions/division-ui";
import {
  AP_CALC_AB_DIVISION_NAME,
} from "@/features/divisions/ap-calc-ab-division";
import { cn } from "@/shared/core/utils";
import { RANK_LADDER_CHIP_SIZE } from "@/features/xp/rank-display-tokens";
import { getAccountRankFromTotalXp, normalizeRankTitle } from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import {
  enterDuelQueueMusic,
  startDuelLoopFromGesture,
  playMentrixaRankUpOnce,
} from "@/shared/integrations/mentrixa-sounds";
import { safeRouterRefresh } from "@/shared/core/safe-router-refresh";
import { AbCalculusSubjectTitle } from "@/features/quest/ui/ab-calc-subject-title";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";
import {
  arenaDivisionFocus,
  arenaDivisionCardClasses,
  arenaDivisionPanelClasses,
} from "@/features/divisions/arena-division-focus";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_DUELS_ICON } from "@/shared/icons/vocab-canonical";

interface Props {
  divisions: { key: string; name: string; description: string | null }[];
  /** Syncs with Division arena “home” focus when set */
  preferredDivisionKey: string | null;
  initialQueueDivision: string | null;
  currentUser: {
    name: string;
    avatarUrl: string | null;
    totalXp: number | null;
  };
}

type MatchIntro = {
  duelId: string;
  divisionLabel: string;
  me: {
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    totalXp: number | null;
  };
  opponent: {
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    totalXp: number | null;
    isAi: boolean;
  };
};

type MatchPhase = "accept" | "merge";

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function resolveInitialDivisionKey(
  divisions: { key: string }[],
  queueDivision: string | null,
  preferred: string | null
): string {
  const keys = new Set(divisions.map((d) => d.key));
  if (queueDivision && keys.has(queueDivision)) return queueDivision;
  if (preferred && keys.has(preferred)) return preferred;
  return divisions[0]?.key ?? "";
}

export function DuelHub({
  divisions,
  preferredDivisionKey,
  initialQueueDivision,
  currentUser,
}: Props) {
  const router = useRouter();
  const transitioningRef = useRef(false);

  const initialKey = useMemo(
    () =>
      resolveInitialDivisionKey(
        divisions,
        initialQueueDivision,
        preferredDivisionKey
      ),
    [divisions, initialQueueDivision, preferredDivisionKey]
  );

  const [divisionKey, setDivisionKey] = useState(initialKey);
  const soleDivision = divisions[0] ?? null;

  useEffect(() => {
    if (soleDivision && divisionKey !== soleDivision.key) {
      setDivisionKey(soleDivision.key);
    }
  }, [soleDivision, divisionKey]);
  const [queuePhase, setQueuePhase] = useState<"idle" | "waiting">(
    initialQueueDivision ? "waiting" : "idle"
  );
  const [queueStartedAtMs, setQueueStartedAtMs] = useState<number | null>(
    initialQueueDivision ? Date.now() : null
  );
  const [queueCountdownSec, setQueueCountdownSec] = useState(
    Math.ceil(DUEL_AI_QUEUE_WAIT_MS / 1000)
  );
  const [queueLoading, setQueueLoading] = useState(false);
  const [instantSparringLoading, setInstantSparringLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [matchIntro, setMatchIntro] = useState<MatchIntro | null>(null);
  const [matchPhase, setMatchPhase] = useState<MatchPhase | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [meAccepted, setMeAccepted] = useState(false);
  const [opponentAccepted, setOpponentAccepted] = useState(false);

  const matchIntroRef = useRef<MatchIntro | null>(null);
  matchIntroRef.current = matchIntro;

  const queueResolveLockRef = useRef(false);
  const myAccountRank = getAccountRankFromTotalXp(currentUser.totalXp ?? 0);

  useEffect(() => {
    if (queuePhase !== "waiting") {
      setQueueCountdownSec(Math.ceil(DUEL_AI_QUEUE_WAIT_MS / 1000));
      return;
    }

    const startedAt = queueStartedAtMs ?? Date.now();
    if (queueStartedAtMs == null) {
      setQueueStartedAtMs(startedAt);
    }

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remainingMs = Math.max(0, DUEL_AI_QUEUE_WAIT_MS - elapsed);
      setQueueCountdownSec(Math.ceil(remainingMs / 1000));
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [queuePhase, queueStartedAtMs]);

  function getProfileImage(person: { avatarUrl: string | null; isAi?: boolean }) {
    if (person.avatarUrl) {
      return (
        <Image
          src={person.avatarUrl}
          alt=""
          fill
          unoptimized
          className="object-cover rounded-full"
          sizes="128px"
        />
      );
    }

    return (
      <Image
        src={person.isAi ? MENTRIXA_LOGO_PNG : "/icons/mentrixer.svg"}
        alt=""
        fill
        className="object-contain p-4"
        sizes="128px"
      />
    );
  }

  useEffect(() => {
    if (!matchIntro || matchPhase !== "merge") return;
    const timer = window.setTimeout(() => {
      router.push(`/student/duel/${matchIntro.duelId}`);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [matchIntro, matchPhase, router]);

  useEffect(() => {
    if (queuePhase !== "waiting" || matchIntro) return;
    enterDuelQueueMusic();
  }, [queuePhase, matchIntro]);

  const playMatchFoundStinger = useCallback(() => {
    playMentrixaRankUpOnce();
  }, []);

  const handleAcceptMatch = useCallback(async () => {
    if (!matchIntro || acceptBusy) return;
    setAcceptBusy(true);
    setAcceptError(null);
    try {
      const r = await acceptQueueMatch(matchIntro.duelId);
      if (!r.success) {
        setAcceptError(r.error);
        return;
      }
      setMeAccepted(r.state.meAccepted);
      setOpponentAccepted(r.state.opponentAccepted);
      if (r.state.bothAccepted || r.state.status === "active") {
        setMatchPhase("merge");
      }
    } catch {
      setAcceptError("Could not accept the match. Try again.");
    } finally {
      setAcceptBusy(false);
    }
  }, [matchIntro, acceptBusy]);

  const handleDeclineMatch = useCallback(async () => {
    if (!matchIntro || acceptBusy) return;
    setAcceptBusy(true);
    setAcceptError(null);
    try {
      const r = await declineQueueMatch(matchIntro.duelId);
      if (!r.success) {
        setAcceptError(r.error);
        return;
      }
      setMatchIntro(null);
      setMatchPhase(null);
      setMeAccepted(false);
      setOpponentAccepted(false);
      setQueuePhase("idle");
      setQueueStartedAtMs(null);
      setQueueError("You declined this match.");
    } catch {
      setAcceptError("Could not decline the match.");
    } finally {
      setAcceptBusy(false);
    }
  }, [matchIntro, acceptBusy]);

  useEffect(() => {
    if (!matchIntro || matchPhase !== "accept") return;

    let cancelled = false;
    const sync = async () => {
      try {
        const resp = await getQueueMatchAcceptance(matchIntro.duelId);
        if (cancelled || !resp.success) return;

        const s = resp.state;
        setMeAccepted(s.meAccepted);
        setOpponentAccepted(s.opponentAccepted);

        if (s.terminal && s.status !== "active") {
          setAcceptError(
            s.status === "cancelled" || s.status === "declined"
              ? "Match was declined. Returning to matchmaking."
              : "This match is no longer available.",
          );
          window.setTimeout(() => {
            if (cancelled) return;
            setMatchIntro(null);
            setMatchPhase(null);
            setMeAccepted(false);
            setOpponentAccepted(false);
            setQueuePhase("idle");
            setQueueStartedAtMs(null);
          }, 2200);
          return;
        }

        if (s.bothAccepted || s.status === "active") {
          setMatchPhase("merge");
        }
      } catch {
        /* poll again */
      }
    };

    void sync();
    const id = setInterval(() => void sync(), 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [matchIntro, matchPhase]);

  const showMatchIntroAndNavigate = useCallback(async (duelId: string): Promise<boolean> => {
    if (transitioningRef.current) return false;
    transitioningRef.current = true;
    playMatchFoundStinger();

    const fallbackPush = () => {
      router.push(`/student/duel/${duelId}`);
    };

    try {
      const resp = await getDuelMatchupPreview(duelId);
      if (!resp.success) {
        fallbackPush();
        return true;
      }

      const preview = resp.preview;
      const label =
        divisions.find((d) => d.key === preview.divisionKey)?.name ?? preview.divisionKey;

      setMatchIntro({
        duelId: preview.duelId,
        divisionLabel: label,
        me: {
          name: preview.me.name,
          avatarUrl: preview.me.avatarUrl,
          bio: preview.me.bio,
          totalXp: preview.me.totalXp,
        },
        opponent: {
          name: preview.opponent.name,
          avatarUrl: preview.opponent.avatarUrl,
          bio: preview.opponent.bio,
          totalXp: preview.opponent.totalXp,
          isAi: preview.opponent.isAi,
        },
      });
      setMatchPhase("accept");
      setMeAccepted(false);
      setOpponentAccepted(false);
      setAcceptError(null);
      return true;
    } catch {
      fallbackPush();
      return true;
    } finally {
      transitioningRef.current = false;
    }
  }, [router, divisions, playMatchFoundStinger]);

  const attemptResolveQueuedMatch = useCallback(async (): Promise<boolean> => {
    if (!divisionKey) return false;
    if (matchIntroRef.current) return true;
    if (queueResolveLockRef.current) return false;
    queueResolveLockRef.current = true;
    try {
      let p;
      try {
        p = await pollDuelQueue(divisionKey);
      } catch {
        return false;
      }
      if (p?.state === "matched" && p.duelId) {
        for (let attempt = 0; attempt < 4; attempt++) {
          if (await showMatchIntroAndNavigate(p.duelId)) return true;
          await new Promise((r) => setTimeout(r, 280));
        }
        setQueueError(
          "A  match was found but the intro did not open. Check “Your duels” below and tap Open, or cancel and try again."
        );
        return false;
      }
      let r;
      try {
        r = await createAiDuelFromQueue(divisionKey);
      } catch {
        setQueueError("Matchmaking connection lost. Check your network and try again.");
        return false;
      }
      if (r.success) {
        for (let attempt = 0; attempt < 4; attempt++) {
          if (await showMatchIntroAndNavigate(r.duelId)) return true;
          await new Promise((res) => setTimeout(res, 280));
        }
        setQueueError(
          "Mentrixa Quest duel was created but the intro did not open. Open it from “Your duels” below."
        );
        safeRouterRefresh(router);
        return false;
      }
      setQueueError(r.error);
      return false;
    } finally {
      queueResolveLockRef.current = false;
    }
  }, [divisionKey, showMatchIntroAndNavigate, router]);

  useEffect(() => {
    if (queuePhase !== "waiting" || !divisionKey || matchIntro) return;
    const tick = async () => {
      try {
        const p = await pollDuelQueue(divisionKey);
        if (p?.state === "matched" && p.duelId) {
          if (!(await showMatchIntroAndNavigate(p.duelId))) {
            await new Promise((r) => setTimeout(r, 350));
            await showMatchIntroAndNavigate(p.duelId);
          }
        }
      } catch {
        /* transient network / dev hiccup — poll again on next interval */
      }
    };
    const id = setInterval(() => void tick(), 2000);
    void tick();
    return () => {
      clearInterval(id);
    };
  }, [queuePhase, divisionKey, matchIntro, showMatchIntroAndNavigate]);

  useEffect(() => {
    if (queuePhase !== "waiting" || !divisionKey || matchIntro) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        await attemptResolveQueuedMatch();
      })();
    }, DUEL_AI_QUEUE_WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [queuePhase, divisionKey, matchIntro, attemptResolveQueuedMatch]);

  async function playSparringQuestNow() {
    startDuelLoopFromGesture();
    setQueueError(null);
    setInstantSparringLoading(true);
    try {
      const ok = await attemptResolveQueuedMatch();
      if (ok) {
        setQueueError(null);
      } else {
        setQueueError((prev) =>
          prev ??
          "Could not start Mentrixa Quest. Wait a moment and tap again, or cancel search and press Start Duel."
        );
      }
    } finally {
      setInstantSparringLoading(false);
    }
  }

  async function findMatch(explicitDivisionKey: string) {
    const key = explicitDivisionKey.trim();
    if (!key) return;
    startDuelLoopFromGesture();
    setQueueLoading(true);
    setQueueError(null);
    try {
      setDivisionKey(key);
      let r;
      try {
        r = await joinDuelQueue(key);
      } catch {
        setQueueError("Could not reach matchmaking. Check your connection and try again.");
        return;
      }
      if (!r || typeof r !== "object" || !("success" in r)) {
        setQueueError("Matchmaking failed. Please try again.");
        return;
      }
      if (!r.success) {
        setQueueError(r.error);
        return;
      }
      if (r.state === "matched" && "duelId" in r && r.duelId) {
        const started = await showMatchIntroAndNavigate(r.duelId);
        if (!started) {
          setQueueError("Could not open match preview. Try again from Your duels.");
        }
        return;
      }
      setQueueStartedAtMs(Date.now());
      setQueuePhase("waiting");
      enterDuelQueueMusic();
    } catch {
      setQueueError("Matchmaking failed. Please try again.");
    } finally {
      setQueueLoading(false);
    }
  }

  async function cancelQueue() {
    setQueueLoading(true);
    setQueueError(null);
    await leaveDuelQueue();
    setQueueLoading(false);
    setQueueStartedAtMs(null);
    setQueuePhase("idle");
    setMatchIntro(null);
    setMatchPhase(null);
    setMeAccepted(false);
    setOpponentAccepted(false);
    setAcceptError(null);
    safeRouterRefresh(router);
  }

  if (divisions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No subject divisions are available yet.
      </p>
    );
  }

  if (queuePhase === "waiting" && !matchIntro) {
    const queueDivisionLabel =
      divisions.find((d) => d.key === divisionKey)?.name?.replace(/\s+Division$/i, "").trim() ??
      divisionKey;

    return (
      <div
        className={cn(
          "fixed inset-0 z-[110] flex h-[100dvh] flex-col overflow-hidden",
          mentrixStudent.pageBgHub,
        )}
      >
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-4 pb-3 sm:pt-6">
          <div className={cn(mentrixStudent.hubNotebook, "mx-auto w-fit px-5 py-3")}>
            <ArenaQueueMatchHeadline divisionLabel={queueDivisionLabel} />
          </div>

          <div className="mx-auto mt-4 flex w-full max-w-6xl flex-1 items-center justify-center gap-4 sm:mt-6 sm:gap-8 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className={cn(
                mentrixStudent.hubNotebook,
                "flex w-full max-w-[11rem] flex-col items-center gap-3 px-4 py-5 sm:max-w-[12.5rem] sm:gap-4 sm:px-5",
              )}
            >
              <div className="relative">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#6366F1] bg-white shadow-[3px_4px_0_#0B1220] sm:h-32 sm:w-32 lg:h-36 lg:w-36">
                  <motion.div
                    className="relative h-full w-full"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 10,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                  >
                    {getProfileImage(currentUser)}
                  </motion.div>
                </div>
              </div>
              <div className="space-y-1.5 text-center sm:space-y-2">
                <div className="flex justify-center">
                  <RankBadge
                    rank={myAccountRank}
                    size={RANK_LADDER_CHIP_SIZE}
                    active
                    surface="light"
                    animate={myAccountRank.key === "mentrixer" || myAccountRank.key === "apex"}
                  />
                </div>
                <p
                  className="mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: myAccountRank.labelOnLight }}
                >
                  {normalizeRankTitle(myAccountRank.title)}
                </p>
                <p className="mx-hub-ink-title text-base uppercase italic sm:text-lg">
                  {currentUser.name}
                </p>
                <span className="mx-hub-ink-muted text-[10px] font-bold uppercase tracking-widest">
                  Mentrixer
                </span>
              </div>
            </motion.div>

            <div className="relative flex flex-col items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  mentrixStudent.hubSticky,
                  "relative flex min-w-[11rem] flex-col items-center px-5 py-6 text-center sm:min-w-[15rem] sm:px-8 sm:py-7",
                )}
              >
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-[#6366F1] bg-[#7C3AED] px-3 py-1 shadow-[2px_2px_0_#0B1220]">
                  <MentrixaVocabIcon name={CANONICAL_DUELS_ICON} size={12} surface="dark" title="Duels" />
                  <span className="mx-hub-type-on-dark text-[9px] font-black uppercase tracking-widest">
                    Duel match
                  </span>
                </div>
                <p className="mx-hub-timer mt-3 text-4xl tabular-nums sm:text-6xl">
                  {formatCountdown(queueCountdownSec)}
                </p>
                <p className="mt-2 mx-hub-type-ui text-[10px] font-bold uppercase tracking-[0.2em]">
                  Live matchmaking
                </p>
                <div className="mt-5 flex w-full flex-col items-center gap-2 px-1">
                  <Button
                    type="button"
                    disabled={queueLoading || instantSparringLoading}
                    onClick={() => void playSparringQuestNow()}
                    className={cn(
                      mentrixStudent.pillPrimary,
                      "h-10 w-full max-w-[240px] text-[10px] font-black uppercase tracking-[0.14em]",
                    )}
                  >
                    <Image src="/mentrixalogo/logo.webp" alt="" width={16} height={16} className="mr-2 shrink-0 rounded-sm" />
                    {instantSparringLoading ? "Starting…" : "Play against Mentrixa Quest"}
                  </Button>
                  {queueError ? (
                    <p className="max-w-[280px] text-center text-[11px] font-medium leading-snug text-[#B45309]">
                      {queueError}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className={cn(
                mentrixStudent.hubSticky,
                "flex w-full max-w-[11rem] flex-col items-center gap-3 px-4 py-5 sm:max-w-[12.5rem] sm:gap-4 sm:px-5",
              )}
            >
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#A5B4FC] bg-[#EDE9FE]/80 shadow-[2px_2px_0_rgba(11,18,32,0.08)] sm:h-32 sm:w-32 lg:h-36 lg:w-36">
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    rotate: { duration: 10, ease: "linear", repeat: Infinity },
                    scale: { duration: 3, ease: "easeInOut", repeat: Infinity },
                  }}
                  className="relative h-16 w-16 opacity-40 sm:h-24 sm:w-24"
                >
                  <Image
                    src="/icons/mentrixer.svg"
                    alt="Searching"
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </motion.div>
              </div>
              <div className="text-center">
                <p className="mx-hub-ink-title text-sm uppercase italic tracking-[0.2em] animate-pulse">
                  Searching…
                </p>
                <p className="mx-hub-ink-muted mt-2 text-[9px] font-bold uppercase tracking-widest">Global arena</p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="relative z-20 shrink-0 border-t border-[#C4B5FD] bg-[#FAFAF8]/95 px-4 py-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={queueLoading || instantSparringLoading}
            className={cn(
              mentrixStudent.hubGhostLink,
              "mx-auto flex h-10 w-full max-w-xs items-center justify-center text-xs font-black uppercase tracking-[0.16em]",
            )}
            onClick={() => void cancelQueue()}
          >
            Cancel search
          </Button>
        </div>
      </div>
    );
  }

  if (matchIntro && matchPhase === "accept") {
    const acceptStatusLine =
      meAccepted && opponentAccepted
        ? "Starting duel…"
        : meAccepted
          ? "Waiting for opponent…"
          : opponentAccepted
            ? "Opponent is ready — accept to continue"
            : "Waiting for both players to accept";

    return (
      <DuelMatchAcceptScreen
        divisionLabel={matchIntro.divisionLabel}
        me={matchIntro.me}
        opponent={matchIntro.opponent}
        meAccepted={meAccepted}
        opponentAccepted={opponentAccepted}
        acceptBusy={acceptBusy}
        acceptError={acceptError}
        onAccept={() => void handleAcceptMatch()}
        onDecline={() => void handleDeclineMatch()}
        statusLine={acceptStatusLine}
      />
    );
  }

  if (matchIntro && matchPhase === "merge") {
    return (
      <div className={cn("fixed inset-0 z-[130] overflow-hidden", mentrixStudent.pageBgArena)}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8"
        >
          <div className={cn(mentrixStudent.hubNotebook, "px-5 py-3")}>
            <p className="mx-hub-type-ui text-center text-[11px] font-semibold uppercase tracking-[0.24em]">
              Locking duel
            </p>
          </div>

          <div className="relative mt-10 flex h-[320px] w-full max-w-4xl items-center justify-center sm:h-[360px]">
            <motion.div
              animate={{ x: [-170, 0], scale: [1, 0.97] }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            >
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#6366F1] bg-white shadow-[3px_4px_0_#0B1220] sm:h-32 sm:w-32">
                {getProfileImage(matchIntro.me) ?? (
                  <span className="text-sm font-semibold tracking-[0.18em] text-[#64748B]">Mentrixer</span>
                )}
              </div>
            </motion.div>

            <motion.div
              animate={{ x: [170, 0], scale: [1, 0.97] }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            >
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#6366F1] bg-white shadow-[3px_4px_0_#0B1220] sm:h-32 sm:w-32">
                {getProfileImage({ ...matchIntro.opponent, isAi: matchIntro.opponent.isAi }) ?? (
                  <span className="text-sm font-semibold tracking-[0.18em] text-[#64748B]">Mentrixer</span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.45 }}
              className="absolute flex items-center justify-center"
            >
              <div
                className={cn(
                  mentrixStudent.hubSticky,
                  "relative flex min-h-[10.5rem] min-w-[10.5rem] items-center justify-center overflow-visible p-3 sm:min-h-[11.5rem] sm:min-w-[11.5rem]",
                )}
              >
                <MentrixaLogoLoader size="md" className="overflow-visible" />
              </div>
            </motion.div>
          </div>

          <div className={cn(mentrixStudent.hubSticky, "mt-3 px-4 py-2 text-center")}>
            <p className="mx-hub-ink-muted text-sm font-semibold">Preparing duel arena…</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {queueError && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl border border-[#A5B4FC] bg-[#EDE9FE] flex items-center gap-3 text-[#4F46E5] text-xs font-bold uppercase tracking-widest"
        >
          <Info className="w-4 h-4" />
          {queueError}
        </motion.div>
      )}

      <StudentStickyNote variant={STUDENT_ROUTE_HEADER_VARIANT.duels}>
        <div className={cn(arenaDivisionPanelClasses(), "overflow-visible")}>
        <p
          className={cn(
            "inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]",
            arenaDivisionFocus.eyebrow,
          )}
        >
          <MentrixaVocabIcon name={CANONICAL_DUELS_ICON} size={50} className="text-[#6366F1]" title="Duels" />
          {AP_CALC_AB_DIVISION_NAME}
        </p>
      

        {!soleDivision ? (
          <p className={`mt-5 ${mentrixStudent.hubEmpty} text-sm`}>
            Duel arena is syncing. Refresh in a moment if this persists.
          </p>
        ) : (
          <div className="mt-5 overflow-visible p-1">
            {(() => {
              const d = soleDivision;
              const t = getDivisionTheme(d.key);
              const isProfileFocus = preferredDivisionKey === d.key;

              return (
                <StudentStickyNote variant="dog-ear" className={cn(
                    arenaDivisionCardClasses({
                      isSelected: true,
                      isProfileFocus,
                    }),
                    "relative overflow-visible pt-8",
                  )}>
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-2 rounded-t-[1.35rem] bg-[#6366F1]"
                    aria-hidden
                  />

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[#6366F1] bg-[#7C3AED] text-xl font-bold text-white shadow-[2px_2px_0_#0B1220]"
                      >
                        {t.emoji}
                      </div>
                      <div className="min-w-0">
                        <AbCalculusSubjectTitle
                          hubPaper
                          className="text-lg sm:text-xl leading-snug"
                        />
                      </div>
                    </div>
                  </div>

                  <p className={cn("mt-4 line-clamp-3 flex-1 text-xs font-medium leading-relaxed", mentrixHubSurfaces.inkBody)}>
                    {d.description || "Limits, derivatives, integrals, and verified first attempts on the AP Calculus AB skill tree."}
                  </p>

                  <div className="mt-6">
                    <Button
                      disabled={queueLoading}
                      onPointerDown={() => {
                        startDuelLoopFromGesture();
                      }}
                      onClick={() => {
                        void findMatch(d.key);
                      }}
                      className={`h-11 w-full ${mentrixStudent.pillPrimary} text-[10px] font-black uppercase tracking-widest`}
                    >
                      {queueLoading ? "Searching..." : "Start duel"}
                    </Button>
                  </div>
                </StudentStickyNote>
              );
            })()}
          </div>
        )}
        </div>
      </StudentStickyNote>
    </div>
  );
}

/** Division name + “MATCH” typed out above the VS lockup while queued. */
function ArenaQueueMatchHeadline({ divisionLabel }: { divisionLabel: string }) {
  const fullText = useMemo(
    () => `${divisionLabel.trim()} MATCH`.replace(/\s+/g, " ").toUpperCase(),
    [divisionLabel]
  );
  const [len, setLen] = useState(0);

  useEffect(() => {
    setLen(0);
    if (!fullText.length) return;

    let i = 0;
    const msPerChar = 38;
    const id = window.setInterval(() => {
      i += 1;
      setLen(Math.min(i, fullText.length));
      if (i >= fullText.length) {
        window.clearInterval(id);
      }
    }, msPerChar);

    return () => window.clearInterval(id);
  }, [fullText]);

  const visible = fullText.slice(0, len);
  const typing = len < fullText.length;

  return (
    <div className="flex flex-col items-center px-4 text-center">
      <p
        className="max-w-[min(100%,36rem)] mx-hub-type-ui text-[11px] font-black uppercase tracking-[0.28em] sm:text-[13px] sm:tracking-[0.32em]"
        aria-label={fullText}
      >
        {visible}
        {typing ? (
          <span
            className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] bg-[#4338CA]/80 align-middle animate-pulse"
            aria-hidden
          />
        ) : null}
      </p>
    </div>
  );
}

