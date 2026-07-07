import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";

export function buildLoopReportRowVerdict(row: LoopReportRow): string {
  if (row.completedAt && row.preAccuracy != null && row.postAccuracy != null) {
    return `First attempt on ${row.nodeName} moved ${Math.round(row.preAccuracy * 100)}% → ${Math.round(row.postAccuracy * 100)}% after your ${formatSource(row.sourceType)}.`;
  }
  if (row.isDue) {
    return `Retest due on ${row.nodeName} — take it now to lock movement.`;
  }
  return `Retest on ${row.nodeName} scheduled after your ${formatSource(row.sourceType)}.`;
}

export function buildLoopReportNextAction(row: LoopReportRow): string {
  if (row.isDue || !row.completedAt) {
    return `Tap Start retest below — Quest loads ${row.nodeName} in ~4 min.`;
  }
  return `Practice ${row.nodeName} once more, then book your next Guide session.`;
}

function formatSource(sourceType: string): string {
  switch (sourceType) {
    case "session":
      return "Guide session";
    case "studio_package":
      return "study package";
    case "breakthrough":
      return "breakthrough";
    case "duel_loss":
      return "duel loss";
    default:
      return "intervention";
  }
}

export function buildLoopReportHubVerdict(rows: LoopReportRow[]): {
  verdict: string;
  nextAction: string;
} {
  const due = rows.find((row) => row.isDue);
  if (due) {
    return {
      verdict: buildLoopReportRowVerdict(due),
      nextAction: buildLoopReportNextAction(due),
    };
  }
  const latestCompleted = rows.find((row) => row.completedAt);
  if (latestCompleted) {
    return {
      verdict: buildLoopReportRowVerdict(latestCompleted),
      nextAction: "View your full Loop Report for every closed loop this month.",
    };
  }
  return {
    verdict: "No closed loops yet. Book a Guide session or finish a duel to start your retest pipeline.",
    nextAction: "Browse Guides from the hub when the wall is real.",
  };
}
