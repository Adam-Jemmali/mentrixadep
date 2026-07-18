import { ImageResponse } from "next/og";
import { getSiteUrl } from "@/shared/core/site";
import { loadWrappedByShareToken } from "@/features/wrapped/load-wrapped";
import {
  buildWrappedSlideCopy,
  parseWrappedSlideIndex,
} from "@/features/wrapped/wrapped-pure";
import { renderWrappedOgSlide } from "@/features/wrapped/og-wrapped-slide";
import { vocabIconSrc } from "@/shared/icons/mentrixa-vocab-map";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/** Node runtime — @vercel/og exceeds the 1 MB Edge bundle limit on Hobby. */
export const runtime = "nodejs";

async function loadIconDataUrl(iconName: string, origin: string): Promise<string | null> {
  try {
    const path = vocabIconSrc(iconName as VocabIconName);
    const res = await fetch(`${origin}${path}`, { cache: "force-cache" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/svg+xml";
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  const slide = parseWrappedSlideIndex(searchParams.get("slide"));
  if (!token || !slide) {
    return new Response("Missing token or slide", { status: 400 });
  }

  const report = await loadWrappedByShareToken(token);
  if (!report) {
    return new Response("Not found", { status: 404 });
  }

  const slides = buildWrappedSlideCopy({
    reportYear: report.reportYear,
    data: report.reportData,
    rankUsername: report.rankUsername,
  });
  const copy = slides.find((s) => s.slide === slide) ?? slides[0]!;
  const origin = getSiteUrl();
  const iconSrc = await loadIconDataUrl(copy.eyebrowIcon, origin);

  return new ImageResponse(
    renderWrappedOgSlide({
      copy,
      iconSrc,
      wordmarkGold: slide === 1 || slide === 5,
    }),
    { width: 1200, height: 630 },
  );
}
