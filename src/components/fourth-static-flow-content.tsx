"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/ui/tilt-card";

const FLOW_STEPS = [
  {
    number: "01",
    icon: "/images/book.png",
    title: "Book",
    line: "Book — Search your course. Pick a verified Guide. Choose a slot. Pay. 3 minutes from now you have a session scheduled.",
    hoverColor: "hover:bg-cyan-500/20",
  },
  {
    number: "02",
    icon: "/images/live.png",
    title: "Meet",
    line: "Meet — Show up live. Screen share your problem. Your Guide works through it with you in real time. Not a lecture. A solution.",
    hoverColor: "hover:bg-violet-500/20",
  },
  {
    number: "03",
    icon: "/images/package.png",
    title: "Unpack",
    line: "Unpack — 1 second after you hang up, Quest drops your custom study pack. It is waiting in your account every time you come back to it.",
    hoverColor: "hover:bg-emerald-500/20",
  },
  {
    number: "04",
    icon: "/images/xp.png",
    title: "Climb",
    line: "Climb — You drill with Quest, compete in duels, climb your division. Progress compounds. You are not the same student you were before the first session.",
    hoverColor: "hover:bg-cyan-500/20",
  },
];

function useSectionProgress(sectionId: string) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(section.scrollHeight - window.innerHeight, 1);
      const next = Math.min(Math.max(-rect.top / scrollable, 0), 1);
      setProgress(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sectionId]);

  return progress;
}

export function FourthStaticFlowContent() {
  const progress = useSectionProgress("fourthseq");
  const headingOpacity = Math.min(1, Math.max(0.14, progress * 1.15));
  const cardsOpacity = Math.min(1, Math.max(0.1, (progress - 0.06) * 1.28));

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
              title={step.title}
              hoverColor={step.hoverColor}
              className={cn(
                "h-full rounded-2xl border border-white/10 bg-slate-950/82 p-3.5 text-left shadow-xl shadow-black/30 backdrop-blur-md",
                "transform-gpu transition-all duration-500 ease-out hover:-rotate-1 hover:scale-[1.03] hover:shadow-2xl",
                cardsOpacity < 0.2 ? "pointer-events-none" : ""
              )}
              style={{
                opacity: cardsOpacity,
                transform: `translateY(${(1 - cardsOpacity) * 18}px)`,
                transitionDelay: `${i * 70}ms`,
              }}
            >
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-slate-900/80">
                <Image src={step.icon} alt="" width={20} height={20} className="object-contain brightness-0 invert" />
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200">{step.number}</p>
              <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
              <p className="mt-1.5 text-[12px] leading-snug text-slate-100/95 md:text-[13px]">{step.line}</p>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
