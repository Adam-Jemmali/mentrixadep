import { enqueueJob } from "@/features/jobs/enqueue";
import type { EmailJobPayload } from "@/features/jobs/types";

export async function queueEmailJob(
  idempotencyKey: string,
  payload: EmailJobPayload,
  priority = 0,
): Promise<void> {
  await enqueueJob({
    jobType: "email.send",
    idempotencyKey,
    payload: payload as unknown as Record<string, unknown>,
    priority,
  });
}

export async function queueAnalyticsEvent(
  idempotencyKey: string,
  eventName: string,
  options: {
    userId?: string | null;
    sessionId?: string | null;
    properties?: Record<string, unknown>;
  } = {},
): Promise<void> {
  await enqueueJob({
    jobType: "analytics.track",
    idempotencyKey,
    payload: {
      eventName,
      userId: options.userId ?? null,
      sessionId: options.sessionId ?? null,
      properties: options.properties ?? {},
    },
    priority: -1,
  });
}
