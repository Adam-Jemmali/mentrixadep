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

/** Open book with upward arrow rising from the spine (matches public/icons/scholar.svg). */
export function ScholarRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path
        d="M24 30 C21 28.5 17 28 14 28.5 L14 36 C17 35.2 21 35.5 24 36.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 30 C27 28.5 31 28 34 28.5 L34 36 C31 35.2 27 35.5 24 36.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="24" y1="30" x2="24" y2="36.5" stroke={color} strokeWidth="1.25" opacity="0.55" />
      <line x1="24" y1="28.5" x2="24" y2="10" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      <polyline
        points="19,14 24,10 29,14"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polygon points="24,8 21.5,13 26.5,13" fill={color} opacity="0.55" />
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

/** Crossed lightning bolts with center spark (matches public/icons/rival.svg). */
export function RivalRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <polyline
        points="29,12 21,22 25,24 36,36"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <polyline
        points="19,12 27,22 23,24 12,36"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      <polygon points="24,20 25.5,22.5 28,23 25.5,24.5 24,27 22.5,24.5 20,23 22.5,22.5" fill={color} opacity="0.75" />
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
