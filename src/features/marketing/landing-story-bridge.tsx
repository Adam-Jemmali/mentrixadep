"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { fadeUp, staggerContainer } from "@/features/marketing/landing/v2/motion/landing-motion";

type Props = {
  chapter: string;
  title: string;
  subtitle: string;
};

export function LandingStoryBridge({ chapter, title, subtitle }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <section
      ref={ref}
      className="relative flex min-h-[22vh] items-center justify-center overflow-hidden px-6 py-10 md:py-12"
      aria-label={`${chapter} transition`}
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="relative z-10 mx-auto max-w-3xl"
      >
        <motion.div
          variants={fadeUp}
          custom={0}
          className={cn(
            landingHub.stickyCard,
            "mx-auto max-w-2xl rotate-[0.4deg] px-5 py-6 text-center sm:px-7 sm:py-7",
          )}
        >
          <p className={landingHub.eyebrow}>{chapter}</p>
          <h3 className={cn(landingHub.title, "mt-3")}>{title}</h3>
          <p className={cn(landingHub.body, "mx-auto mt-3 max-w-xl")}>{subtitle}</p>
        </motion.div>
      </motion.div>
    </section>
  );
}
