"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/ui/tilt-card";
import { useSectionScrollProgress } from "@/lib/landing-perf";

const FLOW_STEPS = [
  {
    number: "01",
    icon: "/images/book.webp",
    title: "Book",
    line: " Search your course. Pick a verified Guide. Choose a slot. Pay.",
    hoverColor: "hover:bg-indigo-500/20",
  },
  {
    number: "02",
    icon: "/images/live.webp",
    title: "Meet",
    line: " Show up live. Screen share your problem. Your Guide works through it with you in real time. Not a lecture. A solution.",
    hoverColor: "hover:bg-violet-500/20",
  },
  {
    number: "03",
    icon: "/images/package.webp",
    title: "Unpack",
    line: " 1 second after you hang up, Quest drops your custom study pack.",
    hoverColor: "hover:bg-purple-500/20",
  },
  {
    number: "04",
    icon: "/images/xp.webp",
    title: "Climb",
    line: " You drill with Quest, compete in duels, climb your division. Progress compounds. You are not the same student you were before the first session.",
    hoverColor: "hover:bg-indigo-500/20",
  },
];

export function FourthStaticFlowContent() {
  const progress = useSectionScrollProgress("fourthseq", 0.015);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const update = () => setIsMobileViewport(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const effectiveProgress = isMobileViewport ? 1 : progress;
  const headingOpacity = Math.min(1, Math.max(0.14, effectiveProgress * 1.15));
  const cardsOpacity = Math.min(1, Math.max(0.1, (effectiveProgress - 0.06) * 1.28));

  return (
    <section id="flow" className="relative flex min-h-screen items-center justify-center px-5 py-10 md:px-8 md:py-12">
      <div className="absolute inset-0 bg-slate-950/55" aria-hidden />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col">
        <div
          className="mx-auto mb-5 max-w-3xl text-center"
          style={{ opacity: headingOpacity, transform: `translateY(${(1 - headingOpacity) * 16}px)` }}
        >
          <h2 className="text-[clamp(22px,3.2vw,34px)] font-bold leading-tight tracking-[-0.03em] text-white">
            From confused to prepared. 4 steps.
          </h2>
        </div>

        <div className="grid flex-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step, i) => (
            <TiltCard
              key={step.title}
              className={cn(
                "h-full rounded-2xl border border-white/10 bg-slate-950/82 p-3.5 text-left shadow-xl shadow-black/30 backdrop-blur-md",
                "transform-gpu transition-all duration-500 ease-out hover:-rotate-1 hover:scale-[1.03] hover:shadow-2xl",
                step.hoverColor,
                cardsOpacity < 0.2 ? "pointer-events-none" : ""
              )}
              style={{
                opacity: cardsOpacity,
                transform: `translateY(${(1 - cardsOpacity) * 18}px)`,
                transitionDelay: `${i * 70}ms`,
              }}
            >
              <div
                className={cn(
                  "mb-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                  "border-white/25 bg-slate-900/80",
                  "max-lg:border-slate-200 max-lg:bg-white max-lg:shadow-md max-lg:ring-1 max-lg:ring-black/10",
                )}
              >
                <Image
                  src={step.icon}
                  alt=""
                  width={20}
                  height={20}
                  className={cn(
                    "object-contain brightness-0 invert",
                    "max-lg:brightness-100 max-lg:invert-0 max-lg:drop-shadow-sm",
                  )}
                />
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-300">{step.number}</p>
              <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
              <p className="mt-1.5 text-[12px] leading-snug text-slate-100/95 md:text-[13px]">{step.line}</p>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
