import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runRefreshWeeklyDemandCron() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("sync_skill_node_weekly_demand");
  if (error) {
    throw new Error(error.message);
  }
  return { rows_synced: typeof data === "number" ? data : 0 };
}

export const GET = cronGetHandler("refresh-weekly-demand", runRefreshWeeklyDemandCron);
