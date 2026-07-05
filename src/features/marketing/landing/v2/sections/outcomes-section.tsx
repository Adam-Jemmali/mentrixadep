"use client";

import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
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
import { LANDING_OUTCOMES } from "@/features/marketing/landing/landing-copy-pure";

export function OutcomesSection() {
  const { cinematic } = useLandingMotion();

  return (
    <LandingSectionShell id="outcomes">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
      >
        <LandingSectionHeader eyebrow={LANDING_OUTCOMES.eyebrow} title={LANDING_OUTCOMES.title} />
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
        className="mx-auto mt-10 grid gap-4 sm:grid-cols-2 lg:gap-5"
      >
        {LANDING_OUTCOMES.items.map((item, i) => (
          <motion.div
            key={item.word}
            variants={i % 2 === 0 ? slideFromLeft : slideFromRight}
            custom={Math.floor(i / 2)}
            whileHover={cinematic ? cardHoverLift : undefined}
          >
            <LandingStickyCard rotate={i % 2 === 0} className={cn("cursor-default", i % 2 === 1 && "rotate-[0.5deg]")}>
              <motion.span
                className="mb-2 inline-block h-1 w-8 rounded-full bg-[#6366F1]"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={viewportOnce}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ originX: 0 }}
              />
              <p className={landingHub.eyebrow}>{item.word}</p>
              <p className={`mt-2 ${landingHub.body}`}>{item.sentence}</p>
            </LandingStickyCard>
          </motion.div>
        ))}
      </motion.div>
    </LandingSectionShell>
  );
}
