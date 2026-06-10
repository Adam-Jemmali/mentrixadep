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
  DeferredOutcomesSection,
  DeferredPricingSection,
  DeferredRankLadderShowcase,
  DeferredSocialProofStrip,
  DeferredWhyMentrixSection,
} from "@/features/marketing/landing/v2/landing-page-deferred";
import { markLandingSection } from "@/features/marketing/landing-perf";
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
    <div className="lp-root bg-arena-bg">
      <LandingScrollProgress />
      <HeroClimbSection />

      <DeferredSocialProofStrip />

      <LandingStoryBridge
        chapter="Chapter 01"
        title="One arena. Every skill you take seriously."
        subtitle="Courses end. Rank does not. Mentrixa is not a content library you finish and forget. It is a competitive arena you return to every time you want proof the skill is real."
      />

      <DeferredOutcomesSection />

      <LandingStoryBridge
        chapter="Chapter 02"
        title="A number that tells the truth."
        subtitle="Most learners have no idea if they are improving. They confuse hours spent with progress made. Mentrixa turns every quest, duel, and session into a score. Public. Permanent. Undeniable."
      />

      <DeferredFeaturesBentoSection />

      <DeferredRankLadderShowcase />

      <DeferredWhyMentrixSection />

      <LandingStoryBridge
        chapter="Chapter 03"
        title="The same 4 moves. Any skill you enter."
        subtitle="Every learner who improves on Mentrixa runs the same loop. Book when stuck. Meet the Guide live. Unpack what you learned. Climb tomorrow. The subject changes. The loop does not."
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

      <DeferredLandingFooterBlock />
    </div>
  );
}
