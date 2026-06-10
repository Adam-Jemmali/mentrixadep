"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";

const WireframeDottedGlobe = dynamic(
  () => import("@/shared/ui/wireframe-dotted-globe").then((m) => m.WireframeDottedGlobe),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto aspect-[17/10] w-full max-w-[680px] animate-pulse rounded-2xl bg-indigo-950/40"
        aria-hidden
      />
    ),
  },
);

const MOTTO =
  "The ranked world for anyone who wants to prove what they know.";

const VISION =
  "Every person trying to get better at something deserves a place to compete and a real expert when the game is not enough.";

export function SocialProofStrip() {
  const reduceMotion = useReducedMotion();
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
      className="relative overflow-hidden border-y border-white/15 bg-slate-950/90 px-4 py-10 backdrop-blur-md sm:px-6 sm:py-14"
    >
      {motionEnabled ? (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_50%,rgba(99,102,241,0.12),transparent_72%)]"
          aria-hidden
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <div className="relative mx-auto max-w-4xl">
        {inView ? (
          <WireframeDottedGlobe
            width={680}
            height={400}
            className="mx-auto w-full max-w-[680px]"
            hideHint
          />
        ) : (
          <div
            className="mx-auto aspect-[17/10] w-full max-w-[680px] rounded-2xl bg-indigo-950/30"
            aria-hidden
          />
        )}

        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 sm:px-8"
          initial={motionEnabled ? { opacity: 0, y: 10 } : false}
          animate={motionEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          <div className="max-w-xl text-center">
            <div
              className="rounded-2xl px-4 py-5 sm:px-6 sm:py-6"
              style={{
                background:
                  "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(15, 10, 30, 0.82) 0%, rgba(15, 10, 30, 0.45) 55%, transparent 100%)",
              }}
            >
              <p className="text-balance text-lg font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] sm:text-xl md:text-[1.35rem]">
                {MOTTO}
              </p>
              <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-slate-200/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-[15px]">
                {VISION}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
