/** Canonical AP Calculus AB unit names from scripts/data/ap-calc-ab-skill-nodes.json */
export const AP_CALC_AB_UNIT_NAMES: Record<number, string> = {
  1: "Limits and Continuity",
  2: "Differentiation Definition and Properties",
  3: "Differentiation Composite Implicit Inverse",
  4: "Contextual Applications of Differentiation",
  5: "Analytical Applications of Differentiation",
  6: "Integration and Accumulation of Change",
  7: "Differential Equations",
  8: "Applications of Integration",
};

/** Full unit title for mastery grid and skill tree UI. */
export function unitDisplayName(unitNumber: number, unitName?: string): string {
  const fromData = unitName?.trim();
  if (fromData) return fromData;
  return AP_CALC_AB_UNIT_NAMES[unitNumber] ?? `Unit ${unitNumber}`;
}

/** @deprecated Use unitDisplayName — kept for imports migrating off short labels. */
export function unitShortLabel(unitNumber: number): string {
  return unitDisplayName(unitNumber);
}

export function nodeOneWordLabel(nodeName: string, nodeSlug?: string): string {
  const text = `${nodeName} ${nodeSlug ?? ""}`.toLowerCase();

  if (/chain/.test(text)) return "Chain";
  if (/limit|continuity|asymptote|squeeze|ivt|intermediate/.test(text)) return "Limits";
  if (/integral|riemann|ftc|antideriv|accumulation|u-sub/.test(text)) return "Integral";
  if (/derivative|differentiat|tangent|secant|power rule|product|quotient/.test(text)) return "Derivative";
  if (/optimization|extrema|critical|concavity|inflection|mvt|mean value/.test(text)) return "Optimize";
  if (/related rate/.test(text)) return "Rates";
  if (/slope field|differential equation|separable|exponential growth|decay/.test(text)) return "DiffEq";
  if (/volume|area between|disk|washer|cross.section/.test(text)) return "Volume";
  if (/l.?hopital|indeterminate/.test(text)) return "LHopital";
  if (/implicit|inverse/.test(text)) return "Implicit";
  if (/velocity|motion|position/.test(text)) return "Motion";
  if (/graph|sketch/.test(text)) return "Graphs";
  if (/table/.test(text)) return "Tables";

  const slugWord = nodeSlug?.split("-").find((w) => w.length > 2);
  if (slugWord) {
    return slugWord.charAt(0).toUpperCase() + slugWord.slice(1, 8);
  }
  const first = nodeName.trim().split(/\s+/)[0];
  return first ? first.slice(0, 10) : "Skill";
}
