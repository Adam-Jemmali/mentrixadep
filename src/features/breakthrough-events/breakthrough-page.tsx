import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBreakthroughForShare } from "@/features/breakthrough-events/reads";
import { BreakthroughSharePage } from "@/features/breakthrough-events/breakthrough-share-page";
import { getSiteUrl } from "@/shared/core/site";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getBreakthroughForShare(eventId);
  if (!event) return { title: "Breakthrough. Mentrixa" };

  const siteUrl = getSiteUrl();
  const ogUrl = `${siteUrl}/api/og/breakthrough?event_id=${encodeURIComponent(eventId)}`;

  return {
    title: `Breakthrough: ${event.concept}. Mentrixa`,
    description: `${event.concept} — ${Math.round(event.accuracyBefore)}% to ${Math.round(event.accuracyAfter)}% accuracy jump on Mentrixa.`,
    openGraph: {
      title: `BREAKTHROUGH: ${event.concept}`,
      description: `${Math.round(event.accuracyBefore)}% → ${Math.round(event.accuracyAfter)}%. ${event.subject}`,
      url: event.shareUrl,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `Breakthrough: ${event.concept}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `BREAKTHROUGH: ${event.concept}`,
      images: [ogUrl],
    },
  };
}

export default async function BreakthroughPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getBreakthroughForShare(eventId);
  if (!event) notFound();

  return <BreakthroughSharePage data={event} />;
}
