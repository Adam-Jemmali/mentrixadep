import type { LiveBoardEventRow } from "@/features/live-board/types";

export const ARENA_PAGE_COPY = {
  title: "AP Calculus AB — Live Rank Arena",
  subtitle:
    "Real faces. Real account ranks. Gold Top % is verified peer standing from first attempts only.",
  cta: "Take this test and see where you rank",
  ctaHref: "/try",
  feedEyebrow: "Live right now",
  leadersTitle: "Who is ahead right now",
  leadersSubtitle:
    "Account rank matches the student hub. Top % is the verified cohort verdict. Tap a card for the full passport.",
  emptyFeed: "No live events yet. Lock your first skill to appear here.",
  liveRibbonLabel: "In the arena now",
} as const;

export function liveBoardEventTypeLabel(
  eventType: LiveBoardEventRow["event_type"],
): string {
  switch (eventType) {
    case "verified_attempt":
      return "First try locked";
    case "rank_advance":
      return "Rank up";
    case "breakthrough":
      return "Breakthrough";
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
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  const hours = Math.floor(delta / MS_HOUR);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(delta / MS_DAY);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function formatAccuracyPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "0";
  const rounded = Math.round(value);
  return String(rounded);
}

export function formatLiveBoardEventDescription(event: Pick<
  LiveBoardEventRow,
  "event_type" | "node_name" | "accuracy_pct" | "new_rank_tier"
>): string {
  switch (event.event_type) {
    case "verified_attempt":
      return `scored ${formatAccuracyPct(event.accuracy_pct)} percent on ${event.node_name} for the first time`;
    case "rank_advance":
      return `advanced to ${event.new_rank_tier?.trim() || "a new rank"}`;
    case "breakthrough":
      return `broke through ${event.node_name}`;
    default:
      return event.node_name;
  }
}
