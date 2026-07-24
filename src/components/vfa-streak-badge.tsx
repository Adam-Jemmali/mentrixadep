"use client";

import { useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { vfaProofStreakLabel } from "@/features/vfa-streak/vfa-streak-pure";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { cn } from "@/shared/core/utils";

import { VERIFIED_GOLD_CSS } from "@/components/ui/mentrixa-ui-tokens";

const GOLD = VERIFIED_GOLD_CSS;

/** Verified proof streak pill beside rank badge — gold count + streak vocab icon. */
export function VfaStreakBadge({
  days,
  className,
}: {
  days: number;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const streakNumberRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const numberEl = streakNumberRef.current;
    const iconEl = iconRef.current;
    if (!numberEl || days <= 0) return;

    if (reducedMotion) {
      numberEl.textContent = String(days);
      return;
    }

    const counter = { val: 0 };
    const countAnim = animate(counter, {
      val: days,
      round: 1,
      duration: 700,
      ease: "outExpo",
      delay: 200,
      onUpdate: () => {
        numberEl.textContent = String(Math.round(counter.val));
      },
      onComplete: () => {
        if (!iconEl) return;
        animate(iconEl, {
          scale: [1, 1.3, 1],
          duration: 400,
          ease: "outExpo",
        });
      },
    });

    return () => {
      countAnim.pause();
    };
  }, [days, reducedMotion]);

  if (days <= 0) return null;

  return (
    <StudentStickyNote compact variant="strip" className={cn("inline-flex rotate-0 px-2 py-1 shadow-none", className)}>
      <div
        className="inline-flex items-center gap-2.5 rounded-full border border-[var(--mx-gold)]/30 bg-[var(--mx-gold)]/10 px-2.5 py-1"
        aria-label={`${days} ${vfaProofStreakLabel(days)}`}
      >
        <span ref={iconRef} className="inline-flex shrink-0 origin-center">
          <MentrixaVocabIcon name="streak" size={28} gold surface="light" title="Proof streak" />
        </span>
        <span
          ref={streakNumberRef}
          className="font-mono text-base font-bold tabular-nums leading-none"
          style={{ color: GOLD }}
        >
          {reducedMotion ? days : 0}
        </span>
        <span className="text-[13px] font-medium leading-none text-[#64748B]">{vfaProofStreakLabel(days)}</span>
      </div>
    </StudentStickyNote>
  );
}
