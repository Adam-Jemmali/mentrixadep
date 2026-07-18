"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { fireLevelUpConfetti, fireMentrixerGoldRain } from "@/features/xp/confetti-burst";
import { playMentrixaRankUpOnce } from "@/shared/integrations/mentrixa-sounds";
import { normalizeRankTitle } from "@/features/xp/rank-icons";

export type RankLevelUpPayload = {
  toLevel: number;
  title: string;
};

const MIN_VISIBLE_MS = 1500;
const AUTO_DISMISS_MS = 4000;

export function RankLevelUpModal({
  open,
  payload,
  onDismiss,
  headline,
  subtitle,
}: {
  open: boolean;
  payload: RankLevelUpPayload | null;
  onDismiss: () => void;
  /** Override default "You reached [RANK]" copy (e.g. onboarding reveal). */
  headline?: string;
  subtitle?: string;
}) {
  const [canDismiss, setCanDismiss] = useState(false);
  const openedAtRef = useRef<number | null>(null);
  const fxPlayedRef = useRef(false);

  const isMentrixer = payload?.title.trim().toUpperCase() === "MENTRIXER";

  useEffect(() => {
    if (!open || !payload) {
      setCanDismiss(false);
      openedAtRef.current = null;
      fxPlayedRef.current = false;
      return;
    }

    openedAtRef.current = Date.now();
    setCanDismiss(false);

    const unlockTimer = window.setTimeout(() => setCanDismiss(true), MIN_VISIBLE_MS);
    const autoTimer = window.setTimeout(() => onDismiss(), AUTO_DISMISS_MS);

    if (!fxPlayedRef.current) {
      fxPlayedRef.current = true;
      playMentrixaRankUpOnce();
      void fireLevelUpConfetti();
      if (isMentrixer) {
        void fireMentrixerGoldRain();
      }
    }

    return () => {
      window.clearTimeout(unlockTimer);
      window.clearTimeout(autoTimer);
    };
  }, [open, payload, onDismiss, isMentrixer]);

  const tryDismiss = useCallback(() => {
    if (!canDismiss) return;
    onDismiss();
  }, [canDismiss, onDismiss]);

  if (!open || !payload) return null;

  const displayHeadline = headline ?? `You reached ${normalizeRankTitle(payload.title).toUpperCase()}`;
  const displaySubtitle =
    subtitle ??
    (isMentrixer
      ? "The peak rank. Public proof forever."
      : "Keep competing — quests, duels, and Guide sessions all move your rank.");

  return (
    <AnimatePresence>
      <motion.div
        key="rank-level-up-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center px-4"
        style={{ backgroundColor: "rgba(10, 10, 10, 0.95)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rank-level-up-title"
        onClick={tryDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex max-w-md flex-col items-center text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <RankBadge
            rank={{ level: payload.toLevel, title: payload.title }}
            size="xl"
            animate
          />
          <h2
            id="rank-level-up-title"
            className="mt-8 font-[family-name:var(--font-playfair),serif] text-[32px] font-bold leading-tight text-white"
          >
            {displayHeadline}
          </h2>
          <p className="mt-3 text-sm text-white/60">{displaySubtitle}</p>
          {canDismiss ? (
            <button
              type="button"
              className="mt-8 text-xs font-medium uppercase tracking-widest text-white/45 transition hover:text-white/70"
              onClick={tryDismiss}
            >
              Tap to continue
            </button>
          ) : (
            <p className="mt-8 text-xs uppercase tracking-widest text-white/30">Rank secured…</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
