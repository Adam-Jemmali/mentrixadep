import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";

const RANK_CACHE_WINDOW_MINUTES = 10;

async function runRefreshRankCacheCron() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("refresh_ap_calc_verified_rank_cache_recent", {
    p_window: `${RANK_CACHE_WINDOW_MINUTES} minutes`,
  });
  if (error) {
    throw new Error(error.message);
  }
  const rowsUpdated = typeof data === "number" ? data : Number(data ?? 0);
  return {
    rows_updated: Number.isFinite(rowsUpdated) ? rowsUpdated : 0,
    window_minutes: RANK_CACHE_WINDOW_MINUTES,
  };
}

export const GET = cronGetHandler("refresh-rank-cache", runRefreshRankCacheCron);
