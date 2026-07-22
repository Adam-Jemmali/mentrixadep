import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { PassportVerdict, RankPassportReceipt } from "@/features/rank-card/types";
import { peerTopPercent } from "@/features/xp/rank-statistics-pure";

export function rankPassportBandCaption(bandScore: number | null): string {
  if (bandScore == null) return `Building proof on ${AP_CALC_AB_SUBJECT}`;
  return `Proof tier ${bandScore} on ${AP_CALC_AB_SUBJECT}`;
}

export function rankPassportBandFootnote(): string {
  return "First attempt only";
}

export function rankPassportAccuracyHeadline(accuracyPercent: number, topPercent: number | null): string {
  if (topPercent != null) {
    return `${accuracyPercent}% first try Top ${topPercent}%`;
  }
  return `${accuracyPercent}% first try`;
}

export function rankPassportPeerValue(verdict: PassportVerdict, percentile: number | null): string {
  if (verdict.kind === "ranked") {
    return `${verdict.topPercent}%`;
  }
  if (percentile != null) {
    return `${peerTopPercent(percentile)}%`;
  }
  return "—";
}

export function formatBreakthroughReceiptLine(receipt: RankPassportReceipt): string {
  if (receipt.prePercent != null && receipt.postPercent != null) {
    return `${receipt.nodeName} ${receipt.prePercent}% to ${receipt.postPercent}% ${receipt.date}`;
  }
  return `${receipt.nodeName} ${receipt.beforeState} to ${receipt.afterState} ${receipt.date}`;
}
