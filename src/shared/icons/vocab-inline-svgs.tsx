import type { ReactElement, ReactNode } from "react";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

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

/** Geometry copied from public/icons/vocab/momentum.svg */
function MomentumInline({ size, surface, gold, className }: InlineVocabProps) {
  const { stroke } = vocabInlineStroke(surface, gold);
  return (
    <InlineSvgShell size={size} className={className}>
      <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 32c6-4 10-4 16 0s10 4 16 0" strokeWidth="2" />
        <path d="M8 24c6-4 10-4 16 0s10 4 16 0" strokeWidth="2" />
        <path d="M8 16c6-4 10-4 16 0s10 4 16 0" strokeWidth="2" />
        <line x1="30" y1="10" x2="38" y2="10" strokeWidth="2.5" />
        <polyline points="34,6 38,10 34,14" strokeWidth="2.25" />
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
  momentum: MomentumInline,
  "momentum-membership": MomentumInline,
};

export function hasInlineVocabIcon(name: VocabIconName): boolean {
  return name in INLINE_VOCAB_RENDERERS;
}

export function renderInlineVocabIcon(
  name: VocabIconName,
  props: InlineVocabProps,
): ReactElement | null {
  const render = INLINE_VOCAB_RENDERERS[name];
  return render ? render(props) : null;
}
