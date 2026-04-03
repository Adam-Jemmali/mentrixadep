import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Cron: runs every hour.
 * 1. Notifies admins of overdue verifications (deadline passed, still pending/in_review)
 * 2. Optionally sends a follow-up reminder to users whose verification is in info_requested state
 *    for more than 24h without a response.
 */
export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("verification-overdue", async () => {
    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    // Find overdue verifications (deadline passed, still actionable)
    const { data: overdue, error } = await adminClient
      .from("user_verifications")
      .select("id, user_id, role, deadline_at, status")
      .lt("deadline_at", now)
      .in("status", ["pending", "in_review", "info_requested"]);

    if (error) {
      console.error("[cron/verification-overdue] fetch error:", error);
      throw new Error("DB error");
    }

    const overdueCount = overdue?.length ?? 0;

    // Log overdue to audit trail (mark once so we don't spam)
    if (overdueCount > 0) {
      const entries = (overdue ?? []).map((v) => ({
        verification_id: v.id,
        user_id: v.user_id,
        action: "overdue_flagged",
        notes: `Deadline was ${v.deadline_at}, now ${now}`,
        metadata: { deadline_at: v.deadline_at, status: v.status },
      }));

      // Only insert if not already flagged today
      const today = now.slice(0, 10);
      for (const entry of entries) {
        const { data: existing } = await adminClient
          .from("verification_audit_log")
          .select("id")
          .eq("verification_id", entry.verification_id)
          .eq("action", "overdue_flagged")
          .gte("created_at", `${today}T00:00:00.000Z`)
          .maybeSingle();

        if (!existing) {
          await adminClient.from("verification_audit_log").insert(entry);
        }
      }
    }

    return {
      rows_scanned: overdueCount,
      rows_updated: overdueCount,
      overdue: overdueCount,
      timestamp: now,
    };
  });
}
