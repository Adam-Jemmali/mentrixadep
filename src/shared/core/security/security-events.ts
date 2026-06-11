import { createAdminClient } from "@/shared/integrations/supabase/admin";

export type SecurityEventInput = {
  event_type: string;
  user_id?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Best-effort insert — never blocks the caller on failure. */
export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_events").insert({
      event_type: input.event_type,
      user_id: input.user_id ?? null,
      ip_address: input.ip_address ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.warn("[security_events] insert failed:", err);
  }
}

export async function countRecentSecurityEvents(sinceIso: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) {
    console.warn("[security_events] count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}
