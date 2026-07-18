"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeroHeadline } from "@/features/marketing/landing/v2/sections/hero-headline";
import { LandingShimmerButton } from "@/features/marketing/landing/v2/motion/landing-shimmer-button";
import { HeroScrollCue } from "@/features/marketing/landing/v2/hero/hero-scroll-cue";
import { LANDING_HERO } from "@/features/marketing/landing/landing-copy-pure";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingStickyGameNote } from "@/features/marketing/landing/ui/landing-sticky-note";
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
    router.prefetch(LANDING_HERO.arenaHref);
  }, [router]);

  return (
    <section id="hero" className="relative min-h-[100dvh] overflow-hidden">
      <HeroScrollCue />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[88rem] flex-col justify-center px-4 pb-12 pt-24 sm:px-6 lg:px-10 lg:pb-16 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 xl:gap-16">
          <div className={`${landingHub.notebookCard} lp-hero-notebook lp-hero-line text-center lg:text-left`}>
            <HeroHeadline className={landingHub.titleHero} />

            <p className={`lp-hero-line lp-hero-line-delay-1 mt-4 text-center lg:text-left ${landingHub.bodySm}`}>
              {LANDING_HERO.arenaLine}{" "}
              <Link
                href={LANDING_HERO.arenaHref}
                className="font-semibold text-[#7C3AED] underline-offset-2 hover:text-[#6D28D9] hover:underline"
              >
                {LANDING_HERO.arenaLink}
              </Link>
            </p>

            <div className="lp-hero-line lp-hero-line-delay-2 mt-9 flex justify-center lg:justify-start">
              <LandingShimmerButton href="/try" variant="primary" className="lp-cta-pulse">
                {LANDING_HERO.cta}
              </LandingShimmerButton>
            </div>

            <p className={`lp-hero-line lp-hero-line-delay-3 mt-6 text-center lg:text-left ${landingHub.bodySm}`}>
              {LANDING_HERO.footnote}
            </p>
          </div>

          <div className="lp-hero-stage flex w-full items-center justify-center lg:justify-end">
            <LandingStickyGameNote variant="pinned" className="rotate-[0.35deg]">
              <HeroRankStage />
            </LandingStickyGameNote>
          </div>
        </div>
      </div>
    </section>
  );
}
