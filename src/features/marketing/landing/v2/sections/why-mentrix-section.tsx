"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  slideFromLeft,
  slideFromRight,
  staggerContainer,
  viewportOnce,
  cardHoverLift,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import {
  LandingSectionHeader,
  LandingSectionShell,
  LandingStickyCard,
} from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_WHY } from "@/features/marketing/landing/landing-copy-pure";

export function WhyMentrixSection() {
  const { cinematic } = useLandingMotion();

  return (
    <LandingSectionShell id="why">
      <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerContainer}>
        <LandingSectionHeader title={LANDING_WHY.title} />
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
        className="mt-10 grid gap-5 md:grid-cols-2 lg:gap-8"
      >
        <motion.div variants={slideFromLeft} custom={0} whileHover={cinematic ? cardHoverLift : undefined}>
          <LandingStickyCard rotate variant="dog-ear" className="rotate-[-0.6deg]">
            <p className={landingHub.eyebrow}>{LANDING_WHY.withoutEyebrow}</p>
            <ul className="mt-4 space-y-3">
              {LANDING_WHY.without.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-2.5 ${landingHub.body}`}
                >
                  <span className="mt-2 h-px w-6 shrink-0 bg-[#6366F1]/50" aria-hidden />
                  {line}
                </motion.li>
              ))}
            </ul>
          </LandingStickyCard>
        </motion.div>

        <motion.div variants={slideFromRight} custom={0} whileHover={cinematic ? cardHoverLift : undefined}>
          <LandingStickyCard rotate={false} variant="taped" className="rotate-[0.5deg]">
            <p className={landingHub.eyebrow}>{LANDING_WHY.withEyebrow}</p>
            <ul className="mt-4 space-y-3">
              {LANDING_WHY.with.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-2.5 ${landingHub.body}`}
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6366F1]" />
                  {line}
                </motion.li>
              ))}
            </ul>
          </LandingStickyCard>
        </motion.div>
      </motion.div>
    </LandingSectionShell>
  );
}
