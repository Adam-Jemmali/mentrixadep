"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { assertNoBlockedLanguage, parseUUID } from "@/lib/security";
import { getUtcWeekMondayString } from "@/lib/division-week";
import {
  CLAN_QUEST_CHALLENGE_BONUS_XP,
  CLAN_QUEST_CHALLENGE_TARGET,
} from "@/lib/clan-constants";

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

async function assertClanMember(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  clanId: string
): Promise<boolean> {
  const { data } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .eq("clan_id", clanId)
    .maybeSingle();
  return !!data?.clan_id;
}

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

export type PublicClanBrowseRow = {
  id: string;
  name: string;
  tag: string;
  member_count: number;
  leader_name: string;
  focus_division_key: string | null;
  focus_label: string;
};

type ClanBrowseSource = {
  id: string;
  name: string;
  tag: string;
  leader_id: string;
  focus_division_key: string | null;
};

async function buildPublicClanBrowseRows(
  admin: ReturnType<typeof createAdminClient>,
  clans: ClanBrowseSource[],
): Promise<PublicClanBrowseRow[]> {
  if (!clans.length) return [];

  const ids = clans.map((c) => c.id);
  const leaderIds = [...new Set(clans.map((c) => c.leader_id))];

  const [{ data: memberRows }, { data: settings }, { data: divisions }] = await Promise.all([
    admin.from("clan_members").select("clan_id").in("clan_id", ids),
    admin.from("user_settings").select("user_id, display_name").in("user_id", leaderIds),
    admin.from("divisions").select("key, name").eq("active", true),
  ]);

  const memberCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    const cid = row.clan_id as string;
    memberCounts.set(cid, (memberCounts.get(cid) ?? 0) + 1);
  }

  const leaderNames = new Map<string, string>();
  for (const row of settings ?? []) {
    const name = (row.display_name as string | null)?.trim();
    leaderNames.set(row.user_id as string, name || "Mentrixer");
  }

  const divisionNames = new Map<string, string>();
  for (const row of divisions ?? []) {
    divisionNames.set(row.key as string, row.name as string);
  }

  return clans.map((c) => {
    const focusKey = (c.focus_division_key as string | null) ?? null;
    return {
      id: c.id,
      name: c.name,
      tag: c.tag,
      member_count: memberCounts.get(c.id) ?? 0,
      leader_name: leaderNames.get(c.leader_id) ?? "Mentrixer",
      focus_division_key: focusKey,
      focus_label: focusKey
        ? divisionNames.get(focusKey) ?? focusKey.replace(/-/g, " ")
        : "Any subject",
    };
  });
}

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

export async function postClanMessage(
  clanId: string,
  bodyRaw: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }
    const id = parseUUID(clanId);
    if (!id.ok) return { success: false, error: "Invalid clan." };

    const body = bodyRaw.trim().slice(0, 2000);
    if (body.length < 1) {
      return { success: false, error: "Message cannot be empty." };
    }
    assertNoBlockedLanguage(body, "clan chat message");

    const admin = createAdminClient();
    if (!(await assertClanMember(admin, user.id, id.id))) {
      return { success: false, error: "Not a member." };
    }

    const { error } = await admin.from("clan_messages").insert({
      clan_id: id.id,
      user_id: user.id,
      body,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/student/clan/${id.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to send.",
    };
  }
}

export type ClanMessageRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function listClanMessages(
  clanId: string,
  limit = 80
): Promise<ClanMessageRow[] | { error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { error: "Not allowed." };
    }
    const id = parseUUID(clanId);
    if (!id.ok) return { error: "Invalid clan." };

    const admin = createAdminClient();
    if (!(await assertClanMember(admin, user.id, id.id))) {
      return { error: "Not a member." };
    }

    const { data: rows, error } = await admin
      .from("clan_messages")
      .select("id, user_id, body, created_at")
      .eq("clan_id", id.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(120, Math.max(10, limit)));

    if (error) return { error: error.message };

    const uids = Array.from(
      new Set((rows ?? []).map((r) => r.user_id as string))
    );
    const { data: settings } = await admin
      .from("user_settings")
      .select("user_id, display_name, avatar_url")
      .in("user_id", uids);

    const names = new Map(
      (settings ?? []).map((s) => [s.user_id, s.display_name as string | null])
    );
    const avatars = new Map(
      (settings ?? []).map((s) => [s.user_id, (s as { avatar_url?: string | null }).avatar_url ?? null])
    );

    const list: ClanMessageRow[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      body: r.body as string,
      created_at: r.created_at as string,
      display_name: names.get(r.user_id as string) ?? null,
      avatar_url: avatars.get(r.user_id as string) ?? null,
    }));

    return list.reverse();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error" };
  }
}


/** Called when a learner completes any quest with XP — increments weekly clan challenge. */
export async function recordClanQuestCompletion(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: m } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!m?.clan_id) return;

  const clanId = m.clan_id as string;
  const weekStart = getUtcWeekMondayString();

  const { data: existing } = await admin
    .from("clan_weekly_challenge")
    .select("quests_completed, bonus_awarded_at, quest_target, bonus_xp")
    .eq("clan_id", clanId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const target = existing?.quest_target ?? CLAN_QUEST_CHALLENGE_TARGET;
  const bonusXp = existing?.bonus_xp ?? CLAN_QUEST_CHALLENGE_BONUS_XP;
  const next = (existing?.quests_completed ?? 0) + 1;

  await admin.from("clan_weekly_challenge").upsert(
    {
      clan_id: clanId,
      week_start: weekStart,
      quests_completed: next,
      quest_target: target,
      bonus_xp: bonusXp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clan_id,week_start" }
  );

  if (existing?.bonus_awarded_at || next < target) {
    return;
  }

  const now = new Date().toISOString();
  const { data: locked } = await admin
    .from("clan_weekly_challenge")
    .update({ bonus_awarded_at: now })
    .eq("clan_id", clanId)
    .eq("week_start", weekStart)
    .is("bonus_awarded_at", null)
    .gte("quests_completed", target)
    .select("clan_id")
    .maybeSingle();

  if (!locked) return;

  const { data: cRow } = await admin
    .from("clans")
    .select("xp_total")
    .eq("id", clanId)
    .maybeSingle();

  const cur = Number(cRow?.xp_total ?? 0);
  await admin
    .from("clans")
    .update({
      xp_total: cur + bonusXp,
      updated_at: now,
    })
    .eq("id", clanId);

  revalidatePath(`/student/clan/${clanId}`);
}

/** Award Clan XP for winning a duel. */
export async function recordClanDuelWin(userId: string, isClanWar: boolean): Promise<void> {
  const admin = createAdminClient();
  const { data: m } = await admin
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!m?.clan_id) return;

  const clanId = m.clan_id as string;
  const xpAmount = isClanWar ? 50 : 10;
  const now = new Date().toISOString();

  const { data: cRow } = await admin
    .from("clans")
    .select("xp_total")
    .eq("id", clanId)
    .maybeSingle();

  const cur = Number(cRow?.xp_total ?? 0);
  await admin
    .from("clans")
    .update({
      xp_total: cur + xpAmount,
      updated_at: now,
    })
    .eq("id", clanId);

  // If there's an active war, update that too
  const { data: activeWar } = await admin
    .from("clan_wars")
    .select("id, clan_a_id, clan_b_id, clan_a_xp, clan_b_xp")
    .or(`clan_a_id.eq.${clanId},clan_b_id.eq.${clanId}`)
    .eq("status", "active")
    .maybeSingle();

  if (activeWar) {
    if (activeWar.clan_a_id === clanId) {
      await admin.from("clan_wars").update({ clan_a_xp: Number(activeWar.clan_a_xp) + xpAmount }).eq("id", activeWar.id);
    } else {
      await admin.from("clan_wars").update({ clan_b_xp: Number(activeWar.clan_b_xp) + xpAmount }).eq("id", activeWar.id);
    }
  }

  revalidatePath(`/student/clan/${clanId}`);
}

export async function approveJoinRequest(
  requestId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }
    const rid = parseUUID(requestId);
    if (!rid.ok) return { success: false, error: "Invalid request." };

    const admin = createAdminClient();
    const { data: req } = await admin
      .from("clan_join_requests")
      .select("id, clan_id, user_id, status")
      .eq("id", rid.id)
      .maybeSingle();

    if (!req || req.status !== "pending") {
      return { success: false, error: "Request not found." };
    }

    const { data: mem } = await admin
      .from("clan_members")
      .select("role")
      .eq("clan_id", req.clan_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem?.role !== "leader") {
      return { success: false, error: "Only the leader can approve." };
    }

    const { count } = await admin
      .from("clan_members")
      .select("user_id", { count: "exact", head: true })
      .eq("clan_id", req.clan_id as string);

    if ((count ?? 0) >= 20) {
      return { success: false, error: "Clan is full (20 members)." };
    }

    const { error: insErr } = await admin.from("clan_members").insert({
      clan_id: req.clan_id as string,
      user_id: req.user_id as string,
      role: "member",
    });

    if (insErr) {
      return { success: false, error: insErr.message };
    }

    await admin
      .from("clan_join_requests")
      .update({
        status: "approved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", rid.id);

    revalidatePath(`/student/clan/${req.clan_id as string}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed.",
    };
  }
}

export async function rejectJoinRequest(
  requestId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Not allowed." };
    }
    const rid = parseUUID(requestId);
    if (!rid.ok) return { success: false, error: "Invalid request." };

    const admin = createAdminClient();
    const { data: req } = await admin
      .from("clan_join_requests")
      .select("clan_id, status")
      .eq("id", rid.id)
      .maybeSingle();

    if (!req || req.status !== "pending") {
      return { success: false, error: "Request not found." };
    }

    const { data: mem } = await admin
      .from("clan_members")
      .select("role")
      .eq("clan_id", req.clan_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mem?.role !== "leader") {
      return { success: false, error: "Only the leader can reject." };
    }

    await admin
      .from("clan_join_requests")
      .update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", rid.id);

    revalidatePath(`/student/clan/${req.clan_id as string}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed.",
    };
  }
}

export async function listPendingJoinRequests(clanId: string) {
  const user = await requireRole(["student", "admin"]);
  if (user.role !== "student") return [];

  const id = parseUUID(clanId);
  if (!id.ok) return [];

  const admin = createAdminClient();
  const { data: mem } = await admin
    .from("clan_members")
    .select("role")
    .eq("clan_id", id.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mem?.role !== "leader") return [];

  const { data: rows } = await admin
    .from("clan_join_requests")
    .select("id, user_id, created_at")
    .eq("clan_id", id.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const uids = (rows ?? []).map((r) => r.user_id as string);
  if (uids.length === 0) return [];

  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, display_name")
    .in("user_id", uids);

  const names = new Map(
    (settings ?? []).map((s) => [s.user_id, s.display_name as string | null])
  );

  return (rows ?? []).map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    display_name: names.get(r.user_id as string) ?? null,
    created_at: r.created_at as string,
  }));
}
