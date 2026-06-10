"use client";

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

const OUTCOME_LINES = [
  "Within 10 minutes of every live session, Quest generates your summary, flashcards, and practice drills from that exact call. Not templates. Not generic. Yours.",
  "Quest reads your performance data and drills the specific concept you keep missing. Not a textbook chapter. The exact gap the data found.",
  "Every skill you add gets its own division, its own leaderboard, and its own Guide pool. One account. Unlimited subjects. The rank follows you.",
  "Guides set their own rate between $15 and $60 CAD. You see the full price before you book. Stripe pays them the moment the session ends. No invoicing. No waiting. No surprises.",
];

export function OutcomesSection() {
  const { cinematic } = useLandingMotion();

  return (
    <section id="outcomes" className="relative overflow-hidden bg-arena-bg py-20 md:py-28">
      <ArenaMeshBackground variant="section" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.p variants={fadeUp} custom={0} className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
            The offer, clearly
          </motion.p>
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
              className={cn(
                "lp-feature-3d cursor-default rounded-2xl border border-white/10 bg-slate-950/78 p-4 shadow-lg shadow-black/25 backdrop-blur-md md:p-5",
                i % 2 === 0 ? "border-violet-300/20" : "border-cyan-300/20",
              )}
            >
              <motion.span
                className="mb-2 inline-block h-1 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={viewportOnce}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ originX: 0 }}
              />
              <p className="text-[13px] leading-snug text-slate-100 md:text-sm">{line}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
