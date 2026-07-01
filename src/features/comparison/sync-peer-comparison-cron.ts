import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runSyncPeerComparisonCron() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("sync_peer_comparison_snapshots");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? { node_rows: 0, guide_rows: 0 };
}

export const GET = cronGetHandler("sync-peer-comparison", runSyncPeerComparisonCron);
