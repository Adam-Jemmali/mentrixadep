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
import { DivisionPickerCards } from "@/components/student/division-picker-cards";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";
import { MentrixaLogoLoader } from "@/components/mentrixa-logo";

interface Props {
  divisions: { key: string; name: string; description: string | null }[];
  /** Syncs with Division arena “home” focus when set */
  preferredDivisionKey: string | null;
  initialQueueDivision: string | null;
}

type MatchIntro = {
  duelId: string;
  divisionLabel: string;
  me: { name: string; avatarUrl: string | null; bio: string | null; totalXp: number | null };
  opponent: { name: string; avatarUrl: string | null; bio: string | null; totalXp: number | null; isAi: boolean };
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

  const activeDivisionLabel =
    divisions.find((d) => d.key === divisionKey)?.name ?? divisionKey;

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
          className="object-cover"
          sizes="96px"
        />
      );
    }

    if (person.isAi) {
      return (
        <Image
          src={MENTRIXA_LOGO_PNG}
          alt=""
          fill
          className="object-contain p-4"
          sizes="96px"
        />
      );
    }

    return null;
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

  const showMatchIntroAndNavigate = useCallback(async (duelId: string) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;

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
        },
        opponent: {
          name: preview.opponent.name,
          avatarUrl: preview.opponent.avatarUrl,
          bio: preview.opponent.bio,
          totalXp: preview.opponent.totalXp,
          isAi: preview.opponent.isAi,
        },
      });
      setMatchPhase("preview");
    } catch {
      fallbackPush();
    }
  }, [router, divisions]);

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
    return () => clearInterval(id);
  }, [queuePhase, divisionKey, matchIntro, showMatchIntroAndNavigate]);

  /** No human in ~60s → AI sparring opponent (same question set) */
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
    setQueueLoading(true);
    setQueueError(null);
    try {
      const r = await joinDuelQueue(divisionKey);
      if (!r || typeof r !== "object" || !("success" in r)) {
        setQueueError("Matchmaking failed. Please try again.");
        return;
      }
      if (!r.success) {
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
      setQueueError("Matchmaking failed. Please try again.");
    } finally {
      setQueueLoading(false);
    }
  }

  async function cancelQueue() {
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
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/85">
            Queueing • {activeDivisionLabel}
          </p>

          <div className="mt-10 flex w-full max-w-5xl items-center justify-center gap-4 sm:gap-8">
            <motion.div
              animate={{ x: [0, 118, 0], scale: [1, 0.96, 1] }}
              transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-700 bg-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:h-32 sm:w-32">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 7, ease: "linear", repeat: Infinity }}
                  className="relative h-12 w-12 sm:h-14 sm:w-14"
                >
                  <Image
                    src="/icons/mentrixer.svg"
                    alt="Mentrixer"
                    fill
                    className="object-contain"
                    sizes="56px"
                  />
                </motion.div>
              </div>
            </motion.div>

            <div className="flex min-w-[170px] flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-center backdrop-blur-md sm:min-w-[220px] sm:px-8 sm:py-6">
              <div className="flex items-center gap-2 text-slate-300/80">
                <Image
                  src={MENTRIXA_LOGO_PNG}
                  alt="Mentrixa"
                  width={80}
                  height={80}
                  className="opacity-80"
                />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Bot
                </p>
              </div>
              <p className="mt-2 font-mono text-5xl font-black tabular-nums text-white sm:text-6xl">
                {formatCountdown(queueCountdownSec)}
              </p>
            </div>

            <motion.div
              animate={{ x: [0, -118, 0], scale: [1, 0.96, 1] }}
              transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-700 bg-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:h-32 sm:w-32">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 7, ease: "linear", repeat: Infinity }}
                  className="relative h-12 w-12 sm:h-14 sm:w-14"
                >
                  <Image
                    src="/icons/mentrixer.svg"
                    alt="Mentrixer"
                    fill
                    className="object-contain"
                    sizes="56px"
                  />
                </motion.div>
              </div>
            </motion.div>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.35, y: 10, rotate: -24 }}
              animate={{ opacity: 1, scale: [0.9, 1.18, 0.98], y: 0, rotate: [-24, 12, -6] }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="relative flex h-24 w-24 items-center justify-center"
            >
              <div className="absolute inset-2 rounded-full border border-white/10 bg-white/5 blur-[0.2px]" />
              <div className="absolute h-3 w-16 -rotate-12 rounded-full bg-gradient-to-r from-transparent via-white/35 to-transparent blur-[2px]" />
              <div className="absolute -rotate-[8deg] text-[2.65rem] font-black italic tracking-[-0.28em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]">
                VS
              </div>
              <div className="absolute bottom-4 h-px w-10 -rotate-6 bg-white/20" />
            </motion.div>
          </div>

          <div className="mt-8 text-center text-sm text-slate-300/80">
            Looking for a Mentrixer in this division.
          </div>

          <div className="mt-2 text-center text-xs text-slate-400/75">
            Same-division matching first.When the timer reaches 00:00, you will face Mentrixa Bot.
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={queueLoading}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
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
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/80">
            Match found • {matchIntro.divisionLabel}
          </p>

          <div className="mt-8 flex w-full max-w-5xl items-center justify-center gap-4 sm:gap-8">
            <ProfileCard
              name={matchIntro.me.name}
              bio={matchIntro.me.bio}
              avatarUrl={matchIntro.me.avatarUrl}
              totalXp={matchIntro.me.totalXp}
              tone="cyan"
              align="left"
            />

            <div className="flex flex-col items-center justify-center px-2">
              <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-black tracking-[0.18em] text-white">
                VS
              </div>
            </div>

            <ProfileCard
              name={matchIntro.opponent.name}
              bio={matchIntro.opponent.bio}
              avatarUrl={matchIntro.opponent.avatarUrl}
              totalXp={matchIntro.opponent.totalXp}
              tone="violet"
              align="right"
              isAi={matchIntro.opponent.isAi}
            />
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
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-white/15 bg-white/6 shadow-[0_0_45px_rgba(59,130,246,0.2)] backdrop-blur-md sm:h-40 sm:w-40">
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
    <div className="space-y-6">
      <div className={`${mentrixStudent.card} space-y-4 p-5`}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Matchmaking</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">
            Queue setup
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">Select your subject.</p>
        </div>
        <DivisionPickerCards
          mode="select"
          divisions={divisions}
          selectedKey={divisionKey}
          onSelect={setDivisionKey}
          compact
        />
        {queueError && (
          <p className="text-sm text-red-600">{queueError}</p>
        )}
        {queuePhase === "idle" ? (
          <Button
            type="button"
            disabled={queueLoading || !divisionKey}
            className="w-full rounded-full bg-blue-600 py-6 text-base font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-500 sm:w-auto"
            onClick={() => void findMatch()}
          >
            {queueLoading ? "Searching..." : "Find opponent"}
          </Button>
        ) : null}
      </div>

    </div>
  );
}

function ProfileCard({
  name,
  bio,
  avatarUrl,
  totalXp,
  tone,
  align,
  isAi = false,
}: {
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  totalXp: number | null;
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
        className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border bg-slate-900 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:h-28 sm:w-28 ${
          tone === "cyan" ? "border-cyan-200/30" : "border-violet-200/30"
        }`}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={name} fill unoptimized className="object-cover" sizes="112px" />
        ) : isAi ? (
          <Image src={MENTRIXA_LOGO_PNG} alt={name} fill className="object-contain p-4" sizes="112px" />
        ) : (
          <div className={`text-lg font-black tracking-[0.18em] ${tone === "cyan" ? "text-cyan-100" : "text-violet-100"}`}>
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-base font-semibold text-white">{name}</p>
        {xpLabel ? <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300/75">{xpLabel}</p> : null}
        {bio ? <p className="max-w-[18rem] text-sm leading-relaxed text-slate-200/80">{bio}</p> : null}
      </div>
    </motion.div>
  );
}
