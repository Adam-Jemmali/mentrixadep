"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  joinDuelQueue,
  leaveDuelQueue,
  pollDuelQueue,
  createAiDuelFromQueue,
  getDuelMatchupPreview,
} from "@/app/actions/duel";
import { DUEL_AI_QUEUE_WAIT_MS } from "@/lib/duel-constants";
import { Button } from "@/components/ui/button";
import { Info, Users } from "lucide-react";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import { MentrixaLogoLoader } from "@/components/mentrixa-logo";
import { getDivisionTheme } from "@/lib/division-ui";
import { cn } from "@/lib/utils";

interface Props {
  divisions: { key: string; name: string; description: string | null }[];
  /** Syncs with Division arena “home” focus when set */
  preferredDivisionKey: string | null;
  initialQueueDivision: string | null;
  currentUser: {
    name: string;
    avatarUrl: string | null;
    clan: { name: string; tag: string } | null;
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
    clan: { name: string; tag: string } | null;
  };
  opponent: { 
    name: string; 
    avatarUrl: string | null; 
    bio: string | null; 
    totalXp: number | null; 
    isAi: boolean;
    clan: { name: string; tag: string } | null;
  };
};

type MatchPhase = "preview" | "merge";

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
  const [queueError, setQueueError] = useState<string | null>(null);
  const [matchIntro, setMatchIntro] = useState<MatchIntro | null>(null);
  const [matchPhase, setMatchPhase] = useState<MatchPhase | null>(null);


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
    if (!matchIntro || matchPhase !== "preview") return;
    const timer = window.setTimeout(() => setMatchPhase("merge"), 1500);
    return () => window.clearTimeout(timer);
  }, [matchIntro, matchPhase]);

  useEffect(() => {
    if (!matchIntro || matchPhase !== "merge") return;
    const timer = window.setTimeout(() => {
      router.push(`/student/duel/${matchIntro.duelId}`);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [matchIntro, matchPhase, router]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const playSuspense = useCallback(() => {
    stopAudio();
    const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-tense-horror-drum-roll-668.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audio.play().catch(() => {
      console.warn("Audio playback failed — usually requires user interaction first.");
    });
    audioRef.current = audio;
  }, [stopAudio]);

  const playMatchFoundStinger = useCallback(() => {
    const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-cinematic-impact-with-reverb-2253.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => { });
  }, []);

  const showMatchIntroAndNavigate = useCallback(async (duelId: string) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    stopAudio();
    playMatchFoundStinger();

    const fallbackPush = () => {
      router.push(`/student/duel/${duelId}`);
    };

    try {
      const resp = await getDuelMatchupPreview(duelId);
      if (!resp.success) {
        fallbackPush();
        return;
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
          clan: preview.me.clan,
        },
        opponent: {
          name: preview.opponent.name,
          avatarUrl: preview.opponent.avatarUrl,
          bio: preview.opponent.bio,
          totalXp: preview.opponent.totalXp,
          isAi: preview.opponent.isAi,
          clan: preview.opponent.clan,
        },
      });
      setMatchPhase("preview");
    } catch {
      fallbackPush();
    }
  }, [router, divisions, stopAudio, playMatchFoundStinger]);

  useEffect(() => {
    if (queuePhase !== "waiting" || !divisionKey || matchIntro) return;
    const tick = async () => {
      const p = await pollDuelQueue(divisionKey);
      if (p?.state === "matched" && p.duelId) {
        await showMatchIntroAndNavigate(p.duelId);
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
        const p = await pollDuelQueue(divisionKey);
        if (p?.state === "matched" && p.duelId) {
          await showMatchIntroAndNavigate(p.duelId);
          return;
        }
        const r = await createAiDuelFromQueue(divisionKey);
        if (!cancelled && r.success) {
          await showMatchIntroAndNavigate(r.duelId);
        }
      })();
    }, DUEL_AI_QUEUE_WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [queuePhase, divisionKey, matchIntro, showMatchIntroAndNavigate]);

  async function findMatch() {
    if (!divisionKey) return;
    playSuspense();
    setQueueLoading(true);
    setQueueError(null);
    try {
      const r = await joinDuelQueue(divisionKey);
      if (!r || typeof r !== "object" || !("success" in r)) {
        stopAudio();
        setQueueError("Matchmaking failed. Please try again.");
        return;
      }
      if (!r.success) {
        stopAudio();
        setQueueError(r.error);
        return;
      }
      if (r.state === "matched" && "duelId" in r && r.duelId) {
        await showMatchIntroAndNavigate(r.duelId);
        return;
      }
      setQueueStartedAtMs(Date.now());
      setQueuePhase("waiting");
    } catch {
      stopAudio();
      setQueueError("Matchmaking failed. Please try again.");
    } finally {
      setQueueLoading(false);
    }
  }

  async function cancelQueue() {
    stopAudio();
    setQueueLoading(true);
    await leaveDuelQueue();
    setQueueLoading(false);
    setQueueStartedAtMs(null);
    setQueuePhase("idle");
    setMatchIntro(null);
    setMatchPhase(null);
    router.refresh();
  }

  if (divisions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No subject divisions are available yet.
      </p>
    );
  }

  if (queuePhase === "waiting" && !matchIntro) {
    return (
      <div className="fixed inset-0 z-[110] overflow-hidden bg-[#09162c]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_42%),radial-gradient(circle_at_50%_15%,rgba(148,163,184,0.08),transparent_28%),linear-gradient(180deg,#0c1a33_0%,#09162c_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[url('/mentrixalogo/logo.png')] bg-[length:118px_118px] bg-repeat opacity-[0.045]" />

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 text-white">
          {/* SEARCHING CONTAINER */}
          <div className="mt-10 flex w-full max-w-6xl items-center justify-center gap-4 sm:gap-12 relative">
            
            {/* YOU SIDE */}
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 opacity-20 blur group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/20 bg-slate-900 shadow-[0_0_50px_rgba(99,102,241,0.15)] sm:h-40 sm:w-40 overflow-hidden">
                  {getProfileImage(currentUser)}
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-black uppercase italic tracking-tight text-white drop-shadow-md">{currentUser.name}</p>
                {currentUser.clan ? (
                   <motion.div 
                     initial={{ opacity: 0, y: 5 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="flex flex-col items-center"
                   >
                     <span className="text-[10px] font-black italic uppercase tracking-[0.25em] text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-sm border border-indigo-400/20">
                       {currentUser.clan.name}
                     </span>
                     <span className="text-[9px] font-bold text-slate-500 mt-1">[{currentUser.clan.tag}]</span>
                   </motion.div>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lone Mentrixer</span>
                )}
              </div>
            </motion.div>

            {/* COUNTDOWN CENTER */}
            <div className="relative flex flex-col items-center justify-center">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex min-w-[170px] flex-col items-center rounded-[2rem] border border-white/10 bg-white/5 px-6 py-6 text-center backdrop-blur-xl sm:min-w-[240px] sm:px-10 sm:py-8 shadow-2xl"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                  Arena Match
                </div>
                <p className="mt-2 font-mono text-5xl font-black tabular-nums text-white sm:text-7xl drop-shadow-lg">
                  {formatCountdown(queueCountdownSec)}
                </p>
                <p className="mt-2 text-[10px] font-bold text-slate-400/80 uppercase tracking-[0.2em]">Live Matchmaking</p>
              </motion.div>
            </div>

            {/* SEARCHING SIDE */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/5 bg-slate-900/50 shadow-[0_0_30px_rgba(255,255,255,0.03)] sm:h-40 sm:w-40 backdrop-blur-sm">
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    rotate: { duration: 10, ease: "linear", repeat: Infinity },
                    scale: { duration: 3, ease: "easeInOut", repeat: Infinity }
                  }}
                  className="relative h-16 w-16 sm:h-24 sm:w-24 opacity-20"
                >
                  <Image
                    src="/icons/mentrixer.svg"
                    alt="Searching"
                    fill
                    className="object-contain grayscale invert"
                    sizes="96px"
                  />
                </motion.div>
                <div className="absolute inset-0 rounded-full border border-white/5 animate-ping" style={{ animationDuration: '3s' }} />
              </div>
              <div className="text-center">
                 <p className="text-sm font-black uppercase italic tracking-[0.25em] text-slate-500/80 animate-pulse">Searching...</p>
                 <p className="text-[9px] font-bold text-slate-600 mt-2">GLOBAL ARENA</p>
              </div>
            </motion.div>

          </div>

          {/* VS ANIMATION */}
          <div className="mt-12 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ 
                opacity: 1, 
                scale: [0, 1.4, 1], 
                rotate: [-180, 10, -5],
              }}
              transition={{ duration: 1, ease: "backOut" }}
              className="relative flex h-32 w-32 items-center justify-center"
            >
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl" 
              />
              <div className="absolute -rotate-[8deg] text-[4rem] font-black italic tracking-[-0.3em] text-white drop-shadow-[0_0_30px_rgba(99,102,241,0.6)] sm:text-[5rem]">
                VS
              </div>
              {/* Decorative lines */}
              <div className="absolute -left-12 top-1/2 h-0.5 w-10 bg-gradient-to-r from-transparent to-white/40" />
              <div className="absolute -right-12 top-1/2 h-0.5 w-10 bg-gradient-to-l from-transparent to-white/40" />
            </motion.div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-2">
           
          </div>

          <div className="mt-10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={queueLoading}
              className="text-indigo-600 hover:text-purple-500 hover:bg-black transition-all"
              onClick={() => void cancelQueue()}
            >
              Cancel search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (matchIntro && matchPhase === "preview") {
    return (
      <div className="fixed inset-0 z-[120] overflow-hidden bg-[#08172f]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.15),transparent_42%),linear-gradient(180deg,#0b1832_0%,#08172f_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[url('/mentrixalogo/logo.png')] bg-[length:118px_118px] bg-repeat opacity-[0.04]" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 text-white"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 px-6 py-2 rounded-full bg-indigo-600 text-white font-black italic uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(99,102,241,0.4)]"
          >
            Match Found!
          </motion.div>

          <div className="mt-2 flex w-full max-w-5xl items-center justify-center gap-4 sm:gap-12 px-4">
            <ProfileCard
              name={matchIntro.me.name}
              bio={matchIntro.me.bio}
              avatarUrl={matchIntro.me.avatarUrl}
              totalXp={matchIntro.me.totalXp}
              clan={matchIntro.me.clan}
              tone="cyan"
              align="left"
            />

            <motion.div 
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.3 }}
              className="flex flex-col items-center justify-center px-4"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-md shadow-2xl">
                <div className="text-2xl font-black italic tracking-tighter text-white">VS</div>
              </div>
            </motion.div>

            <ProfileCard
              name={matchIntro.opponent.name}
              bio={matchIntro.opponent.bio}
              avatarUrl={matchIntro.opponent.avatarUrl}
              totalXp={matchIntro.opponent.totalXp}
              clan={matchIntro.opponent.clan}
              tone="violet"
              align="right"
              isAi={matchIntro.opponent.isAi}
            />
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Entering Battle Room...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (matchIntro && matchPhase === "merge") {
    return (
      <div className="fixed inset-0 z-[130] overflow-hidden bg-[#071327]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.14),transparent_40%),linear-gradient(180deg,#09172c_0%,#071327_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[url('/mentrixalogo/logo.png')] bg-[length:118px_118px] bg-repeat opacity-[0.04]" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 text-white"
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/80">
            Locking duel
          </p>

          <div className="relative mt-10 flex h-[320px] w-full max-w-4xl items-center justify-center sm:h-[360px]">
            <motion.div
              animate={{ x: [-170, 0], scale: [1, 0.97] }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            >
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-700 bg-slate-900 shadow-[0_0_35px_rgba(15,23,42,0.35)] sm:h-32 sm:w-32">
                {getProfileImage(matchIntro.me) ?? (
                  <span className="text-sm font-semibold tracking-[0.18em] text-slate-200/80">Mentrixer</span>
                )}
              </div>
            </motion.div>

            <motion.div
              animate={{ x: [170, 0], scale: [1, 0.97] }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            >
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-700 bg-slate-900 shadow-[0_0_35px_rgba(15,23,42,0.35)] sm:h-32 sm:w-32">
                {getProfileImage({ ...matchIntro.opponent, isAi: matchIntro.opponent.isAi }) ?? (
                  <span className="text-sm font-semibold tracking-[0.18em] text-slate-200/80">Mentrixer</span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.45 }}
              className="absolute flex items-center justify-center"
            >
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/15 bg-white/6 shadow-[0_0_45px_rgba(99,102,241,0.2)] backdrop-blur-md sm:h-40 sm:w-40">
                <MentrixaLogoLoader size="md" />
              </div>
            </motion.div>
          </div>

          <div className="mt-3 text-center text-xs text-slate-300/70">Preparing duel arena…</div>
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
          className="p-4 rounded-2xl bg-slate-900/10 border border-slate-900/20 flex items-center gap-3 text-slate-900 text-xs font-bold uppercase tracking-widest"
        >
          <Info className="w-4 h-4" />
          {queueError}
        </motion.div>
      )}

      <motion.ul 
        layout
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {divisions.map((d, i) => {
          const t = getDivisionTheme(d.key);
          const isSelected = divisionKey === d.key;
          
          return (
            <motion.li 
              key={d.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                onClick={() => setDivisionKey(d.key)}
                className={cn(
                  "group relative h-full flex flex-col rounded-3xl border bg-white p-6 transition-all duration-300 cursor-pointer",
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl shadow-indigo-500/10"
                    : "border-slate-200 hover:border-indigo-300 hover:shadow-lg"
                )}
              >
                {/* ICON & TITLE */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn("relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110", t.gradient)}>
                      {t.emoji}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 leading-none truncate">
                        {d.name.replace(/\s+Division$/i, "")}
                      </h2>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           <Users className="w-3 h-3 opacity-50" />
                           Arena Active
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <p className="mt-4 text-xs font-medium leading-relaxed text-slate-500 flex-1 line-clamp-2">
                  {d.description || "Enter the battleground for this subject."}
                </p>

                {/* FOOTER ACTIONS */}
                <div className="mt-6">
                  <Button 
                    disabled={queueLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDivisionKey(d.key);
                      void findMatch();
                    }}
                    className={cn(
                      "w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                      isSelected 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {isSelected && queueLoading ? "Searching..." : "Start Duel"}
                  </Button>
                </div>

                {/* DECORATIVE LOGO */}
                <div className="absolute -bottom-2 -right-2 p-2 opacity-[0.02] grayscale pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                   <Image src="/mentrixalogo/logo.png" alt="" width={80} height={80} />
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

function ProfileCard({
  name,
  bio,
  avatarUrl,
  totalXp,
  clan,
  tone,
  align,
  isAi = false,
}: {
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  totalXp: number | null;
  clan?: { name: string; tag: string } | null;
  tone: "cyan" | "violet";
  align: "left" | "right";
  isAi?: boolean;
}) {
  const xpLabel = totalXp != null ? `${totalXp.toLocaleString()} XP` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex w-[min(100%,18rem)] flex-col items-center gap-3 text-center ${align === "right" ? "sm:translate-y-1" : ""}`}
    >
      <div
        className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border bg-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:h-28 sm:w-28 ${tone === "cyan" ? "border-cyan-200/30" : "border-violet-200/30"
          }`}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={name} fill unoptimized className="object-cover" sizes="112px" />
        ) : (
          <Image 
            src={isAi ? MENTRIXA_LOGO_PNG : "/icons/mentrixer.svg"} 
            alt={name} 
            fill 
            className="object-contain p-6" 
            sizes="112px" 
          />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-base font-black uppercase italic tracking-tight text-white">{name}</p>
        
        {clan && (
           <p className="text-[10px] font-black italic uppercase tracking-[0.2em] text-indigo-400">
             {clan.name} <span className="text-slate-500">[{clan.tag}]</span>
           </p>
        )}

        {xpLabel ? <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300/75">{xpLabel}</p> : null}
        {bio ? <p className="max-w-[18rem] text-sm leading-relaxed text-slate-200/80">{bio}</p> : null}
      </div>
    </motion.div>
  );
}

