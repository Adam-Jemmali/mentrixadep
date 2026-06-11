import type { ReactElement } from "react";
import type { AccountRankKey } from "@/features/xp/rank-icons";

type IconProps = { color: string; className?: string };

function svgProps(className?: string) {
  return {
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true as const,
  };
}

/** Compass rose — forward arrow slightly off-center (uncertain path). */
export function WandererRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="1.75" opacity="0.35" />
      <path d="M24 8v6M24 34v6M8 24h6M34 24h6" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14 14l4.2 4.2M29.8 29.8 34 34M34 14l-4.2 4.2M14 34l4.2-4.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M26 30l-8-14 14 8-6 6z" fill={color} />
    </svg>
  );
}

/** Magnifying glass with star inside the lens. */
export function SeekerRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="21" cy="21" r="11" stroke={color} strokeWidth="2.25" />
      <path d="M29.5 29.5 38 38" stroke={color} strokeWidth="2.75" strokeLinecap="round" />
      <path
        d="M21 16.2 22.4 19.8 26.2 20.2 23.3 22.8 24.1 26.6 21 24.6 17.9 26.6 18.7 22.8 15.8 20.2 19.6 19.8Z"
        fill={color}
      />
    </svg>
  );
}

/** Open book with upward arrow rising from the spine. */
export function ScholarRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M10 14c0-2 4-3 8-3 4 0 6 1 6 1s2-1 6-1 8 1 8 3v22c0 0-4-2-8-2s-6 2-6 2-2-2-6-2-8 2V14Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 11v22" stroke={color} strokeWidth="1.5" opacity="0.55" />
      <path d="M24 18v10M20 22h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 12 20 16h8L24 12Z" fill={color} />
    </svg>
  );
}

/** Shield with a single diagonal battle mark. */
export function ContenderRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path
        d="M24 6 36 11v12c0 8.5-6.5 14.5-12 17-5.5-2.5-12-8.5-12-17V11L24 6Z"
        stroke={color}
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      <path d="M16 30 32 16" stroke={color} strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}

/** Two crossed lightning bolts forming an X. */
export function RivalRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M28 8 18 22h7l-5 18 14-18h-7l1-14Z" fill={color} />
      <path d="M20 8 10 22h7l-5 18 14-18h-7l1-14Z" fill={color} opacity="0.72" />
    </svg>
  );
}

/** Mountain peak with star above the summit. */
export function ApexRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M6 38h36" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <path d="M8 38 24 12 40 38Z" stroke={color} strokeWidth="2.25" strokeLinejoin="round" />
      <path d="M18 38 24 24 30 38" stroke={color} strokeWidth="1.75" strokeLinejoin="round" opacity="0.65" />
      <path
        d="M24 8 25.4 11.6 29.2 12 26.3 14.6 27.1 18.4 24 16.4 20.9 18.4 21.7 14.6 18.8 12 22.6 11.6Z"
        fill={color}
      />
    </svg>
  );
}

/** Five-point crown — diamond at center peak. Gold rank only. */
export function MentrixerRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path
        d="M8 34h32l-4-18-8 10-4-14-4 14-8-10-4 18Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={`${color}22`}
      />
      <path d="M8 34h32" stroke={color} strokeWidth="2.25" strokeLinecap="round" />
      <path d="M24 10 26.2 16.8 33.4 17.2 27.7 21.4 29.6 28.4 24 24.4 18.4 28.4 20.3 21.4 14.6 17.2 21.8 16.8Z" fill={color} />
      <path d="M24 8.5 25 11.5 28 11.8 25.8 13.8 26.5 16.8 24 15.2 21.5 16.8 22.2 13.8 20 11.8 23 11.5Z" fill="#FFF8E7" opacity="0.95" />
    </svg>
  );
}

const ICONS: Record<AccountRankKey, (props: IconProps) => ReactElement> = {
  wanderer: WandererRankIcon,
  seeker: SeekerRankIcon,
  scholar: ScholarRankIcon,
  contender: ContenderRankIcon,
  rival: RivalRankIcon,
  apex: ApexRankIcon,
  mentrixer: MentrixerRankIcon,
};

export function RankBadgeIcon({
  rankKey,
  color,
  className,
}: {
  rankKey: AccountRankKey;
  color: string;
  className?: string;
}) {
  const Icon = ICONS[rankKey];
  return <Icon color={color} className={className} />;
}
