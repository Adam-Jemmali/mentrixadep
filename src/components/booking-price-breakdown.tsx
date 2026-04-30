"use client";

import { splitSessionPriceCents } from "@/lib/booking-pricing";
import { formatUsdFromCents } from "@/lib/duel-reward";

export function BookingPriceBreakdown({
  sessionPriceCents,
  className = "",
}: {
  sessionPriceCents: number;
  className?: string;
}) {
  const split = splitSessionPriceCents(sessionPriceCents);

  return (
    <div className={`space-y-2 text-sm ${className}`}>
      <div className="flex justify-between gap-3 text-slate-300">
        <span>Session (guide)</span>
        <span className="font-medium tabular-nums text-white">{formatUsdFromCents(split.sessionCents)}</span>
      </div>
      <div className="flex justify-between gap-3 text-slate-400">
        <span>Platform fee (15%)</span>
        <span className="font-medium tabular-nums text-slate-300">
          {formatUsdFromCents(split.platformFeeCents)}
        </span>
      </div>
      <div className="flex justify-between gap-3 border-t border-slate-800 pt-2 text-sm font-bold text-white">
        <span>Total due</span>
        <span className="tabular-nums">{formatUsdFromCents(split.totalCents)}</span>
      </div>
    </div>
  );
}
