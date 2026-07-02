"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import type { BreakthroughMomentumBridgeMessages } from "@/features/payments/breakthrough-momentum-bridge-pure";

type BreakthroughMomentumBridgeCardProps = {
  messages: BreakthroughMomentumBridgeMessages;
};

export function BreakthroughMomentumBridgeCard({ messages }: BreakthroughMomentumBridgeCardProps) {
  return (
    <section
      className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 sm:p-5"
      aria-label="Momentum upgrade after session"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
        Close the loop
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{messages.verdict}</p>
      <p className="mt-1 text-sm text-slate-600">{messages.nextAction}</p>
      <div className="mt-4">
        <Button asChild size="sm">
          <Link href="/student/subscribe">Get Momentum</Link>
        </Button>
      </div>
    </section>
  );
}
