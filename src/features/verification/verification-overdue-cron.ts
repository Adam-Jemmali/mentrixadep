import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runVerificationOverdueCron() {
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

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

  if (overdueCount > 0) {
    const entries = (overdue ?? []).map((v) => ({
      verification_id: v.id,
      user_id: v.user_id,
      action: "overdue_flagged",
      notes: `Deadline was ${v.deadline_at}, now ${now}`,
      metadata: { deadline_at: v.deadline_at, status: v.status },
    }));

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
}

export const GET = cronGetHandler("verification-overdue", runVerificationOverdueCron);
