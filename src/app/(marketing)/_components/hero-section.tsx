"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { gsap } from "@/shared/core/gsap";
import { useReducedMotion } from "@/shared/animation/motion";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { HeroArenaPreview } from "@/app/(marketing)/_components/hero-arena-preview";
import { LandingBackground } from "@/app/(marketing)/_components/landing-background";
import { cn } from "@/shared/core/utils";

type HeroSectionProps = {
  initialEvents: LiveBoardEventRow[];
  leaders: ArenaLeaderProfile[];
  todayCount: number;
};

export function HeroSection({ initialEvents, leaders, todayCount }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const root = sectionRef.current;
    if (!root) return;

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(root.querySelector(".hero-eyebrow"), { y: -12, opacity: 0, duration: 0.4 })
      .from(root.querySelector(".hero-h1-line-1"), { y: 20, opacity: 0, duration: 0.55 }, "-=0.15")
      .from(root.querySelector(".hero-h1-line-2"), { y: 20, opacity: 0, duration: 0.55 }, "-=0.35")
      .from(root.querySelector(".hero-subtext"), { y: 12, opacity: 0, duration: 0.4 }, "-=0.2")
      .from(
        root.querySelector(".hero-cta-primary"),
        { y: 8, opacity: 0, scale: 0.97, duration: 0.35 },
        "-=0.15",
      )
      .from(root.querySelector(".hero-cta-secondary"), { y: 8, opacity: 0, duration: 0.3 }, "-=0.2")
      .from(
        root.querySelector(".hero-arena-card"),
        { x: 24, opacity: 0, rotate: 0, duration: 0.65, ease: "back.out(1.4)" },
        "-=0.4",
      );

    return () => {
      tl.kill();
    };
  }, [reduce]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[var(--surface-base)] pt-14"
    >
      <LandingBackground />

      <div className="relative z-10 mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[55fr_45fr] lg:gap-12 lg:py-20">
        <div className="max-w-xl">
          <p
            className={cn(
              "hero-eyebrow inline-flex rounded-full px-3 py-1.5",
              "bg-[var(--mx-violet)]/10 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mx-violet)]",
            )}
          >
            Live skill proof · Calculus AB open
          </p>

          <h1
            className="mt-6 font-sans font-bold leading-[1.05] text-white"
            style={{ fontSize: "clamp(38px, 5vw, 64px)" }}
            aria-label="Sports have live boards. Learning never did."
          >
            <span className="hero-h1-line-1 block">Sports have live boards.</span>
            <span className="hero-h1-line-2 block">Learning never did.</span>
          </h1>

          <p className="hero-subtext mt-5 max-w-[440px] text-base leading-relaxed text-white/60">
            The first time you answer here, that answer is permanent. No retries. No inflation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/try"
              prefetch={false}
              className={cn(
                "hero-cta-primary inline-flex items-center justify-center gap-2 rounded-full",
                "bg-[var(--mx-violet)] px-6 py-3 text-sm font-bold text-white",
                "transition-colors hover:bg-[var(--mx-primary-hover)]",
              )}
            >
              Find out what you don&apos;t know
              <IconArrowRight size={16} stroke={2.2} aria-hidden />
            </Link>
            <Link
              href="/auth/signup?role=tutor"
              prefetch={false}
              className={cn(
                "hero-cta-secondary inline-flex items-center justify-center rounded-full",
                "border border-white/15 px-6 py-3 text-sm font-semibold text-white/70",
                "transition-colors hover:border-white/25 hover:text-white",
              )}
            >
              Teach on Mentrixa
            </Link>
          </div>
        </div>

        <HeroArenaPreview
          initialEvents={initialEvents}
          leaders={leaders}
          todayCount={todayCount}
          className="w-full lg:justify-self-end"
        />
      </div>
    </section>
  );
}
