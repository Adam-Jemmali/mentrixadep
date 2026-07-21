"use client";

import { useRef } from "react";
import { MasteryNode } from "@/components/mastery-node";
import { animate, stagger } from "@/shared/animation/anime";
import { useReducedMotion } from "@/shared/animation/motion";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { KokonutGlass } from "@/shared/ui/kokonut-glass";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_IMPACT_SCORE_ICON } from "@/shared/icons/vocab-canonical";
import type { GuideImpactNodeEntry } from "@/features/guide-impact/impact-score-pure";
import {
  GUIDE_IMPACT_CHIP_CLASS,
  GUIDE_PUBLIC_COPY,
  guideImpactChipHoverCopy,
  guideImpactChipVisual,
} from "@/features/tutor/public-profile-pure";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { cn } from "@/shared/core/utils";

function chipNodeState(visual: ReturnType<typeof guideImpactChipVisual>) {
  if (visual === "high") return "proficient" as const;
  if (visual === "moderate") return "attempted" as const;
  return "unstarted" as const;
}

export function GuidePublicImpactChipsSection({
  entries,
}: {
  entries: GuideImpactNodeEntry[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useGsapScrollTriggerEffect((_gsap, ScrollTrigger) => {
    const section = sectionRef.current;
    if (!section || reduceMotion || entries.length === 0) return;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top 85%",
      once: true,
      onEnter: () => {
        const chips = section.querySelectorAll<HTMLElement>(".impact-chip");
        if (chips.length === 0) return;
        animate(chips, {
          scale: [0.6, 1],
          opacity: [0, 1],
          duration: 400,
          ease: "outBack",
          delay: stagger(50),
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [entries.length, reduceMotion]);

  return (
    <section ref={sectionRef} id="guide-verified-impact" className="scroll-mt-20">
      <GuideAnimatedSticky variant="dog-ear" staggerIndex={1}>
        <div className="mb-2 flex items-center gap-2">
          <MentrixaVocabIcon
            name={CANONICAL_IMPACT_SCORE_ICON}
            size={18}
            gold
            surface="light"
            title="Verified impact"
          />
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7C3AED]">
            {GUIDE_PUBLIC_COPY.impactHeading}
          </h2>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-[#475569]">
            Per-node verified impact appears after this Guide has measurable first-attempt movement.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {entries.map((entry) => {
              const visual = guideImpactChipVisual(entry.impactScore, entry.studentsCounted);
              const hoverCopy = guideImpactChipHoverCopy(entry.studentsCounted, entry.nodeName);
              return (
                <li key={entry.skillNodeId} className="group relative">
                  <div
                    className={cn(
                      "impact-chip inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold",
                      GUIDE_IMPACT_CHIP_CLASS[visual],
                      reduceMotion ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <MasteryNode
                      nodeId={entry.skillNodeId}
                      state={chipNodeState(visual)}
                      nodeName={entry.nodeName}
                      size="xs"
                    />
                    <span className="max-w-[9rem] truncate">{entry.nodeName}</span>
                    <span className="font-mono tabular-nums">{Math.round(entry.impactScore)}/100</span>
                  </div>
                  <KokonutGlass
                    verifiedGlow={visual === "high" && entry.impactScore > 80}
                    className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-[min(16rem,70vw)] -translate-x-1/2 px-3 py-2 text-center text-[11px] leading-snug text-white opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {hoverCopy}
                  </KokonutGlass>
                </li>
              );
            })}
          </ul>
        )}
      </GuideAnimatedSticky>
    </section>
  );
}
