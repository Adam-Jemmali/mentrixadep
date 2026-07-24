import Link from "next/link";
import {
  GUIDE_PORTFOLIO_SECTION_TITLE,
  GUIDE_PORTFOLIO_SHOW_MORE,
  type GuidePortfolioCard,
} from "@/features/guide-portfolio/guide-portfolio-pure";
import { BeforeAfterCard } from "@/features/share/before-after-card";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

export function GuideTeachingPortfolioSection({
  cards,
  hasMore,
  guideId,
  className,
}: {
  cards: GuidePortfolioCard[];
  hasMore: boolean;
  guideId: string;
  className?: string;
}) {
  if (cards.length === 0) return null;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 px-1">
        <MentrixaVocabIcon name="breakthrough" size={18} gold surface="dark" title="Portfolio" />
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white">
          {GUIDE_PORTFOLIO_SECTION_TITLE}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <BeforeAfterCard
            key={card.id}
            mode="portfolio"
            nodeName={card.nodeName}
            beforeAccuracy={card.beforeAccuracy}
            afterAccuracy={card.afterAccuracy}
            date={new Date(card.addedAt ?? Date.now())}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="text-center">
          <Link
            href={`/tutor/${guideId}/portfolio`}
            className="text-sm font-semibold text-[var(--mx-violet)] hover:text-[var(--mx-indigo)]"
          >
            {GUIDE_PORTFOLIO_SHOW_MORE}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
