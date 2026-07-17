import {
  enforcePublicFeedRateLimit,
  publicFeedJsonResponse,
  publicFeedOptionsResponse,
} from "@/features/arena-widget/public-feed-http";
import { loadPublicArenaFeed } from "@/features/arena-widget/load-public-feed";

export async function OPTIONS() {
  return publicFeedOptionsResponse();
}

export async function GET(request: Request) {
  const blocked = await enforcePublicFeedRateLimit(request);
  if (blocked) return blocked;

  const feed = await loadPublicArenaFeed();
  return publicFeedJsonResponse(feed);
}
