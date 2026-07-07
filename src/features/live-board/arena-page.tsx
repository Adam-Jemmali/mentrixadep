import type { Metadata } from "next";
import { ArenaPageClient } from "@/features/live-board/ui/arena-page-client";
import {
  loadArenaLeaders,
  loadLiveBoardEvents,
} from "@/features/live-board/load-live-board-snapshot";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Live Rank Arena · AP Calculus AB · Mentrixa",
  description:
    "Watch verified first attempts on AP Calculus AB move in real time. Every score is a first try. No retries.",
  alternates: {
    canonical: `${getSiteUrl()}/arena`,
  },
  openGraph: {
    title: "AP Calculus AB Live Rank Arena · Mentrixa",
    description:
      "Public live board of verified first attempt accuracy. Updated as it happens.",
    url: `${getSiteUrl()}/arena`,
  },
};

export default async function ArenaPage() {
  const [initialEvents, leaders] = await Promise.all([
    loadLiveBoardEvents(50),
    loadArenaLeaders(10),
  ]);

  return <ArenaPageClient initialEvents={initialEvents} leaders={leaders} />;
}
