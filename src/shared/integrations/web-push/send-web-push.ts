import webpush from "web-push";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

type PushPayload = {
  title: string;
  body: string;
  url: string;
};

/**
 * Send Web Push to one user via stored VAPID subscriptions.
 * Falls back to the send-web-push edge function when local keys are absent.
 * Best effort. Never throws to callers.
 */
export async function sendWebPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number }> {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

    if (publicKey && privateKey) {
      return await sendWithLocalVapid(userId, payload, publicKey, privateKey);
    }

    return await sendViaEdgeFunction([userId], payload);
  } catch (err) {
    console.error(
      "[sendWebPushToUser]",
      err instanceof Error ? err.message : String(err),
    );
    return { sent: 0 };
  }
}

async function sendWithLocalVapid(
  userId: string,
  payload: PushPayload,
  publicKey: string,
  privateKey: string,
): Promise<{ sent: number }> {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_secret")
    .eq("user_id", userId)
    .limit(20);

  if (!subs?.length) return { sent: 0 };

  webpush.setVapidDetails("mailto:hello@mentrixa.one", publicKey, privateKey);
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_secret },
        },
        body,
      );
      sent += 1;
    } catch (err) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", sub.endpoint);
      }
    }
  }

  return { sent };
}

async function sendViaEdgeFunction(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey || userIds.length === 0) return { sent: 0 };

  await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userIds,
      title: payload.title,
      body: payload.body,
      url: payload.url,
    }),
  });

  return { sent: userIds.length };
}
