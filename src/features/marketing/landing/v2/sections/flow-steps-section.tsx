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
  iconFloat,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import { FlowStepsOrderGame } from "@/features/marketing/landing/v2/sections/flow-steps-order-game";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";

const FLOW_STEPS: {
  number: string;
  vocabIcon: VocabIconName;
  title: string;
  line: string;
}[] = [
  {
    number: "01",
    vocabIcon: "flow-book",
    title: "Book",
    line: "Snapshot shows the weak spot. Quest picks the right Guide. Three clicks.",
  },
  {
    number: "02",
    vocabIcon: "flow-meet",
    title: "Meet",
    line: "Show up live. Your Guide already knows where you broke. Start there.",
  },
  {
    number: "03",
    vocabIcon: "flow-unpack",
    title: "Unpack",
    line: "Ten minutes later your Quest pack lands. Summary, flashcards, drills on what you fixed.",
  },
  {
    number: "04",
    vocabIcon: "flow-climb",
    title: "Climb",
    line: "XP updates. Rank moves. Big jump? You get a Breakthrough Card to share.",
  },
];

export function FlowStepsSection() {
  const ref = useRef<HTMLElement>(null);
  const [loopLocked, setLoopLocked] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const { cinematic } = useLandingMotion();
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
    <section id="flow" ref={ref} className={landingHub.section}>
      <div className={landingHub.sectionInner}>
        <div className="relative mt-6 hidden lg:block">
          <div className="absolute left-[12.5%] right-[12.5%] top-8 h-0.5 origin-left bg-[#C4B5FD]/50">
            <motion.div className="h-full origin-left bg-[#6366F1]" style={{ scaleX: lineScale }} />
          </div>
          {FLOW_STEPS.map((_, i) => {
            const left = 12.5 + i * 25;
            return (
              <motion.div
                key={FLOW_STEPS[i]!.number}
                className="absolute top-[1.65rem] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#6366F1] bg-[#EDE9FE]"
                style={{ left: `${left}%` }}
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
            );
          })}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FLOW_STEPS.map((step, i) => (
            <motion.div key={step.title} variants={scaleIn} custom={i} whileHover={cinematic ? cardHoverLift : undefined}>
              <LandingStickyCard rotate={i % 2 === 0} className={cn("relative overflow-hidden", i % 2 === 1 && "rotate-[0.45deg]")}>
                {loopLocked ? (
                  <motion.span
                    className={`text-[10px] font-bold tabular-nums ${landingHub.eyebrow}`}
                    initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ delay: 0.1 + i * 0.15, duration: 0.45, ease: "easeOut" }}
                  >
                    {step.number}
                  </motion.span>
                ) : (
                  <span className="text-[10px] font-bold tabular-nums text-[#94A3B8]">??</span>
                )}
                <div className="relative mt-3 flex items-center gap-3">
                  <motion.span
                    className={`${landingHub.stickyCard} relative flex h-9 w-9 shrink-0 rotate-0 items-center justify-center p-0`}
                    animate={cinematic ? iconFloat : undefined}
                  >
                    <MentrixaVocabIcon name={step.vocabIcon} size={20} surface="light" title={step.title} />
                  </motion.span>
                  <h3 className="text-base font-bold text-[#0B1220]">{step.title}</h3>
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
                    <span className="invisible select-none" aria-hidden>
                      {step.line}
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
