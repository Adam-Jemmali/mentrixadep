"use client";

import { cn } from "@/shared/core/utils";
import type { VerifiedAttemptCardModel } from "@/features/quest/verified-attempt-card-pure";

export function VerifiedAttemptCard({
  card,
  className,
}: {
  card: VerifiedAttemptCardModel;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-violet-300 bg-white p-4 shadow-[1px_2px_0_rgba(11,18,32,0.08)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mx-indigo)]">
          {card.modalityLabel}
        </p>
        {card.isCorrect ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mx-gold)]">
            Verified
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Locked miss
          </span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-[var(--mx-navy)]">{card.nodeName}</h3>
      <p className="mt-1 text-xs text-slate-600">
        Unit {card.unitNumber}. {card.unitName}
      </p>
      <p className="mt-3 text-sm text-slate-800">{card.proofLine}</p>
      <p className="mt-2 text-xs font-medium text-slate-700">{card.verdict}</p>
      <p className="mt-1 text-xs text-[var(--mx-indigo)]">{card.nextAction}</p>
    </article>
  );
}

export function VerifiedAttemptProofRail({
  cards,
  mixLabel,
}: {
  cards: VerifiedAttemptCardModel[];
  mixLabel: string;
}) {
  if (cards.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-violet-300 bg-[#F8FAFC] p-4">
        <p className="text-sm text-slate-600">
          Verified attempt cards appear here after first encounters. They are resume-grade proof,
          not decorative badges.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mx-indigo)]">
          Verified proof
        </p>
        <p className="mt-1 text-sm text-slate-700">{mixLabel}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <VerifiedAttemptCard key={`${card.skillNodeId}-${card.attemptedAt}`} card={card} />
        ))}
      </div>
    </section>
  );
}
