import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { LiveBoardEventRow, LiveBoardEventType } from "@/features/live-board/types";
import { normalizeArenaAvatarUrl } from "@/features/live-board/live-board-avatar-pure";
import {
  enrichArenaLeaderProfiles,
  resolveAvatarFromAuthMetadata,
  type ArenaLeaderProfileInput,
} from "@/features/live-board/load-arena-leader-profile";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";

function parseLiveBoardEvent(row: Record<string, unknown>): LiveBoardEventRow | null {
  const eventType = String(row.event_type ?? "");
  if (
    eventType !== "verified_attempt" &&
    eventType !== "rank_advance" &&
    eventType !== "breakthrough" &&
    eventType !== "division_war_result"
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
    avatar_url: normalizeArenaAvatarUrl(row.avatar_url as string | null | undefined),
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
        "id, event_type, user_id, display_name, avatar_url, skill_node_id, node_name, unit_name, accuracy_pct, new_rank_tier, is_first_attempt, occurred_at",
      )
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("loadLiveBoardEvents failed", error.message);
      return [];
    }

    const parsed = (data ?? [])
      .map((row) => parseLiveBoardEvent(row as Record<string, unknown>))
      .filter((row): row is LiveBoardEventRow => row != null);

    const missingAvatarUserIds = parsed
      .filter((row) => !row.avatar_url)
      .map((row) => row.user_id);

    const avatarsByUser = new Map<string, string | null>();
    if (missingAvatarUserIds.length > 0) {
      await Promise.all(
        missingAvatarUserIds.map(async (userId) => {
          try {
            const { data } = await admin.auth.admin.getUserById(userId);
            avatarsByUser.set(
              userId,
              resolveAvatarFromAuthMetadata(
                data.user?.user_metadata as Record<string, unknown> | undefined,
              ),
            );
          } catch {
            avatarsByUser.set(userId, null);
          }
        }),
      );
    }

    return parsed.map((row) => ({
      ...row,
      avatar_url: row.avatar_url ?? avatarsByUser.get(row.user_id) ?? null,
    }));
  } catch (err) {
    console.error(
      "loadLiveBoardEvents failed",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

export async function loadArenaLeaders(limit = 10) {
  try {
    const admin = createAdminClient();
    const { data: cacheRows, error } = await admin
      .from("ap_calc_verified_rank_cache")
      .select("user_id, accuracy_percent, verified_count, percentile")
      .gte("verified_count", MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE)
      .not("percentile", "is", null)
      .order("accuracy_percent", { ascending: false })
      .limit(limit);

    if (error || !cacheRows?.length) {
      if (error) console.error("loadArenaLeaders failed", error.message);
      return [];
    }

    const userIds = cacheRows.map((row) => String(row.user_id));

    const [{ data: settingsRows }, { data: xpRows }] = await Promise.all([
      admin
        .from("user_settings")
        .select("user_id, display_name, rank_card_username, avatar_url")
        .in("user_id", userIds),
      admin.from("user_xp").select("user_id, total_xp").in("user_id", userIds),
    ]);

    const settingsByUser = new Map(
      (settingsRows ?? []).map((row) => [String(row.user_id), row]),
    );
    const xpByUser = new Map(
      (xpRows ?? []).map((row) => [String(row.user_id), Number(row.total_xp ?? 0)]),
    );

    const inputs: ArenaLeaderProfileInput[] = cacheRows.map((row) => {
      const userId = String(row.user_id);
      const settings = settingsByUser.get(userId);
      return {
        userId,
        displayName: (settings?.display_name as string | null) ?? null,
        email: null,
        username:
          typeof settings?.rank_card_username === "string" &&
          settings.rank_card_username.trim()
            ? settings.rank_card_username.trim().toLowerCase()
            : null,
        settingsAvatarUrl: (settings?.avatar_url as string | null) ?? null,
        totalXp: xpByUser.get(userId) ?? 0,
        accuracyPercent: Number(row.accuracy_percent ?? 0),
        verifiedCount: Number(row.verified_count ?? 0),
        percentile: Number(row.percentile ?? 0),
      };
    });

    return enrichArenaLeaderProfiles(inputs);
  } catch (err) {
    console.error(
      "loadArenaLeaders failed",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}
