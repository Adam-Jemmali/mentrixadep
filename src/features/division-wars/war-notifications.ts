"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { trackEvent } from "@/shared/integrations/analytics";

type WarNotification = {
  title: string;
  body: string;
  warId: string;
};

/**
 * Notify division war participants. Uses analytics + optional Supabase edge push stub.
 * Never throws — push delivery is best-effort.
 */
export async function notifyDivisionWarMembers(
  userIds: string[],
  notification: WarNotification,
): Promise<void> {
  const unique = Array.from(new Set(userIds)).slice(0, 500);
  if (unique.length === 0) return;

  for (const userId of unique) {
    void trackEvent("division_war_notification", {
      userId,
      properties: {
        war_id: notification.warId,
        title: notification.title,
        body: notification.body,
      },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userIds: unique,
        title: notification.title,
        body: notification.body,
        url: "/student/division",
      }),
    });
  } catch {
    // Edge function may be stubbed in dev
  }
}

export async function getActiveWarBadgesForUser(userId: string): Promise<
  { divisionName: string; expiresAt: string }[]
> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data } = await admin
    .from("division_war_badges")
    .select("division_name, expires_at")
    .eq("user_id", userId)
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(5);

  return (data ?? []).map((row) => ({
    divisionName: String(row.division_name),
    expiresAt: String(row.expires_at),
  }));
}
