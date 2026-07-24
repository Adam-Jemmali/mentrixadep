"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LandingStickyNote } from "@/features/marketing/landing/ui/landing-sticky-note";
import { ARENA_PAGE_COPY } from "@/features/live-board/live-board-messages-pure";
import { ArenaBoardFeed } from "@/features/live-board/ui/arena-board-feed";
import { ArenaBoardNav } from "@/features/live-board/ui/arena-board-nav";
import { ArenaLeadersPanel } from "@/features/live-board/ui/arena-leaders-panel";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { useReducedMotion } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";

type Props = {
  initialEvents: LiveBoardEventRow[];
  leaders: ArenaLeaderProfile[];
};

export function ArenaPageClient({ initialEvents, leaders }: Props) {
  const router = useRouter();
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    router.prefetch(ARENA_PAGE_COPY.ctaHref);
  }, [router]);

  useGsapEffect(
    (gsap) => {
      const hero = heroRef.current;
      if (!hero || reducedMotion) return;

      gsap.from(".arena-hero-reveal", {
        y: 18,
        opacity: 0,
        stagger: 0.08,
        duration: 0.55,
        ease: "power2.out",
      });
    },
    [reducedMotion],
  );

  return (
    <div className="mx-shell-arena min-h-[100dvh] bg-[var(--mx-navy)] text-white">
      <ArenaBoardNav />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-[calc(3.5rem+1.25rem)] sm:px-6">
        <header ref={heroRef}>
          <LandingStickyNote variant="pinned" className="arena-hero-reveal text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--mx-indigo)]">
              {ARENA_PAGE_COPY.titleLine1}
            </p>
            <h1 className="mt-2 font-sans text-[28px] font-bold leading-tight text-[var(--mx-navy)]">
              {ARENA_PAGE_COPY.titleLine2}
            </h1>
            <p className="arena-hero-reveal mt-3 text-sm leading-relaxed text-[#475569]">
              {ARENA_PAGE_COPY.subtitle}
            </p>
            <p className="arena-hero-reveal mt-1 text-sm text-[#64748B]">{ARENA_PAGE_COPY.subtitleLive}</p>
            <div className="arena-hero-reveal mt-6 flex justify-center">
              <Link
                href={ARENA_PAGE_COPY.ctaHref}
                prefetch={false}
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full",
                  "bg-[var(--mx-violet)] px-5 py-2.5 text-sm font-bold text-white",
                  "transition-colors hover:bg-[var(--mx-primary-hover)]",
                )}
              >
                <MentrixaVocabIcon name="flow-climb" size={16} surface="dark" title="Try" />
                {ARENA_PAGE_COPY.cta}
              </Link>
            </div>
          </LandingStickyNote>
        </header>

        <ArenaBoardFeed initialEvents={initialEvents} />
        <ArenaLeadersPanel leaders={leaders} />
      </main>
    </div>
  );
}
