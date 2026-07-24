"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createTimeline, stagger } from "@/shared/animation/anime";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { useHydrationSafeMotion } from "@/shared/animation/use-hydration-safe-motion";
import { StudentHomeAnimatedSticky } from "@/features/student-home/student-home-animated-sticky";
import { StudentHubAnimatedFraction } from "@/features/student-home/student-hub-animated-fraction";
import type { StudentHomeVerdictView } from "@/features/student-home/student-home-verdict-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import {
  MentrixaVocabIcon,
  VocabSectionHeading,
  VOCAB_HEADING_ICON_SIZE,
} from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_QUEST_ICON, CANONICAL_RANK_PROOF_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

export function StudentVerdictHero({
  hero,
  className,
}: {
  hero: StudentHomeVerdictView;
  className?: string;
}) {
  const { safeReduceMotion } = useHydrationSafeMotion();
  const reduceMotion = useReducedMotion();
  const bannerRef = useRef<HTMLDivElement>(null);
  const hasFraction = hero.accuracyFraction != null;
  const showGold = (hero.accuracyFraction?.percent ?? 0) >= 70;

  useGsapEffect(
    (gsap) => {
      if (reduceMotion) return;
      const banner = bannerRef.current;
      if (!banner) return;

      gsap.set(banner, { scale: 0.96, opacity: 0, transformOrigin: "50% 0%" });
      const tl = gsap.timeline({ delay: 0.12 });
      tl.to(banner, { scale: 1, opacity: 1, duration: 0.55, ease: "power3.out" });

      return () => {
        tl.kill();
      };
    },
    [hasFraction, reduceMotion],
  );

  useEffect(() => {
    if (reduceMotion || !hasFraction) return;

    const timeline = createTimeline({ autoplay: true });
    timeline.add(`.home-verdict-panel`, {
      boxShadow: [
        "1px 2px 0 rgba(11,18,32,0.1)",
        "2px 4px 0 rgba(11,18,32,0.06)",
        "1px 2px 0 rgba(11,18,32,0.1)",
      ],
      duration: 900,
      ease: "inOutSine",
      delay: stagger(120, { start: 420 }),
    });

    return () => {
      timeline.revert();
    };
  }, [hasFraction, reduceMotion]);

  return (
    <StudentHomeAnimatedSticky
      variant={STUDENT_ROUTE_HEADER_VARIANT.home}
      staggerIndex={0}
      className={cn(mentrixStudent.hubHero, "relative overflow-hidden", className)}
    >
      <div aria-label="Your verified rank verdict">
        <div
          ref={bannerRef}
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[var(--mx-violet)]/12 via-[var(--mx-indigo)]/6 to-transparent"
          aria-hidden
        />

        <VocabSectionHeading
          name={CANONICAL_RANK_PROOF_ICON}
          label="Verified verdict"
          surface="light"
          gold={showGold}
          className="relative"
        />

        {hasFraction ? (
          <div className="home-verdict-panel relative mt-3 rounded-lg border border-violet-200 bg-white/85 px-3 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
              First-try accuracy
            </p>
            <StudentHubAnimatedFraction
              className="mt-2"
              numerator={hero.accuracyFraction!.correct}
              denominator={hero.accuracyFraction!.total}
              percent={hero.accuracyFraction!.percent}
            />
            <p className="mt-2 text-[10px] leading-snug text-[#475569]">
              Each first try is permanent on AP Calculus AB.
            </p>
            {hero.peerSummary ? (
              <p className="mt-1 text-[10px] font-medium text-[var(--mx-navy)]">{hero.peerSummary}</p>
            ) : null}
          </div>
        ) : (
          <p className="relative mt-3 max-w-[540px] text-sm leading-snug text-[#475569]">{hero.headline}</p>
        )}

        <motion.div
          className="relative mt-3"
          whileHover={safeReduceMotion ? undefined : { scale: 1.03, y: -2 }}
          whileTap={safeReduceMotion ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
          <Link
            href={hero.cta.href}
            className={cn(
              mentrixStudent.hubBtnSolid,
              "inline-flex cursor-pointer items-center gap-2 px-5 py-2.5 text-sm font-semibold",
            )}
          >
            <MentrixaVocabIcon
              name={CANONICAL_QUEST_ICON}
              size={VOCAB_HEADING_ICON_SIZE * 0.44}
              surface="light"
              title={hero.cta.label}
            />
            {hero.cta.label}
          </Link>
        </motion.div>
      </div>
    </StudentHomeAnimatedSticky>
  );
}
