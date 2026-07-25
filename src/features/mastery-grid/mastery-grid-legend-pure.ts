import type { MasteryNodeState } from "@/features/mastery-grid/types";

export type MasteryGridLegendEntry = {
  state: MasteryNodeState;
  label: string;
  hint: string;
  icon: "focus-ring" | "practice-pack" | "verified";
};

/** Concise grid color key — first-try states only. */
export const MASTERY_GRID_LEGEND: MasteryGridLegendEntry[] = [
  { state: "none", label: "Open", hint: "No first try yet", icon: "focus-ring" },
  { state: "weak", label: "Weak", hint: "First try under 70%", icon: "practice-pack" },
  { state: "proficient", label: "Solid", hint: "Strong first try", icon: "practice-pack" },
  { state: "verified", label: "Verified", hint: "Locked into rank", icon: "verified" },
];
