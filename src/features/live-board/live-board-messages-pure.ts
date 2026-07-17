import type { LiveBoardEventRow } from "@/features/live-board/types";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export const ARENA_PAGE_COPY = {
  title: "AP Calculus AB Live Rank Arena",
  subtitle: "Every score here is a first attempt. No retries. Updated as it happens.",
  cta: "Take this test and see where you rank",
  ctaHref: "/try",
  feedEyebrow: "Live feed",
  leadersTitle: "Top 10 by verified accuracy",
  leadersSubtitle: "AP Calculus AB first-attempt standing from the rank.",
  emptyFeed: "No live events yet. Lock your first skill to appear here.",
  divisionWarEyebrow: "Division War",
} as const;

/** Visible rows in the compact Arena feed viewport. */
export const ARENA_FEED_VISIBLE_LIMIT = 12;

export function liveBoardEventTypeLabel(
  eventType: LiveBoardEventRow["event_type"],
): string {
  switch (eventType) {
    case "verified_attempt":
      return "First try";
    case "rank_advance":
      return "Rank up";
    case "breakthrough":
      return "Breakthrough";
    case "division_war_result":
      return "Division War";
    default:
      return "Update";
  }
}

export function liveBoardEventVocabIcon(
  eventType: LiveBoardEventRow["event_type"],
): VocabIconName {
  switch (eventType) {
    case "verified_attempt":
      return "verified";
    case "rank_advance":
      return "rank-proof";
    case "breakthrough":
      return "breakthrough";
    case "division_war_result":
      return "leaderboard";
    default:
      return "practice-pack";
  }
}

const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

export function formatLiveBoardTimeAgo(
  iso: string,
  nowMs: number = Date.now(),
): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "just now";

  const delta = Math.max(0, nowMs - then);
  if (delta < MS_MINUTE) return "just now";

  const minutes = Math.floor(delta / MS_MINUTE);
  if (minutes < 60) {
    return minutes === 1 ? "1m ago" : `${minutes}m ago`;
  }

  const hours = Math.floor(delta / MS_HOUR);
  if (hours < 24) {
    return hours === 1 ? "1h ago" : `${hours}h ago`;
  }

  const days = Math.floor(delta / MS_DAY);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

export function formatLiveBoardEventDescription(event: Pick<
  LiveBoardEventRow,
  "event_type" | "node_name" | "accuracy_pct" | "new_rank_tier" | "display_name"
>): string {
  const name = event.display_name.trim() || "A Mentrixer";
  switch (event.event_type) {
    case "verified_attempt":
      if (event.accuracy_pct === 100) return `${name} locked ${event.node_name}`;
      if (event.accuracy_pct === 0) return `${name} missed ${event.node_name}`;
      return `${name} · ${event.node_name}`;
    case "rank_advance":
      return `${name} → ${event.new_rank_tier?.trim() || "new rank"}`;
    case "breakthrough":
      return `${name} broke through ${event.node_name}`;
    case "division_war_result":
      return event.display_name.trim();
    default:
      return event.node_name;
  }
}

export function formatDivisionWarScoreLine(
  winnerName: string,
  winnerPoints: number,
  loserName: string,
  loserPoints: number,
): string {
  return `${winnerName.trim()} ${winnerPoints} · ${loserName.trim()} ${loserPoints}`;
}

/** Encode loser side into unit_name: "Loser Name|68". */
export function encodeDivisionWarLoserMeta(
  loserName: string,
  loserAccuracyPct: number,
): string {
  const name = loserName.trim() || "Division";
  return `${name}|${Math.round(loserAccuracyPct)}`;
}

export function parseDivisionWarLoserMeta(
  unitName: string,
): { loserName: string; loserAccuracyPct: number } | null {
  const raw = unitName.trim();
  const pipe = raw.indexOf("|");
  if (pipe > 0) {
    const loserName = raw.slice(0, pipe).trim();
    const loserAccuracyPct = Number(raw.slice(pipe + 1).trim());
    if (loserName && Number.isFinite(loserAccuracyPct)) {
      return { loserName, loserAccuracyPct: Math.round(loserAccuracyPct) };
    }
  }

  // Legacy points line: "Winner 842 · Loser 710"
  const legacy = raw.match(/^(.+?)\s+\d+(?:\.\d+)?\s+·\s+(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (legacy?.[2] && legacy[3]) {
    return {
      loserName: legacy[2].trim(),
      loserAccuracyPct: Math.round(Number(legacy[3])),
    };
  }

  return null;
}

export type DivisionWarResultCardCopy = {
  winnerName: string;
  loserName: string;
  winnerAccuracyPct: number;
  loserAccuracyPct: number;
  weekLabel: string;
  loserNote: string;
};

export const DIVISION_WAR_WEEK_LABEL = "This week in AP Calculus AB";

export function formatDivisionWarLoserNote(
  loserName: string,
  loserAccuracyPct: number,
): string {
  const name = loserName.trim() || "Division";
  return `${name} pushed hard this week. ${Math.round(loserAccuracyPct)} percent average accuracy.`;
}

export function formatDivisionWarAccuracyLine(accuracyPct: number): string {
  return `${Math.round(accuracyPct)} percent average`;
}

/** Build card copy from a stored live_board_events war row. */
export function buildDivisionWarResultCardCopy(
  event: Pick<LiveBoardEventRow, "node_name" | "unit_name" | "accuracy_pct" | "display_name">,
): DivisionWarResultCardCopy {
  const winnerName = event.node_name.trim() || "Division";
  const loserMeta = parseDivisionWarLoserMeta(event.unit_name);
  const loserName =
    loserMeta?.loserName ??
    (() => {
      const m = event.display_name.match(/\bdefeated\s+(.+)$/i);
      return m?.[1]?.trim() || "Division";
    })();
  const winnerAccuracyPct = Math.round(Number(event.accuracy_pct ?? 0));
  const loserAccuracyPct = loserMeta?.loserAccuracyPct ?? 0;

  return {
    winnerName,
    loserName,
    winnerAccuracyPct,
    loserAccuracyPct,
    weekLabel: DIVISION_WAR_WEEK_LABEL,
    loserNote: formatDivisionWarLoserNote(loserName, loserAccuracyPct),
  };
}

/** Average accuracy from summed quest percentages / quest count. */
export function divisionWarAverageAccuracy(
  totalAccuracyPoints: number,
  questsCompleted: number,
): number {
  if (questsCompleted <= 0) return 0;
  return Math.round(totalAccuracyPoints / questsCompleted);
}

export function isDivisionWarLiveBoardEvent(
  eventType: LiveBoardEventRow["event_type"],
): boolean {
  return eventType === "division_war_result";
}
