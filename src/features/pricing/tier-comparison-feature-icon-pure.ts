import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/** Map tier comparison feature labels to vocabulary icons for the landing pricing table. */
export function tierComparisonFeatureIcon(feature: string): VocabIconName {
  const line = feature.toLowerCase();
  if (line.includes("mastery grid")) return "mastery-grid";
  if (line.includes("item bank")) return "quest";
  if (line.includes("duel")) return "duels";
  if (line.includes("included guide session")) return "session";
  if (line.includes("live guide")) return "guide-session";
  if (line.includes("pre-session brief")) return "brief";
  if (line.includes("member session rate")) return "momentum";
  if (line.includes("movement receipt")) return "movement-receipt";
  if (line.includes("timeline") || line.includes("archive")) return "mastery-grid";
  if (line.includes("goal pace")) return "receipt";
  if (line.includes("retest")) return "quest";
  if (line.includes("guide memory") || line.includes("brief archive")) return "guide-session";
  if (line.includes("trajectory certificate")) return "rank-proof";
  if (line.includes("loop sla")) return "loop-report";
  return "verified";
}
