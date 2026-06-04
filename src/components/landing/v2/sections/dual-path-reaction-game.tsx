"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LandingSpeechBubble } from "@/components/landing/v2/motion/landing-speech-bubble";
import { FallingRoleSliceArena, type SliceRole } from "@/components/landing/v2/motion/falling-role-slice-arena";
import { springSoft } from "@/components/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/components/landing/v2/motion/use-landing-motion";

const ICON_VERSION = "20260410";

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
  const isMentrixer = side.tone === "blue";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springSoft}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm",
        highlight && "ring-1 ring-white/25 shadow-2xl",
        isMentrixer
          ? "border-indigo-400/35 bg-gradient-to-br from-indigo-950/55 via-slate-950/50 to-slate-900/55 shadow-indigo-950/25"
          : "border-violet-400/35 bg-gradient-to-br from-violet-950/55 via-violet-900/45 to-slate-950/55 shadow-violet-950/25",
      )}
    >
      <p
        className={cn(
          "relative inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]",
          isMentrixer ? "text-indigo-300" : "text-violet-300",
        )}
      >
        <RoleIcon role={side.role} size={16} className="brightness-0 invert" />
        {side.role}
      </p>
      <h3 className="relative mt-2 text-lg font-bold text-white md:text-[19px]">{side.title}</h3>
      <ul className="relative mt-4 space-y-2.5 text-[13px] text-slate-200/95">
        {side.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <Check className={isMentrixer ? "text-indigo-300" : "text-violet-300"} />
            {point}
          </li>
        ))}
      </ul>
      <motion.div whileHover={cinematic ? { scale: 1.03 } : undefined} whileTap={cinematic ? { scale: 0.98 } : undefined}>
        <Link
          href={side.href}
          className="relative mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1120]"
        >
          <RoleIcon role={side.role} size={18} />
          {side.cta}
          <ArrowRight />
        </Link>
      </motion.div>
    </motion.article>
  );
}

const GAME_COACH =
  "Slice Mentrixer or Guide icons as they fall. Your top side wins.";

export function DualPathReactionGame({ sides }: Props) {
  const { mounted } = useLandingMotion();
  const [phase, setPhase] = useState<"game" | "result">("game");
  const [arenaKey, setArenaKey] = useState(0);
  const [winner, setWinner] = useState<SliceRole | null>(null);
  const [coach, setCoach] = useState<{ message: string; tone: "coach" | "success" }>({
    message: GAME_COACH,
    tone: "coach",
  });

  const handleComplete = useCallback((nextWinner: SliceRole, scores: { Mentrixer: number; Guide: number }) => {
    setWinner(nextWinner);
    setCoach({
      message:
        nextWinner === "Mentrixer"
          ? `You sliced ${scores.Mentrixer} Mentrixer icons. The arena picked your path.`
          : `You sliced ${scores.Guide} Guide icons. Time to teach what you know.`,
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
    <div className="relative">
      {phase === "game" ? (
        <>
          {mounted ? (
            <FallingRoleSliceArena
              key={arenaKey}
              className="lp-path-arena mx-auto h-[min(480px,78vw)] min-h-[360px] w-full max-w-4xl rounded-3xl border-white/10 bg-slate-950/60"
              minHeight={360}
              hudInset={96}
              gameSeconds={14}
              iconSize={52}
              fallSpeed={220}
              spawnMs={380}
              maxVisible={16}
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
              className="lp-path-arena mx-auto h-[min(480px,78vw)] min-h-[360px] w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950/60"
              aria-hidden
            />
          )}

          <p className="mt-3 text-center text-[10px] text-slate-500">
            Tap the badges as they fall.
          </p>
        </>
      ) : null}

      {phase === "result" && winner ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          className="mx-auto max-w-lg"
        >
          <div className="mb-6 text-center">
            <h2
              id="path-heading"
              className="font-bold text-white text-[clamp(22px,3.2vw,34px)] tracking-[-0.03em]"
            >
              Two sides. One platform.
            </h2>
            <p className="mt-2 text-[13px] text-slate-300">
              The learner who climbs today becomes the Guide who earns tomorrow. Same arena.
            </p>
          </div>

          <LandingSpeechBubble message={coach.message} tone={coach.tone} label="" className="mx-auto mb-5 max-w-lg" />

          <SideCard side={winningSide} highlight />
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={resetGame}
              className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-white/15"
            >
              Play again
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] text-slate-500">
            Mini game only. Your real path starts when you sign up.
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

export { SideCard };
