"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  FallingRoleSliceArena,
  type SliceRole,
} from "@/features/marketing/landing/v2/motion/falling-role-slice-arena";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

type HudState = {
  secondsLeft: number;
  scores: { Mentrixer: number; Guide: number };
  phase: "idle" | "playing" | "done";
};

type Props = {
  gameKey: number;
  onComplete: (winner: SliceRole, scores: { Mentrixer: number; Guide: number }) => void;
};

export function HeroWaitlistNinjaStage({ gameKey, onComplete }: Props) {
  const { mounted } = useLandingMotion();
  const [hud, setHud] = useState<HudState>({
    secondsLeft: 10,
    scores: { Mentrixer: 0, Guide: 0 },
    phase: "idle",
  });

  const handleHudUpdate = useCallback((state: HudState) => {
    setHud(state);
  }, []);

  const playing = hud.phase === "playing";

  return (
    <div className="lp-ninja-stage relative">
      <div className="lp-ninja-stage__rim pointer-events-none absolute -inset-[2px] rounded-[18px]" aria-hidden />
      <div className="lp-ninja-stage__slashes pointer-events-none absolute inset-0 rounded-2xl" aria-hidden />

      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-[#0a0612] shadow-[inset_0_0_60px_rgba(245,158,11,0.08)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[55] flex items-start justify-between gap-2 px-3 pb-2 pt-2.5">
          <div className="lp-ninja-score lp-ninja-score--learn">
            <span className="lp-ninja-score__label">Learn</span>
            <span className="lp-ninja-score__num">{hud.scores.Mentrixer}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-[0.28em] text-amber-200/90">Slash</span>
            <motion.span
              key={hud.secondsLeft}
              initial={{ scale: 1.35, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-black tabular-nums leading-none text-white drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]"
            >
              {playing ? `${hud.secondsLeft}` : "—"}
            </motion.span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">sec</span>
          </div>

          <div className="lp-ninja-score lp-ninja-score--teach">
            <span className="lp-ninja-score__label">Teach</span>
            <span className="lp-ninja-score__num">{hud.scores.Guide}</span>
          </div>
        </div>

        <FallingRoleSliceArena
          key={gameKey}
          gameSeconds={10}
          height={300}
          hudInset={64}
          iconSize={38}
          fallSpeed={175}
          spawnMs={400}
          autoStart={mounted}
          autoStartDelay={0}
          hideHud
          learnLabel="Learn"
          teachLabel="Teach"
          onHudUpdate={handleHudUpdate}
          onComplete={onComplete}
          className="rounded-none border-0 bg-transparent shadow-none"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[55] bg-gradient-to-t from-[#0a0612] via-[#0a0612]/80 to-transparent px-3 pb-2.5 pt-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">
            Click on the falling badges
          </p>
        </div>
      </div>

      <span className="lp-ninja-corner lp-ninja-corner--tl" aria-hidden />
      <span className="lp-ninja-corner lp-ninja-corner--tr" aria-hidden />
      <span className="lp-ninja-corner lp-ninja-corner--bl" aria-hidden />
      <span className="lp-ninja-corner lp-ninja-corner--br" aria-hidden />
    </div>
  );
}
