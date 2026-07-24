"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_DUAL_PATH } from "@/features/marketing/landing/landing-copy-pure";
import { LandingNumberHeading } from "@/features/marketing/landing/ui/landing-number-heading";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingRoleIcon } from "@/features/marketing/landing/ui/landing-role-icon";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { LandingVocabWord } from "@/features/marketing/landing/ui/landing-vocab-word";
import { LandingStickyNote, LandingStickyGameNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { FallingRoleSliceArena, type SliceRole } from "@/features/marketing/landing/v2/motion/falling-role-slice-arena";
import { springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

const PATH_ARENA_HEIGHT = 240;

const Check = ({ className = "" }: { className?: string }) => (
  <svg className={cn("h-4 w-4 shrink-0", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

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

function SideCard({ side, highlight }: { side: DualPathSide; highlight?: boolean }) {
  const { cinematic } = useLandingMotion();
  const role = side.role === "Mentrixer" ? "mentrixer" : "guide";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springSoft}
      className={cn(highlight && "ring-2 ring-[var(--mx-indigo)] rounded-sm")}
    >
      <LandingStickyNote
        variant={side.role === "Mentrixer" ? "pinned" : "clip"}
        className="relative overflow-hidden p-6"
      >
      <p className={cn("relative", landingHub.stickyWord)}>
        <LandingVocabWord word={side.role} role={role} size="xl" />
      </p>
      <h3 className={cn("relative mt-3 text-lg font-bold md:text-[19px]", landingHub.title)}>
        <LandingVocabWord word={side.title.split(/\s+/)[0] ?? side.title} size="lg" />
        {side.title.includes(" ") ? ` ${side.title.split(/\s+/).slice(1).join(" ")}` : null}
      </h3>
      <ul className={cn("relative mt-4 space-y-2.5 text-[13px]", landingHub.body)}>
        {side.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <Check className="text-[var(--mx-indigo)]" />
            <LandingRoleText text={point} iconSize="sm" />
          </li>
        ))}
      </ul>
      <motion.div whileHover={cinematic ? { scale: 1.03 } : undefined} whileTap={cinematic ? { scale: 0.98 } : undefined}>
        <Link href={side.href} className={cn("relative mt-7", landingHub.btnPrimary)}>
          <LandingRoleIcon role={role} size="md" className="brightness-0 invert" />
          {side.cta}
        </Link>
      </motion.div>
      </LandingStickyNote>
    </motion.article>
  );
}

const GAME_COACH = LANDING_DUAL_PATH.gameCoach;

export function DualPathReactionGame({ sides }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  useLandingNumericReveal(sectionRef);
  const { mounted, lowEnd } = useLandingMotion();
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
    <div ref={sectionRef} className="relative mx-auto max-w-[28rem]">
      <LandingNumberHeading
        id="path-heading"
        count={sides.length}
        suffix="roles"
        subtitle={LANDING_DUAL_PATH.pathSub}
        className="mb-6"
      />

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
              className="lp-path-arena w-full touch-manipulation"
              height={PATH_ARENA_HEIGHT}
              minHeight={PATH_ARENA_HEIGHT}
              hudInset={52}
              gameSeconds={14}
              iconSize={lowEnd ? 34 : 38}
              fallSpeed={lowEnd ? 150 : 180}
              spawnMs={lowEnd ? 700 : 520}
              maxVisible={lowEnd ? 5 : 7}
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
              className="lp-path-arena lp-paper-game-board w-full rounded-xl border border-violet-300"
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
