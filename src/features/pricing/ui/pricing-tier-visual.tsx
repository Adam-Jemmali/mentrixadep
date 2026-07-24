"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import {
  buildPricingTiers,
  TIER_VISUAL_BLURB,
  type PricingTierDefinition,
  type PricingTierId,
} from "@/features/pricing/pricing-tiers-pure";
import { Button } from "@/shared/ui/button";
import { PricingTierInlineIcon } from "@/features/pricing/ui/pricing-tier-icons-inline";

export { TIER_VOCAB_ICONS, TIER_ICON_SRC, tierIconSrc } from "@/features/pricing/ui/pricing-tier-visual-constants";

export function PricingTierIcon({
  tier,
  size = 72,
  className,
  title,
}: {
  tier: PricingTierId;
  size?: number;
  className?: string;
  title?: string;
}) {
  const meta = buildPricingTiers().find((entry) => entry.id === tier);
  const label = title ?? meta?.name ?? tier;

  return <PricingTierInlineIcon tier={tier} size={size} className={className} title={label} />;
}

export function PricingTierVisualCard({
  tier,
  highlight,
  iconSize = 80,
  showCta = false,
  compact = false,
  surface = "dark",
}: {
  tier: PricingTierDefinition;
  highlight?: PricingTierId;
  iconSize?: number;
  showCta?: boolean;
  compact?: boolean;
  surface?: "light" | "dark";
}) {
  const isHighlight = highlight === tier.id;
  const onLight = surface === "light";

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        isHighlight &&
          (onLight
            ? "rounded-2xl bg-violet-100/70 px-4 py-5 ring-2 ring-[var(--mx-indigo)]"
            : "rounded-2xl bg-violet-500/10 px-4 py-5 ring-2 ring-violet-400/50"),
        !isHighlight && compact && "px-2 py-3",
      )}
    >
      <PricingTierIcon tier={tier.id} size={iconSize} />
      <h3
        className={cn(
          "mt-4 font-black",
          onLight ? "text-[var(--mx-navy)]" : "text-white",
          compact ? "text-sm leading-tight" : "text-lg",
        )}
      >
        {tier.name}
      </h3>
      <p className={cn(onLight ? "text-[#475569]" : "text-violet-200/85", compact ? "text-[10px]" : "text-xs")}>
        {TIER_VISUAL_BLURB[tier.id]}
      </p>
      <p
        className={cn(
          "mt-2 font-bold tabular-nums",
          onLight ? (isHighlight ? "text-[#4F46E5]" : "text-[var(--mx-navy)]") : "text-white",
          compact ? "text-base" : "text-2xl",
        )}
      >
        {tier.priceMain}
      </p>
      {!compact && tier.id === "momentum" ? (
        <p className={cn("mt-1 text-[10px]", onLight ? "text-[#64748B]" : "text-violet-300/70")}>{tier.priceSub}</p>
      ) : null}
      {showCta ? (
        <Button
          asChild
          variant={tier.popular ? "default" : "outline"}
          className={cn(
            "mt-4 w-full rounded-xl font-bold",
            tier.popular && "bg-indigo-600 hover:bg-indigo-500",
            !tier.popular &&
              (onLight
                ? "border-[var(--mx-indigo)] bg-transparent text-[#4F46E5] hover:bg-violet-100"
                : "border-violet-400/40 bg-transparent text-violet-100 hover:bg-violet-500/15"),
          )}
        >
          <Link href={tier.buttonLink}>{tier.buttonText}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function PricingTierVisualGrid({
  highlight,
  iconSize = 80,
  showCta = false,
  compact = false,
  surface = "dark",
  className,
}: {
  highlight?: PricingTierId;
  iconSize?: number;
  showCta?: boolean;
  compact?: boolean;
  surface?: "light" | "dark";
  className?: string;
}) {
  const tiers = buildPricingTiers();

  return (
    <div className={cn("grid gap-6 sm:grid-cols-3", className)}>
      {tiers.map((tier) => (
        <PricingTierVisualCard
          key={tier.id}
          tier={tier}
          highlight={highlight}
          iconSize={iconSize}
          showCta={showCta}
          compact={compact}
          surface={surface}
        />
      ))}
    </div>
  );
}
