"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { TypewriterText } from "@/features/marketing/landing/v2/motion/typewriter-text";
import { cn } from "@/shared/core/utils";
import {
  scaleIn,
  staggerContainer,
  viewportOnce,
  cardHoverLift,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import { FlowStepsOrderGame } from "@/features/marketing/landing/v2/sections/flow-steps-order-game";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { LandingNumberHeading, LandingNumberWatermark } from "@/features/marketing/landing/ui/landing-number-heading";
import { LP_NUM } from "@/features/marketing/landing/ui/landing-number-motion-pure";
import { useLandingNumericReveal } from "@/features/marketing/landing/ui/use-landing-numeric-reveal";
import { LandingRoleText } from "@/features/marketing/landing/ui/landing-role-text";
import { LandingVocabWord } from "@/features/marketing/landing/ui/landing-vocab-word";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_FLOW, LANDING_FLOW_STEPS } from "@/features/marketing/landing/landing-copy-pure";
import { landingStickyVariantForIndex } from "@/features/marketing/landing/landing-sticky-variants";

const FLOW_STEPS: {
  number: string;
  vocabIcon: VocabIconName;
  title: string;
  line: string;
}[] = [
  { number: "1", vocabIcon: "flow-book", title: LANDING_FLOW_STEPS[0].title, line: LANDING_FLOW_STEPS[0].line },
  { number: "2", vocabIcon: "flow-meet", title: LANDING_FLOW_STEPS[1].title, line: LANDING_FLOW_STEPS[1].line },
  { number: "3", vocabIcon: "flow-unpack", title: LANDING_FLOW_STEPS[2].title, line: LANDING_FLOW_STEPS[2].line },
  { number: "4", vocabIcon: "flow-climb", title: LANDING_FLOW_STEPS[3].title, line: LANDING_FLOW_STEPS[3].line },
];

export function FlowStepsSection() {
  const ref = useRef<HTMLElement>(null);
  const [loopLocked, setLoopLocked] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const { cinematic } = useLandingMotion();
  useLandingNumericReveal(ref);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.35"],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const lineScale = useTransform(smoothProgress, [0, 1], [0, 1]);

  const wasLockedRef = useRef(false);
  const handleLoopCompletedChange = useCallback((completed: boolean) => {
    if (completed && !wasLockedRef.current) {
      setRevealKey((key) => key + 1);
    }
    wasLockedRef.current = completed;
    setLoopLocked(completed);
  }, []);

  return (
    <section id="flow" ref={ref} className={landingHub.sectionTight}>
      <div className={landingHub.sectionInner}>
        <LandingNumberHeading
          eyebrow={LANDING_FLOW.eyebrow}
          count={FLOW_STEPS.length}
          suffix="steps"
          subtitle={LANDING_FLOW.subtitle}
        />

        <div className="relative mt-8 hidden lg:block">
          <div className="absolute left-[12.5%] right-[12.5%] top-8 h-0.5 origin-left bg-[#C4B5FD]/50">
            <motion.div className="h-full origin-left bg-[var(--mx-indigo)]" style={{ scaleX: lineScale }} />
          </div>
          {FLOW_STEPS.map((step, i) => {
            const left = 12.5 + i * 25;
            return (
              <motion.div
                key={step.number}
                className="absolute top-[1.65rem] flex -translate-x-1/2 flex-col items-center gap-1"
                style={{ left: `${left}%` }}
              >
                <span className="text-[10px] font-bold tabular-nums text-[var(--mx-indigo)]">{step.number}</span>
                <motion.div
                  className="h-3 w-3 rounded-full border-2 border-[var(--mx-indigo)] bg-violet-100"
                  animate={
                    cinematic
                      ? {
                          scale: [1, 1.35, 1],
                          borderColor: ["rgba(99,102,241,0.5)", "rgba(99,102,241,1)", "rgba(99,102,241,0.5)"],
                        }
                      : undefined
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.35,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FLOW_STEPS.map((step, i) => (
            <motion.div key={step.title} variants={scaleIn} custom={i} whileHover={cinematic ? cardHoverLift : undefined}>
              <LandingStickyCard
                rotate={i % 2 === 0}
                variant={landingStickyVariantForIndex(i)}
                className={cn(
                  LP_NUM.card,
                  "relative overflow-hidden opacity-0",
                  i % 2 === 1 && "rotate-[0.45deg]",
                )}
              >
                <LandingNumberWatermark value={step.number} />
                <div className="relative">
                  <LandingVocabWord
                    word={step.title}
                    icon={step.vocabIcon}
                    prefix={`${step.number}.`}
                    size="xl"
                  />
                </div>
                <div className={`relative mt-3 min-h-[2.75rem] text-[13px] leading-snug md:text-sm ${landingHub.body}`}>
                  {loopLocked ? (
                    <TypewriterText
                      text={step.line}
                      className={landingHub.body}
                      speed={22}
                      startDelay={400 + i * 550}
                      resetKey={`${revealKey}-${step.number}`}
                    />
                  ) : (
                    <span className="text-[#94A3B8]">
                      <LandingRoleText text={step.line} iconSize="sm" />
                    </span>
                  )}
                </div>
              </LandingStickyCard>
            </motion.div>
          ))}
        </motion.div>

        <FlowStepsOrderGame onCompletedChange={handleLoopCompletedChange} />
      </div>
    </section>
  );
}
