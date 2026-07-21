import type { Metadata } from "next";
import { ArenaPageClient } from "@/features/live-board/ui/arena-page-client";
import {
  ARENA_BOARD_FEED_LIMIT,
  ARENA_LEADERS_LIMIT,
} from "@/features/live-board/live-board-messages-pure";
import {
  loadArenaLeaders,
  loadLiveBoardEvents,
} from "@/features/live-board/load-live-board-snapshot";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Live Rank Arena AP Calculus AB Mentrixa",
  description:
    "Watch verified first tries on Calculus AB move in real time Every score is a first try",
  alternates: {
    canonical: `${getSiteUrl()}/arena`,
  },
  openGraph: {
    title: "AP Calculus AB Live Rank Arena Mentrixa",
    description: "Public live board of verified first try accuracy Updated as it happens",
    url: `${getSiteUrl()}/arena`,
  },
};

export default async function ArenaPage() {
  const [initialEvents, leaders] = await Promise.all([
    loadLiveBoardEvents(ARENA_BOARD_FEED_LIMIT),
    loadArenaLeaders(ARENA_LEADERS_LIMIT),
  ]);

  return <ArenaPageClient initialEvents={initialEvents} leaders={leaders} />;
}
