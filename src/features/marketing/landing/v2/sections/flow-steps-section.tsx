"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { TypewriterText } from "@/features/marketing/landing/v2/motion/typewriter-text";
import { cn } from "@/shared/core/utils";
import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import {
  scaleIn,
  staggerContainer,
  viewportOnce,
  cardHoverLift,
  iconFloat,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import { FlowStepsOrderGame } from "@/features/marketing/landing/v2/sections/flow-steps-order-game";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

const FLOW_STEPS = [
  {
    number: "01",
    icon: "/images/book.webp",
    title: "Book",
    line: "Find your Guide by subject. See the full price. Book in three minutes.",
  },
  {
    number: "02",
    icon: "/images/live.webp",
    title: "Meet",
    line: "Show up live. Screen share your problem. Work through it together until it breaks open.",
  },
  {
    number: "03",
    icon: "/images/package.webp",
    title: "Unpack",
    line: "Immediately after you hang up, Quest ships your summary, flashcards, and practice drills.",
  },
  {
    number: "04",
    icon: "/images/xp.webp",
    title: "Climb",
    line: "XP lands. Division rank updates. Come back tomorrow and do it again. The rank compounds.",
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
    <section id="flow" ref={ref} className="relative overflow-hidden bg-arena-bg py-20 md:py-28">
      <ArenaMeshBackground variant="section" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="text-center"
        >
          
        </motion.div>

        <div className="relative mt-14 hidden lg:block">
          <div className="absolute left-[12.5%] right-[12.5%] top-8 h-0.5 origin-left bg-white/10">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400"
              style={{ scaleX: lineScale }}
            />
          </div>
          {FLOW_STEPS.map((_, i) => {
            const left = 12.5 + i * 25;
            return (
              <motion.div
                key={FLOW_STEPS[i]!.number}
                className="absolute top-[1.65rem] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-indigo-400/50 bg-slate-950"
                style={{ left: `${left}%` }}
                animate={
                  cinematic
                    ? {
                        scale: [1, 1.35, 1],
                        borderColor: ["rgba(129,140,248,0.5)", "rgba(167,139,250,1)", "rgba(129,140,248,0.5)"],
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
            <motion.article
              key={step.title}
              variants={scaleIn}
              custom={i}
              whileHover={cinematic ? cardHoverLift : undefined}
              className={cn(
                "lp-feature-3d relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/82 p-4 shadow-xl shadow-black/30 backdrop-blur-md md:p-5",
                "hover:border-indigo-400/30 hover:shadow-indigo-500/15 transition-shadow duration-300",
              )}
            >
              {cinematic ? (
                <motion.div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl"
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
              {loopLocked ? (
                <motion.span
                  className="text-[10px] font-bold tabular-nums text-indigo-400"
                  initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.1 + i * 0.15, duration: 0.45, ease: "easeOut" }}
                >
                  {step.number}
                </motion.span>
              ) : (
                <span className="text-[10px] font-bold tabular-nums text-slate-600">??</span>
              )}
              <div className="relative mt-3 flex items-center gap-3">
                <motion.span className="relative h-9 w-9 shrink-0" animate={cinematic ? iconFloat : undefined}>
                  <Image src={step.icon} alt="" fill className="object-contain" sizes="36px" quality={65} loading="lazy" />
                </motion.span>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
              </div>
              <div className="relative mt-3 min-h-[2.75rem] text-[12px] leading-snug md:text-[13px]">
                {loopLocked ? (
                  <TypewriterText
                    text={step.line}
                    className="text-slate-300"
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
            </motion.article>
          ))}
        </motion.div>

        <FlowStepsOrderGame onCompletedChange={handleLoopCompletedChange} />
      </div>
    </section>
  );
}
