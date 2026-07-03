"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/core/utils";
import { useSectionScrollProgress } from "@/features/marketing/landing-perf";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import {
  CANONICAL_BOOKING_ICON,
  CANONICAL_BRIEF_ICON,
  CANONICAL_DUELS_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_SESSION_ICON,
} from "@/shared/icons/vocab-canonical";

const FEATURE_ITEMS: Array<{
  title: string;
  vocabIcon: VocabIconName;
  hoverColor: string;
  body: string;
  priority?: boolean;
}> = [
  {
    title: "Live sessions",
    vocabIcon: CANONICAL_SESSION_ICON,
    hoverColor: "hover:bg-indigo-500/20",
    body: "A real expert on your exact course, live on screen, while the problem is still fresh. Not a chatbot. Not a YouTube video.",
    priority: true,
  },
  {
    title: "Practice quests",
    vocabIcon: CANONICAL_QUEST_ICON,
    hoverColor: "hover:bg-violet-500/20",
    body: "Quest generates practice problems from your actual session. Not generic. Not a textbook chapter.",
  },
  {
    title: "Skill duels",
    vocabIcon: CANONICAL_DUELS_ICON,
    hoverColor: "hover:bg-purple-500/20",
    body: "Head-to-head quizzes against other students in your subject. If you can beat them under pressure, you can beat the exam question on paper.",
  },
  {
    title: "Divisions & XP",
    vocabIcon: "xp",
    hoverColor: "hover:bg-indigo-500/20",
    body: "Every session, quest, and duel earns XP. You rank in your subject's division. When you can see you're improving, you don't stop.",
  },
  {
    title: "Instant booking",
    vocabIcon: CANONICAL_BOOKING_ICON,
    hoverColor: "hover:bg-violet-500/20",
    body: "You land a time without the scheduling thread - the real cost was always the messages before the calendar opened.",
  },
  {
    title: "Session packages",
    vocabIcon: CANONICAL_BRIEF_ICON,
    hoverColor: "hover:bg-purple-500/20",
    body: "You walk away with something you can reopen - the call fades; your summaries, cards, and follow-ups do not.",
  },
];

export function ThirdStaticFeaturesContent() {
  const progress = useSectionScrollProgress("thirdstatic", 0.015);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const update = () => setIsMobileViewport(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const effectiveProgress = isMobileViewport ? 1 : progress;
  const headingOpacity = Math.min(1, Math.max(0.15, effectiveProgress * 1.15));
  const cardsOpacity = Math.min(1, Math.max(0.1, (effectiveProgress - 0.08) * 1.25));

  return (
    <section id="thirdstatic" className="relative h-[190vh]">
      <div id="features" className="sticky top-0 h-screen w-full overflow-hidden">
        {/* `fill` image must sit under a positioned (non-sticky) parent; keep copy in the same layer so it isn't pushed below the fold. */}
        <div className="relative isolate h-full w-full">
          <Image
            src="/sequences-webp/3rdstatic.webp"
            alt="Mentrixa features overview"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/50" aria-hidden />

          <div className="relative z-10 flex h-full w-full flex-col px-5 py-12 md:px-8 md:py-14">
            <div
              className="mx-auto max-w-6xl"
              style={{ opacity: headingOpacity, transform: `translateY(${(1 - headingOpacity) * 18}px)` }}
            >
              <h2 className="text-center font-bold text-white text-[clamp(22px,3.4vw,34px)] tracking-[-0.03em] leading-tight">
                6 things in 1 place. 0 overlap with what you already pay for.
              </h2>
            </div>

            <div className="mx-auto mt-5 grid min-h-0 flex-1 max-w-7xl grid-rows-1 items-start gap-4 lg:grid-cols-[1fr_0.85fr_1fr]">
              <div className="space-y-3 lg:max-h-[68vh] lg:overflow-y-auto lg:pr-1" style={{ opacity: cardsOpacity, transform: `translateY(${(1 - cardsOpacity) * 20}px)` }}>
                {FEATURE_ITEMS.slice(0, 3).map((item, i) => (
                  <article
                    key={item.title}
                    className={cn(
                      "rounded-2xl border border-white/10 bg-slate-950/82 p-3.5 text-white shadow-xl shadow-black/30 backdrop-blur-md",
                      "transform-gpu transition-all duration-500 ease-out hover:-rotate-1 hover:scale-[1.03] hover:shadow-2xl",
                      item.hoverColor
                    )}
                    style={{ transitionDelay: `${i * 70}ms` }}
                  >
                    <div
                      className={cn(
                        "mb-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                        "border-white/25 bg-slate-900/80",
                        "max-lg:border-slate-200 max-lg:bg-white max-lg:shadow-md max-lg:ring-1 max-lg:ring-black/10",
                      )}
                    >
                      <MentrixaVocabIcon
                        name={item.vocabIcon}
                        size={20}
                        surface="dark"
                        title={item.title}
                      />
                    </div>
                    <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-snug text-slate-100/95">{item.body}</p>
                  </article>
                ))}
              </div>

              <div className="hidden lg:block" aria-hidden />

              <div className="space-y-3 lg:max-h-[68vh] lg:overflow-y-auto lg:pr-1" style={{ opacity: cardsOpacity, transform: `translateY(${(1 - cardsOpacity) * 20}px)` }}>
                {FEATURE_ITEMS.slice(3).map((item, i) => (
                  <article
                    key={item.title}
                    className={cn(
                      "rounded-2xl border border-indigo-200/15 bg-slate-950/82 p-3.5 text-white shadow-xl shadow-black/30 backdrop-blur-md",
                      "transform-gpu transition-all duration-500 ease-out hover:-rotate-1 hover:scale-[1.03] hover:shadow-2xl",
                      item.hoverColor
                    )}
                    style={{ transitionDelay: `${i * 70}ms` }}
                  >
                    <div
                      className={cn(
                        "mb-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                        "border-white/25 bg-slate-900/80",
                        "max-lg:border-slate-200 max-lg:bg-white max-lg:shadow-md max-lg:ring-1 max-lg:ring-black/10",
                      )}
                    >
                      <MentrixaVocabIcon
                        name={item.vocabIcon}
                        size={20}
                        surface="dark"
                        title={item.title}
                      />
                    </div>
                    <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-snug text-slate-100/95">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
