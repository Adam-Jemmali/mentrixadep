"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { cacheKeys, cacheTtl, withCache } from "@/shared/core/redis";
import { getCachedUserMeta } from "@/shared/core/user-meta-cache";
import { withSupabaseQuerySpan } from "@/shared/integrations/observability";
import { getDivisionTierFromXp } from "@/features/xp/levels";
import {
  AP_CALC_AB_DIVISION_KEY,
  assertAllowedArenaDivisionKey,
  filterArenaDivisions,
} from "@/features/divisions/ap-calc-ab-division";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export async function getDivisionKeyForCourse(
  course: string
): Promise<string | null> {
  if (!course?.trim()) return null;
  if (isApCalculusAbSubject(course)) return AP_CALC_AB_DIVISION_KEY;
  try {
    const adminClient = createAdminClient();
    const { data: mapRow } = await adminClient
      .from("course_division_map")
      .select("division_id")
      .eq("course", course.trim())
      .maybeSingle();

    if (!mapRow?.division_id) return null;

    const { data: division } = await adminClient
      .from("divisions")
      .select("key")
      .eq("id", mapRow.division_id)
      .maybeSingle();

    return division?.key ?? null;
  } catch {
    return null; // best-effort — never block XP award
  }
}

// ============================================================
// DIVISION LEADERBOARD & LEVELS
// ============================================================
// Division tiers re-exported via getDivisionTierFromXp
// from @/features/xp/levels (see import at top of file).

export interface StudentDivisionResult {
  divisionKey: string;
  divisionName: string;
  divisionDescription: string | null;
  rank: number;
  divisionXp: number;
  level: ReturnType<typeof getDivisionTierFromXp>;
  streakDays: number;
}

/** Active divisions catalog (for focus picker). */
export async function getActiveDivisions(): Promise<
  { key: string; name: string; description: string | null }[]
> {
  await requireRole(["student", "admin"]);
  return getDivisionsCatalog();
}

/** Public division list for pickers (e.g. tutor profile duel) — no auth required. */
export async function getDivisionsCatalog(): Promise<
  { key: string; name: string; description: string | null }[]
> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("divisions")
    .select("key, name, description")
    .eq("active", true)
    .order("name", { ascending: true });
  return filterArenaDivisions(data ?? []).map((d) => ({
    key: d.key,
    name: d.name,
    description: d.description ?? null,
  }));
}

/**
 * Set which division leaderboard the student focuses (null = use highest-XP division).
 */
export async function setFocusedDivision(
  divisionKey: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const adminClient = createAdminClient();

    if (divisionKey !== null && divisionKey.trim() !== "") {
      const allowed = assertAllowedArenaDivisionKey(divisionKey);
      if (!allowed.ok) {
        return { success: false, error: allowed.error };
      }
      const key = allowed.key;
      const { data: div } = await adminClient
        .from("divisions")
        .select("key")
        .eq("key", key)
        .eq("active", true)
        .maybeSingle();
      if (!div) {
        return { success: false, error: "Unknown division." };
      }
      const { error: joinErr } = await adminClient.from("user_divisions").insert({
        user_id: user.id,
        division_key: key,
      });
      if (joinErr && joinErr.code !== "23505") {
        return { success: false, error: joinErr.message };
      }
      await adminClient.from("user_settings").upsert(
        {
          user_id: user.id,
          focused_division_key: key,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } else {
      await adminClient.from("user_settings").upsert(
        {
          user_id: user.id,
          focused_division_key: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    revalidatePath("/student/division", "layout");
    revalidatePath("/student/division/arena");
    if (typeof divisionKey === "string" && divisionKey.trim() !== "") {
      revalidatePath(`/student/division/${divisionKey.trim()}`);
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save focus.",
    };
  }
}

/**
 * Leaderboard context: uses focused_division_key from settings when set and valid;
 * otherwise primary division = highest division_xp.
 * Returns null only when the learner has no division XP and no valid focus.
 */
export async function getStudentDivision(
  userId: string
): Promise<StudentDivisionResult | null> {
  await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  const { data: settingsRow } = await adminClient
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", userId)
    .maybeSingle();

  const focusedKey =
    typeof settingsRow?.focused_division_key === "string"
      ? settingsRow.focused_division_key.trim()
      : null;

  const { data: xpRow } = await adminClient
    .from("user_xp")
    .select("division_xp, streak_days")
    .eq("user_id", userId)
    .maybeSingle();

  const divisionXp = (xpRow?.division_xp as Record<string, number>) ?? {};
  const entries = Object.entries(divisionXp)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  let divisionKey: string;
  let xp: number;

  if (focusedKey) {
    const { data: focusDiv } = await adminClient
      .from("divisions")
      .select("key")
      .eq("key", focusedKey)
      .eq("active", true)
      .maybeSingle();

    if (focusDiv) {
      divisionKey = focusedKey;
      xp =
        typeof divisionXp[divisionKey] === "number"
          ? (divisionXp[divisionKey] ?? 0)
          : 0;
    } else if (entries.length === 0) {
      return null;
    } else {
      [divisionKey, xp] = entries[0] as [string, number];
    }
  } else if (entries.length > 0) {
    [divisionKey, xp] = entries[0] as [string, number];
  } else {
    return null;
  }

  const { data: division } = await adminClient
    .from("divisions")
    .select("key, name, description")
    .eq("key", divisionKey)
    .single();

  if (!division) return null;

  const { data: rankData, error: rankErr } = await adminClient.rpc("get_user_rank", {
    p_user_id: userId,
    p_division_key: divisionKey,
  });

  const rank =
    !rankErr && typeof rankData === "number" && rankData > 0
      ? rankData
      : 1;

  return {
    divisionKey: division.key,
    divisionName: division.name,
    divisionDescription: division.description ?? null,
    rank,
    divisionXp: xp,
    level: getDivisionTierFromXp(xp),
    streakDays: (xpRow?.streak_days as number) ?? 0,
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  divisionXp: number;
  totalXp: number;
  streakDays: number;
  level: ReturnType<typeof getDivisionTierFromXp>;
  isCurrentUser: boolean;
}

async function resolveLeaderboardDisplayNames(
  adminClient: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Record<string, string>> {
  const settingsNameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: settingsRows } = await adminClient
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", userIds);
    for (const s of settingsRows ?? []) {
      const raw = typeof s.display_name === "string" ? s.display_name.trim() : "";
      if (raw) settingsNameByUser.set(s.user_id, raw.slice(0, 100));
    }
  }

  const displayNames: Record<string, string> = {};
  await Promise.all(
    userIds.map(async (uid) => {
      const fromSettings = settingsNameByUser.get(uid);
      if (fromSettings) {
        displayNames[uid] = fromSettings;
        return;
      }
      try {
        const meta = await getCachedUserMeta(uid);
        const fullName = meta.displayName;
        if (fullName && typeof fullName === "string") {
          const parts = fullName.trim().split(/\s+/);
          const first = parts[0];
          const last = parts[parts.length - 1];
          if (parts.length >= 2 && first && last) {
            displayNames[uid] = `${first} ${last.charAt(0)}.`;
          } else if (first) {
            displayNames[uid] = first.slice(0, 2) + ".";
          }
        } else if (meta.email) {
          const local = meta.email.split("@")[0];
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

async function resolveLeaderboardAvatarUrls(
  adminClient: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Record<string, string | null>> {
  const avatarUrls: Record<string, string | null> = {};
  if (userIds.length === 0) return avatarUrls;

  const { data: settingsRows } = await adminClient
    .from("user_settings")
    .select("user_id, avatar_url")
    .in("user_id", userIds);

  for (const row of settingsRows ?? []) {
    avatarUrls[row.user_id] =
      typeof row.avatar_url === "string" && row.avatar_url.trim().length > 0
        ? row.avatar_url.trim()
        : null;
  }

  for (const userId of userIds) {
    if (avatarUrls[userId]) continue;
    try {
      const { data } = await adminClient.auth.admin.getUserById(userId);
      const meta = data?.user?.user_metadata as Record<string, unknown> | undefined;
      const avatarRaw = meta?.avatar_url ?? meta?.picture;
      avatarUrls[userId] =
        typeof avatarRaw === "string" && avatarRaw.trim().length > 0
          ? avatarRaw.trim()
          : null;
    } catch {
      avatarUrls[userId] = null;
    }
  }

  for (const userId of userIds) {
    if (!(userId in avatarUrls)) avatarUrls[userId] = null;
  }

  return avatarUrls;
}

async function resolveLeaderboardTotalXp(
  adminClient: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Record<string, number>> {
  const totalXpByUser: Record<string, number> = {};
  if (userIds.length === 0) return totalXpByUser;

  const { data: xpRows } = await adminClient
    .from("user_xp")
    .select("user_id, total_xp")
    .in("user_id", userIds);

  for (const row of xpRows ?? []) {
    const uid = row.user_id as string;
    totalXpByUser[uid] =
      typeof row.total_xp === "number" ? Math.max(0, row.total_xp) : 0;
  }

  for (const uid of userIds) {
    if (!(uid in totalXpByUser)) totalXpByUser[uid] = 0;
  }

  return totalXpByUser;
}

/** Uses mv_division_leaderboard when present; falls back to scanning user_xp. */
async function buildDivisionLeaderboard(
  divisionKey: string,
  currentUserId: string,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const adminClient = createAdminClient();

  const { data: mvRows, error: mvErr } = await withSupabaseQuerySpan(
    "mv_division_leaderboard.select",
    async () =>
      adminClient
        .from("mv_division_leaderboard")
        .select("user_id, division_xp, streak_days")
        .eq("division_key", divisionKey)
        .order("division_xp", { ascending: false })
        .limit(limit),
  );

  let divXpList: { user_id: string; xp: number; streak_days: number }[];

  if (mvErr) {
    const { data: xpRows } = await adminClient
      .from("user_xp")
      .select("user_id, division_xp, streak_days");
    divXpList = (xpRows ?? [])
      .map((r) => ({
        user_id: r.user_id as string,
        xp: (r.division_xp as Record<string, number>)?.[divisionKey] ?? 0,
        streak_days: (r.streak_days as number) ?? 0,
      }))
      .filter((r) => r.xp > 0)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
  } else {
    divXpList = (mvRows ?? []).map((r: { user_id: string; division_xp: unknown; streak_days: unknown }) => ({
      user_id: r.user_id as string,
      xp: Number(r.division_xp) ?? 0,
      streak_days: Number(r.streak_days) ?? 0,
    }));
  }

  const userIds = divXpList.map((r) => r.user_id);
  const [displayNames, avatarUrls, totalXpByUser] = await Promise.all([
    resolveLeaderboardDisplayNames(adminClient, userIds),
    resolveLeaderboardAvatarUrls(adminClient, userIds),
    resolveLeaderboardTotalXp(adminClient, userIds),
  ]);

  return divXpList.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    displayName: displayNames[r.user_id] ?? "Anonymous",
    avatarUrl: avatarUrls[r.user_id] ?? null,
    divisionXp: r.xp,
    totalXp: totalXpByUser[r.user_id] ?? 0,
    streakDays: r.streak_days,
    level: getDivisionTierFromXp(r.xp),
    isCurrentUser: r.user_id === currentUserId,
  }));
}

/** Top learners in a division (all-time division XP). Display name from Settings, then auth metadata / email. */
export async function getDivisionLeaderboard(
  divisionKey: string,
  currentUserId: string,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  await requireRole(["student", "admin"]);
  const cacheKey = `${cacheKeys.leaderboard(divisionKey)}:${currentUserId}:${limit}`;
  return withCache(cacheKey, cacheTtl.leaderboard, () =>
    buildDivisionLeaderboard(divisionKey, currentUserId, limit),
  );
}

export interface DivisionStat {
  divisionKey: string;
  divisionName: string;
  xp: number;
  level: ReturnType<typeof getDivisionTierFromXp>;
  rank: number;
}

/** All divisions the student has XP in, with level and rank per division. */
export async function getStudentDivisionStats(
  userId: string
): Promise<DivisionStat[]> {
  await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  const { data: xpRow } = await adminClient
    .from("user_xp")
    .select("division_xp")
    .eq("user_id", userId)
    .single();

  const divisionXp = (xpRow?.division_xp as Record<string, number>) ?? {};
  const keys = Object.entries(divisionXp)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .map(([k]) => k);

  if (keys.length === 0) return [];

  const { data: divisions } = await adminClient
    .from("divisions")
    .select("key, name")
    .in("key", keys);

  const divMap = new Map((divisions ?? []).map((d) => [d.key, d.name]));

  const rankEntries = await Promise.all(
    keys.map(async (key) => {
      const xp = divisionXp[key] ?? 0;
      const { count, error: cErr } = await adminClient
        .from("mv_division_leaderboard")
        .select("*", { count: "exact", head: true })
        .eq("division_key", key)
        .gt("division_xp", xp);

      let rank: number;
      if (!cErr) {
        rank = (count ?? 0) + 1;
      } else {
        const { data: allRows } = await adminClient.from("user_xp").select("user_id, division_xp");
        const withXp = (allRows ?? [])
          .map((r) => (r.division_xp as Record<string, number>)?.[key] ?? 0)
          .filter((v) => v > 0);
        rank = withXp.filter((v) => v > xp).length + 1;
      }

      return {
        divisionKey: key,
        divisionName: divMap.get(key) ?? key,
        xp,
        level: getDivisionTierFromXp(xp),
        rank,
      };
    }),
  );

  return rankEntries.sort((a, b) => b.xp - a.xp);
}