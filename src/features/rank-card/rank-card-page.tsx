import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getRankCardByUsername } from "@/features/rank-card/reads";
import {
  RankCardPrivateNotice,
  RankCardPublicPage,
} from "@/features/rank-card/rank-card-public-page";
import { getSiteUrl } from "@/shared/core/site";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const card = await getRankCardByUsername(username, { skipAnalytics: true });
  if (!card) return { title: "Rank Card · Mentrixa" };
  if (card.isPrivate) {
    return { title: "Private Rank Card · Mentrixa", robots: { index: false, follow: false } };
  }

  const siteUrl = getSiteUrl();
  const ogUrl = `${siteUrl}/api/og/rank-card?username=${encodeURIComponent(username)}`;

  return {
    title: `${card.displayName} · Rank Card · Mentrixa`,
    description: `Verified competitive performance — ${card.globalRankTitle} rank on Mentrixa.`,
    openGraph: {
      title: `${card.displayName} · Mentrixa Rank Card`,
      description: `Verified competitive performance record. ${card.topSubject?.subject ?? "Arena"} · ${card.topSubject?.currentAccuracy ?? 0}% accuracy.`,
      url: `${siteUrl}/rank/${username}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${card.displayName} Rank Card` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.displayName} · Mentrixa Rank Card`,
      images: [ogUrl],
    },
  };
}

export default async function RankCardPage({ params }: Props) {
  const { username } = await params;
  const h = await headers();
  const referrer = h.get("referer");

  const card = await getRankCardByUsername(username, { referrer });
  if (!card) notFound();

  if (card.isPrivate) {
    return <RankCardPrivateNotice username={card.username} />;
  }

  return <RankCardPublicPage data={card} />;
}
