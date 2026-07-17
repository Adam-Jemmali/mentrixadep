import type { LiveBoardEventRow } from "@/features/live-board/types";

export const ARENA_PAGE_COPY = {
  title: "AP Calculus AB Live Rank Arena",
  subtitle: "Every score here is a first attempt. No retries. Updated as it happens.",
  cta: "Take this test and see where you rank",
  ctaHref: "/try",
  feedEyebrow: "Live feed",
  leadersTitle: "Top 10 by verified accuracy",
  leadersSubtitle:
    "AP Calculus AB first-attempt standing from the rank cache. No live aggregation on this page.",
  emptyFeed: "No live events yet. Lock your first skill to appear here.",
  divisionWarEyebrow: "Division War",
} as const;

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

function formatAccuracyPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "0";
  return String(Math.round(value));
}

export function formatLiveBoardEventDescription(event: Pick<
  LiveBoardEventRow,
  "event_type" | "node_name" | "accuracy_pct" | "new_rank_tier" | "display_name"
>): string {
  const name = event.display_name.trim() || "A Mentrixer";
  switch (event.event_type) {
    case "verified_attempt":
      return `${name} scored ${formatAccuracyPct(event.accuracy_pct)}% on ${event.node_name} · first try`;
    case "rank_advance":
      return `${name} advanced to ${event.new_rank_tier?.trim() || "a new rank"}`;
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

export function isDivisionWarLiveBoardEvent(
  eventType: LiveBoardEventRow["event_type"],
): boolean {
  return eventType === "division_war_result";
}
