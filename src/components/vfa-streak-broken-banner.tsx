"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "@/shared/animation/motion";
import {
  vfaStreakBrokenBannerStorageKey,
  vfaStreakBrokenCopy,
  type VfaStreakHomeDisplay,
} from "@/features/vfa-streak/vfa-streak-pure";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

/** One time orange banner when a proof streak breaks. */
export function VfaStreakBrokenBanner({
  userId,
  display,
  className,
}: {
  userId: string;
  display: VfaStreakHomeDisplay;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (display.kind !== "broken") {
      setVisible(false);
      return;
    }

    const key = vfaStreakBrokenBannerStorageKey(userId, display.endedDays);
    if (typeof window !== "undefined" && window.localStorage.getItem(key) === "1") {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, [display, userId]);

  const dismiss = useCallback(() => {
    if (display.kind !== "broken") return;
    const key = vfaStreakBrokenBannerStorageKey(userId, display.endedDays);
    window.localStorage.setItem(key, "1");
    setVisible(false);
  }, [display, userId]);

  return (
    <AnimatePresence>
      {visible && display.kind === "broken" ? (
        <motion.div
          key="vfa-streak-broken"
          initial={reducedMotion ? false : { y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          role="status"
        >
          <StudentStickyNote
            variant="pinned"
            className={cn(
              "flex w-full rotate-0 items-start gap-3 border-orange-400/40 bg-orange-500/10 px-4 py-3",
              className,
            )}
          >
            <MentrixaVocabIcon name="streak" size={24} surface="light" title="Proof streak ended" />
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-orange-950/90">
              {vfaStreakBrokenCopy(display.endedDays)}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 text-xs font-bold uppercase tracking-wide text-orange-800/80 hover:text-orange-950"
            >
              Dismiss
            </button>
          </StudentStickyNote>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
