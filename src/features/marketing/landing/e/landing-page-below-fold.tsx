"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { LandingStatItem } from "@/features/marketing/landing-stats";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LandingHowItWorksSection } from "@/features/marketing/landing/e/how-it-works-section";
import { LandingGuidesSection } from "@/features/marketing/landing/e/guides-section";
import { LandingFinalCtaSection } from "@/features/marketing/landing/e/final-cta-section";
import { useTrack } from "@/shared/integrations/use-track";

const LandingProofSection = dynamic(
  () =>
    import("@/features/marketing/landing/e/proof-section").then((m) => m.LandingProofSection),
  { ssr: false },
);

const DeferredLandingFooterBlock = dynamic(
  () =>
    import("@/features/marketing/landing/v2/sections/landing-footer-block").then(
      (m) => m.LandingFooterBlock,
    ),
  { loading: () => <div className="min-h-[200px]" aria-hidden /> },
);

type Props = {
  stats: LandingStatItem[];
};

/** Below-the-fold Lenis scroll sections — sticky note desk. */
export function LandingPageBelowFold({ stats }: Props) {
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
    <div className={landingHub.pageRoot}>
      <LandingHowItWorksSection />
      <LandingProofSection stats={stats} />
      <LandingGuidesSection />
      <LandingFinalCtaSection />
      <DeferredLandingFooterBlock />
    </div>
  );
}
