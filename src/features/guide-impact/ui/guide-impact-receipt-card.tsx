"use client";

import type { GuideImpactReceipt } from "@/features/guide-impact/impact-receipt-reads";

export function GuideImpactReceiptCard({
  receipts,
  momentumActive,
}: {
  receipts: GuideImpactReceipt[];
  momentumActive: boolean;
}) {
  if (receipts.length === 0) return null;
  const latest = receipts[0]!;

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
        Guide impact receipt
      </p>
      <p className="mt-2 text-sm font-semibold text-indigo-950">
        {latest.guideName} moved your verified path on {latest.nodeName}. Impact Score{" "}
        {Math.round(latest.impactScore)} on AP Calculus AB.
      </p>
      {momentumActive && receipts.length > 1 ? (
        <ul className="mt-3 space-y-1 text-xs text-indigo-900/85">
          {receipts.slice(1, 4).map((receipt, index) => (
            <li key={`${receipt.guideId}-${index}`}>
              {receipt.guideName}. {receipt.nodeName}
            </li>
          ))}
        </ul>
      ) : !momentumActive ? (
        <p className="mt-2 text-xs text-indigo-800/80">
          Momentum unlocks your full impact receipt history after every session.
        </p>
      ) : null}
    </section>
  );
}
