"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { HeroClimbSection } from "@/features/marketing/landing/v2/sections/hero-climb-section";
import { LandingStoryBridge } from "@/features/marketing/landing-story-bridge";
import { LandingScrollProgress } from "@/features/marketing/landing/v2/motion/landing-scroll-progress";
import {
  DeferredDualPathSection,
  DeferredFeaturesBentoSection,
  DeferredFlowStepsSection,
  DeferredLandingFooterBlock,
  DeferredLandingFaqSection,
  DeferredOutcomesSection,
  DeferredPricingSection,
  DeferredRankLadderShowcase,
  DeferredSocialProofStrip,
  DeferredWhyMentrixSection,
} from "@/features/marketing/landing/v2/landing-page-deferred";
import { markLandingSection } from "@/features/marketing/landing-perf";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
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
      markLandingSection("path", "dual-path"),
      markLandingSection("pricing", "pricing"),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return (
    <div className={landingHub.pageRoot}>
      <LandingScrollProgress />
      <HeroClimbSection />

      <DeferredSocialProofStrip />

      <LandingStoryBridge
        chapter="Who"
        title="AP Calculus AB students who need proof, not practice."
        subtitle="If you cannot show rank against real Mentrixers, you do not know if you are ready. Mentrixa records your first attempt on each skill permanently."
      />

      <DeferredOutcomesSection />

      <LandingStoryBridge
        chapter="Why now"
        title="Every day without a verified attempt is a wrong rank."
        subtitle="The exam does not wait. Retakes feel good but never move rank. One quest run starts the record that stays public."
      />

      <DeferredFeaturesBentoSection />

      <DeferredRankLadderShowcase />

      <DeferredWhyMentrixSection />

      <LandingStoryBridge
        chapter="The loop"
        title="Four moves. Same verified loop."
        subtitle="Compete on first attempts. Book a Guide when stuck. Meet live. Climb tomorrow with proof that moved."
      />

      <DeferredFlowStepsSection />

      <DeferredDualPathSection />

      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-8%" }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        id="pricing"
      >
        <DeferredPricingSection />
      </motion.div>

      <DeferredLandingFaqSection />

      <DeferredLandingFooterBlock />
    </div>
  );
}
