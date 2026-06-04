import type { ComponentType } from "react";
import {
  Atom,
  BrainCircuit,
  CircleSlash2,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Sigma,
  Sparkles,
} from "lucide-react";

export type DivisionFocusIcon = ComponentType<{ className?: string }>;

/** Map division key/name to the icon used in focus/subject selects. */
export function resolveDivisionFocusIcon(key: string, name: string): DivisionFocusIcon {
  const source = `${key} ${name}`.toLowerCase();
  if (source.includes("biology")) return Dna;
  if (source.includes("chem")) return FlaskConical;
  if (source.includes("computer") || source.includes("data")) return BrainCircuit;
  if (source.includes("econom")) return Landmark;
  if (source.includes("english") || source.includes("history")) return Globe2;
  if (source.includes("math")) return Sigma;
  if (source.includes("physics")) return Atom;
  return Sparkles;
}

export { CircleSlash2 };
