"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { animate, createTimeline, stagger } from "@/shared/animation/anime";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import type { ApReadinessBandView } from "@/features/student-home/ap-readiness-band-pure";
import { ApReadinessBand } from "@/features/student-home/ap-readiness-band";
import { StudentHomeAnimatedSticky } from "@/features/student-home/student-home-animated-sticky";
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

function VerdictMetricRow({
  icon,
  label,
  value,
  detail,
  gold,
  className,
}: StudentHomeVerdictView["metrics"][number] & { className?: string }) {
  return (
    <div
      className={cn(
        "home-verdict-metric flex items-start gap-3 rounded-xl border border-[#E0E7FF] bg-white/85 px-3 py-2.5 shadow-[1px_2px_0_rgba(11,18,32,0.06)]",
        className,
      )}
    >
      <span className="flex shrink-0 items-center justify-center rounded-lg bg-[#EDE9FE] p-1.5 ring-1 ring-[#C4B5FD]/60">
        <MentrixaVocabIcon name={icon} size={28} surface="light" gold={gold} title={label} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6366F1]">{label}</p>
        <p className="font-mono text-base font-black tabular-nums leading-none text-[#0B1220]">{value}</p>
        <p className="mt-1 text-[11px] leading-snug text-[#475569]">{detail}</p>
      </div>
    </div>
  );
}

export function StudentVerdictHero({
  hero,
  apBand,
  className,
}: {
  hero: StudentHomeVerdictView;
  apBand: ApReadinessBandView;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const headlineRef = useRef<HTMLParagraphElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headlineRef.current;
    if (!el || reduceMotion) return;

    animate(el, {
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 820,
      ease: "outExpo",
    });
  }, [hero.headline, reduceMotion]);

  useGsapEffect(
    (gsap) => {
      if (reduceMotion) return;
      const banner = bannerRef.current;
      const metrics = metricsRef.current;
      if (!banner) return;

      const rows = metrics
        ? (gsap.utils.toArray<HTMLElement>(".home-verdict-metric", metrics) as HTMLElement[])
        : [];

      gsap.set(banner, { scale: 0.96, opacity: 0, transformOrigin: "50% 0%" });
      if (rows.length > 0) gsap.set(rows, { opacity: 0, x: -20 });

      const tl = gsap.timeline({ delay: 0.12 });
      tl.to(banner, { scale: 1, opacity: 1, duration: 0.55, ease: "power3.out" });
      if (rows.length > 0) {
        tl.to(
          rows,
          { opacity: 1, x: 0, duration: 0.48, stagger: 0.08, ease: "back.out(1.4)" },
          "-=0.2",
        );
      }

      return () => {
        tl.kill();
      };
    },
    [hero.metrics.length, reduceMotion],
  );

  useEffect(() => {
    const metrics = metricsRef.current;
    if (!metrics || reduceMotion || hero.metrics.length === 0) return;

    const timeline = createTimeline({ autoplay: true });
    timeline.add(metrics, {
      boxShadow: [
        "1px 2px 0 rgba(11,18,32,0.06)",
        "2px 4px 0 rgba(11,18,32,0.1)",
        "1px 2px 0 rgba(11,18,32,0.06)",
      ],
      duration: 900,
      ease: "inOutSine",
      delay: stagger(120, { start: 400 }),
    });

    return () => {
      timeline.revert();
    };
  }, [hero.metrics, reduceMotion]);

  return (
    <StudentHomeAnimatedSticky
      variant={STUDENT_ROUTE_HEADER_VARIANT.home}
      staggerIndex={0}
      className={cn(mentrixStudent.hubHero, "relative overflow-hidden", className)}
    >
      <div aria-label="Your verified rank verdict">
      <div
        ref={bannerRef}
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#7C3AED]/12 via-[#6366F1]/6 to-transparent"
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
        ref={headlineRef}
        className={cn(
          "relative mt-4 max-w-[600px] font-[family-name:var(--font-playfair),serif] italic leading-snug text-[#0B1220]",
          reduceMotion ? "opacity-100" : "opacity-0",
        )}
        style={{ fontSize: "clamp(20px, 3vw, 28px)" }}
      >
        {hero.headline}
      </p>

      {hero.metrics.length > 0 ? (
        <div ref={metricsRef} className="relative mt-4 grid gap-2 sm:grid-cols-2">
          {hero.metrics.map((metric) => (
            <VerdictMetricRow key={`${metric.icon}-${metric.label}`} {...metric} />
          ))}
        </div>
      ) : null}

      <div className="relative mt-4">
        <ApReadinessBand band={apBand} />
      </div>

      <motion.div
        className="relative mt-5"
        whileHover={reduceMotion ? undefined : { scale: 1.03, y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
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
