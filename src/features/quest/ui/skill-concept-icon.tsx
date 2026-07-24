import type { ReactElement } from "react";
import { cn } from "@/shared/core/utils";
import {
  apCalcSkillVisual,
  apCalcSkillVisualAccentClass,
  type ApCalcSkillVisualSurface,
} from "@/features/quest/ap-calc-skill-visual-pure";

export type SkillConceptKind =
  | "chain-rule"
  | "limit"
  | "derivative"
  | "integral"
  | "slope-field"
  | "optimization"
  | "related-rates"
  | "volume"
  | "trig"
  | "exponential"
  | "implicit"
  | "lhopital"
  | "generic";

function resolveSkillConceptKind(nodeName: string, nodeSlug?: string): SkillConceptKind {
  const text = `${nodeName} ${nodeSlug ?? ""}`.toLowerCase();
  if (/chain|composite/.test(text)) return "chain-rule";
  if (/l.?hopital|indeterminate/.test(text)) return "lhopital";
  if (/slope field|differential equation|separable/.test(text)) return "slope-field";
  if (/related rate/.test(text)) return "related-rates";
  if (/optimization|extrema|critical|concavity|inflection/.test(text)) return "optimization";
  if (/volume|area between|disk|washer/.test(text)) return "volume";
  if (/integral|riemann|ftc|antideriv|u-sub|accumulation/.test(text)) return "integral";
  if (/implicit|inverse/.test(text)) return "implicit";
  if (/sin|cos|tan|trig/.test(text)) return "trig";
  if (/exponential|e\^x|growth|decay/.test(text)) return "exponential";
  if (/limit|continuity|asymptote|squeeze|intermediate/.test(text)) return "limit";
  if (/derivative|differentiat|tangent|power rule/.test(text)) return "derivative";
  return "generic";
}

type SvgProps = { stroke: string; size: number };

function ChainRuleSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="16" cy="20" r="7" fill="none" stroke={stroke} strokeWidth="2" />
      <circle cx="32" cy="28" r="7" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M23 20 L27 28" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 34 Q24 8 40 34" fill="none" stroke={stroke} strokeWidth="1.75" opacity="0.55" />
    </svg>
  );
}

function LimitSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <line x1="8" y1="32" x2="40" y2="32" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      <path d="M8 36 C16 12 24 12 32 28 S40 30 40 18" fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" />
      <path d="M30 18 L40 18 M35 13 L35 23" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DerivativeSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M8 34 Q24 8 40 26" fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" />
      <line x1="22" y1="18" x2="36" y2="10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="16" r="2.5" fill={stroke} />
    </svg>
  );
}

function IntegralSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M14 8 C10 24 10 24 14 40" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <path d="M16 34 Q24 10 38 22 L38 34 Z" fill={stroke} fillOpacity="0.18" stroke={stroke} strokeWidth="1.75" />
    </svg>
  );
}

function SlopeFieldSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      {[12, 24, 36].map((x) =>
        [12, 24, 36].map((y) => (
          <line
            key={`${x}-${y}`}
            x1={x - 3}
            y1={y + 2}
            x2={x + 3}
            y2={y - 2}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.85"
          />
        )),
      )}
    </svg>
  );
}

function OptimizationSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M8 34 Q18 8 28 20 T40 14" fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" />
      <circle cx="28" cy="20" r="3" fill={stroke} />
      <line x1="28" y1="20" x2="28" y2="34" stroke={stroke} strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

function RelatedRatesSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect x="14" y="18" width="20" height="20" rx="2" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M24 18 L24 10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M14 28 L8 28 M34 28 L40 28" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function VolumeSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <ellipse cx="24" cy="14" rx="14" ry="5" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M10 14 L10 34 C10 38 34 38 38 34 L38 14" fill="none" stroke={stroke} strokeWidth="2" />
      <ellipse cx="24" cy="34" rx="14" ry="5" fill={stroke} fillOpacity="0.12" stroke={stroke} strokeWidth="1.75" />
    </svg>
  );
}

function TrigSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M6 24 C12 8 20 8 26 24 S38 40 42 24" fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" />
      <line x1="6" y1="24" x2="42" y2="24" stroke={stroke} strokeWidth="1.25" opacity="0.4" />
    </svg>
  );
}

function ExponentialSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d="M8 36 C8 36 14 12 40 12" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ImplicitSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="14" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M14 30 Q24 14 34 30" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LhopitalSvg({ stroke, size }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <text x="10" y="22" fill={stroke} fontSize="11" fontFamily="Geist Mono, monospace" fontWeight="700">
        0/0
      </text>
      <path d="M28 30 L38 18" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 18 L38 18 L38 24" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GenericSvg({ stroke, size, glyph }: SvgProps & { glyph: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <text
        x="24"
        y="27"
        textAnchor="middle"
        fill={stroke}
        fontSize={glyph.length > 6 ? 8 : 10}
        fontFamily="Geist Mono, monospace"
        fontWeight="700"
      >
        {glyph.slice(0, 8)}
      </text>
    </svg>
  );
}

const CONCEPT_SVG: Record<
  Exclude<SkillConceptKind, "generic">,
  (props: SvgProps) => ReactElement
> = {
  "chain-rule": ChainRuleSvg,
  limit: LimitSvg,
  derivative: DerivativeSvg,
  integral: IntegralSvg,
  "slope-field": SlopeFieldSvg,
  optimization: OptimizationSvg,
  "related-rates": RelatedRatesSvg,
  volume: VolumeSvg,
  trig: TrigSvg,
  exponential: ExponentialSvg,
  implicit: ImplicitSvg,
  lhopital: LhopitalSvg,
};

export function SkillConceptIcon({
  nodeName,
  nodeSlug,
  unitNumber,
  unitName,
  size = 40,
  surface = "onDark",
  className,
  title,
}: {
  nodeName: string;
  nodeSlug?: string;
  unitNumber?: number;
  unitName?: string;
  size?: number;
  surface?: ApCalcSkillVisualSurface;
  className?: string;
  title?: string;
}) {
  const visual = apCalcSkillVisual({ nodeName, nodeSlug, unitNumber, unitName });
  const kind = resolveSkillConceptKind(nodeName, nodeSlug);
  const stroke = surface === "onDark" ? "#FFFFFF" : "var(--mx-navy-2)";

  const svg =
    kind === "generic" ? (
      <GenericSvg stroke={stroke} size={size} glyph={visual.glyph} />
    ) : (
      CONCEPT_SVG[kind]({ stroke, size })
    );

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br p-1",
        apCalcSkillVisualAccentClass(visual.accent, surface),
        className,
      )}
      style={{ width: size + 8, height: size + 8 }}
      title={title ?? visual.hint}
      aria-hidden={!title}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {svg}
    </span>
  );
}

export function UnitConceptIcon({
  unitNumber,
  size = 44,
  surface = "onDark",
  className,
}: {
  unitNumber: number;
  size?: number;
  surface?: ApCalcSkillVisualSurface;
  className?: string;
}) {
  const visual = apCalcSkillVisual({ nodeName: "", unitNumber });
  const stroke = surface === "onDark" ? "#FFFFFF" : "var(--mx-navy-2)";
  const inset = 6;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br font-mono font-black",
        apCalcSkillVisualAccentClass(visual.accent, surface),
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size - inset} height={size - inset} viewBox="0 0 48 48">
        <rect
          x="10"
          y="10"
          width="28"
          height="28"
          rx="6"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
        />
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fill={stroke}
          fontSize="16"
          fontFamily="Geist Mono, monospace"
          fontWeight="800"
        >
          {unitNumber}
        </text>
      </svg>
    </span>
  );
}

export { resolveSkillConceptKind };
