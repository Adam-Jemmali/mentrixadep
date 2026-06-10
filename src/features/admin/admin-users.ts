"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";

export type AdminUser = {
  id: string;
  email: string | null;
  role: string;
  approved: boolean;
  status?: "pending" | "approved" | "suspended" | null;
  created_at: string;
};

export async function getAllUsers(pageIndex = 0, pageSize = 100): Promise<AdminUser[]> {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const safePage = Math.max(0, pageIndex);
  const safeSize = Math.min(Math.max(pageSize, 1), 200);
  const from = safePage * safeSize;
  const to = from + safeSize - 1;

  const { data: users, error } = await adminClient
    .from("users")
    .select("id, role, approved, status, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  if (!users?.length) return [];

  const emailById = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });
    if (authError) break;
    authData.users.forEach((u) => {
      if (u.email) emailById.set(u.id, u.email);
    });
    hasMore = authData.users.length === perPage;
    page += 1;
  }

  for (const u of users) {
    if (emailById.has(u.id)) continue;
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(u.id);
      const em = authUser?.user?.email;
      if (em) emailById.set(u.id, em);
    } catch {
      /* best-effort */
    }
  }

  return users
    .map((u) => ({
      id: u.id,
      email: emailById.get(u.id) ?? null,
      role: u.role,
      approved: u.approved,
      status: (u as { status?: "pending" | "approved" | "suspended" | null }).status ?? null,
      created_at: u.created_at,
    }))
    .filter((u) => Boolean(u.email));
}

export async function suspendUser(userId: string) {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();

  enforceRateLimit(getRateLimitId(admin.id), RATE_LIMITS.adminAction, "suspend user");
  const validId = validateUUID(userId);

  const { error } = await adminClient
    .from("users")
    .update({ approved: false, status: "suspended" })
    .eq("id", validId);

  if (error) throw new Error(sanitizeError(error));
  revalidatePath("/admin/users");
  return { success: true };
}

export async function unsuspendUser(userId: string) {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();

  enforceRateLimit(getRateLimitId(admin.id), RATE_LIMITS.adminAction, "unsuspend user");
  const validId = validateUUID(userId);

  const { error } = await adminClient
    .from("users")
    .update({ approved: true, status: "approved" })
    .eq("id", validId);

  if (error) throw new Error(sanitizeError(error));
  revalidatePath("/admin/users");
  return { success: true };
}

export async function promoteToAdmin(userId: string, mfaCode?: string) {
  void userId;
  void mfaCode;
  await requireRole("admin");
  throw new Error("Promoting users to admin is disabled.");
}

export async function getUserDetail(userId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(userId);

  const [userRes, xpRes, sessionsRes, ratingsRes] = await Promise.all([
    adminClient.from("users").select("*").eq("id", validId).single(),
    adminClient.from("user_xp").select("total_xp, streak_days").eq("user_id", validId).maybeSingle(),
    adminClient.from("sessions").select("id, course, start_time, status").or(`student_id.eq.${validId},tutor_id.eq.${validId}`).order("start_time", { ascending: false }).limit(10),
    adminClient.from("ratings").select("rating").eq("tutor_id", validId),
  ]);

  const authUser = await adminClient.auth.admin.getUserById(validId);

  return {
    user: userRes.data,
    email: authUser.data?.user?.email ?? null,
    xp: xpRes.data,
    recentSessions: sessionsRes.data ?? [],
    avgRating: ratingsRes.data?.length
      ? ratingsRes.data.reduce((a, r) => a + r.rating, 0) / ratingsRes.data.length
      : null,
  };
}
