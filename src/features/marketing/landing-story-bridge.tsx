"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { SparklesCore } from "@/shared/ui/sparkles";
import { fadeUp, staggerContainer } from "@/features/marketing/landing/v2/motion/landing-motion";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";

type Props = {
  chapter: string;
  title: string;
  subtitle: string;
};

export function LandingStoryBridge({ chapter, title, subtitle }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const { cinematic } = useLandingMotion();

  return (
    <section
      ref={ref}
      className="lp-section-tilt relative flex min-h-[28vh] items-center justify-center overflow-hidden border-y border-white/10 bg-[radial-gradient(70%_120%_at_50%_50%,rgba(56,189,248,0.2)_0%,rgba(15,23,42,0.88)_65%,rgba(2,6,23,0.98)_100%)] px-6 py-12"
      aria-label={`${chapter} transition`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[url('/mentrixalogo/logo.webp')] bg-[length:108px_108px] bg-repeat opacity-[0.055]" />

      {cinematic ? (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <SparklesCore
              id={`sparkles-${chapter.replace(/\s+/g, "-")}`}
              background="transparent"
              minSize={0.4}
              maxSize={1.2}
              particleDensity={48}
              className="h-full w-full"
              particleColor="#60A5FA"
              speed={0.9}
            />
          </motion.div>
          <motion.div
            className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={inView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          />
        </>
      ) : null}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="relative z-10 mx-auto max-w-3xl text-center"
      >
        <motion.p
          variants={fadeUp}
          custom={0}
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/85"
        >
          {chapter}
        </motion.p>
        <motion.h3
          variants={fadeUp}
          custom={1}
          className={cn(
            "mt-3 font-black tracking-[-0.03em] text-white text-[clamp(22px,3.6vw,36px)]",
          )}
        >
          {title}
        </motion.h3>
        <motion.p
          variants={fadeUp}
          custom={2}
          className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-100/95"
        >
          {subtitle}
        </motion.p>
      </motion.div>
    </section>
  );
}
