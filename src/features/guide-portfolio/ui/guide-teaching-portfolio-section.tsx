import Link from "next/link";
import {
  formatPortfolioAccuracy,
  GUIDE_PORTFOLIO_SECTION_TITLE,
  GUIDE_PORTFOLIO_SHOW_MORE,
  type GuidePortfolioCard,
} from "@/features/guide-portfolio/guide-portfolio-pure";
import { cn } from "@/shared/core/utils";

const VERIFIED_GOLD = "#D4A017";

function PortfolioCard({ card }: { card: GuidePortfolioCard }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-slate-50/60 px-4 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
        {card.nodeName}
      </p>
      <p className="mt-1.5 text-sm font-semibold tabular-nums text-[#0B1220]">
        <span className="text-[#64748B]">{formatPortfolioAccuracy(card.beforeAccuracy)}</span>
        <span className="mx-1.5 text-[#94A3B8]">→</span>
        <span style={{ color: VERIFIED_GOLD }}>
          {formatPortfolioAccuracy(card.afterAccuracy)}
        </span>
      </p>
    </div>
  );
}

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
    <section
      className={cn(
        "rounded-[2.5rem] border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-600/[0.03]",
        className,
      )}
    >
      <h2 className="mb-6 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-950">
        {GUIDE_PORTFOLIO_SECTION_TITLE}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <PortfolioCard key={card.id} card={card} />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-5 text-center">
          <Link
            href={`/tutor/${guideId}/portfolio`}
            className="text-sm font-semibold text-[#7C3AED] underline-offset-2 hover:underline"
          >
            {GUIDE_PORTFOLIO_SHOW_MORE}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
