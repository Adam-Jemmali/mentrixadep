"use client";

import { useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { duelInviteStakeCopy } from "@/features/duels/duel-wager-ui-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

/** Violet stake badge on duel invite — pulses once on first appearance. */
export function DuelInviteStakeBadge({
  challengerName,
  amount,
  className,
}: {
  challengerName: string;
  amount: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    void animate(el, {
      scale: [1, 1.06, 1],
      opacity: [0.85, 1, 1],
      duration: 700,
      ease: "easeInOut",
    });
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--mx-violet)]/30 bg-[var(--mx-violet)]/10 px-3 py-1.5 text-[var(--mx-violet)] shadow-[0_0_20px_rgba(124,58,237,0.15)]",
        className,
      )}
    >
      <MentrixaVocabIcon name="duels" size={16} surface="dark" title="Stake" />
      <span className="text-sm font-bold leading-snug">{duelInviteStakeCopy(challengerName, amount)}</span>
    </div>
  );
}
