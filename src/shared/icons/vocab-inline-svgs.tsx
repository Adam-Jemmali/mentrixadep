import type { ReactElement, ReactNode } from "react";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { resolveCanonicalVocabIcon } from "@/shared/icons/vocab-canonical";

const VERIFIED_GOLD = "#D4A017";

export function vocabInlineStroke(
  surface: "dark" | "light",
  gold: boolean,
): { stroke: string; fill: string } {
  if (gold) {
    return { stroke: VERIFIED_GOLD, fill: VERIFIED_GOLD };
  }
  if (surface === "dark") {
    return { stroke: "#FFFFFF", fill: "#FFFFFF" };
  }
  return { stroke: "#000000", fill: "#000000" };
}

type InlineVocabProps = {
  size: number;
  surface: "dark" | "light";
  gold: boolean;
  className?: string;
};

function InlineSvgShell({
  size,
  className,
  children,
}: {
  size: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Geometry copied from public/icons/vocab/home.svg */
function HomeInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 22 24 10 40 22" />
        <path d="M12 22v16h10V30h4v8h10V22" />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/profile.svg */
function ProfileInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="16" r="8" strokeWidth="2.1" />
        <path d="M10 40c0-8 6-14 14-14s14 6 14 14" strokeWidth="2" />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/booking.svg */
function BookingInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke, fill } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="12" width="28" height="28" rx="3" strokeWidth="2" />
        <line x1="10" y1="20" x2="38" y2="20" strokeWidth="1.75" opacity="0.5" />
        <line x1="18" y1="8" x2="18" y2="14" />
        <line x1="30" y1="8" x2="30" y2="14" />
        <path d="M24 26 20 30h8l-4-4Z" fill={fill} stroke="none" opacity="0.75" />
        <line x1="24" y1="26" x2="24" y2="32" strokeWidth="2" />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/unit.svg */
function UnitInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke, fill } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="8" width="28" height="32" rx="3" strokeWidth="2" />
        <line x1="10" y1="16" x2="38" y2="16" strokeWidth="1.75" opacity="0.5" />
        <line x1="10" y1="24" x2="38" y2="24" strokeWidth="1.75" opacity="0.5" />
        <line x1="10" y1="32" x2="38" y2="32" strokeWidth="1.75" opacity="0.5" />
        <rect x="14" y="11" width="8" height="3" rx="1" fill={fill} stroke="none" opacity="0.75" />
        <rect x="14" y="19" width="12" height="2" rx="1" fill={fill} stroke="none" opacity="0.45" />
        <rect x="14" y="27" width="10" height="2" rx="1" fill={fill} stroke="none" opacity="0.45" />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/verified.svg */
function VerifiedInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke, fill } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="16" strokeWidth="2.1" />
        <circle cx="24" cy="24" r="12" strokeWidth="1.25" opacity="0.35" />
        <path d="M16 24l5.5 5.5L32 18" strokeWidth="2.5" />
        <polygon
          points="24,8 26,12 30,12 27,15 28,19 24,17 20,19 21,15 18,12 22,12"
          fill={fill}
          stroke="none"
          opacity="0.7"
        />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/skills.svg */
function SkillsInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="10" r="4" strokeWidth="2" />
        <circle cx="12" cy="28" r="4" strokeWidth="2" />
        <circle cx="36" cy="28" r="4" strokeWidth="2" />
        <circle cx="24" cy="40" r="4" strokeWidth="2" />
        <line x1="24" y1="14" x2="14" y2="25" />
        <line x1="24" y1="14" x2="34" y2="25" />
        <line x1="16" y1="31" x2="22" y2="37" />
        <line x1="32" y1="31" x2="26" y2="37" />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/practice-pack.svg — proficient (70%+) nodes */
function PracticePackInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="8" width="28" height="32" rx="3" strokeWidth="2" />
        <line x1="16" y1="16" x2="32" y2="16" strokeWidth="1.75" />
        <line x1="16" y1="22" x2="28" y2="22" strokeWidth="1.75" />
        <path d="M30 30l6 6" strokeWidth="2.25" />
        <circle cx="26" cy="26" r="5" strokeWidth="2" />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/rival.svg — versus / top rival */
function RivalInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke, fill } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="10,12 22,22 16,26 38,38" strokeWidth="2.35" />
        <polyline points="38,12 26,22 32,26 10,38" strokeWidth="2.35" />
        <polygon points="24,21 27,24 24,27 21,24" fill={fill} stroke="none" opacity="0.75" />
      </g>
    </InlineSvgShell>
  );
}

/** Geometry copied from public/icons/vocab/focus-ring.svg — weak / slipped nodes */
function FocusRingInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke, fill } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="15" strokeWidth="2.25" />
        <circle cx="24" cy="24" r="9" strokeWidth="1.75" opacity="0.55" />
        <circle cx="24" cy="24" r="3.5" fill={fill} stroke="none" opacity="0.85" />
        <line x1="24" y1="4" x2="24" y2="8" strokeWidth="2" />
        <line x1="24" y1="40" x2="24" y2="44" strokeWidth="2" />
        <line x1="4" y1="24" x2="8" y2="24" strokeWidth="2" />
        <line x1="40" y1="24" x2="44" y2="24" strokeWidth="2" />
      </g>
    </InlineSvgShell>
  );
}

const INLINE_VOCAB_RENDERERS: Partial<
  Record<VocabIconName, (props: InlineVocabProps) => ReactElement>
> = {
  home: HomeInline,
  profile: ProfileInline,
  booking: BookingInline,
  unit: UnitInline,
  verified: VerifiedInline,
  skills: SkillsInline,
  "practice-pack": PracticePackInline,
  "focus-ring": FocusRingInline,
  rival: RivalInline,
};

export function hasInlineVocabIcon(name: VocabIconName): boolean {
  return resolveCanonicalVocabIcon(name) in INLINE_VOCAB_RENDERERS;
}

export function renderInlineVocabIcon(
  name: VocabIconName,
  props: InlineVocabProps,
): ReactElement | null {
  const canonical = resolveCanonicalVocabIcon(name);
  const render = INLINE_VOCAB_RENDERERS[canonical];
  return render ? render(props) : null;
}
