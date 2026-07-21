"use client";

import Link from "next/link";
import { useRef } from "react";
import { useReducedMotion } from "@/shared/animation/motion";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_BREAKTHROUGH_ICON } from "@/shared/icons/vocab-canonical";
import {
  GUIDE_PORTFOLIO_SHOW_MORE,
  type GuidePortfolioCard,
} from "@/features/guide-portfolio/guide-portfolio-pure";
import { BeforeAfterCard } from "@/features/share/before-after-card";
import { GUIDE_PUBLIC_COPY } from "@/features/tutor/public-profile-pure";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";

export function GuidePublicPortfolioSection({
  cards,
  hasMore,
  guideId,
}: {
  cards: GuidePortfolioCard[];
  hasMore: boolean;
  guideId: string;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useGsapScrollTriggerEffect((gsap) => {
    const grid = gridRef.current;
    if (!grid || reduceMotion || cards.length === 0) return;

    const items = grid.querySelectorAll<HTMLElement>("[data-portfolio-card]");
    const tween = gsap.from(items, {
      opacity: 0,
      y: 24,
      duration: 0.45,
      stagger: 0.08,
      ease: "power2.out",
      scrollTrigger: {
        trigger: grid,
        start: "top 88%",
        once: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [cards.length, reduceMotion]);

  if (cards.length === 0) return null;

  return (
    <section id="guide-portfolio" className="scroll-mt-20">
      <GuideAnimatedSticky variant="clip" staggerIndex={2}>
        <div className="mb-2 flex items-center gap-2">
          <MentrixaVocabIcon
            name={CANONICAL_BREAKTHROUGH_ICON}
            size={18}
            gold
            surface="light"
            title="Portfolio"
          />
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7C3AED]">
            {GUIDE_PUBLIC_COPY.portfolioHeading}
          </h2>
        </div>
        <div ref={gridRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.id} data-portfolio-card>
              <BeforeAfterCard
                mode="portfolio"
                nodeName={card.nodeName}
                beforeAccuracy={card.beforeAccuracy}
                afterAccuracy={card.afterAccuracy}
                date={new Date(card.addedAt ?? Date.now())}
              />
            </div>
          ))}
        </div>
        {hasMore ? (
          <div className="mt-3 text-center">
            <Link
              href={`/tutor/${guideId}/portfolio`}
              className="text-xs font-semibold text-[#7C3AED] hover:text-[#A78BFA]"
            >
              {GUIDE_PORTFOLIO_SHOW_MORE}
            </Link>
          </div>
        ) : null}
      </GuideAnimatedSticky>
    </section>
  );
}
