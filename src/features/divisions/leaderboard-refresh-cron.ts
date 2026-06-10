import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runRefreshDivisionLeaderboardCron() {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refresh_division_leaderboard_mv");
  if (error) {
    throw new Error(error.message);
  }
  return { rows_scanned: 0, rows_updated: 0, refreshed: true };
}

export const GET = cronGetHandler("refresh-division-leaderboard", runRefreshDivisionLeaderboardCron);
