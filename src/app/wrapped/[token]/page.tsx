import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadWrappedByShareToken } from "@/features/wrapped/load-wrapped";
import { WrappedShareCarousel } from "@/features/wrapped/ui/wrapped-share-carousel";
import {
  buildWrappedSlideUrls,
  wrappedHeadline,
  wrappedSharePath,
} from "@/features/wrapped/wrapped-pure";
import { getSiteUrl } from "@/shared/core/site";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ slide?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const report = await loadWrappedByShareToken(token);
  if (!report) return { title: "Wrapped · Mentrixa" };

  const site = getSiteUrl();
  const sharePath = wrappedSharePath(report.shareToken);
  const images =
    report.imageUrls.length > 0
      ? report.imageUrls
      : buildWrappedSlideUrls(site, report.shareToken);
  const og = images[0]!;

  return {
    title: `${wrappedHeadline(report.role, report.reportYear)} · Mentrixa`,
    description: "Five slides. Your year. Locked.",
    openGraph: {
      title: wrappedHeadline(report.role, report.reportYear),
      description: "Verified first attempts only.",
      url: `${site}${sharePath}`,
      images: [{ url: og, width: 1200, height: 630, alt: "Mentrixa Wrapped" }],
    },
    twitter: {
      card: "summary_large_image",
      title: wrappedHeadline(report.role, report.reportYear),
      images: [og],
    },
  };
}

export default async function PublicWrappedPage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const report = await loadWrappedByShareToken(token);
  if (!report) notFound();

  const site = getSiteUrl();
  const sharePath = wrappedSharePath(report.shareToken);
  const slideUrls =
    report.imageUrls.length === 5
      ? report.imageUrls
      : buildWrappedSlideUrls(site, report.shareToken);
  const initialSlide = Number(query.slide ?? "1");

  return (
    <main className="min-h-dvh bg-[#0B1220] text-slate-100">
      <WrappedShareCarousel
        reportYear={report.reportYear}
        data={report.reportData}
        shareUrl={`${site}${sharePath}`}
        slideUrls={slideUrls}
        rankUsername={report.rankUsername}
        initialSlide={Number.isFinite(initialSlide) ? initialSlide : 1}
      />
    </main>
  );
}
