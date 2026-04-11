"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const WITHOUT_SYSTEM = [
  "You spend the same hours studying and get the same result on the next exam.",
  "You keep paying for Chegg, ChatGPT and apps that answer questions but don't fix why you keep asking the same ones.",
  "The exam you're dreading doesn't get easier the longer you wait to start.",
];

const WHY_NOW = [
  "You can book a verified Guide tonight and be in a live session before midnight.",
  "The Quest study pack lands in your account within 10 minutes of the session ending.",
  "Free to create an account. You only pay when you book a session.",
];

export function ThirdSequenceWhyContent() {
  const headingOpacity = 1;
  const leftOpacity = 1;
  const rightOpacity = 1;

  return (
    <section id="why" className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 md:px-8 md:py-14">
      <div className="relative z-10 w-full max-w-7xl">
        <div
          className="mx-auto mb-6 max-w-3xl text-center"
          style={{ opacity: headingOpacity, transform: `translateY(${(1 - headingOpacity) * 16}px)` }}
        >
          <h2 className="text-[clamp(20px,3.2vw,30px)] font-bold tracking-[-0.03em] text-white">Should you join?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[13px] text-cyan-100/95">
            You already feel both sides - here&apos;s the split, so you&apos;re not guessing.
          </p>
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
              "rounded-2xl border border-emerald-300/15 bg-slate-950/82 p-4 md:p-5 shadow-xl shadow-black/30 backdrop-blur-md",
              "transition-all duration-500"
            )}
            style={{ opacity: rightOpacity, transform: `translateY(${(1 - rightOpacity) * 18}px)` }}
          >
            <p className="mb-3 text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-200">If you start now</p>
            <ul className="space-y-3">
              {WHY_NOW.map((line) => (
                <li key={line} className="flex gap-2.5 text-[12px] leading-snug text-slate-100/95 md:text-[13px]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
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
