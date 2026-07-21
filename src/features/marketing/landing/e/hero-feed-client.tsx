"use client";

import dynamic from "next/dynamic";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";
import {
  LANDING_E,
  LANDING_HERO_FEED_VISIBLE_LIMIT,
} from "@/features/marketing/landing/landing-copy-pure";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { LandingHeroCtaSection } from "@/features/marketing/landing/e/hero-cta-section";

const LiveBoardFeed = dynamic(
  () => import("@/features/live-board/ui/live-board-feed").then((m) => m.LiveBoardFeed),
  {
    ssr: false,
    loading: () => (
      <BklitShimmer
        className="h-[16.5rem] w-full rounded-lg border border-white/10"
        aria-label="Loading live Arena feed"
      />
    ),
  },
);

type Props = {
  initialEvents: LiveBoardEventRow[];
  leaders: ArenaLeaderProfile[];
  moreTodayCount: number;
};

/** Hydrates live feed + CTAs after first paint. */
export function LandingHeroFeedClient({ initialEvents, leaders, moreTodayCount }: Props) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <LiveBoardFeed
        initialEvents={initialEvents}
        leaders={leaders}
        visibleLimit={LANDING_HERO_FEED_VISIBLE_LIMIT}
        hideDivisionWar
        hideEyebrow
        moreTodayCount={moreTodayCount}
        moreTodayHref={LANDING_E.feedMoreTodayHref}
        moreTodayLabel={LANDING_E.feedMoreToday}
      />
      <LandingHeroCtaSection />
    </div>
  );
}
