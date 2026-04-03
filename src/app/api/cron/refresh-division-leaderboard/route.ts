import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

/** Refresh mv_division_leaderboard (~every 5 min via platform cron). */
export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("refresh-division-leaderboard", async () => {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("refresh_division_leaderboard_mv");
    if (error) {
      throw new Error(error.message);
    }
    return { rows_scanned: 0, rows_updated: 0, refreshed: true };
  });
}
