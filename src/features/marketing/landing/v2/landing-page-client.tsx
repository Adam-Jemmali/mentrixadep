"use client";

import { useEffect } from "react";
import { HeroClimbSection } from "@/features/marketing/landing/v2/sections/hero-climb-section";
import {
  DeferredDualPathSection,
  DeferredFeaturesBentoSection,
  DeferredFlowStepsSection,
  DeferredGuideSection,
  DeferredLandingFooterBlock,
  DeferredLandingFaqSection,
  DeferredLandingStoryBridge,
  DeferredOutcomesSection,
  DeferredPricingSection,
  DeferredRankLadderShowcase,
  DeferredSocialProofStrip,
  DeferredWhyMentrixSection,
} from "@/features/marketing/landing/v2/landing-page-deferred";
import { markLandingSection } from "@/features/marketing/landing-perf";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_STORY_BRIDGES } from "@/features/marketing/landing/landing-copy-pure";
import { useTrack } from "@/shared/integrations/use-track";

export function LandingPageClient() {
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

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const cleanups = [
      markLandingSection("hero", "hero"),
      markLandingSection("outcomes", "outcomes"),
      markLandingSection("features", "features"),
      markLandingSection("ranks", "rank-ladder"),
      markLandingSection("flow", "flow"),
      markLandingSection("guide", "guide"),
      markLandingSection("path", "dual-path"),
      markLandingSection("pricing", "pricing"),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return (
    <div className={landingHub.pageRoot}>
      <HeroClimbSection />

      <DeferredSocialProofStrip />

      <DeferredLandingStoryBridge
        chapter={LANDING_STORY_BRIDGES[0].chapter}
        title={LANDING_STORY_BRIDGES[0].title}
        subtitle={LANDING_STORY_BRIDGES[0].subtitle}
      />

      <DeferredOutcomesSection />

      <DeferredLandingStoryBridge
        chapter={LANDING_STORY_BRIDGES[1].chapter}
        title={LANDING_STORY_BRIDGES[1].title}
        subtitle={LANDING_STORY_BRIDGES[1].subtitle}
      />

      <DeferredFeaturesBentoSection />

      <DeferredRankLadderShowcase />

      <DeferredWhyMentrixSection />

      <DeferredLandingStoryBridge
        chapter={LANDING_STORY_BRIDGES[2].chapter}
        title={LANDING_STORY_BRIDGES[2].title}
        subtitle={LANDING_STORY_BRIDGES[2].subtitle}
      />

      <DeferredGuideSection />

      <DeferredFlowStepsSection />

      <DeferredDualPathSection />

      <div id="pricing" className="lp-section-reveal">
        <DeferredPricingSection />
      </div>

      <DeferredLandingFaqSection />

      <DeferredLandingFooterBlock />
    </div>
  );
}
