import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { ArenaLeaderRow, LiveBoardEventRow, LiveBoardEventType } from "@/features/live-board/types";
import {
  MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE,
  rankLevelFromAccuracy,
} from "@/features/xp/calibrated-rank";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";

function leaderDisplayName(settingsDisplayName: string | null | undefined): string {
  const trimmed = typeof settingsDisplayName === "string" ? settingsDisplayName.trim() : "";
  if (trimmed) return trimmed.slice(0, 100);
  return "Mentrixer";
}

function parseLiveBoardEvent(row: Record<string, unknown>): LiveBoardEventRow | null {
  const eventType = String(row.event_type ?? "");
  if (
    eventType !== "verified_attempt" &&
    eventType !== "rank_advance" &&
    eventType !== "breakthrough"
  ) {
    return null;
  }

  const id = String(row.id ?? "");
  const displayName = String(row.display_name ?? "").trim();
  const nodeName = String(row.node_name ?? "").trim();
  const unitName = String(row.unit_name ?? "").trim();
  const occurredAt = String(row.occurred_at ?? "");

  if (!id || !displayName || !nodeName || !unitName || !occurredAt) return null;

  const rawAccuracy = row.accuracy_pct;
  const accuracyPct =
    rawAccuracy == null || rawAccuracy === ""
      ? null
      : Number(rawAccuracy);

  return {
    id,
    event_type: eventType as LiveBoardEventType,
    user_id: String(row.user_id ?? ""),
    display_name: displayName,
    skill_node_id: row.skill_node_id ? String(row.skill_node_id) : null,
    node_name: nodeName,
    unit_name: unitName,
    accuracy_pct: Number.isFinite(accuracyPct) ? accuracyPct : null,
    new_rank_tier: row.new_rank_tier ? String(row.new_rank_tier) : null,
    is_first_attempt: Boolean(row.is_first_attempt),
    occurred_at: occurredAt,
  };
}

export async function loadLiveBoardEvents(limit = 50): Promise<LiveBoardEventRow[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("live_board_events")
      .select(
        "id, event_type, user_id, display_name, skill_node_id, node_name, unit_name, accuracy_pct, new_rank_tier, is_first_attempt, occurred_at",
      )
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("loadLiveBoardEvents failed", error.message);
      return [];
    }

    return (data ?? [])
      .map((row) => parseLiveBoardEvent(row as Record<string, unknown>))
      .filter((row): row is LiveBoardEventRow => row != null);
  } catch (err) {
    console.error(
      "loadLiveBoardEvents failed",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

export async function loadArenaLeaders(limit = 10): Promise<ArenaLeaderRow[]> {
  try {
    const admin = createAdminClient();
    const { data: cacheRows, error } = await admin
      .from("ap_calc_verified_rank_cache")
      .select("user_id, accuracy_percent, verified_count")
      .gte("verified_count", MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE)
      .order("accuracy_percent", { ascending: false })
      .limit(limit);

    if (error || !cacheRows?.length) {
      if (error) console.error("loadArenaLeaders failed", error.message);
      return [];
    }

    const userIds = cacheRows.map((row) => String(row.user_id));

    const { data: settingsRows } = await admin
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const settingsByUser = new Map(
      (settingsRows ?? []).map((row) => [String(row.user_id), row.display_name as string | null]),
    );

    return cacheRows.map((row) => {
      const userId = String(row.user_id);
      const accuracyPercent = Number(row.accuracy_percent ?? 0);
      const rankLevel = rankLevelFromAccuracy(accuracyPercent);
      const rankTier = normalizeRankTitle(getAccountRankByLevel(rankLevel).title);
      const displayName = leaderDisplayName(settingsByUser.get(userId));

      return {
        userId,
        displayName,
        rankTier,
        rankLevel,
        accuracyPercent,
        verifiedCount: Number(row.verified_count ?? 0),
      };
    });
  } catch (err) {
    console.error(
      "loadArenaLeaders failed",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}
