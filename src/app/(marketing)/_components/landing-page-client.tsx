"use client";

import { useEffect } from "react";
import { HeroSection } from "@/app/(marketing)/_components/hero-section";
import { HowItWorksSection } from "@/app/(marketing)/_components/how-it-works-section";
import { ProofSection } from "@/app/(marketing)/_components/proof-section";
import { GuidesSection } from "@/app/(marketing)/_components/guides-section";
import { FinalCtaSection } from "@/app/(marketing)/_components/final-cta-section";
import type { LandingStatsPayload } from "@/features/marketing/landing-stats";
import type { ArenaLeaderProfile } from "@/features/live-board/load-arena-leader-profile";
import type { LiveBoardEventRow } from "@/features/live-board/types";
import { useTrack } from "@/shared/integrations/use-track";

type LandingPageClientProps = {
  initialEvents: LiveBoardEventRow[];
  leaders: ArenaLeaderProfile[];
  todayCount: number;
  landingStats: LandingStatsPayload;
};

export function LandingPageClient({
  initialEvents,
  leaders,
  todayCount,
  landingStats,
}: LandingPageClientProps) {
  const track = useTrack();

  useEffect(() => {
    track("page_view_landing");
  }, [track]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const query = url.searchParams;
    const hashRaw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const hash = new URLSearchParams(hashRaw);

    if (
      hash.get("type") === "recovery" &&
      (hash.get("access_token") || hash.get("refresh_token") || hash.get("token_hash"))
    ) {
      window.location.replace(`/auth/reset-password#${hash.toString()}`);
      return;
    }

    const queryType = query.get("type");
    const queryCode = query.get("code");
    const queryTokenHash = query.get("token_hash");
    if (queryType === "recovery" && (queryCode || queryTokenHash)) {
      const next = new URLSearchParams();
      next.set("type", "recovery");
      if (queryCode) next.set("code", queryCode);
      if (queryTokenHash) next.set("token_hash", queryTokenHash);
      window.location.replace(`/auth/reset-password?${next.toString()}`);
      return;
    }

    if (query.get("error_code") === "otp_expired" || hash.get("error_code") === "otp_expired") {
      window.location.replace("/auth/forgot-password?error=expired");
    }
  }, []);

  return (
    <>
      <HeroSection
        initialEvents={initialEvents}
        leaders={leaders}
        todayCount={todayCount}
      />
      <HowItWorksSection />
      <ProofSection stats={landingStats.stats} />
      <GuidesSection />
      <FinalCtaSection />
    </>
  );
}
