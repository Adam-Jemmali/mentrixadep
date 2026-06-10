import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/shared/integrations/supabase/server";
import { trackEvent, type AnalyticsEventName, type EventProperties } from "@/shared/integrations/analytics";
import { enforceSlidingRateLimit, getClientIpFromRequest, getRateLimitId } from "@/shared/core/security";
import { z } from "zod";

const ALLOWED_CLIENT_EVENTS: AnalyticsEventName[] = [
  "page_view_landing",
  "signup_started",
  "quest_started",
  "quest_completed",
  "duel_challenged",
  "checkout_started",
  "checkout_abandoned",
  "daily_login",
  "referral_clicked",
  "realtime_disconnect",
  "realtime_reconnect",
];

const bodySchema = z.object({
  eventName: z.string(),
  sessionId: z.string().optional(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await enforceSlidingRateLimit(
      getRateLimitId(undefined, getClientIpFromRequest(req)),
      { maxRequests: 60, windowMs: 60_000 },
      "analytics.track",
    );

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { eventName, sessionId, properties } = parsed.data;

    if (!ALLOWED_CLIENT_EVENTS.includes(eventName as AnalyticsEventName)) {
      return NextResponse.json({ error: "Event not allowed" }, { status: 403 });
    }

    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Anonymous event
    }

    after(async () => {
      await trackEvent(eventName as AnalyticsEventName, {
        userId,
        sessionId,
        properties: properties as EventProperties | undefined,
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
