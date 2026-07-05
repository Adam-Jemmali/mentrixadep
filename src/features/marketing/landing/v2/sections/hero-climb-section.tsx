"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { HeroHeadline } from "@/features/marketing/landing/v2/sections/hero-headline";
import { LandingShimmerButton } from "@/features/marketing/landing/v2/motion/landing-shimmer-button";
import { fadeUp, staggerContainer } from "@/features/marketing/landing/v2/motion/landing-motion";
import { HeroScrollCue } from "@/features/marketing/landing/v2/hero/hero-scroll-cue";
import { LANDING_HERO } from "@/features/marketing/landing/landing-copy-pure";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { Skeleton } from "@/shared/ui/skeleton";

const HeroRankStage = dynamic(
  () => import("@/features/marketing/landing/v2/hero/hero-rank-stage").then((m) => m.HeroRankStage),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        tone="light"
        className="mx-auto h-[min(380px,72vw)] w-full max-w-[28rem] rounded-lg border border-[#C4B5FD]"
        aria-hidden
      />
    ),
  },
);

export function HeroClimbSection() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/auth/signup");
    router.prefetch("/try");
  }, [router]);

  return (
    <section id="hero" className="relative min-h-[100dvh] overflow-hidden">
      <HeroScrollCue />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[88rem] flex-col justify-center px-4 pb-12 pt-24 sm:px-6 lg:px-10 lg:pb-16 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 xl:gap-16">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className={`${landingHub.notebookCard} text-center lg:text-left`}
          >
            <HeroHeadline className={landingHub.titleHero} />

            <motion.div
              variants={fadeUp}
              custom={2}
              className="mt-9 flex justify-center lg:justify-start"
            >
              <LandingShimmerButton href="/try" variant="primary" className="lp-cta-pulse">
                {LANDING_HERO.cta}
              </LandingShimmerButton>
            </motion.div>

            <motion.p
              variants={fadeUp}
              custom={3}
              className={`mt-6 text-center lg:text-left ${landingHub.bodySm}`}
            >
              {LANDING_HERO.footnote}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
            className="flex w-full items-center justify-center lg:justify-end"
          >
            <div className={`${landingHub.stickyGameNote} rotate-[0.35deg]`}>
              <HeroRankStage />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
