"use client";

import { useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { DUEL_WAGER_STEP_COPY } from "@/features/duels/duel-wager-ui-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

const GOLD = "#D4A017";

/** Live win/lose XP preview with anime counter on slider moves. */
export function DuelWagerPreview({
  yourWager,
  maxWager,
  className,
}: {
  yourWager: number;
  maxWager: number;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const winRef = useRef<HTMLSpanElement>(null);
  const loseRef = useRef<HTMLSpanElement>(null);
  const loseLineRef = useRef<HTMLParagraphElement>(null);
  const prevWinRef = useRef(0);
  const prevLoseRef = useRef(0);

  useEffect(() => {
    const winEl = winRef.current;
    const loseEl = loseRef.current;
    const loseLine = loseLineRef.current;
    if (!winEl || !loseEl) return;

    if (reducedMotion) {
      winEl.textContent = `+${yourWager.toLocaleString()} ${DUEL_WAGER_STEP_COPY.currentXpLabel}`;
      loseEl.textContent = `-${yourWager.toLocaleString()} ${DUEL_WAGER_STEP_COPY.currentXpLabel}`;
      if (loseLine) {
        loseLine.style.opacity = String(0.4 + (maxWager > 0 ? (yourWager / maxWager) * 0.3 : 0));
      }
      return;
    }

    const winObj = { val: prevWinRef.current };
    const loseObj = { val: prevLoseRef.current };

    const winAnim = animate(winObj, {
      val: yourWager,
      duration: 100,
      ease: "linear",
      onUpdate: () => {
        winEl.textContent = `+${Math.round(winObj.val).toLocaleString()} ${DUEL_WAGER_STEP_COPY.currentXpLabel}`;
      },
    });

    const loseAnim = animate(loseObj, {
      val: yourWager,
      duration: 100,
      ease: "linear",
      onUpdate: () => {
        loseEl.textContent = `-${Math.round(loseObj.val).toLocaleString()} ${DUEL_WAGER_STEP_COPY.currentXpLabel}`;
      },
    });

    if (loseLine) {
      const opacity = 0.4 + (maxWager > 0 ? (yourWager / maxWager) * 0.3 : 0);
      animate(loseLine, { opacity, duration: 100, ease: "linear" });
    }

    prevWinRef.current = yourWager;
    prevLoseRef.current = yourWager;

    return () => {
      winAnim.pause();
      loseAnim.pause();
    };
  }, [yourWager, maxWager, reducedMotion]);

  return (
    <div className={cn("space-y-2 rounded-xl border border-[#334155]/60 bg-[#0F172A]/40 px-3 py-3", className)}>
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
        <MentrixaVocabIcon name="xp" size={18} gold surface="dark" title="Win XP" />
        <span>{DUEL_WAGER_STEP_COPY.winPrefix}</span>
        <span ref={winRef} className="font-mono tabular-nums">
          +0 {DUEL_WAGER_STEP_COPY.currentXpLabel}
        </span>
      </p>
      <p ref={loseLineRef} className="flex items-center gap-2 text-sm font-semibold text-red-400/70">
        <MentrixaVocabIcon name="xp" size={18} surface="dark" title="Lose XP" />
        <span>{DUEL_WAGER_STEP_COPY.losePrefix}</span>
        <span ref={loseRef} className="font-mono tabular-nums">
          -0 {DUEL_WAGER_STEP_COPY.currentXpLabel}
        </span>
      </p>
    </div>
  );
}

export function DuelWagerXpDisplay({
  totalXp,
  maxWager,
  className,
}: {
  totalXp: number;
  maxWager: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="inline-flex items-center gap-2">
        <MentrixaVocabIcon name="xp" size={22} gold surface="dark" title="Your XP" />
        <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: GOLD }}>
          {totalXp.toLocaleString()} {DUEL_WAGER_STEP_COPY.currentXpLabel}
        </span>
      </p>
      <p className="text-[13px] text-[#94A3B8]">
        {DUEL_WAGER_STEP_COPY.maxStakePrefix}{" "}
        <span className="font-mono tabular-nums text-[#CBD5E1]">{maxWager.toLocaleString()}</span>{" "}
        {DUEL_WAGER_STEP_COPY.maxStakeSuffix}{" "}
        <span className="text-[#64748B]">{DUEL_WAGER_STEP_COPY.maxStakeCapNote}</span>
      </p>
    </div>
  );
}
