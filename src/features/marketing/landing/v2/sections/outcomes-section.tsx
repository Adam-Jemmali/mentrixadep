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

const OUTCOME_LINES = [
  "Ten minutes after every call, Quest builds your summary, flashcards, and drills from that session.",
  "Quest drills the concept your accuracy keeps dropping on. Not random practice.",
  "One account. AP Calculus AB skill tree, leaderboard, and Guide pool.",
  "Guides set rates. Stripe pays when the call ends. No invoices.",
];

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
        <LandingSectionHeader eyebrow="What you get" title="Verified proof, not practice theater." />
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
        className="mx-auto mt-10 grid gap-4 sm:grid-cols-2 lg:gap-5"
      >
        {OUTCOME_LINES.map((line, i) => (
          <motion.div
            key={line}
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
              <p className={landingHub.body}>{line}</p>
            </LandingStickyCard>
          </motion.div>
        ))}
      </motion.div>
    </LandingSectionShell>
  );
}
