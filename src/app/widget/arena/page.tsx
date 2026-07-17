import type { Metadata } from "next";
import { ArenaWidgetClient } from "@/features/arena-widget/ui/arena-widget-client";
import { loadPublicArenaFeed } from "@/features/arena-widget/load-public-feed";
import {
  parseWidgetHeight,
  parseWidgetTheme,
} from "@/features/arena-widget/public-feed-pure";

export const metadata: Metadata = {
  title: "Arena feed · Mentrixa",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ theme?: string; height?: string }>;
};

export default async function ArenaWidgetPage({ searchParams }: Props) {
  const params = await searchParams;
  const theme = parseWidgetTheme(params.theme);
  const height = parseWidgetHeight(params.height);
  const feed = await loadPublicArenaFeed();

  return (
    <ArenaWidgetClient
      theme={theme}
      height={height}
      initialItems={feed.items}
    />
  );
}
