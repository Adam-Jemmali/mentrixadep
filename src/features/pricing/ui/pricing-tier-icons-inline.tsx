import type { ReactNode } from "react";
import { cn } from "@/shared/core/utils";
import type { PricingTierId } from "@/features/pricing/pricing-tiers-pure";

type TierSvgProps = {
  size?: number;
  className?: string;
  title?: string;
};

function TierSvgShell({
  size = 72,
  className,
  title,
  children,
}: TierSvgProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-90 -90 180 180"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn("block shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export function ArenaTierIcon({ size = 72, className, title = "The Arena" }: TierSvgProps) {
  return (
    <TierSvgShell size={size} className={className} title={title}>
      <circle cx="0" cy="0" r="88" fill="none" stroke="#7C3AED" strokeWidth="1" opacity="0.25" />
      <circle cx="0" cy="0" r="80" fill="#0B1220" />
      <circle cx="0" cy="0" r="70" fill="none" stroke="#6366F1" strokeWidth="0.75" opacity="0.35" />
      <path
        d="M-52 22 L-38 -28 L0 28 L38 -28 L52 22"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="-68" r="2.5" fill="#6366F1" opacity="0.6" />
      <circle cx="48" cy="-48" r="2" fill="#6366F1" opacity="0.4" />
      <circle cx="-48" cy="-48" r="2" fill="#6366F1" opacity="0.4" />
      <circle cx="65" cy="-8" r="1.5" fill="#6366F1" opacity="0.3" />
      <circle cx="-65" cy="-8" r="1.5" fill="#6366F1" opacity="0.3" />
    </TierSvgShell>
  );
}

export function BreakthroughTierIcon({ size = 72, className, title = "The Breakthrough" }: TierSvgProps) {
  return (
    <TierSvgShell size={size} className={className} title={title}>
      <circle cx="0" cy="0" r="88" fill="none" stroke="#D4A017" strokeWidth="1.5" opacity="0.4" />
      <circle cx="0" cy="0" r="80" fill="#0F0C00" />
      <circle cx="0" cy="0" r="70" fill="none" stroke="#D4A017" strokeWidth="1" opacity="0.5" />
      <path
        d="M-52 22 L-38 -28 L0 28 L38 -28 L52 22"
        fill="none"
        stroke="#D4A017"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="-22" y1="-36" x2="-30" y2="-54" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="0" y1="-30" x2="0" y2="-60" stroke="#D4A017" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="22" y1="-36" x2="30" y2="-54" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path
        d="M-5 -56 L0 -64 L5 -56"
        fill="none"
        stroke="#D4A017"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="0" y1="-88" x2="0" y2="-78" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="88" y1="0" x2="78" y2="0" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="-88" y1="0" x2="-78" y2="0" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="0" y1="88" x2="0" y2="78" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </TierSvgShell>
  );
}

export function MomentumTierIcon({ size = 72, className, title = "Momentum Pack" }: TierSvgProps) {
  return (
    <TierSvgShell size={size} className={className} title={title}>
      <circle cx="0" cy="0" r="88" fill="none" stroke="#7C3AED" strokeWidth="0.75" opacity="0.2" />
      <circle cx="0" cy="0" r="76" fill="none" stroke="#6366F1" strokeWidth="1.25" opacity="0.4" />
      <circle cx="0" cy="0" r="63" fill="none" stroke="#7C3AED" strokeWidth="1.75" opacity="0.6" />
      <circle cx="0" cy="0" r="56" fill="#0D0B1A" />
      <path
        d="M-40 20 L-29 -22 L0 22 L29 -22 L40 20"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="88" cy="0" r="4" fill="#7C3AED" opacity="0.35" />
      <circle cx="-44" cy="76" r="4" fill="#7C3AED" opacity="0.35" />
      <circle cx="-44" cy="-76" r="4" fill="#7C3AED" opacity="0.35" />
      <circle cx="65.8" cy="38" r="5" fill="#6366F1" opacity="0.55" />
      <circle cx="-76" cy="0" r="5" fill="#6366F1" opacity="0.55" />
      <circle cx="10" cy="-75" r="5" fill="#6366F1" opacity="0.55" />
      <circle cx="0" cy="-63" r="6" fill="#A78BFA" opacity="0.8" />
      <path
        d="M-28 -28 Q0 -44 28 -28"
        fill="none"
        stroke="#A78BFA"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </TierSvgShell>
  );
}

const TIER_ICON_COMPONENTS = {
  arena: ArenaTierIcon,
  breakthrough: BreakthroughTierIcon,
  momentum: MomentumTierIcon,
} as const;

export function PricingTierInlineIcon({
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
  const Icon = TIER_ICON_COMPONENTS[tier];
  return <Icon size={size} className={className} title={title} />;
}
