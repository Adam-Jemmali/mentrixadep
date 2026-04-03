import { getLandingStats } from "@/lib/landing-stats";
import { HomePageClient } from "@/components/home-page-client";

export default async function Home() {
  const { grid, ticker } = await getLandingStats();
  return <HomePageClient stats={grid} ticker={ticker} />;
}
