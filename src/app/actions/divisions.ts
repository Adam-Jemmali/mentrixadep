"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUtcWeekMondayString } from "@/lib/division-week";
import { getDivisionTierFromXp } from "@/lib/levels";
import {
  getDivisionKeyForCourse,
  getDivisionsCatalog,
  getDivisionLeaderboard,
  type LeaderboardEntry,
} from "@/app/actions/quest";

export interface WeeklyLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  weeklyXp: number;
  streakDays: number;
  level: ReturnType<typeof getDivisionTierFromXp>;
  isCurrentUser: boolean;
}

export interface DivisionHubCard {
  key: string;
  name: string;
  description: string | null;
  memberCount: number;
  weeklyRank: number | null;
  weeklyXp: number;
  isFocused: boolean;
  isMember: boolean;
}

export interface DivisionActivityItem {
  userId: string;
  displayName: string;
  completedAt: string;
}

export interface DivisionDuelPreview {
  id: string;
  studentId: string;
  opponentId: string;
  status: string;
  createdAt: string;
  studentName: string;
  opponentName: string;
}

async function resolveDisplayNames(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(userIds));
  const settingsNameByUser = new Map<string, string>();
  if (unique.length > 0) {
    const { data: settingsRows } = await admin
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", unique);
    for (const s of settingsRows ?? []) {
      const raw = typeof s.display_name === "string" ? s.display_name.trim() : "";
      if (raw) settingsNameByUser.set(s.user_id, raw.slice(0, 100));
    }
  }

  const displayNames: Record<string, string> = {};
  await Promise.all(
    unique.map(async (uid) => {
      const fromSettings = settingsNameByUser.get(uid);
      if (fromSettings) {
        displayNames[uid] = fromSettings;
        return;
      }
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        const u = data?.user;
        const fullName = (u?.user_metadata?.full_name as string) || (u?.user_metadata?.name as string);
        if (fullName && typeof fullName === "string") {
          const parts = fullName.trim().split(/\s+/);
          const first = parts[0];
          const last = parts[parts.length - 1];
          if (parts.length >= 2 && first && last) {
            displayNames[uid] = `${first} ${last.charAt(0)}.`;
          } else if (first) {
            displayNames[uid] = `${first.slice(0, 2)}.`;
          }
        } else if (u?.email) {
          const local = u.email.split("@")[0];
          displayNames[uid] = local ? `${local.slice(0, 3)}***` : "Anonymous";
        } else {
          displayNames[uid] = "Anonymous";
        }
      } catch {
        displayNames[uid] = "Anonymous";
      }
    }),
  );
  return displayNames;
}

export async function getWeeklyDivisionLeaderboard(
  divisionKey: string,
  currentUserId: string,
  limit = 50,
): Promise<WeeklyLeaderboardEntry[]> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const weekStart = getUtcWeekMondayString();

  const { data: rows } = await admin
    .from("division_weekly_xp")
    .select("user_id, xp_earned")
    .eq("division_key", divisionKey)
    .eq("week_start", weekStart)
    .gt("xp_earned", 0)
    .order("xp_earned", { ascending: false })
    .order("user_id", { ascending: true })
    .limit(limit);

  const list = rows ?? [];
  const userIds = list.map((r) => r.user_id);
  const names = await resolveDisplayNames(admin, userIds);

  const { data: xpRows } =
    userIds.length > 0
      ? await admin.from("user_xp").select("user_id, streak_days, division_xp").in("user_id", userIds)
      : { data: [] as { user_id: string; streak_days: number | null; division_xp: unknown }[] };

  const xpByUser = new Map(
    (xpRows ?? []).map((r) => [
      r.user_id,
      {
        streak: (r.streak_days as number) ?? 0,
        divXp: (r.division_xp as Record<string, number>)?.[divisionKey] ?? 0,
      },
    ]),
  );

  return list.map((r, i) => {
    const meta = xpByUser.get(r.user_id);
    const allTimeDivXp = meta?.divXp ?? 0;
    return {
      rank: i + 1,
      userId: r.user_id,
      displayName: names[r.user_id] ?? "Anonymous",
      weeklyXp: r.xp_earned,
      streakDays: meta?.streak ?? 0,
      level: getDivisionTierFromXp(allTimeDivXp),
      isCurrentUser: r.user_id === currentUserId,
    };
  });
}

export async function getDivisionHubCards(userId: string): Promise<DivisionHubCard[]> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const weekStart = getUtcWeekMondayString();

  const [catalog, { data: settingsRow }] = await Promise.all([
    getDivisionsCatalog(),
    admin.from("user_settings").select("focused_division_key").eq("user_id", userId).maybeSingle(),
  ]);

  const focused =
    typeof settingsRow?.focused_division_key === "string"
      ? settingsRow.focused_division_key.trim()
      : null;

  const { data: memberships } = await admin
    .from("user_divisions")
    .select("division_key")
    .eq("user_id", userId);

  const memberSet = new Set((memberships ?? []).map((m) => m.division_key));

  const cards: DivisionHubCard[] = [];

  for (const d of catalog) {
    const { count: memberCount } = await admin
      .from("user_divisions")
      .select("*", { count: "exact", head: true })
      .eq("division_key", d.key);

    const { data: myWeek } = await admin
      .from("division_weekly_xp")
      .select("xp_earned")
      .eq("user_id", userId)
      .eq("division_key", d.key)
      .eq("week_start", weekStart)
      .maybeSingle();

    const myXp = myWeek?.xp_earned ?? 0;
    let weeklyRank: number | null = null;
    if (memberSet.has(d.key) && myXp > 0) {
      const { count: above } = await admin
        .from("division_weekly_xp")
        .select("*", { count: "exact", head: true })
        .eq("division_key", d.key)
        .eq("week_start", weekStart)
        .gt("xp_earned", myXp);
      weeklyRank = (above ?? 0) + 1;
    } else if (memberSet.has(d.key) && myXp === 0) {
      const { count: total } = await admin
        .from("division_weekly_xp")
        .select("*", { count: "exact", head: true })
        .eq("division_key", d.key)
        .eq("week_start", weekStart)
        .gt("xp_earned", 0);
      weeklyRank = (total ?? 0) > 0 ? (total ?? 0) + 1 : null;
    }

    cards.push({
      key: d.key,
      name: d.name,
      description: d.description ?? null,
      memberCount: memberCount ?? 0,
      weeklyRank,
      weeklyXp: myXp,
      isFocused: focused === d.key,
      isMember: memberSet.has(d.key),
    });
  }

  return cards;
}

export async function joinDivision(
  divisionKey: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();
    const key = divisionKey.trim();
    const { data: div } = await admin
      .from("divisions")
      .select("key")
      .eq("key", key)
      .eq("active", true)
      .maybeSingle();
    if (!div) {
      return { success: false, error: "Unknown division." };
    }

    const { error } = await admin.from("user_divisions").insert({
      user_id: user.id,
      division_key: key,
    });
    if (error && error.code !== "23505") {
      return { success: false, error: error.message };
    }

    revalidatePath("/student/division");
    revalidatePath("/student/division/arena");
    revalidatePath(`/student/division/${key}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not join division.",
    };
  }
}

export async function getDivisionByKey(
  divisionKey: string,
): Promise<{ key: string; name: string; description: string | null } | null> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const { data } = await admin
    .from("divisions")
    .select("key, name, description")
    .eq("key", divisionKey.trim())
    .eq("active", true)
    .maybeSingle();
  return data
    ? {
        key: data.key,
        name: data.name,
        description: data.description ?? null,
      }
    : null;
}

export async function getDivisionActivityFeed(
  divisionKey: string,
  limit = 20,
): Promise<DivisionActivityItem[]> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data: studentRows } = await admin.from("users").select("id").eq("role", "student");
  const studentIds = new Set((studentRows ?? []).map((r) => r.id));

  const { data: progress } = await admin
    .from("user_quest_progress")
    .select("user_id, quest_id, last_attempt_at")
    .eq("status", "completed")
    .order("last_attempt_at", { ascending: false })
    .limit(500);

  if (!progress?.length) return [];

  const filtered = progress.filter((p) => studentIds.has(p.user_id));
  const questIds = Array.from(new Set(filtered.map((p) => p.quest_id)));
  const { data: quests } = await admin.from("quests").select("id, metadata").in("id", questIds);
  const questMap = new Map((quests ?? []).map((q) => [q.id, q]));

  const courses = new Set<string>();
  for (const p of filtered) {
    const q = questMap.get(p.quest_id);
    const m = (q?.metadata as Record<string, unknown> | null) ?? {};
    if (typeof m.course === "string" && m.course.trim()) courses.add(m.course.trim());
  }
  const courseToDivKey = new Map<string, string>();
  for (const c of Array.from(courses)) {
    courseToDivKey.set(c, (await getDivisionKeyForCourse(c)) ?? "general");
  }

  const out: DivisionActivityItem[] = [];
  for (const p of filtered) {
    if (out.length >= limit) break;
    const q = questMap.get(p.quest_id);
    const m = (q?.metadata as Record<string, unknown> | null) ?? {};
    const course = typeof m.course === "string" ? m.course.trim() : null;
    const divKey = course ? (courseToDivKey.get(course) ?? "general") : "general";
    if (divKey !== divisionKey) continue;
    const completedAt =
      (typeof p.last_attempt_at === "string" && p.last_attempt_at) || new Date().toISOString();
    out.push({ userId: p.user_id, displayName: "", completedAt });
  }

  const names = await resolveDisplayNames(admin, out.map((o) => o.userId));
  return out.map((o) => ({
    ...o,
    displayName: names[o.userId] ?? "A learner",
  }));
}

export async function getUpcomingDuelsForDivision(
  divisionKey: string,
  limit = 12,
): Promise<DivisionDuelPreview[]> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data: duels } = await admin
    .from("skill_duels")
    .select("id, student_id, opponent_student_id, status, created_at")
    .eq("division_key", divisionKey)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!duels?.length) return [];

  const ids = Array.from(new Set(duels.flatMap((d) => [d.student_id, d.opponent_student_id])));
  const names = await resolveDisplayNames(admin, ids);

  return duels.map((d) => ({
    id: d.id,
    studentId: d.student_id,
    opponentId: d.opponent_student_id,
    status: d.status,
    createdAt: d.created_at,
    studentName: names[d.student_id] ?? "Player",
    opponentName: names[d.opponent_student_id] ?? "Player",
  }));
}

export async function getDivisionMessages(divisionKey: string, limit = 80) {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("division_messages")
    .select("id, user_id, body, created_at")
    .eq("division_key", divisionKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  const list = (rows ?? []).slice().reverse();
  const ids = list.map((r) => r.user_id);
  const names = await resolveDisplayNames(admin, ids);

  return list.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: names[r.user_id] ?? "Member",
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function postDivisionMessage(
  divisionKey: string,
  body: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const admin = createAdminClient();
    const key = divisionKey.trim();
    const text = body.trim();
    if (text.length < 1 || text.length > 4000) {
      return { success: false, error: "Message must be 1–4000 characters." };
    }

    const { data: mem } = await admin
      .from("user_divisions")
      .select("division_key")
      .eq("user_id", user.id)
      .eq("division_key", key)
      .maybeSingle();
    if (!mem) {
      return { success: false, error: "Join this division to participate in the board." };
    }

    const { error } = await admin.from("division_messages").insert({
      division_key: key,
      user_id: user.id,
      body: text,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath(`/student/division/${key}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not post message.",
    };
  }
}

export async function isUserDivisionMember(userId: string, divisionKey: string): Promise<boolean> {
  await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_divisions")
    .select("division_key")
    .eq("user_id", userId)
    .eq("division_key", divisionKey.trim())
    .maybeSingle();
  return Boolean(data);
}

/** Detail page: weekly top 50, all-time top 50, activity, duels, chat. */
export async function loadDivisionDetailPage(divisionKey: string, userId: string) {
  await requireRole(["student", "admin"]);
  const div = await getDivisionByKey(divisionKey);
  if (!div) return null;

  const admin = createAdminClient();
  const weekStart = getUtcWeekMondayString();

  const [weekly, allTime, activity, duels, messages, isMember, memberCountRes] = await Promise.all([
    getWeeklyDivisionLeaderboard(divisionKey, userId, 50),
    getDivisionLeaderboard(divisionKey, userId, 50),
    getDivisionActivityFeed(divisionKey, 3),
    getUpcomingDuelsForDivision(divisionKey, 12),
    getDivisionMessages(divisionKey, 80),
    isUserDivisionMember(userId, divisionKey),
    admin.from("user_divisions").select("*", { count: "exact", head: true }).eq("division_key", divisionKey.trim()),
  ]);

  const memberCount = memberCountRes.count ?? 0;

  const { data: settingsRow } = await admin
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", userId)
    .maybeSingle();
  const focused =
    typeof settingsRow?.focused_division_key === "string"
      ? settingsRow.focused_division_key.trim()
      : null;

  const { data: weekRows } = await admin
    .from("division_weekly_xp")
    .select("xp_earned")
    .eq("division_key", divisionKey)
    .eq("week_start", weekStart)
    .gt("xp_earned", 0);

  const weeklyPoolXp = (weekRows ?? []).reduce((s, r) => s + (r.xp_earned ?? 0), 0);

  return {
    division: div,
    weekStart,
    weeklyLeaderboard: weekly,
    allTimeLeaderboard: allTime as LeaderboardEntry[],
    activity,
    duels,
    messages,
    isMember,
    memberCount,
    weeklyPoolXp,
    isFocused: focused === divisionKey,
  };
}

export type DivisionDetailPayload = NonNullable<Awaited<ReturnType<typeof loadDivisionDetailPage>>>;
