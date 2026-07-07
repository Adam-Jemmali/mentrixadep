import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";

export type LoopClosureFunnel = {
  scheduled: number;
  due: number;
  completed: number;
  positiveDelta: number;
};

export function buildLoopClosureFunnel(rows: LoopReportRow[]): LoopClosureFunnel {
  const scheduled = rows.length;
  const due = rows.filter((row) => row.isDue).length;
  const completed = rows.filter((row) => row.completedAt).length;
  const positiveDelta = rows.filter((row) => row.delta != null && row.delta > 0).length;
  return { scheduled, due, completed, positiveDelta };
}

export function formatLoopSourceLabel(sourceType: string): string {
  switch (sourceType) {
    case "session":
      return "Guide session";
    case "studio_package":
      return "Study package";
    case "breakthrough":
      return "Breakthrough";
    case "duel_loss":
      return "Duel loss";
    default:
      return "Session";
  }
}

export function buildLoopDeltaBadge(row: LoopReportRow): string | null {
  if (row.preAccuracy == null || row.postAccuracy == null) return null;
  const pre = Math.round(row.preAccuracy * 100);
  const post = Math.round(row.postAccuracy * 100);
  const delta = post - pre;
  const sign = delta > 0 ? "+" : "";
  return `${pre}% → ${post}% (${sign}${delta})`;
}

export function lockedLoopPreviewCount(totalRows: number, visibleRows: number): number {
  return Math.max(0, totalRows - visibleRows);
}
