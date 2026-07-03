import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import {
  CANONICAL_IMPACT_SCORE_ICON,
  CANONICAL_LOOP_REPORT_ICON,
  CANONICAL_MASTERY_GRID_ICON,
  CANONICAL_MOMENTUM_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_RECEIPT_ICON,
  CANONICAL_SESSION_ICON,
  CANONICAL_BRIEF_ICON,
  CANONICAL_RANK_PROOF_ICON,
} from "@/shared/icons/vocab-canonical";

/** Map Momentum perk copy to the closest product vocabulary icon (existing SVG assets only). */
export function momentumPerkVocabIcon(receipt: string): VocabIconName {
  const line = receipt.toLowerCase();
  if (line.includes("movement receipt")) return CANONICAL_RECEIPT_ICON;
  if (line.includes("included guide session") || line.includes("session credit")) return CANONICAL_SESSION_ICON;
  if (line.includes("member session rate") || line.includes("versus")) return CANONICAL_MOMENTUM_ICON;
  if (line.includes("priority retest")) return CANONICAL_QUEST_ICON;
  if (line.includes("mastery grid timeline") || line.includes("progress archive")) return CANONICAL_MASTERY_GRID_ICON;
  if (line.includes("loop report") || line.includes("loop sla")) return CANONICAL_LOOP_REPORT_ICON;
  if (line.includes("goal pace")) return CANONICAL_RECEIPT_ICON;
  if (line.includes("guide impact")) return CANONICAL_IMPACT_SCORE_ICON;
  if (line.includes("pre-session brief")) return CANONICAL_BRIEF_ICON;
  if (line.includes("guide memory") || line.includes("brief archive")) return CANONICAL_SESSION_ICON;
  if (line.includes("trajectory certificate")) return CANONICAL_RANK_PROOF_ICON;
  return CANONICAL_MOMENTUM_ICON;
}
