import type { Metadata } from "next";
import { MarketingLandingNav } from "@/features/marketing/marketing-landing-nav";
import { LandingPageClient } from "@/features/marketing/landing/v2/landing-page-client";
import { getSiteUrl, SITE_NAME } from "@/shared/core/site";
import { LANDING_METADATA } from "@/features/marketing/landing/landing-copy-pure";

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

export default async function Home() {
  return (
    <>
      <MarketingLandingNav />
      <LandingPageClient />
    </>
  );
}
