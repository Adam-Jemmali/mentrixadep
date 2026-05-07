"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSectionScrollProgress } from "@/lib/landing-perf";

const OUTCOME_LINES = [
  "Within 10 minutes of every session, Quest drops your summary, flashcards, and practice problems.",
  "Your Quest practice drills are built from your session, not recycled problems.",
  "Sessions, quests, duels, and your division rank all live in one place. One login. One place to become the best Mentrixer.",
  "Guides set their rate ($15-$60 CAD per session). Stripe pays them automatically after every session.",
];

export function SecondSequenceOutcomeContent() {
  const progress = useSectionScrollProgress("secondseq", 0.015);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const update = () => setIsMobileViewport(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const effectiveProgress = isMobileViewport ? 1 : progress;
  const headingOpacity = Math.min(1, Math.max(0.1, effectiveProgress * 1.2));
  const leftOpacity = Math.min(1, Math.max(0.05, (effectiveProgress - 0.06) * 1.35));
  const rightOpacity = Math.min(1, Math.max(0.05, (effectiveProgress - 0.12) * 1.35));

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden pt-14 pb-8 md:pt-16 md:pb-10 lg:pt-18 lg:pb-10">
      <div className="relative z-10 w-full px-5">
        <div
          className="mx-auto max-w-6xl text-center"
          style={{ opacity: headingOpacity, transform: `translateY(${(1 - headingOpacity) * 16}px)` }}
        >
          <p className="mb-5 text-[10px] font-bold tracking-[0.2em] uppercase text-white md:mb-6">
            Here is exactly what you get.
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-7xl items-start gap-4 lg:grid-cols-[1fr_0.6fr_1fr] lg:gap-6">
          <div
            className="space-y-3"
            style={{ opacity: leftOpacity, transform: `translateY(${(1 - leftOpacity) * 18}px)` }}
          >
            {OUTCOME_LINES.slice(0, 2).map((line, i) => (
              <div
                key={line}
                className={cn(
                  "rounded-2xl border border-violet-200/25 bg-slate-950/78 p-3.5 text-left shadow-lg shadow-black/20 backdrop-blur-sm",
                  "transition-all duration-500"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <p className="text-[12px] md:text-[13px] text-white leading-snug">{line}</p>
              </div>
            ))}
          </div>

          <div className="hidden lg:block" aria-hidden />

          <div
            className="space-y-3"
            style={{ opacity: rightOpacity, transform: `translateY(${(1 - rightOpacity) * 18}px)` }}
          >
            {OUTCOME_LINES.slice(2).map((line, i) => (
              <div
                key={line}
                className={cn(
                  "rounded-2xl border border-cyan-200/25 bg-slate-950/78 p-3.5 text-left shadow-lg shadow-black/20 backdrop-blur-sm",
                  "transition-all duration-500"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <p className="text-[12px] md:text-[13px] text-white leading-snug">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
