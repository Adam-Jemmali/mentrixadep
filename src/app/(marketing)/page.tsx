import type { Metadata } from "next";
import { MarketingLandingNav } from "@/features/marketing/marketing-landing-nav";
import { LandingHeroSentence } from "@/features/marketing/landing/e/hero-sentence";
import { LandingHeroFeedClient } from "@/features/marketing/landing/e/hero-feed-client";
import { LandingPageBelowFold } from "@/features/marketing/landing/e/landing-page-below-fold";
import {
  LANDING_HERO_FEED_VISIBLE_LIMIT,
  LANDING_METADATA,
} from "@/features/marketing/landing/landing-copy-pure";
import { getLandingStats } from "@/features/marketing/landing-stats";
import {
  loadArenaLeaders,
  loadLiveBoardEvents,
  loadLiveBoardEventsTodayCount,
} from "@/features/live-board/load-live-board-snapshot";
import { getSiteUrl, SITE_NAME } from "@/shared/core/site";

const V2_DESCRIPTION = LANDING_METADATA.description;

export const metadata: Metadata = {
  title: `${SITE_NAME} | ${LANDING_METADATA.titleSuffix}`,
  description: V2_DESCRIPTION,
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    url: getSiteUrl(),
    title: `${SITE_NAME} | ${LANDING_METADATA.titleSuffix}`,
    description: V2_DESCRIPTION,
  },
};

/** SSR nav + hero sentence immediately; live feed hydrates after first paint. */
export default async function Home() {
  const [initialEvents, leaders, eventsTodayCount, landingStats] = await Promise.all([
    loadLiveBoardEvents(LANDING_HERO_FEED_VISIBLE_LIMIT * 3),
    loadArenaLeaders(10),
    loadLiveBoardEventsTodayCount(),
    getLandingStats(),
  ]);

  const moreTodayCount = Math.max(0, eventsTodayCount - LANDING_HERO_FEED_VISIBLE_LIMIT);

  return (
    <>
      <MarketingLandingNav />
      <section
        aria-label="Live Arena hero"
        className="relative bg-[var(--mx-navy,#0B1220)] px-4 pb-12 pt-[calc(3.5rem+1.5rem)] sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <LandingHeroSentence />
          <LandingHeroFeedClient
            initialEvents={initialEvents}
            leaders={leaders}
            moreTodayCount={moreTodayCount}
          />
        </div>
      </section>
      <LandingPageBelowFold stats={landingStats.stats} />
    </>
  );
}
