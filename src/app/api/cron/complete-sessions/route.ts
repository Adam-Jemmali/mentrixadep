import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingSessionXpAwards } from "@/app/actions/xp";
import { createPayoutLedgerForSession } from "@/app/actions/stripe-connect";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("complete-sessions", async () => {
    const supabase = createAdminClient();

    // Find sessions about to be completed (for ledger creation before status update)
    const now = new Date().toISOString();
    const { data: sessionsToComplete } = await supabase
      .from("sessions")
      .select("id")
      .eq("status", "scheduled")
      .lte("end_time", now)
      .is("payout_status", null);

    const { error } = await supabase.rpc("auto_complete_sessions");

    if (error) {
      throw new Error(`Failed to complete sessions: ${error.message}`);
    }

    // Create payout ledger rows for newly completed sessions (fire-and-forget)
    const sessionIds = (sessionsToComplete ?? []).map((s) => s.id);
    for (const sid of sessionIds) {
      createPayoutLedgerForSession(sid).catch((e) =>
        console.error(`[cron/complete-sessions] ledger creation failed for ${sid}:`, e)
      );
    }

    const xpResult = await processPendingSessionXpAwards();

    return {
      rows_scanned: sessionIds.length,
      rows_updated: sessionIds.length,
      rows_created: sessionIds.length,
      xpAwards: xpResult,
      payoutLedgerCreated: sessionIds.length,
    };
  });
}

