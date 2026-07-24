"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "@/shared/animation/motion";
import {
  vfaStreakMilestoneDaysLabel,
  type VfaStreakMilestone,
} from "@/features/vfa-streak/vfa-streak-pure";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";

import { VERIFIED_GOLD_CSS } from "@/components/ui/mentrixa-ui-tokens";

const GOLD = VERIFIED_GOLD_CSS;
const MIN_VISIBLE_MS = 2000;
const AUTO_DISMISS_MS = 4000;

export function VfaStreakMilestoneModal({
  open,
  days,
  peerContext,
  onDismiss,
}: {
  open: boolean;
  days: VfaStreakMilestone | null;
  peerContext: string;
  onDismiss: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [canDismiss, setCanDismiss] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !days) {
      setCanDismiss(false);
      return;
    }

    const unlockTimer = window.setTimeout(() => setCanDismiss(true), MIN_VISIBLE_MS);
    const autoTimer = window.setTimeout(() => onDismiss(), AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(unlockTimer);
      window.clearTimeout(autoTimer);
    };
  }, [open, days, onDismiss]);

  useGsapEffect(
    (gsap) => {
      if (!open || !days || reducedMotion) return;
      const overlay = overlayRef.current;
      if (!overlay) return;

      const tl = gsap.timeline();
      tl.from(".streak-modal-overlay", { opacity: 0, duration: 0.3 });
      tl.from(
        ".streak-number-large",
        { scale: 0.5, opacity: 0, duration: 0.6, ease: "back.out(1.7)" },
        "-=0.1",
      );
      tl.from(".streak-label", { y: 10, opacity: 0, duration: 0.4 }, "-=0.2");
      tl.from(".streak-peer-context", { y: 8, opacity: 0, duration: 0.35 }, "-=0.15");

      return () => {
        tl.kill();
      };
    },
    [open, days, reducedMotion],
  );

  const tryDismiss = useCallback(() => {
    if (!canDismiss) return;
    onDismiss();
  }, [canDismiss, onDismiss]);

  if (!open || !days) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        key="vfa-streak-milestone"
        initial={{ opacity: reducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="streak-modal-overlay fixed inset-0 z-[125] flex items-center justify-center px-4"
        style={{ backgroundColor: "rgba(10, 10, 10, 0.95)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vfa-streak-milestone-title"
        onClick={tryDismiss}
      >
        <div className="flex max-w-md flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
          <span className="streak-modal-icon inline-flex">
            <MentrixaVocabIcon name="streak" size={64} gold surface="dark" title="Proof streak" />
          </span>
          <p
            id="vfa-streak-milestone-title"
            className="streak-number-large mt-6 font-[family-name:var(--font-playfair),serif] text-[80px] font-bold leading-none tabular-nums"
            style={{ color: GOLD }}
          >
            {days}
          </p>
          <p className="streak-label mt-3 text-base font-medium text-white/80">{vfaStreakMilestoneDaysLabel()}</p>
          <p className="streak-peer-context mt-4 text-sm text-white/55">{peerContext}</p>
          {canDismiss ? (
            <button
              type="button"
              className="mt-8 text-xs font-medium uppercase tracking-widest text-white/45 transition hover:text-white/70"
              onClick={tryDismiss}
            >
              Tap to continue
            </button>
          ) : (
            <p className="mt-8 text-xs uppercase tracking-widest text-white/30">Streak secured</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
