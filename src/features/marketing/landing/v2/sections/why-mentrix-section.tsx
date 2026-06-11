"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import {
  fadeUp,
  slideFromLeft,
  slideFromRight,
  staggerContainer,
  viewportOnce,
  cardHoverLift,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

const WITHOUT_SYSTEM = [
  "You put in hours. Nothing moves. You do not know what broke.",
  "The exam tells you what you missed. Too late to fix it.",
  "Tools answer questions but leave the gap where it was.",
];

const WHY_NOW = [
  "Rank updates after every quest, duel, and session. You always know where you stand.",
  "Guides see your accuracy and weakest concepts before you join. Session starts at the problem.",
  "Honest rank on your public Rank Card. Moves when you work. Stops when you stop.",
];

export function WhyMentrixSection() {
  const { cinematic } = useLandingMotion();

  return (
    <section id="why" className="relative overflow-hidden bg-[#0F172A] py-20 md:py-28">
      <ArenaMeshBackground variant="section" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="font-bold text-white text-[clamp(22px,3.2vw,32px)] tracking-[-0.03em]"
          >
            The worst time to learn what you missed is after the exam.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mt-10 grid gap-5 md:grid-cols-2 lg:gap-8"
        >
          <motion.div
            variants={slideFromLeft}
            custom={0}
            whileHover={cinematic ? cardHoverLift : undefined}
            className={cn(
              "rounded-2xl border border-violet-300/15 bg-slate-950/82 p-5 shadow-xl shadow-black/30 backdrop-blur-md md:p-6",
            )}
          >
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">
              Without Mentrixa
            </p>
            <ul className="space-y-3">
              {WITHOUT_SYSTEM.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-2.5 text-[13px] leading-snug text-slate-100/95"
                >
                  <span className="mt-2 h-px w-6 shrink-0 bg-violet-500/40" aria-hidden />
                  {line}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={slideFromRight}
            custom={0}
            whileHover={cinematic ? cardHoverLift : undefined}
            className="rounded-2xl border border-indigo-300/15 bg-slate-950/82 p-5 shadow-xl shadow-black/30 backdrop-blur-md md:p-6"
          >
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">
              With Mentrixa
            </p>
            <ul className="space-y-3">
              {WHY_NOW.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-2.5 text-[13px] leading-snug text-slate-100/95"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  {line}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
