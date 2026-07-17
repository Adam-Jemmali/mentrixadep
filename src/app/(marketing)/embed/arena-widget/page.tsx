import type { Metadata } from "next";
import { ArenaEmbedPageClient } from "@/features/arena-widget/ui/arena-embed-page-client";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Embed Arena widget · Mentrixa",
  description: "Embed the Mentrixa live Arena feed on your site.",
};

export default function ArenaEmbedPage() {
  return <ArenaEmbedPageClient siteUrl={getSiteUrl()} />;
}
