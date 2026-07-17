import { z } from "zod";
import {
  enforcePublicFeedRateLimit,
  publicFeedJsonResponse,
  publicFeedOptionsResponse,
} from "@/features/arena-widget/public-feed-http";
import { loadPublicGuideFeed } from "@/features/arena-widget/load-public-feed";

type Props = { params: Promise<{ guideId: string }> };

export async function OPTIONS() {
  return publicFeedOptionsResponse();
}

export async function GET(request: Request, { params }: Props) {
  const blocked = await enforcePublicFeedRateLimit(request);
  if (blocked) return blocked;

  const { guideId } = await params;
  const parsed = z.string().uuid().safeParse(guideId);
  if (!parsed.success) {
    return publicFeedJsonResponse({ ok: false, error: "Invalid guide id." }, 400);
  }

  const feed = await loadPublicGuideFeed(parsed.data);
  return publicFeedJsonResponse(feed);
}
