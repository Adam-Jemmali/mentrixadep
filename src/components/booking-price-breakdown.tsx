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
      <div className="flex justify-between gap-3 text-slate-800">
        <span>Session (guide)</span>
        <span className="font-medium tabular-nums text-slate-900">{formatUsdFromCents(split.sessionCents)}</span>
      </div>
      <div className="flex justify-between gap-3 text-slate-700">
        <span>Platform fee (5%)</span>
        <span className="font-medium tabular-nums text-slate-700">
          {formatUsdFromCents(split.platformFeeCents)}
        </span>
      </div>
      <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-sm font-medium text-slate-900">
        <span>Total due</span>
        <span className="tabular-nums">{formatUsdFromCents(split.totalCents)}</span>
      </div>
    </div>
  );
}
