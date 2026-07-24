import type { LiveBoardEventRow } from "@/features/live-board/types";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export const ARENA_PAGE_COPY = {
  title: "AP Calculus AB Live Rank Arena",
  titleLine1: "AP Calculus AB",
  titleLine2: "Live Rank Arena",
  subtitle: "Every score here is a first try on Calculus AB",
  subtitleLive: "Updated as it happens",
  cta: "Take this test and see where you rank",
  ctaHref: "/try",
  feedEyebrow: "Live feed",
  leadersTitle: "Top 5 by verified first try accuracy",
  leadersSubtitle: "Calculus AB standing from first tries on the rank",
  leadersEmpty: "Leaderboard fills once five verified skills are locked",
  emptyFeed: "Answer your first skill to appear on the feed",
  divisionWarEyebrow: "Division War",
  navBack: "Back to home",
} as const;

/** Visible rows in the compact landing hero feed viewport. */
export const ARENA_FEED_VISIBLE_LIMIT = 12;

/** Arena board page live feed cap. */
export const ARENA_BOARD_FEED_LIMIT = 50;

/** Arena board top leaders cap. */
export const ARENA_LEADERS_LIMIT = 5;

export const LANDING_HERO_FEED_ROW_HEIGHT_REM = 2.75;

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

/** Screen reader announcement for new live feed rows (aria-live). */
export function formatLiveBoardEventAnnouncement(
  event: Pick<
    LiveBoardEventRow,
    "event_type" | "node_name" | "accuracy_pct" | "new_rank_tier" | "display_name" | "unit_name"
  >,
): string {
  if (isDivisionWarLiveBoardEvent(event.event_type)) {
    return formatArenaBoardWarHeadline(event);
  }
  return formatLiveBoardEventDescription(event);
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
      return `${name} tried ${event.node_name}`;
    case "rank_advance":
      return `${name} reached ${event.new_rank_tier?.trim() || "new rank"}`;
    case "breakthrough":
      return `${name} broke through ${event.node_name}`;
    case "division_war_result":
      return event.display_name.trim();
    default:
      return event.node_name;
  }
}

/** Arena board row event text without display name. */
export function formatArenaBoardEventText(
  event: Pick<
    LiveBoardEventRow,
    "event_type" | "node_name" | "accuracy_pct" | "new_rank_tier"
  >,
): string {
  const skill = event.node_name.trim() || "a skill";
  switch (event.event_type) {
    case "verified_attempt": {
      const pct = Math.round(Number(event.accuracy_pct ?? 0));
      return `scored ${pct}% on ${skill} first time`;
    }
    case "rank_advance":
      return `advanced to ${event.new_rank_tier?.trim() || "new rank"}`;
    case "breakthrough":
      return `broke through ${skill}`;
    case "division_war_result":
      return skill;
    default:
      return skill;
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

export function formatArenaBoardWarHeadline(
  event: Pick<
    LiveBoardEventRow,
    "node_name" | "unit_name" | "accuracy_pct" | "display_name"
  >,
): string {
  const copy = buildDivisionWarResultCardCopy(event);
  return `${copy.winnerName} defeated ${copy.loserName}`;
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
