export type ApCalcSkillVisual = {
  glyph: string;
  hint: string;
  unitLabel: string;
  accent: "violet" | "cyan" | "amber" | "rose" | "emerald" | "indigo" | "sky" | "fuchsia";
};

const UNIT_ACCENT: Record<number, ApCalcSkillVisual["accent"]> = {
  1: "cyan",
  2: "violet",
  3: "indigo",
  4: "amber",
  5: "rose",
  6: "emerald",
  7: "sky",
  8: "fuchsia",
};

export type ApCalcSkillVisualSurface = "onLight" | "onDark";

const ACCENT_CLASS_ON_LIGHT: Record<ApCalcSkillVisual["accent"], string> = {
  violet:
    "from-violet-200/90 to-violet-100/80 border-violet-400/70 text-violet-950 shadow-sm",
  cyan: "from-cyan-200/90 to-cyan-100/80 border-cyan-500/65 text-cyan-950 shadow-sm",
  amber: "from-amber-200/90 to-amber-100/80 border-amber-500/65 text-amber-950 shadow-sm",
  rose: "from-rose-200/90 to-rose-100/80 border-rose-500/65 text-rose-950 shadow-sm",
  emerald:
    "from-emerald-200/90 to-emerald-100/80 border-emerald-500/65 text-emerald-950 shadow-sm",
  indigo:
    "from-indigo-200/90 to-indigo-100/80 border-indigo-500/65 text-indigo-950 shadow-sm",
  sky: "from-sky-200/90 to-sky-100/80 border-sky-500/65 text-sky-950 shadow-sm",
  fuchsia:
    "from-fuchsia-200/90 to-fuchsia-100/80 border-fuchsia-500/65 text-fuchsia-950 shadow-sm",
};

const ACCENT_CLASS_ON_DARK: Record<ApCalcSkillVisual["accent"], string> = {
  violet: "from-violet-500/35 to-violet-600/10 border-violet-400/45 text-violet-50",
  cyan: "from-cyan-500/35 to-cyan-600/10 border-cyan-400/45 text-cyan-50",
  amber: "from-amber-500/35 to-amber-600/10 border-amber-400/45 text-amber-50",
  rose: "from-rose-500/35 to-rose-600/10 border-rose-400/45 text-rose-50",
  emerald: "from-emerald-500/35 to-emerald-600/10 border-emerald-400/45 text-emerald-50",
  indigo: "from-indigo-500/35 to-indigo-600/10 border-indigo-400/45 text-indigo-50",
  sky: "from-sky-500/35 to-sky-600/10 border-sky-400/45 text-sky-50",
  fuchsia: "from-fuchsia-500/35 to-fuchsia-600/10 border-fuchsia-400/45 text-fuchsia-50",
};

export function apCalcSkillVisualAccentClass(
  accent: ApCalcSkillVisual["accent"],
  surface: ApCalcSkillVisualSurface = "onLight",
): string {
  return surface === "onDark" ? ACCENT_CLASS_ON_DARK[accent] : ACCENT_CLASS_ON_LIGHT[accent];
}

function matchGlyph(nodeName: string, nodeSlug?: string): { glyph: string; hint: string } {
  const text = `${nodeName} ${nodeSlug ?? ""}`.toLowerCase();

  if (/sum and difference|sum.difference/.test(text)) {
    return { glyph: "f±g", hint: "Sum / difference" };
  }
  if (/interval.*(increase|decrease)|increasing|decreasing/.test(text)) {
    return { glyph: "↗ ↘", hint: "Intervals inc/dec" };
  }
  if (/mean value theorem|mvt/.test(text)) {
    return { glyph: "f′(c)=Δ", hint: "Mean Value Thm" };
  }
  if (/concavity|inflection/.test(text)) {
    return { glyph: "f″(x)", hint: "Concavity" };
  }
  if (/l['']?h[oô]pital|indeterminate/.test(text)) {
    return { glyph: "0/0 →", hint: "L'Hopital" };
  }
  if (/power rule/.test(text)) {
    return { glyph: "nxⁿ⁻¹", hint: "Power rule" };
  }
  if (/trig|sin|cos|tan/.test(text)) {
    return { glyph: "sin′ cos", hint: "Trig derivatives" };
  }
  if (/exponential|e\^x/.test(text)) {
    return { glyph: "eˣ", hint: "Exponentials" };
  }
  if (/\bln\b|logarithm/.test(text)) {
    return { glyph: "d/dx ln x", hint: "Log derivative" };
  }
  if (/chain rule|composite/.test(text)) {
    return { glyph: "f(g(x))", hint: "Chain rule" };
  }
  if (/product rule/.test(text)) {
    return { glyph: "(uv)′", hint: "Product rule" };
  }
  if (/quotient rule/.test(text)) {
    return { glyph: "(u/v)′", hint: "Quotient rule" };
  }
  if (/implicit/.test(text)) {
    return { glyph: "dy/dx", hint: "Implicit diff" };
  }
  if (/related rate/.test(text)) {
    return { glyph: "dr/dt", hint: "Related rates" };
  }
  if (/optimization|max|min/.test(text)) {
    return { glyph: "f′=0", hint: "Optimization" };
  }
  if (/riemann|rectangular|trapezoid/.test(text)) {
    return { glyph: "∑Δx", hint: "Riemann sums" };
  }
  if (/u-sub|substitution/.test(text)) {
    return { glyph: "∫u du", hint: "U-substitution" };
  }
  if (/slope field|differential equation/.test(text)) {
    return { glyph: "dy/dx=", hint: "Slope fields" };
  }
  if (/definite integral|ftc|fundamental theorem/.test(text)) {
    return { glyph: "∫ₐᵇ", hint: "Definite integral" };
  }
  if (/integral|integration|antideriv/.test(text)) {
    return { glyph: "∫ f dx", hint: "Integration" };
  }
  if (/limit|continuity|asymptote/.test(text)) {
    return { glyph: "lim→", hint: "Limits" };
  }
  if (/derivative|differentiat/.test(text)) {
    return { glyph: "f′(x)", hint: "Derivatives" };
  }
  if (/volume|area between|solid.revolution/.test(text)) {
    return { glyph: "π∫r²", hint: "Applications" };
  }
  if (/accumulation|net change/.test(text)) {
    return { glyph: "∫rate", hint: "Accumulation" };
  }
  if (/squeeze|sandwich/.test(text)) {
    return { glyph: "g≤f≤h", hint: "Squeeze theorem" };
  }
  if (/intermediate value|ivt/.test(text)) {
    return { glyph: "f(c)=k", hint: "IVT" };
  }

  const words = nodeName.trim().split(/\s+/);
  const short = words.slice(0, 2).join(" ");
  return { glyph: short.length > 12 ? `${short.slice(0, 11)}…` : short, hint: "Skill node" };
}

export function apCalcSkillVisual(params: {
  nodeName: string;
  nodeSlug?: string;
  unitNumber?: number;
  unitName?: string;
}): ApCalcSkillVisual {
  const unitNumber = params.unitNumber ?? 0;
  const accent = UNIT_ACCENT[unitNumber] ?? "violet";
  const { glyph, hint } = matchGlyph(params.nodeName, params.nodeSlug);
  const unitLabel =
    unitNumber > 0 && params.unitName
      ? `Unit ${unitNumber}. ${params.unitName}`
      : params.unitName ?? "AP Calculus AB";

  return { glyph, hint, unitLabel, accent };
}

export function formatTrapInsightHeadline(trapInsight: string): string {
  const trimmed = trapInsight.trim().replace(/\.$/, "");
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
