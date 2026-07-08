import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getRankCardByUsername } from "@/features/rank-card/reads";
import {
  RankCardPrivateNotice,
  RankCardPublicPage,
} from "@/features/rank-card/rank-card-public-page";
import { passportVerdictPlainText } from "@/features/rank-card/rank-passport-pure";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { getCurrentUser } from "@/shared/core/auth";
import { getSiteUrl } from "@/shared/core/site";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const card = await getRankCardByUsername(username, { skipAnalytics: true });
  if (!card) return { title: "Rank Passport · Mentrixa" };
  if (card.isPrivate) {
    return { title: "Private Rank Passport · Mentrixa", robots: { index: false, follow: false } };
  }

  const siteUrl = getSiteUrl();
  const ogUrl = `${siteUrl}/api/og/rank-card?username=${encodeURIComponent(username)}`;
  const description = passportVerdictPlainText(card.passportVerdict);

  return {
    title: `${card.displayName} · Verified Rank · Mentrixa`,
    description,
    openGraph: {
      title: `${card.displayName} · Mentrixa Verified Rank`,
      description,
      url: `${siteUrl}/rank/${username}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${card.displayName} verified rank` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.displayName} · Mentrixa Verified Rank`,
      description,
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
    return (
      <div className={mentrixStudent.pageBgArena}>
        <RankCardPrivateNotice username={card.username} />
      </div>
    );
  }

  return (
    <div className={mentrixStudent.pageBgArena}>
      <RankCardPublicPage
        data={card}
        isOwner={(await getCurrentUser())?.id === card.userId}
      />
    </div>
  );
}
