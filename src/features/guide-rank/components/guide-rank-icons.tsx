import type { ReactElement } from "react";
import type { GuideRankKey } from "@/features/guide-rank/constants";

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

/** Torch — teaching craft entry flame. */
export function PractitionerRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <line x1="24" y1="34" x2="24" y2="18" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="24" cy="36" rx="5" ry="2.5" stroke={color} strokeWidth="2.25" />
      <path d="M24 10 C18 16 16 20 19 24 C21 21 24 19 24 10Z" fill={color} opacity="0.92" />
      <path d="M24 10 C30 16 32 20 29 24 C27 21 24 19 24 10Z" fill={color} opacity="0.85" />
      <path d="M24 8 C22 14 24 17 26 14 C25 11 24 9 24 8Z" fill={color} />
      <circle cx="24" cy="26" r="2" fill={color} />
    </svg>
  );
}

/** Focused beam — cone to focal lens. */
export function SpecialistRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <polygon points="24,10 12,34 36,34" fill={`${color}33`} stroke="none" />
      <line x1="24" y1="10" x2="12" y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="10" x2="36" y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="34" x2="36" y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <circle cx="24" cy="34" r="5" stroke={color} strokeWidth="2.75" />
      <circle cx="24" cy="34" r="2" fill={color} />
    </svg>
  );
}

/** Calibrated dial — gauge arc with needle at high mark. */
export function ExpertRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M12 30 A12 12 0 0 1 36 30" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="30" x2="16" y2="30" stroke={color} strokeWidth="2.25" strokeLinecap="round" opacity="0.9" />
      <line x1="24" y1="18" x2="24" y2="20" stroke={color} strokeWidth="2.25" strokeLinecap="round" opacity="0.95" />
      <line x1="34" y1="30" x2="32" y2="30" stroke={color} strokeWidth="2.25" strokeLinecap="round" opacity="0.9" />
      <line x1="24" y1="30" x2="32" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="30" r="3" stroke={color} strokeWidth="2.5" />
      <circle cx="24" cy="30" r="1.25" fill={color} />
    </svg>
  );
}

/** Mastery seal — wax disc with star mark. */
export function MasterRankIcon({ color, className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="24" cy="24" r="14" stroke={color} strokeWidth="3" />
      <circle cx="24" cy="24" r="11" stroke={color} strokeWidth="2" strokeDasharray="2 2" opacity="0.85" />
      <path d="M18 32 L14 38 L17 34 Z" fill={color} opacity="0.95" />
      <path d="M30 32 L34 38 L31 34 Z" fill={color} opacity="0.95" />
      <path
        d="M24 14 L26 19 31.5 19.5 27.5 23 28.8 28.5 24 25.8 19.2 28.5 20.5 23 16.5 19.5 22 19Z"
        fill={color}
      />
    </svg>
  );
}

/** Impact halo — gold pulse rings with upward arrow (mirrors Mentrixer gold craft). */
export function EliteRankIcon({ color, className }: IconProps) {
  const highlight = color === "#D4A017" ? "#F5D76E" : color;
  return (
    <svg {...svgProps(className)}>
      <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="2.75" opacity="0.95" />
      <circle cx="24" cy="24" r="13" stroke={color} strokeWidth="2.25" opacity="0.9" />
      <circle cx="24" cy="24" r="8" stroke={color} strokeWidth="2" opacity="0.88" />
      <polygon
        points="24,10 30,22 27,22 27,34 21,34 21,22 18,22"
        fill={`${color}F0`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon points="24,8 27,14 21,14" fill={highlight} />
      <rect x="18" y="34" width="12" height="3" rx="1" fill={color} />
      <circle cx="20" cy="35.5" r="1" fill={highlight} opacity="0.9" />
      <circle cx="28" cy="35.5" r="1" fill={highlight} opacity="0.9" />
    </svg>
  );
}

const ICONS: Record<GuideRankKey, (props: IconProps) => ReactElement> = {
  practitioner: PractitionerRankIcon,
  specialist: SpecialistRankIcon,
  expert: ExpertRankIcon,
  master: MasterRankIcon,
  elite: EliteRankIcon,
};

export function GuideRankBadgeIcon({
  rankKey,
  color,
  className,
}: {
  rankKey: GuideRankKey;
  color: string;
  className?: string;
}) {
  const Icon = ICONS[rankKey] ?? PractitionerRankIcon;
  return <Icon color={color} className={className} />;
}
