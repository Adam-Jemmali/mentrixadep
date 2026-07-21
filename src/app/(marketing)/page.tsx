import type { Metadata } from "next";
import { LandingNav } from "@/app/(marketing)/_components/landing-nav";
import { LandingPageClient } from "@/app/(marketing)/_components/landing-page-client";
import { getLandingStats } from "@/features/marketing/landing-stats";
import { LANDING_METADATA } from "@/features/marketing/landing/landing-copy-pure";
import {
  loadArenaLeaders,
  loadLiveBoardEvents,
  loadLiveBoardTodayCount,
} from "@/features/live-board/load-live-board-snapshot";
import { LANDING_FEED_VISIBLE_LIMIT } from "@/features/live-board/live-board-messages-pure";
import { getSiteUrl, SITE_NAME } from "@/shared/core/site";

const DESCRIPTION =
  "Live verified first attempts on AP Calculus AB. Your first answer is permanent. Watch the board move in real time.";

export const metadata: Metadata = {
  title: `${SITE_NAME} | ${LANDING_METADATA.titleSuffix}`,
  description: DESCRIPTION,
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    url: getSiteUrl(),
    title: `${SITE_NAME} | ${LANDING_METADATA.titleSuffix}`,
    description: DESCRIPTION,
  },
};

export default async function Home() {
  const [initialEvents, leaders, todayCount, landingStats] = await Promise.all([
    loadLiveBoardEvents(LANDING_FEED_VISIBLE_LIMIT + 4),
    loadArenaLeaders(10),
    loadLiveBoardTodayCount(),
    getLandingStats(),
  ]);

  return (
    <>
      <LandingNav />
      <LandingPageClient
        initialEvents={initialEvents}
        leaders={leaders}
        todayCount={todayCount}
        landingStats={landingStats}
      />
    </>
  );
}
