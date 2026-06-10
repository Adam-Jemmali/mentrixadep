"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { parseUUID } from "@/shared/core/security";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import {
  CLAN_QUEST_CHALLENGE_BONUS_XP,
  CLAN_QUEST_CHALLENGE_TARGET,
} from "@/features/clans/clan-constants";
import { assertClanMember, buildPublicClanBrowseRows, type PublicClanBrowseRow } from "@/features/clans/clan-dashboard-internal";

export type ClanDashboardPayload = {
  clan: {
    id: string;
    name: string;
    tag: string;
    invite_code: string;
    leader_id: string;
    description: string | null;
    focus_division_key: string | null;
    join_mode: "open" | "approval";
    is_public: boolean;
    avatar_kind: "preset" | "custom";
    avatar_preset_key: string | null;
    avatar_url: string | null;
    xp_total: number;
    created_at: string;
  };
  memberCount: number;
  weeklyClanXp: number;
  challenge: {
    week_start: string;
    quests_completed: number;
    quest_target: number;
    bonus_xp: number;
    bonus_awarded_at: string | null;
  } | null;
  members: {
    user_id: string;
    role: "leader" | "member";
    joined_at: string;
    display_name: string | null;
    avatar_url: string | null;
    weekly_xp: number;
  }[];
  trophies: {
    id: string;
    opponent_name: string;
    won: boolean;
    ended_label: string;
  }[];
};

export type PublicClanSnapshot = {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  join_mode: "open" | "approval";
  focus_division_key: string | null;
  avatar_kind: "preset" | "custom";
  avatar_preset_key: string | null;
  avatar_url: string | null;
  member_count: number;
};

export type { PublicClanBrowseRow };

export async function getPublicClanSnapshot(
  clanId: string
): Promise<PublicClanSnapshot | null> {
  const id = parseUUID(clanId);
  if (!id.ok) return null;

  const admin = createAdminClient();
  const { data: clan } = await admin
    .from("clans")
    .select(
      "id, name, tag, description, is_public, join_mode, focus_division_key, avatar_kind, avatar_preset_key, avatar_url"
    )
    .eq("id", id.id)
    .maybeSingle();

  if (!clan || (clan as { is_public?: boolean }).is_public !== true) {
    return null;
  }

  const { count } = await admin
    .from("clan_members")
    .select("user_id", { count: "exact", head: true })
    .eq("clan_id", id.id);

  return {
    id: clan.id as string,
    name: clan.name as string,
    tag: clan.tag as string,
    description: (clan as { description?: string | null }).description ?? null,
    join_mode:
      ((clan as { join_mode?: string }).join_mode as "open" | "approval") ??
      "open",
    focus_division_key:
      (clan as { focus_division_key?: string | null }).focus_division_key ?? null,
    avatar_kind:
      ((clan as { avatar_kind?: string }).avatar_kind as "preset" | "custom") ??
      "preset",
    avatar_preset_key:
      (clan as { avatar_preset_key?: string | null }).avatar_preset_key ?? null,
    avatar_url: (clan as { avatar_url?: string | null }).avatar_url ?? null,
    member_count: count ?? 0,
  };
}

export async function getClanDashboard(
  clanId: string
): Promise<ClanDashboardPayload | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { error: "Not allowed." };
    }
    const id = parseUUID(clanId);
    if (!id.ok) return { error: "Invalid clan." };

    const admin = createAdminClient();
    if (!(await assertClanMember(admin, user.id, id.id))) {
      return { error: "You are not in this clan." };
    }

    const { data: clan, error: cErr } = await admin
      .from("clans")
      .select(
        "id, name, tag, invite_code, leader_id, description, focus_division_key, join_mode, is_public, avatar_kind, avatar_preset_key, avatar_url, xp_total, created_at"
      )
      .eq("id", id.id)
      .maybeSingle();

    if (cErr || !clan) return { error: "Clan not found." };

    const weekStart = getUtcWeekMondayString();

    const { data: memberRows } = await admin
      .from("clan_members")
      .select("user_id, role, joined_at")
      .eq("clan_id", id.id)
      .order("joined_at", { ascending: true });

    const ids = (memberRows ?? []).map((m) => m.user_id);
    const { data: settings } = await admin
      .from("user_settings")
      .select("user_id, display_name, avatar_url")
      .in("user_id", ids);

      const settingsByUser = new Map(
        (settings ?? []).map((s) => [
          s.user_id,
          {
            display_name: s.display_name as string | null,
            avatar_url: (s as { avatar_url?: string | null }).avatar_url ?? null,
          },
        ])
    );

    const { data: weeklyRows } = await admin
      .from("division_weekly_xp")
      .select("user_id, xp_earned")
      .eq("week_start", weekStart)
      .in("user_id", ids);

    const weeklyByUser = new Map<string, number>();
    for (const row of weeklyRows ?? []) {
      const u = row.user_id as string;
      weeklyByUser.set(u, (weeklyByUser.get(u) ?? 0) + (row.xp_earned ?? 0));
    }

    let weeklyClanXp = 0;
    for (const uid of ids) {
      weeklyClanXp += weeklyByUser.get(uid) ?? 0;
    }

    const members = (memberRows ?? []).map((m) => ({
      user_id: m.user_id,
      role: m.role as "leader" | "member",
      joined_at: m.joined_at,
      display_name: settingsByUser.get(m.user_id)?.display_name ?? null,
      avatar_url: settingsByUser.get(m.user_id)?.avatar_url ?? null,
      weekly_xp: weeklyByUser.get(m.user_id) ?? 0,
    }));

    members.sort((a, b) => b.weekly_xp - a.weekly_xp);

    const { data: chRow } = await admin
      .from("clan_weekly_challenge")
      .select(
        "week_start, quests_completed, quest_target, bonus_xp, bonus_awarded_at"
      )
      .eq("clan_id", id.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    const { data: wars } = await admin
      .from("clan_wars")
      .select("id, clan_a_id, clan_b_id, clan_a_xp, clan_b_xp, winner_clan_id, ends_at, status")
      .or(`clan_a_id.eq.${id.id},clan_b_id.eq.${id.id}`)
      .eq("status", "completed")
      .order("ends_at", { ascending: false })
      .limit(8);

    const otherIds = new Set<string>();
    for (const w of wars ?? []) {
      const a = w.clan_a_id as string;
      const b = w.clan_b_id as string;
      otherIds.add(a === id.id ? b : a);
    }

    const nameByClan = new Map<string, string>();
    if (otherIds.size > 0) {
      const { data: clans } = await admin
        .from("clans")
        .select("id, name")
        .in("id", Array.from(otherIds));
      for (const c of clans ?? []) {
        nameByClan.set(c.id as string, (c.name as string) ?? "Clan");
      }
    }

    const trophies = (wars ?? []).map((w) => {
      const a = w.clan_a_id as string;
      const b = w.clan_b_id as string;
      const other = a === id.id ? b : a;
      const won = w.winner_clan_id === id.id;
      const ends = w.ends_at ? new Date(w.ends_at as string) : null;
      return {
        id: w.id as string,
        opponent_name: nameByClan.get(other) ?? "Opponent",
        won,
        ended_label: ends
          ? ends.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
      };
    });

    return {
      clan: {
        id: clan.id as string,
        name: clan.name as string,
        tag: clan.tag as string,
        invite_code: clan.invite_code as string,
        leader_id: clan.leader_id as string,
        description: (clan as { description?: string | null }).description ?? null,
        focus_division_key:
          (clan as { focus_division_key?: string | null }).focus_division_key ?? null,
        join_mode:
          ((clan as { join_mode?: string }).join_mode as "open" | "approval") ?? "open",
        is_public: (clan as { is_public?: boolean }).is_public !== false,
        avatar_kind:
          ((clan as { avatar_kind?: string }).avatar_kind as "preset" | "custom") ??
          "preset",
        avatar_preset_key:
          (clan as { avatar_preset_key?: string | null }).avatar_preset_key ?? null,
        avatar_url: (clan as { avatar_url?: string | null }).avatar_url ?? null,
        xp_total: Number((clan as { xp_total?: number }).xp_total ?? 0),
        created_at: clan.created_at as string,
      },
      memberCount: ids.length,
      weeklyClanXp,
      challenge: chRow
        ? {
            week_start: chRow.week_start as string,
            quests_completed: chRow.quests_completed as number,
            quest_target: (chRow.quest_target as number) ?? CLAN_QUEST_CHALLENGE_TARGET,
            bonus_xp: (chRow.bonus_xp as number) ?? CLAN_QUEST_CHALLENGE_BONUS_XP,
            bonus_awarded_at: (chRow.bonus_awarded_at as string | null) ?? null,
          }
        : {
            week_start: weekStart,
            quests_completed: 0,
            quest_target: CLAN_QUEST_CHALLENGE_TARGET,
            bonus_xp: CLAN_QUEST_CHALLENGE_BONUS_XP,
            bonus_awarded_at: null,
          },
      members,
      trophies,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getTopPublicClans(limit = 8): Promise<PublicClanBrowseRow[]> {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") return [];

  const admin = createAdminClient();
  const { data: clans } = await admin
    .from("clans")
    .select("id, name, tag, leader_id, focus_division_key")
    .eq("is_public", true)
    .limit(120);

  if (!clans?.length) return [];

  const rows = await buildPublicClanBrowseRows(
    admin,
    clans.map((c) => ({
      id: c.id as string,
      name: c.name as string,
      tag: c.tag as string,
      leader_id: c.leader_id as string,
      focus_division_key: (c.focus_division_key as string | null) ?? null,
    })),
  );

  return rows
    .sort((a, b) => b.member_count - a.member_count || a.name.localeCompare(b.name))
    .slice(0, Math.min(Math.max(limit, 1), 20));
}

export async function searchPublicClans(query: string): Promise<PublicClanBrowseRow[]> {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") return [];

  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];

  const admin = createAdminClient();
  const { data: clans } = await admin
    .from("clans")
    .select("id, name, tag, leader_id, focus_division_key")
    .eq("is_public", true)
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(24);

  if (!clans?.length) return [];

  return buildPublicClanBrowseRows(
    admin,
    clans.map((c) => ({
      id: c.id as string,
      name: c.name as string,
      tag: c.tag as string,
      leader_id: c.leader_id as string,
      focus_division_key: (c.focus_division_key as string | null) ?? null,
    })),
  );
}

