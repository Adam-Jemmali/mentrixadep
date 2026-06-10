"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import NumberFlow from "@number-flow/react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/shared/core/utils";
import {
  ACCOUNT_RANK_VISUALS,
  normalizeRankTitle,
  type AccountRankKey,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

const ICON_VERSION = "20260410";
const RADIUS = 148;
const GAME_SECONDS = 40;
const COACH_START =
  "The ring spins. You have 40 seconds. Tap a rank, then tap its slot on the wheel. Lowest at the top.";
const ORBIT_SPIN_SECONDS = 18;

const STABLE_TRAY_ORDER: AccountRankKey[] = [
  "rival",
  "scholar",
  "seeker",
  "contender",
  "wanderer",
  "apex",
  "mentrixer",
];

function shuffleKeys(keys: AccountRankKey[]): AccountRankKey[] {
  const next = [...keys];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function slotForKey(key: AccountRankKey): number {
  return ACCOUNT_RANK_VISUALS.findIndex((r) => r.key === key);
}

function rankByKey(key: AccountRankKey): AccountRankVisual {
  return ACCOUNT_RANK_VISUALS.find((r) => r.key === key)!;
}

function roundOrbitPx(value: number) {
  return Math.round(value * 1000) / 1000;
}

function slotPosition(index: number) {
  const angle = (index / ACCOUNT_RANK_VISUALS.length) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: roundOrbitPx(Math.cos(rad) * RADIUS),
    y: roundOrbitPx(Math.sin(rad) * RADIUS),
  };
}

type CoachTone = "coach" | "success" | "error" | "neutral";

export function HeroRankOrbitGame() {
  const reducedMotion = useReducedMotion();
  const { canLoop, cinematic, mounted } = useLandingMotion();
  const loop = canLoop && !reducedMotion;

  const [xp, setXp] = useState(2885);
  const [tray, setTray] = useState<AccountRankKey[]>(STABLE_TRAY_ORDER);
  const [placed, setPlaced] = useState<Partial<Record<number, AccountRankKey>>>({});
  const [selectedKey, setSelectedKey] = useState<AccountRankKey | null>(null);
  const [shakeSlot, setShakeSlot] = useState<number | null>(null);
  const [coach, setCoach] = useState({
    message: COACH_START,
    tone: "coach" as CoachTone,
  });
  const [completed, setCompleted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);

  const placedCount = Object.keys(placed).length;
  const gameLocked = completed || timedOut;
  /** Orbit spins for everyone after mount — core game challenge, not decorative fluff. */
  const orbitSpins = mounted && !completed && !timedOut;
  const orbitDuration = completed ? 52 : timedOut ? 38 : secondsLeft <= 8 ? 12 : ORBIT_SPIN_SECONDS;

  useEffect(() => {
    setTray(shuffleKeys(ACCOUNT_RANK_VISUALS.map((r) => r.key)));
  }, []);

  useEffect(() => {
    if (!loop) return;
    const id = window.setInterval(() => {
      setXp((v) => v + Math.floor(Math.random() * 12) + 3);
    }, 2800);
    return () => window.clearInterval(id);
  }, [loop]);

  useEffect(() => {
    if (gameLocked) return;

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimedOut(true);
          setCoach({ message: "Time's up. Your rank does not lie. Play again.", tone: "error" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [gameLocked]);

  useEffect(() => {
    if (placedCount === ACCOUNT_RANK_VISUALS.length && !completed && !timedOut) {
      setCompleted(true);
      const elapsed = GAME_SECONDS - secondsLeft;
      setCoach({
        message:
          elapsed > 0
            ? `Ladder locked in ${elapsed} second${elapsed === 1 ? "" : "s"}. Nice climb.`
            : "Ladder locked. Nice climb.",
        tone: "success",
      });
    }
  }, [placedCount, completed, timedOut, secondsLeft]);

  const tryPlace = useCallback(
    (key: AccountRankKey, slotIndex: number) => {
      if (gameLocked) return false;

      const expected = slotForKey(key);
      if (slotIndex !== expected) {
        setShakeSlot(slotIndex);
        setCoach({
          message: `${normalizeRankTitle(rankByKey(key).title)} belongs elsewhere. Follow the ladder.`,
          tone: "error",
        });
        window.setTimeout(() => setShakeSlot(null), 520);
        return false;
      }

      setPlaced((prev) => ({ ...prev, [slotIndex]: key }));
      setTray((prev) => prev.filter((k) => k !== key));
      setCoach({
        message: `${normalizeRankTitle(rankByKey(key).title)} locked. ${ACCOUNT_RANK_VISUALS.length - placedCount - 1} left · ${secondsLeft}s`,
        tone: "coach",
      });
      return true;
    },
    [gameLocked, placedCount, secondsLeft],
  );

  const handleSlotClick = useCallback(
    (slotIndex: number) => {
      if (gameLocked) return;
      if (!selectedKey) {
        setCoach({ message: "Pick a rank chip below first, then tap its slot.", tone: "neutral" });
        return;
      }
      if (placed[slotIndex]) return;
      const ok = tryPlace(selectedKey, slotIndex);
      if (ok) setSelectedKey(null);
    },
    [gameLocked, placed, selectedKey, tryPlace],
  );

  const handleTrayClick = useCallback(
    (key: AccountRankKey) => {
      if (gameLocked) return;
      setSelectedKey((prev) => {
        const next = prev === key ? null : key;
        setCoach({
          message: next
            ? `Selected ${normalizeRankTitle(rankByKey(key).title)}. Tap the matching slot.`
            : "Pick a rank chip, then tap its slot on the wheel.",
          tone: "coach",
        });
        return next;
      });
    },
    [gameLocked],
  );

  const resetGame = useCallback(() => {
    setTray(shuffleKeys(ACCOUNT_RANK_VISUALS.map((r) => r.key)));
    setPlaced({});
    setCompleted(false);
    setTimedOut(false);
    setSecondsLeft(GAME_SECONDS);
    setSelectedKey(null);
    setCoach({
      message: COACH_START,
      tone: "coach",
    });
  }, []);

  const orbitRotate = orbitSpins ? { rotate: 360 } : undefined;
  const orbitTransition = orbitSpins
    ? { duration: orbitDuration, repeat: Infinity, ease: "linear" as const, repeatType: "loop" as const }
    : undefined;
  const orbitCounterRotate = orbitSpins ? { rotate: -360 } : undefined;

  return (
    <div className="relative mx-auto w-full max-w-[min(520px,94vw)]">
      <LandingSpeechBubble
        message={coach.message}
        tone={coach.tone}
        label=""
        className="mb-4"
      />

      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/90">
          {placedCount}/{ACCOUNT_RANK_VISUALS.length} ranks
        </p>

        {!gameLocked ? (
          <motion.div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 tabular-nums",
              secondsLeft <= 8
                ? "border-rose-400/50 bg-rose-950/50 text-rose-200"
                : "border-indigo-400/30 bg-indigo-950/50 text-indigo-100",
            )}
            animate={secondsLeft <= 8 ? { scale: [1, 1.06, 1] } : undefined}
            transition={{ duration: 0.6, repeat: secondsLeft <= 8 ? Infinity : 0 }}
            role="timer"
            aria-live="polite"
            aria-label={`${secondsLeft} seconds remaining`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Time</span>
            <span className="text-sm font-black">{secondsLeft}s</span>
          </motion.div>
        ) : null}

        {gameLocked ? (
          <motion.button
            type="button"
            onClick={resetGame}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-white/15"
          >
            Play again
          </motion.button>
        ) : null}
      </div>

      <div className="relative">
        <div className="lp-hero-stage-glow pointer-events-none absolute inset-0" aria-hidden />

        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative flex h-[min(460px,78vw)] items-center justify-center"
        >
          <div className="lp-hero-pedestal absolute bottom-[8%] left-1/2 h-16 w-[72%] -translate-x-1/2" aria-hidden />

          <motion.div
            className="absolute inset-[4%] rounded-full border border-white/[0.08]"
            style={{ boxShadow: "inset 0 0 100px rgba(99,102,241,0.2)" }}
            animate={orbitRotate}
            transition={orbitTransition}
          />
          <motion.div
            className="absolute inset-[10%] rounded-full border border-dashed border-indigo-400/25"
            animate={orbitRotate}
            transition={orbitTransition}
          />

          {loop ? (
            <>
              <motion.div
                className="absolute inset-[2%] rounded-full opacity-80"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent, rgba(99,102,241,0.45) 50deg, transparent 100deg, rgba(34,211,238,0.25) 180deg, transparent)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              />
              {[0, 120, 240].map((deg) => (
                <motion.div
                  key={deg}
                  className="absolute left-1/2 top-1/2 h-px w-[42%] origin-left bg-gradient-to-r from-indigo-400/40 to-transparent"
                  style={{ rotate: `${deg}deg` }}
                  animate={{ opacity: [0.2, 0.55, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, delay: deg / 120 }}
                />
              ))}
            </>
          ) : null}

          <motion.div
            className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full border border-indigo-300/40 bg-slate-950/90 shadow-[0_0_80px_rgba(99,102,241,0.45)]"
            animate={
              loop
                ? {
                    scale: completed ? [1, 1.08, 1] : [1, 1.05, 1],
                    boxShadow: completed
                      ? [
                          "0 0 60px rgba(212,160,23,0.45)",
                          "0 0 100px rgba(212,160,23,0.65)",
                          "0 0 60px rgba(212,160,23,0.45)",
                        ]
                      : [
                          "0 0 50px rgba(99,102,241,0.35)",
                          "0 0 90px rgba(124,58,237,0.55)",
                          "0 0 50px rgba(99,102,241,0.35)",
                        ],
                  }
                : undefined
            }
            transition={{ duration: completed ? 2 : 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="relative mb-0.5 block size-7">
              <Image
                src={`/icons/mentrixer.svg?v=${ICON_VERSION}`}
                alt=""
                fill
                className="object-contain drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]"
                sizes="28px"
              />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-indigo-300">Live XP</span>
            <span className="text-xl font-black tabular-nums text-white">
              {cinematic ? (
                <NumberFlow value={xp} transformTiming={{ duration: 700, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }} />
              ) : (
                xp.toLocaleString()
              )}
            </span>
          </motion.div>

          {mounted ? (
          <motion.div
            className="absolute inset-0 will-change-transform [transform:translateZ(0)]"
            animate={orbitRotate}
            transition={orbitTransition}
          >
            {ACCOUNT_RANK_VISUALS.map((rank, i) => {
              const { x, y } = slotPosition(i);
              const filledKey = placed[i];
              const filledRank = filledKey ? rankByKey(filledKey) : null;
              const isShake = shakeSlot === i;

              return (
                <motion.div
                  key={rank.key}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ x, y }}
                >
                  <motion.div
                    animate={orbitCounterRotate}
                    transition={orbitTransition}
                    className="flex flex-col items-center gap-1"
                  >
                    <motion.button
                      type="button"
                      onClick={() => handleSlotClick(i)}
                      animate={isShake ? { x: [0, -8, 8, -6, 6, 0] } : { scale: filledRank ? 1 : selectedKey && !filledRank ? 1.04 : 1 }}
                      transition={isShake ? { duration: 0.45 } : { duration: 0.2 }}
                      className={cn(
                        "relative flex cursor-pointer flex-col items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                        !filledRank && "lp-orbit-slot",
                        selectedKey && !filledRank && "ring-2 ring-cyan-400/70",
                      )}
                      aria-label={
                        filledRank
                          ? `${normalizeRankTitle(filledRank.title)} placed`
                          : `Slot for ${normalizeRankTitle(rank.title)}`
                      }
                    >
                      {filledRank ? (
                        <RankBadge
                          rank={filledRank}
                          size={filledRank.key === "mentrixer" || filledRank.key === "apex" ? "md" : "sm"}
                          active
                          showGlow={filledRank.key === "mentrixer" || filledRank.key === "apex"}
                          priority
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-950/60 text-[10px] font-bold text-slate-500">
                          {i + 1}
                        </div>
                      )}
                    </motion.button>
                    <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
                      {filledRank ? normalizeRankTitle(filledRank.title) : rank.title.slice(0, 3)}
                    </span>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
          ) : null}

          <AnimatePresence>
            {completed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  className="h-48 w-48 rounded-full border-2 border-amber-400/40"
                  animate={{ scale: [1, 1.35, 1.5], opacity: [0.6, 0.25, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <div className="lp-rank-tray relative z-20 -mt-2 flex flex-wrap justify-center gap-2 px-2 pb-1">
          {tray.map((key) => {
            const rank = rankByKey(key);
            const isSelected = selectedKey === key;

            return (
              <motion.button
                key={key}
                type="button"
                disabled={gameLocked}
                whileHover={gameLocked ? undefined : { scale: 1.05, y: -3 }}
                whileTap={gameLocked ? undefined : { scale: 0.97 }}
                onClick={() => handleTrayClick(key)}
                className={cn(
                  "cursor-pointer select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60",
                  isSelected && "ring-2 ring-cyan-400",
                )}
                aria-pressed={isSelected}
                aria-label={`Select ${normalizeRankTitle(rank.title)}`}
              >
                <RankBadge rank={rank} size="sm" active showGlow={rank.key === "mentrixer" || rank.key === "apex"} />
              </motion.button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-500">
        {gameLocked
          ? completed
            ? "Mini game only. Real XP lives inside Mentrixa."
            : ""
          : "The ring is spinning. Tap a rank, then tap its slot before time runs out."}
      </p>
    </div>
  );
}
