import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { liveBoardRetentionCutoffIso } from "@/features/live-board/live-board-retention-pure";

/**
 * Delete Arena feed rows older than the 48h retention window.
 * Best-effort maintenance run from the existing background-jobs cron; never throws.
 */
export async function purgeStaleLiveBoardEvents(): Promise<{ purged: boolean }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("live_board_events")
      .delete()
      .lt("occurred_at", liveBoardRetentionCutoffIso());

    if (error) {
      console.error("purgeStaleLiveBoardEvents failed", error.message);
      return { purged: false };
    }
    return { purged: true };
  } catch (err) {
    console.error(
      "purgeStaleLiveBoardEvents failed",
      err instanceof Error ? err.message : String(err),
    );
    return { purged: false };
  }
}
