"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { Skeleton } from "@/shared/ui/skeleton";
import { LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";

const WireframeDottedGlobe = dynamic(
  () => import("@/shared/ui/wireframe-dotted-globe").then((m) => m.WireframeDottedGlobe),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        tone="light"
        className="mx-auto aspect-[17/10] w-full max-w-[680px] rounded-lg border border-[#C4B5FD]"
        aria-hidden
      />
    ),
  },
);

import { LANDING_SOCIAL } from "@/features/marketing/landing/landing-copy-pure";

export function SocialProofStrip() {
  const reduceMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const id = requestAnimationFrame(() => setMotionReady(true));
    return () => cancelAnimationFrame(id);
  }, [inView]);

  const motionEnabled = motionReady && reduceMotion !== true;

  return (
    <section
      ref={sectionRef}
      aria-label="Mentrixa vision"
      className={`${landingHub.sectionTight} px-4 sm:px-6`}
    >
      <div className="relative mx-auto max-w-4xl">
        {inView ? (
          <WireframeDottedGlobe
            width={680}
            height={400}
            className="mx-auto w-full max-w-[680px] opacity-90"
            hideHint
          />
        ) : (
          <div
            className="mx-auto aspect-[17/10] w-full max-w-[680px] rounded-lg border border-dashed border-[#C4B5FD] bg-[#EDE9FE]/40"
            aria-hidden
          />
        )}

        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 sm:px-8"
          initial={motionEnabled ? { opacity: 0, y: 10 } : false}
          animate={motionEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          <LandingStickyCard rotate={false} className="pointer-events-auto max-w-xl rotate-[0.25deg] px-5 py-6 text-center sm:px-7">
            <p className={landingHub.stickyWord}>{LANDING_SOCIAL.word}</p>
            <p className={`mx-auto mt-3 max-w-lg text-balance text-lg font-semibold leading-snug sm:text-xl ${landingHub.body}`}>
              {LANDING_SOCIAL.sentence}
            </p>
          </LandingStickyCard>
        </motion.div>
      </div>
    </section>
  );
}
