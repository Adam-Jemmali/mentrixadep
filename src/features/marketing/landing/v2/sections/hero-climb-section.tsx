"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import { HeroPremiumChrome } from "@/features/marketing/landing/v2/backgrounds/hero-premium-chrome";
import { HeroAmbientLayer } from "@/features/marketing/landing/v2/backgrounds/hero-ambient-layer";
import { HeroHeadline } from "@/features/marketing/landing/v2/sections/hero-headline";
import { LandingShimmerButton } from "@/features/marketing/landing/v2/motion/landing-shimmer-button";
import { fadeUp, staggerContainer } from "@/features/marketing/landing/v2/motion/landing-motion";
import { HeroScrollCue } from "@/features/marketing/landing/v2/hero/hero-scroll-cue";

const HeroRankStage = dynamic(
  () => import("@/features/marketing/landing/v2/hero/hero-rank-stage").then((m) => m.HeroRankStage),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[min(360px,72vw)] w-full max-w-[520px] rounded-2xl border border-white/10 bg-slate-950/40"
        aria-hidden
      />
    ),
  },
);

const ICON_VERSION = "20260410";

function RoleIcon({ role, className = "" }: { role: "mentrixer" | "guide"; className?: string }) {
  return (
    <span className={cn("relative inline-block size-4 shrink-0", className)} aria-hidden>
      <Image
        src={role === "mentrixer" ? `/icons/mentrixer.svg?v=${ICON_VERSION}` : `/icons/guide.svg?v=${ICON_VERSION}`}
        alt=""
        width={16}
        height={16}
        unoptimized
        className="size-full object-contain"
        sizes="16px"
      />
    </span>
  );
}

export function HeroClimbSection() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/auth/signup");
    router.prefetch("/auth/signup?role=tutor");
    router.prefetch("/try");
  }, [router]);

  return (
    <section id="hero" className="lp-hero-premium relative min-h-[100dvh] overflow-hidden bg-arena-bg">
      <ArenaMeshBackground variant="hero" />
      <HeroPremiumChrome />
      <HeroAmbientLayer />
      <HeroScrollCue />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[88rem] flex-col justify-center px-4 pb-12 pt-24 sm:px-6 lg:px-10 lg:pb-16 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 xl:gap-16">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
          

          

            <HeroHeadline className="text-balance font-black italic tracking-[-0.04em] text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.55)] text-[clamp(2.35rem,6.8vw,4.25rem)] leading-[1.02]" />

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-300/95 sm:text-base lg:mx-0"
            >
              Mentrixa is a public ranked arena. Compete daily. See what breaks. Fix it with a
              verified expert.$39 when you need a breakthrough.
            </motion.p>

          

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <LandingShimmerButton href="/auth/signup" variant="primary" className="lp-cta-pulse">
                Prove what you know →
              </LandingShimmerButton>
              <LandingShimmerButton href="/try" variant="secondary">
                Watch how it works ↓
              </LandingShimmerButton>
              <LandingShimmerButton href="/auth/signup?role=tutor" variant="ghost">
                <RoleIcon role="guide" className="brightness-0 invert" />
                Earn from what you know →
              </LandingShimmerButton>
            </motion.div>

            <motion.p
              variants={fadeUp}
              custom={4}
              className="mt-4 text-center text-[11px] font-medium text-slate-500 lg:text-left"
            >
              Free forever. No card until you book a Guide. Accuracy improves or the session is free.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
            className="flex w-full items-center justify-center lg:justify-end"
          >
            <HeroRankStage />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
