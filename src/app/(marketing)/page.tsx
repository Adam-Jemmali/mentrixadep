import type { Metadata } from "next";
import { HomePageClient } from "@/components/home-page-client";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Live tutoring, quests & divisions`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    url: getSiteUrl(),
    title: `${SITE_NAME} — Live tutoring, quests & divisions`,
    description: SITE_DESCRIPTION,
  },
};

export default function Home() {
  return <HomePageClient />;
}
