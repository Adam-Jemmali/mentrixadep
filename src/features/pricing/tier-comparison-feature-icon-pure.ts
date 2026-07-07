import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import {
  CANONICAL_BRIEF_ICON,
  CANONICAL_MASTERY_GRID_ICON,
  CANONICAL_MOMENTUM_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_RANK_PROOF_ICON,
  CANONICAL_RECEIPT_ICON,
  CANONICAL_SESSION_ICON,
  CANONICAL_LOOP_REPORT_ICON,
} from "@/shared/icons/vocab-canonical";

/** Map tier comparison feature labels to vocabulary icons for the landing pricing table. */
export function tierComparisonFeatureIcon(feature: string): VocabIconName {
  const line = feature.toLowerCase();
  if (line.includes("mastery grid")) return CANONICAL_MASTERY_GRID_ICON;
  if (line.includes("item bank")) return CANONICAL_QUEST_ICON;
  if (line.includes("duel")) return "duels";
  if (line.includes("beat line")) return "duels";
  if (line.includes("included guide session")) return CANONICAL_SESSION_ICON;
  if (line.includes("live guide")) return CANONICAL_SESSION_ICON;
  if (line.includes("pre-session brief")) return CANONICAL_BRIEF_ICON;
  if (line.includes("member session rate")) return CANONICAL_MOMENTUM_ICON;
  if (line.includes("movement receipt")) return CANONICAL_RECEIPT_ICON;
  if (line.includes("playbook")) return CANONICAL_MOMENTUM_ICON;
  if (line.includes("action queue")) return CANONICAL_QUEST_ICON;
  if (line.includes("proof chain") || line.includes("counterfactual")) return CANONICAL_LOOP_REPORT_ICON;
  if (line.includes("trajectory") || line.includes("loop velocity")) return CANONICAL_RANK_PROOF_ICON;
  if (line.includes("timeline") || line.includes("archive")) return CANONICAL_MASTERY_GRID_ICON;
  if (line.includes("goal pace")) return CANONICAL_RECEIPT_ICON;
  if (line.includes("retest")) return CANONICAL_QUEST_ICON;
  if (line.includes("guide memory") || line.includes("brief archive")) return CANONICAL_SESSION_ICON;
  if (line.includes("trajectory certificate")) return CANONICAL_RANK_PROOF_ICON;
  if (line.includes("loop sla")) return CANONICAL_LOOP_REPORT_ICON;
  return "verified";
}
