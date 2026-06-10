import type { Metadata } from "next";
import { MarketingLandingNav } from "@/features/marketing/marketing-landing-nav";
import { LandingPageClient } from "@/features/marketing/landing/v2/landing-page-client";
import { getSiteUrl, SITE_NAME } from "@/shared/core/site";

const V2_DESCRIPTION =
  "The ranked world for learning. Prove what you know with public rank, daily quests, and duels. Free to compete. Book a verified Guide when you need a breakthrough.";

export const metadata: Metadata = {
  title: `${SITE_NAME} | Prove what you know`,
  description: V2_DESCRIPTION,
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    url: getSiteUrl(),
    title: `${SITE_NAME} | Prove what you know`,
    description: V2_DESCRIPTION,
  },
};

export default async function Home() {
  return (
    <>
      <MarketingLandingNav />
      <LandingPageClient />
    </>
  );
}
