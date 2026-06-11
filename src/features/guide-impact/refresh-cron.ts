import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runRefreshGuideImpactCron() {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("sync_guide_impact_scores");
  if (error) {
    throw new Error(error.message);
  }
  return { refreshed: true };
}

export const GET = cronGetHandler("refresh-guide-impact", runRefreshGuideImpactCron);
