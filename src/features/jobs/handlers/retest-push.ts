import { sendWebPushToUser } from "@/shared/integrations/web-push/send-web-push";

export type RetestPushJobPayload = {
  userId: string;
  title: string;
  body: string;
  url: string;
};

export async function handleRetestPushJob(payload: RetestPushJobPayload): Promise<void> {
  const userId = String(payload.userId ?? "").trim();
  const title = String(payload.title ?? "").trim();
  const body = String(payload.body ?? "").trim();
  const url = String(payload.url ?? "/student").trim() || "/student";

  if (!userId || !title || !body) {
    throw new Error("push.retest_complete requires userId, title, and body");
  }

  await sendWebPushToUser(userId, { title, body, url });
}
