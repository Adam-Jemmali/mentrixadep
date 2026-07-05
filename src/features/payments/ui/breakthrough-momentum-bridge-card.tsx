"use client";

import type { BreakthroughMomentumBridgeMessages } from "@/features/payments/breakthrough-momentum-bridge-pure";
import { mentrixBrandUi } from "@/features/marketing/mentrix-brand-colors";
import { PricingTierIcon } from "@/features/pricing/ui/pricing-tier-visual";

type BreakthroughMomentumBridgeCardProps = {
  messages: BreakthroughMomentumBridgeMessages;
};

export function BreakthroughMomentumBridgeCard({ messages }: BreakthroughMomentumBridgeCardProps) {
  return (
    <section
      className={`${mentrixBrandUi.panelMuted} rounded-xl p-4 sm:p-5`}
      aria-label="Momentum upgrade after session"
    >
      <div className="flex items-start gap-4">
        <PricingTierIcon tier="momentum" size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{messages.verdict}</p>
          <p className="mt-1 text-xs text-violet-200/85">{messages.nextAction}</p>
        </div>
      </div>
    </section>
  );
}
