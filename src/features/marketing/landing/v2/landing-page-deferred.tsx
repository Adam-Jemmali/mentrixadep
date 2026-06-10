"use client";

import dynamic from "next/dynamic";

function SectionFallback({ className = "min-h-[240px]" }: { className?: string }) {
  return <div className={className} aria-hidden />;
}

export const DeferredSocialProofStrip = dynamic(
  () => import("@/features/marketing/social-proof-strip").then((m) => m.SocialProofStrip),
  { loading: () => <SectionFallback className="min-h-[320px] border-y border-white/10" /> },
);

export const DeferredOutcomesSection = dynamic(
  () => import("@/features/marketing/landing/v2/sections/outcomes-section").then((m) => m.OutcomesSection),
  { loading: () => <SectionFallback /> },
);

export const DeferredFeaturesBentoSection = dynamic(
  () => import("@/features/marketing/landing/v2/sections/features-bento-section").then((m) => m.FeaturesBentoSection),
  { loading: () => <SectionFallback className="min-h-[480px]" /> },
);

export const DeferredRankLadderShowcase = dynamic(
  () => import("@/features/marketing/landing/v2/sections/rank-ladder-showcase").then((m) => m.RankLadderShowcase),
  { loading: () => <SectionFallback /> },
);

export const DeferredWhyMentrixSection = dynamic(
  () => import("@/features/marketing/landing/v2/sections/why-mentrix-section").then((m) => m.WhyMentrixSection),
  { loading: () => <SectionFallback /> },
);

export const DeferredFlowStepsSection = dynamic(
  () => import("@/features/marketing/landing/v2/sections/flow-steps-section").then((m) => m.FlowStepsSection),
  { loading: () => <SectionFallback className="min-h-[360px]" /> },
);

export const DeferredDualPathSection = dynamic(
  () => import("@/features/marketing/landing/v2/sections/dual-path-section").then((m) => m.DualPathSection),
  { loading: () => <SectionFallback className="min-h-[420px]" /> },
);

export const DeferredPricingSection = dynamic(
  () => import("@/shared/ui/pricing"),
  { loading: () => <SectionFallback className="min-h-[520px]" /> },
);

export const DeferredLandingFooterBlock = dynamic(
  () => import("@/features/marketing/landing/v2/sections/landing-footer-block").then((m) => m.LandingFooterBlock),
  { loading: () => <SectionFallback className="min-h-[200px]" /> },
);
