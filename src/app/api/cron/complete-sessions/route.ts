import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingSessionXpAwards } from "@/app/actions/xp";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("complete-sessions", async () => {
    const supabase = createAdminClient();

    // Find sessions about to be completed for cron reporting.
    const now = new Date().toISOString();
    const { data: sessionsToComplete } = await supabase
      .from("sessions")
      .select("id")
      .eq("status", "scheduled")
      .lte("end_time", now);

    const { error } = await supabase.rpc("auto_complete_sessions");

    if (error) {
      throw new Error(`Failed to complete sessions: ${error.message}`);
    }

    const sessionIds = (sessionsToComplete ?? []).map((s) => s.id);

    const xpResult = await processPendingSessionXpAwards();

    return {
      rows_scanned: sessionIds.length,
      rows_updated: sessionIds.length,
      xpAwards: xpResult,
    };
  });
}

