import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  PUBLIC_ARENA_FEED_LIMIT,
  portfolioToPublicFeedItem,
  toPublicFeedItem,
  type PublicFeedItem,
  type PublicFeedResponse,
} from "@/features/arena-widget/public-feed-pure";

export async function loadPublicArenaFeed(
  limit = PUBLIC_ARENA_FEED_LIMIT,
): Promise<PublicFeedResponse> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("live_board_events")
    .select(
      "id, event_type, display_name, node_name, unit_name, accuracy_pct, occurred_at",
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[public-arena-feed]", error.message);
    return { items: [], generated_at: new Date().toISOString() };
  }

  const items: PublicFeedItem[] = (data ?? []).map((row) =>
    toPublicFeedItem({
      id: String(row.id),
      event_type: String(row.event_type),
      display_name: String(row.display_name ?? ""),
      node_name: String(row.node_name ?? ""),
      unit_name: String(row.unit_name ?? ""),
      accuracy_pct:
        row.accuracy_pct == null ? null : Number(row.accuracy_pct),
      occurred_at: String(row.occurred_at),
    }),
  );

  return { items, generated_at: new Date().toISOString() };
}

/** Opted-in Guide portfolio lifts only. No student names. */
export async function loadPublicGuideFeed(
  guideId: string,
  limit = PUBLIC_ARENA_FEED_LIMIT,
): Promise<PublicFeedResponse> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guide_teaching_portfolio")
    .select("id, node_name, before_accuracy, after_accuracy, added_at")
    .eq("guide_id", guideId)
    .eq("student_opted_in", true)
    .order("added_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[public-guide-feed]", error.message);
    return { items: [], generated_at: new Date().toISOString() };
  }

  const items = (data ?? []).map((row) =>
    portfolioToPublicFeedItem({
      id: String(row.id),
      nodeName: String(row.node_name ?? "Skill"),
      beforeAccuracy: Number(row.before_accuracy ?? 0),
      afterAccuracy: Number(row.after_accuracy ?? 0),
      addedAt: String(row.added_at),
    }),
  );

  return { items, generated_at: new Date().toISOString() };
}
