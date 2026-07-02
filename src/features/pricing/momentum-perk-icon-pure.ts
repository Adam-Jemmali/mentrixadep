import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/** Map Momentum perk copy to the closest product vocabulary icon (existing SVG assets only). */
export function momentumPerkVocabIcon(receipt: string): VocabIconName {
  const line = receipt.toLowerCase();
  if (line.includes("movement receipt")) return "movement-receipt";
  if (line.includes("included guide session") || line.includes("session credit")) return "session";
  if (line.includes("member session rate") || line.includes("versus")) return "momentum";
  if (line.includes("priority retest")) return "quest";
  if (line.includes("mastery grid timeline") || line.includes("progress archive")) return "mastery-grid";
  if (line.includes("loop report")) return "loop-report";
  if (line.includes("goal pace")) return "receipt";
  if (line.includes("guide impact")) return "impact-score";
  if (line.includes("pre-session brief")) return "brief";
  if (line.includes("guide memory") || line.includes("brief archive")) return "guide-session";
  if (line.includes("trajectory certificate")) return "rank-proof";
  if (line.includes("loop sla")) return "loop-report";
  return "momentum";
}
