"use client";

import { cn } from "@/shared/core/utils";
import { Check } from "lucide-react";

const WITHOUT_SYSTEM = [
  "Keep searching for answers",
  "Keep forgetting them",
  "Keep starting over",
];

const WHY_NOW = [
  "Build understanding that sticks",
  "Get and give guidance that actually adapts",
  "Turn every session into momentum",
];

export function ThirdSequenceWhyContent() {
  const headingOpacity = 1;
  const leftOpacity = 1;
  const rightOpacity = 1;

  return (
    <section id="why" className="relative flex min-h-[82vh] items-center justify-center overflow-hidden px-5 py-8 md:px-8 md:py-10">
      <div className="relative z-10 w-full max-w-7xl">
        <div
          className="mx-auto mb-6 max-w-3xl text-center"
          style={{ opacity: headingOpacity, transform: `translateY(${(1 - headingOpacity) * 16}px)` }}
        >
          <h2 className="text-[clamp(20px,3.2vw,30px)] font-bold tracking-[-0.03em] text-white">Should you join?</h2>
         
        </div>

        <div className="grid items-start gap-5 md:gap-6 lg:grid-cols-[1fr_0.8fr_1fr]">
          <div
            className={cn(
              "rounded-2xl border border-violet-300/15 bg-slate-950/82 p-4 md:p-5 shadow-xl shadow-black/30 backdrop-blur-md",
              "transition-all duration-500"
            )}
            style={{ opacity: leftOpacity, transform: `translateY(${(1 - leftOpacity) * 18}px)` }}
          >
            <p className="mb-3 text-[10px] font-bold tracking-[0.2em] uppercase text-violet-200">If nothing changes</p>
            <ul className="space-y-3">
              {WITHOUT_SYSTEM.map((line) => (
                <li key={line} className="flex gap-2.5 text-[12px] leading-snug text-slate-100/95 md:text-[13px]">
                  <span className="mt-2 h-px w-6 shrink-0 bg-violet-500/40" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden lg:block" aria-hidden />

          <div
            className={cn(
              "rounded-2xl border border-blue-300/15 bg-slate-950/82 p-4 md:p-5 shadow-xl shadow-black/30 backdrop-blur-md",
              "transition-all duration-500"
            )}
            style={{ opacity: rightOpacity, transform: `translateY(${(1 - rightOpacity) * 18}px)` }}
          >
            <p className="mb-3 text-[10px] font-bold tracking-[0.2em] uppercase text-blue-200">If you start now</p>
            <ul className="space-y-3">
              {WHY_NOW.map((line) => (
                <li key={line} className="flex gap-2.5 text-[12px] leading-snug text-slate-100/95 md:text-[13px]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
