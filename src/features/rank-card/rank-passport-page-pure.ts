import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { PassportVerdict, RankCardData, RankPassportReceipt } from "@/features/rank-card/types";
import { formatStudentHomeAccuracyMath } from "@/features/student-home/student-home-verdict-pure";
import { peerTopPercent } from "@/features/xp/rank-statistics-pure";

export function resolvePassportVerifiedMetrics(data: RankCardData) {
  return formatStudentHomeAccuracyMath(data.verifiedSkillCount, data.verifiedAccuracyPercent);
}

/** Playfair watermark behind the Skill Proof First try card — correct count, not total verified. */
export function passportFirstTryWatermark(data: RankCardData): number {
  return resolvePassportVerifiedMetrics(data).correct;
}

export function rankPassportBandCaption(bandScore: number | null): string {
  if (bandScore == null) return `Building proof on ${AP_CALC_AB_SUBJECT}`;
  return `Proof tier ${bandScore} on ${AP_CALC_AB_SUBJECT}`;
}

export function rankPassportBandFootnote(): string {
  return "";
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

export type PassportBreakthroughSummary = {
  count: number;
  receiptsWithPercent: number;
  bestLift: number | null;
  bestLiftNodeName: string | null;
  avgLift: number | null;
};

export function summarizePassportBreakthroughs(receipts: RankPassportReceipt[]): PassportBreakthroughSummary {
  const withPercent = receipts.filter(
    (receipt) => receipt.prePercent != null && receipt.postPercent != null,
  );
  const lifts = withPercent.map((receipt) => receipt.postPercent! - receipt.prePercent!);
  const bestIndex = lifts.length > 0 ? lifts.indexOf(Math.max(...lifts)) : -1;
  const bestReceipt = bestIndex >= 0 ? withPercent[bestIndex] : null;

  return {
    count: receipts.length,
    receiptsWithPercent: withPercent.length,
    bestLift: bestReceipt ? bestReceipt.postPercent! - bestReceipt.prePercent! : null,
    bestLiftNodeName: bestReceipt?.nodeName ?? null,
    avgLift:
      lifts.length > 0
        ? Math.round(lifts.reduce((sum, lift) => sum + lift, 0) / lifts.length)
        : null,
  };
}

export function pickBestPassportBreakthroughReceipt(
  receipts: RankPassportReceipt[],
): RankPassportReceipt | null {
  if (receipts.length === 0) return null;

  let best: RankPassportReceipt | null = null;
  let bestLift = -1;

  for (const receipt of receipts) {
    const lift = breakthroughReceiptLift(receipt);
    if (lift != null && lift > bestLift) {
      bestLift = lift;
      best = receipt;
    }
  }

  return best ?? receipts[0] ?? null;
}

export function rankPassportBreakthroughConciseVerdict(
  best: RankPassportReceipt | null,
  totalCount: number,
): string {
  if (!best || totalCount <= 0) return "No breakthrough receipts yet.";

  const lift = breakthroughReceiptLift(best);
  if (lift != null && best.prePercent != null && best.postPercent != null) {
    const more = totalCount > 1 ? ` ${totalCount - 1} more on record.` : "";
    return `${best.nodeName} moved ${best.prePercent}% to ${best.postPercent}% (+${lift}%).${more}`;
  }

  return `${best.nodeName}: ${best.beforeState} to ${best.afterState}.`;
}

export function rankPassportBreakthroughVerdict(summary: PassportBreakthroughSummary): string {
  if (summary.count <= 0) return "No breakthrough receipts yet.";
  if (summary.bestLift != null && summary.bestLiftNodeName) {
    return `${summary.count} breakthrough${summary.count === 1 ? "" : "s"} on ${AP_CALC_AB_SUBJECT}, best jump +${summary.bestLift}% on ${summary.bestLiftNodeName}.`;
  }
  return `${summary.count} breakthrough${summary.count === 1 ? "" : "s"} recorded on ${AP_CALC_AB_SUBJECT}.`;
}

export function breakthroughReceiptLift(receipt: RankPassportReceipt): number | null {
  if (receipt.prePercent == null || receipt.postPercent == null) return null;
  return receipt.postPercent - receipt.prePercent;
}

export function breakthroughReceiptDisplayValue(receipt: RankPassportReceipt): string {
  if (receipt.prePercent != null && receipt.postPercent != null) {
    return `${receipt.prePercent}%→${receipt.postPercent}%`;
  }
  return `${receipt.beforeState}→${receipt.afterState}`;
}

export function rankPassportRecordVerdict(vfaStreakLongest: number, vfaStreakDays: number): string {
  if (vfaStreakLongest <= 0) return "No proof streak recorded yet.";
  if (vfaStreakDays > 0) {
    return `${vfaStreakLongest} day best streak holds; ${vfaStreakDays} day proof streak active.`;
  }
  return `${vfaStreakLongest} day best streak on record.`;
}
