"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import { ApReadinessBand } from "@/features/student-home/ap-readiness-band";
import {
  HOME_MOUNT_PANEL_CLASS,
} from "@/features/student-home/student-home-sticky-card";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";
import {
  MentrixaVocabIcon,
  VocabSectionHeading,
  VOCAB_HEADING_ICON_SIZE,
} from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_QUEST_ICON, CANONICAL_RANK_PROOF_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

export function StudentVerdictHero({
  verdict,
  fallbackLine,
  apBand,
  className,
}: {
  verdict: Verdict | null;
  fallbackLine: string;
  apBand: ApReadinessBandView;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const lineRef = useRef<HTMLParagraphElement>(null);
  const line = verdict?.changed ?? fallbackLine;
  const cta = verdict?.nextAction ?? { label: "Open Quest", href: "/student/quest" };

  useEffect(() => {
    const el = lineRef.current;
    if (!el || reduceMotion) return;

    animate(el, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 720,
      ease: "outExpo",
    });
  }, [line, reduceMotion]);

  return (
    <StudentStickyNote
      variant={STUDENT_ROUTE_HEADER_VARIANT.home}
      className={cn(
        HOME_MOUNT_PANEL_CLASS,
        mentrixStudent.hubHero,
        "relative overflow-hidden",
        className,
      )}
      aria-label="Your verified rank verdict"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#7C3AED]/10 blur-2xl"
        aria-hidden
      />

      <VocabSectionHeading
        name={CANONICAL_RANK_PROOF_ICON}
        label="Verified verdict"
        surface="light"
        gold={apBand.isVerifiedPrediction}
        className="relative"
      />

      <p
        ref={lineRef}
        className={cn(
          "relative mt-4 max-w-[600px] font-[family-name:var(--font-playfair),serif] italic leading-snug text-[#0B1220]",
          reduceMotion ? "opacity-100" : "opacity-0",
        )}
        style={{ fontSize: "clamp(20px, 3vw, 28px)" }}
      >
        {line}
      </p>

      <div className="relative mt-4">
        <ApReadinessBand band={apBand} />
      </div>

      <motion.div
        className="relative mt-5"
        whileHover={reduceMotion ? undefined : { scale: 1.03, y: -1 }}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      >
        <Link
          href={cta.href}
          className={cn(
            mentrixStudent.hubBtnSolid,
            "inline-flex cursor-pointer items-center gap-2 px-5 py-2.5 text-sm font-semibold",
          )}
        >
          <MentrixaVocabIcon
            name={CANONICAL_QUEST_ICON}
            size={VOCAB_HEADING_ICON_SIZE * 0.44}
            surface="light"
            title={cta.label}
          />
          {cta.label}
        </Link>
      </motion.div>
    </StudentStickyNote>
  );
}
