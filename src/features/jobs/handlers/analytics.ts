import { trackEvent, type AnalyticsEventName } from "@/shared/integrations/analytics";
import type { AnalyticsJobPayload } from "@/features/jobs/types";

export async function handleAnalyticsJob(payload: AnalyticsJobPayload): Promise<void> {
  await trackEvent(payload.eventName as AnalyticsEventName, {
    userId: payload.userId ?? null,
    sessionId: payload.sessionId ?? null,
    properties: payload.properties as Record<string, string | number | boolean | null | undefined>,
  });
}
