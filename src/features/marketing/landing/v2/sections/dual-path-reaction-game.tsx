"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_DUAL_PATH } from "@/features/marketing/landing/landing-copy-pure";
import { LandingStickyNote, LandingStickyGameNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { FallingRoleSliceArena, type SliceRole } from "@/features/marketing/landing/v2/motion/falling-role-slice-arena";
import { springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

const ICON_VERSION = "20260410";
const PATH_ARENA_HEIGHT = 240;

export type DualPathSide = {
  role: "Mentrixer" | "Guide";
  title: string;
  points: string[];
  cta: string;
  href: string;
  tone: "blue" | "violet";
};

type Props = {
  sides: DualPathSide[];
};

function RoleIcon({
  role,
  className = "",
  size = 40,
}: {
  role: "Mentrixer" | "Guide";
  className?: string;
  size?: number;
}) {
  const src = role === "Mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("pointer-events-none select-none object-contain", className)}
      aria-hidden
    />
  );
}

const ArrowRight = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const Check = ({ className = "" }: { className?: string }) => (
  <svg className={cn("h-4 w-4 shrink-0", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

function SideCard({ side, highlight }: { side: DualPathSide; highlight?: boolean }) {
  const { cinematic } = useLandingMotion();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springSoft}
      className={cn(highlight && "ring-2 ring-[#6366F1] rounded-sm")}
    >
      <LandingStickyNote
        variant={side.role === "Mentrixer" ? "pinned" : "clip"}
        className="relative overflow-hidden p-6"
      >
      <p className={cn("relative inline-flex items-center gap-1.5", landingHub.stickyWord)}>
        <RoleIcon role={side.role} size={16} />
        {side.role}
      </p>
      <h3 className={cn("relative mt-2 text-lg font-bold md:text-[19px]", landingHub.title)}>{side.title}</h3>
      <ul className={cn("relative mt-4 space-y-2.5 text-[13px]", landingHub.body)}>
        {side.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <Check className="text-[#6366F1]" />
            {point}
          </li>
        ))}
      </ul>
      <motion.div whileHover={cinematic ? { scale: 1.03 } : undefined} whileTap={cinematic ? { scale: 0.98 } : undefined}>
        <Link href={side.href} className={cn("relative mt-7", landingHub.btnPrimary)}>
          <RoleIcon role={side.role} size={18} />
          {side.cta}
          <ArrowRight />
        </Link>
      </motion.div>
      </LandingStickyNote>
    </motion.article>
  );
}

const GAME_COACH = LANDING_DUAL_PATH.gameCoach;

export function DualPathReactionGame({ sides }: Props) {
  const { mounted } = useLandingMotion();
  const [phase, setPhase] = useState<"game" | "result">("game");
  const [arenaKey, setArenaKey] = useState(0);
  const [winner, setWinner] = useState<SliceRole | null>(null);
  const [coach, setCoach] = useState<{ message: string; tone: "coach" | "success" }>({
    message: GAME_COACH,
    tone: "coach",
  });

  const handleComplete = useCallback((nextWinner: SliceRole, _scores: { Mentrixer: number; Guide: number }) => {
    setWinner(nextWinner);
    setCoach({
      message:
        nextWinner === "Mentrixer"
          ? LANDING_DUAL_PATH.mentrixerWin
          : LANDING_DUAL_PATH.guideWin,
      tone: "success",
    });
    setPhase("result");
  }, []);

  const resetGame = useCallback(() => {
    setArenaKey((k) => k + 1);
    setWinner(null);
    setPhase("game");
    setCoach({ message: GAME_COACH, tone: "coach" });
  }, []);

  const winningSide = sides.find((s) => s.role === winner) ?? sides[0]!;

  return (
    <div className="relative mx-auto max-w-[28rem]">
      <div className="mb-6 text-center">
        <h2 id="path-heading" className={landingHub.title}>
          {LANDING_DUAL_PATH.pathHeading}
        </h2>
        <p className={`mt-2 ${landingHub.body}`}>{LANDING_DUAL_PATH.pathSub}</p>
      </div>

      {phase === "game" ? (
        <LandingStickyGameNote variant="curl" className="rotate-[0.25deg]">
          <LandingSpeechBubble
            message={coach.message}
            tone={coach.tone}
            label={LANDING_DUAL_PATH.gameLabel}
            className="mb-2 text-[13px]"
          />

          {mounted ? (
            <FallingRoleSliceArena
              key={arenaKey}
              className={cn("lp-path-arena w-full touch-manipulation", landingHub.gamePanel)}
              height={PATH_ARENA_HEIGHT}
              minHeight={PATH_ARENA_HEIGHT}
              hudInset={52}
              gameSeconds={14}
              iconSize={40}
              fallSpeed={200}
              spawnMs={400}
              maxVisible={12}
              autoStart={false}
              autoStartDelay={300}
              viewportAutoStart
              viewportThreshold={0.15}
              learnLabel="Mentrixer"
              teachLabel="Guide"
              onComplete={handleComplete}
            />
          ) : (
            <div
              className={cn("lp-path-arena w-full", landingHub.gamePanel)}
              style={{ height: PATH_ARENA_HEIGHT }}
              aria-hidden
            />
          )}

          <p className={`mt-2 text-center ${landingHub.hint}`}>{LANDING_DUAL_PATH.fallHint}</p>
        </LandingStickyGameNote>
      ) : null}

      {phase === "result" && winner ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          className="mx-auto"
        >
          <LandingSpeechBubble message={coach.message} tone={coach.tone} label="" className="mx-auto mb-4 text-[13px]" />

          <SideCard side={winningSide} highlight />
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={resetGame}
              className={cn("cursor-pointer rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide", landingHub.btnSecondary)}
            >
              {LANDING_DUAL_PATH.playAgain}
            </button>
          </div>

          <p className={`mt-3 text-center ${landingHub.hint}`}>{LANDING_DUAL_PATH.signupHint}</p>
        </motion.div>
      ) : null}
    </div>
  );
}

export { SideCard };
