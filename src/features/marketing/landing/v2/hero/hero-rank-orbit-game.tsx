"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { cn } from "@/shared/core/utils";
import {
  ACCOUNT_RANK_VISUALS,
  normalizeRankTitle,
  type AccountRankKey,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_HERO_GAME } from "@/features/marketing/landing/landing-copy-pure";
import {
  RANK_ICON_ON_LIGHT_FILTER,
  RANK_ICON_VERSION,
} from "@/features/xp/rank-icon-contrast";

const ICON_VERSION = RANK_ICON_VERSION;
const RADIUS = 92;
const GAME_SECONDS = 40;
const COACH_START = LANDING_HERO_GAME.coachStart;
/** Slower orbit = smoother paint on weak GPUs and easier reading. */
const ORBIT_SPIN_SECONDS = 28;

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

function slotStyle(index: number): CSSProperties {
  const angle = (index / ACCOUNT_RANK_VISUALS.length) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    transform: `translate(calc(-50% + ${Math.round(Math.cos(rad) * RADIUS)}px), calc(-50% + ${Math.round(Math.sin(rad) * RADIUS)}px))`,
  };
}

function orbitDurationStyle(seconds: number): CSSProperties {
  return { ["--lp-orbit-duration" as string]: `${seconds}s` };
}

type CoachTone = "coach" | "success" | "error" | "neutral";
type CoachState = { message: string; tone: CoachTone };

function StickyRankChip({
  rank,
  selected,
  emptyLabel,
  onClick,
  disabled,
  shaking,
}: {
  rank?: AccountRankVisual;
  selected?: boolean;
  emptyLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  shaking?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "lp-sticky-rank-chip flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-[#6366F1] bg-white p-1 shadow-[1px_2px_0_rgba(11,18,32,0.16)] outline-none transition-[transform,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-[#6366F1]",
        selected && "border-[#7C3AED] ring-2 ring-[#A78BFA]",
        shaking && "lp-sticky-rank-chip--shake",
        disabled && "cursor-default opacity-70",
        !disabled && "cursor-pointer hover:-translate-y-0.5 active:translate-y-0",
      )}
      aria-pressed={selected}
      aria-label={rank ? normalizeRankTitle(rank.title) : emptyLabel}
    >
      {rank ? (
        <Image
          src={`${rank.iconSrc}?v=${ICON_VERSION}`}
          alt=""
          width={28}
          height={28}
          className="mx-rank-icon-on-light object-contain"
          style={{ filter: RANK_ICON_ON_LIGHT_FILTER }}
          draggable={false}
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-dashed border-[#6366F1] text-[11px] font-bold text-[#4338CA]">
          {emptyLabel}
        </span>
      )}
      <span className="max-w-[3rem] truncate text-[8px] font-bold uppercase tracking-wide text-[#0B1220]">
        {rank ? normalizeRankTitle(rank.title).slice(0, 6) : "slot"}
      </span>
    </button>
  );
}

/**
 * Rank orbit game — paper sticky-note UI + CSS orbit (no neon, no NumberFlow, no trail of framer loops).
 */
export function HeroRankOrbitGame() {
  const { mounted, reduced } = useLandingMotion();

  const [tray, setTray] = useState<AccountRankKey[]>(STABLE_TRAY_ORDER);
  const [placed, setPlaced] = useState<Partial<Record<number, AccountRankKey>>>({});
  const [selectedKey, setSelectedKey] = useState<AccountRankKey | null>(null);
  const [shakeSlot, setShakeSlot] = useState<number | null>(null);
  const [coach, setCoach] = useState<CoachState>({
    message: COACH_START,
    tone: "coach",
  });
  const [completed, setCompleted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);

  const placedCount = Object.keys(placed).length;
  const gameLocked = completed || timedOut;
  const orbitSpins = mounted && !completed && !timedOut && !reduced;

  useEffect(() => {
    setTray(shuffleKeys(ACCOUNT_RANK_VISUALS.map((r) => r.key)));
  }, []);

  useEffect(() => {
    if (gameLocked) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimedOut(true);
          setCoach({ message: LANDING_HERO_GAME.timeUp, tone: "error" });
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
          elapsed > 0 ? LANDING_HERO_GAME.lockedIn(elapsed) : LANDING_HERO_GAME.locked,
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
          message: `${normalizeRankTitle(rankByKey(key).title)}. ${LANDING_HERO_GAME.wrongSlot}`,
          tone: "error",
        });
        window.setTimeout(() => setShakeSlot(null), 420);
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
        setCoach({ message: LANDING_HERO_GAME.pickFirst, tone: "neutral" });
        return;
      }
      if (placed[slotIndex]) return;
      if (tryPlace(selectedKey, slotIndex)) setSelectedKey(null);
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
            : LANDING_HERO_GAME.pickFirst,
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
    setCoach({ message: COACH_START, tone: "coach" });
  }, []);

  return (
    <div className="relative mx-auto w-full">
      <LandingSpeechBubble message={coach.message} tone={coach.tone} label="" className="mb-2 text-[13px]" speed={12} />

      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={`text-[9px] font-bold uppercase tracking-[0.16em] ${landingHub.eyebrow}`}>
          {LANDING_HERO_GAME.placed(placedCount, ACCOUNT_RANK_VISUALS.length)}
        </p>
        {!gameLocked ? (
          <div
            className={cn(
              "rounded-md border px-2.5 py-1 tabular-nums",
              secondsLeft <= 8
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-[#C4B5FD] bg-[#EEF2FF] text-[#4F46E5]",
            )}
            role="timer"
            aria-live="polite"
            aria-label={`${secondsLeft} seconds remaining`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{LANDING_HERO_GAME.timeLabel}</span>{" "}
            <span className="text-sm font-black">{secondsLeft}s</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={resetGame}
            className={cn("cursor-pointer rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wide", landingHub.btnSecondary)}
          >
            {LANDING_HERO_GAME.playAgain}
          </button>
        )}
      </div>

      {/* Paper board — sticky-note surface for the orbit */}
      <div className="lp-paper-game-board relative rounded-xl border border-[#C4B5FD] bg-[#F8FAFC] p-2 sm:p-2.5">
        <div
          className={cn(
            "relative mx-auto flex h-[min(220px,48vw)] min-h-[200px] w-full max-w-[22rem] items-center justify-center sm:h-[236px]",
            orbitSpins && "lp-orbit-spin",
          )}
          style={orbitSpins ? orbitDurationStyle(ORBIT_SPIN_SECONDS) : undefined}
        >
          <div className="pointer-events-none absolute inset-[12%] rounded-full border border-dashed border-[#A5B4FC]/80" aria-hidden />

          <div className="relative z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-[#6366F1] bg-white shadow-[2px_3px_0_rgba(11,18,32,0.12)]">
            <Image
              src={`/icons/mentrixer.svg?v=${ICON_VERSION}`}
              alt=""
              width={22}
              height={22}
              className="mx-rank-icon-on-light object-contain"
              style={{ filter: RANK_ICON_ON_LIGHT_FILTER }}
              draggable={false}
            />
            <span className="text-[7px] font-bold uppercase tracking-wide text-[#6366F1]">{LANDING_HERO_GAME.xpLabel}</span>
          </div>

          {mounted
            ? ACCOUNT_RANK_VISUALS.map((rank, i) => {
                const filledKey = placed[i];
                const filledRank = filledKey ? rankByKey(filledKey) : null;
                return (
                  <div
                    key={rank.key}
                    className="absolute left-1/2 top-1/2 z-20"
                    style={slotStyle(i)}
                  >
                    <div
                      className={cn(orbitSpins && "lp-orbit-counter-spin")}
                      style={orbitSpins ? orbitDurationStyle(ORBIT_SPIN_SECONDS) : undefined}
                    >
                      <StickyRankChip
                        rank={filledRank ?? undefined}
                        emptyLabel={String(i + 1)}
                        selected={Boolean(selectedKey && !filledRank)}
                        shaking={shakeSlot === i}
                        onClick={() => handleSlotClick(i)}
                      />
                    </div>
                  </div>
                );
              })
            : null}
        </div>

        <div className="relative z-20 mt-2 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tray.map((key) => {
            const rank = rankByKey(key);
            return (
              <StickyRankChip
                key={key}
                rank={rank}
                selected={selectedKey === key}
                disabled={gameLocked}
                onClick={() => handleTrayClick(key)}
              />
            );
          })}
        </div>
      </div>

      <p className={`mt-1.5 text-center ${landingHub.hint}`}>
        {gameLocked ? (completed ? LANDING_HERO_GAME.doneHint : "") : LANDING_HERO_GAME.spinningHint}
      </p>
    </div>
  );
}
