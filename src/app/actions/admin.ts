"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId, emailSchema } from "@/lib/security";
import { z } from "zod";
import { sendWaitlistDecisionEmail } from "@/lib/email";
import { logSensitiveAdminAction } from "@/lib/zero-trust";

async function findAuthUserByEmail(email: string) {
  emailSchema.parse(email);
  const adminClient = createAdminClient();
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[admin] listUsers failed while searching by email:", error.message);
      return null;
    }

    const found = data.users.find((u) => (u.email ?? "").trim().toLowerCase() === target);
    if (found) return found;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function getRegistrationRequests() {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("registration_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch registration requests: ${error.message}`);
  }

  const rows = data ?? [];
  const filtered: typeof rows = [];

  for (const r of rows) {
    if (r.status !== "approved") {
      filtered.push(r);
      continue;
    }
    const linked = (r as { account_linked_at?: string | null }).account_linked_at;
    if (linked) {
      const authUser = await findAuthUserByEmail(r.email);
      if (!authUser) {
        /* Approved but auth account was removed (e.g. user deleted account); omit from admin list. */
        continue;
      }
    }
    filtered.push(r);
  }

  return filtered;
}

export async function approveRegistrationRequest(requestId: string) {
  try {
    const user = await requireRole("admin");
    const adminClient = createAdminClient();

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.adminAction,
      "approve registration"
    );

    const validRequestId = validateUUID(requestId);

    const { data: request, error: requestError } = await adminClient
      .from("registration_requests")
      .select("*")
      .eq("id", validRequestId)
      .single();

    if (requestError || !request) {
      throw new Error("Registration request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    // Look up the auth user by email
    // Note: Supabase JS SDK doesn't support email-based user lookup directly,
    // so we list users with pagination. For high-volume apps, consider a
    // server-side function (RPC) that queries auth.users by email.
    const authUser = await findAuthUserByEmail(request.email);

    if (authUser) {
      const { error: updateError } = await adminClient
        .from("users")
        .update({
          role: request.role,
          approved: true,
          status: "approved",
        })
        .eq("id", authUser.id);

      if (updateError) {
        throw new Error(`Failed to approve user: ${updateError.message}`);
      }
    }

    const requestPatch: Record<string, unknown> = {
      status: "approved",
      updated_at: new Date().toISOString(),
    };
    if (authUser) {
      requestPatch.account_linked_at = new Date().toISOString();
    }

    const { error: requestUpdateError } = await adminClient
      .from("registration_requests")
      .update(requestPatch)
      .eq("id", validRequestId);

    if (requestUpdateError) {
      throw new Error(`Failed to update request status: ${sanitizeError(requestUpdateError)}`);
    }

    void sendWaitlistDecisionEmail(request.email, request.role, "approved");

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function rejectRegistrationRequest(requestId: string) {
  try {
    const user = await requireRole("admin");
    const adminClient = createAdminClient();

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.adminAction,
      "reject registration"
    );

    const validRequestId = validateUUID(requestId);

    const { data: request } = await adminClient
      .from("registration_requests")
      .select("email, role")
      .eq("id", validRequestId)
      .maybeSingle();

    const { error } = await adminClient
      .from("registration_requests")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validRequestId);

    if (error) {
      throw new Error(`Failed to reject request: ${sanitizeError(error)}`);
    }

    // Remove the user entirely so they cannot access the app.
    // We find their auth account by email, delete from users table, then from auth.users.
    if (request?.email) {
      try {
        const authUser = await findAuthUserByEmail(request.email);
        if (authUser) {
          // Delete from users table first (FK may cascade, but be explicit)
          await adminClient.from("users").delete().eq("id", authUser.id);
          // Delete from Supabase auth entirely
          await adminClient.auth.admin.deleteUser(authUser.id);

          await logSensitiveAdminAction(user.id, "DELETE_USER_VIA_REJECTION", { 
            targetUserId: authUser.id, 
            requestEmail: request.email 
          });
        }
      } catch (deleteErr) {
        // Best-effort: log but don't fail the rejection
        console.error("[rejectRegistrationRequest] failed to delete user account:", deleteErr);
      }
    }

    if (request?.email && request?.role) {
      void sendWaitlistDecisionEmail(request.email, request.role, "rejected");
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export type AdminUser = {
  id: string;
  email: string | null;
  role: string;
  approved: boolean;
  status?: "pending" | "approved" | "suspended" | null;
  created_at: string;
};

export async function getAutoApproveRegistrations(): Promise<boolean> {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("system_settings")
    .select("value")
    .eq("key", "auto_approve_registrations")
    .single();

  return data?.value?.enabled === true;
}

export async function toggleAutoApproveRegistrations(): Promise<{ enabled: boolean }> {
  const user = await requireRole("admin");
  const adminClient = createAdminClient();

  enforceRateLimit(
    getRateLimitId(user.id),
    RATE_LIMITS.adminAction,
    "toggle auto-approve registrations"
  );

  const current = await getAutoApproveRegistrations();
  const newValue = !current;

  const { error } = await adminClient
    .from("system_settings")
    .upsert({
      key: "auto_approve_registrations",
      value: { enabled: newValue },
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to update setting: ${sanitizeError(error)}`);
  }

  revalidatePath("/admin");
  return { enabled: newValue };
}

export async function approveAllPendingRegistrations(): Promise<{ count: number }> {
  const user = await requireRole("admin");
  const adminClient = createAdminClient();

  enforceRateLimit(
    getRateLimitId(user.id),
    RATE_LIMITS.adminAction,
    "approve all registrations"
  );

  const { data: pendingRequests, error: fetchError } = await adminClient
    .from("registration_requests")
    .select("*")
    .eq("status", "pending");

  if (fetchError || !pendingRequests?.length) {
    return { count: 0 };
  }

  let approved = 0;

  for (const request of pendingRequests) {
    const authUser = await findAuthUserByEmail(request.email);
    if (authUser) {
      const { error: updateError } = await adminClient
        .from("users")
        .update({ role: request.role, approved: true, status: "approved" })
        .eq("id", authUser.id);

      if (updateError) continue;
    }

    const batchPatch: Record<string, unknown> = {
      status: "approved",
      updated_at: new Date().toISOString(),
    };
    if (authUser) {
      batchPatch.account_linked_at = new Date().toISOString();
    }

    await adminClient.from("registration_requests").update(batchPatch).eq("id", request.id);

    void sendWaitlistDecisionEmail(request.email, request.role, "approved");
    approved++;
  }

  revalidatePath("/admin");
  return { count: approved };
}

export async function getAllUsers(): Promise<AdminUser[]> {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data: users, error } = await adminClient
    .from("users")
    .select("id, role, approved, status, created_at")
    .order("created_at", { ascending: false });

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

// ============================================================
// TUTOR COURSE VERIFICATION
// ============================================================

export async function getAllUnverifiedTutorCourses() {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("tutor_courses")
    .select("*")
    .eq("verified", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch unverified courses: ${sanitizeError(error)}`);

  const tutorIds = Array.from(new Set((data ?? []).map((c) => c.tutor_id)));
  const emailMap: Record<string, string> = {};
  await Promise.all(
    tutorIds.map(async (tid) => {
      try {
        const { data: auth } = await adminClient.auth.admin.getUserById(tid);
        if (auth?.user?.email) emailMap[tid] = auth.user.email;
      } catch { /* best-effort */ }
    }),
  );

  return (data ?? []).map((c) => ({
    ...c,
    tutor_email: emailMap[c.tutor_id] ?? null,
  }));
}

export async function verifyTutorCourse(courseId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(courseId);

  const { error } = await adminClient
    .from("tutor_courses")
    .update({ verified: true })
    .eq("id", validId);

  if (error) throw new Error(`Failed to verify course: ${sanitizeError(error)}`);

  revalidatePath("/admin");
  return { success: true };
}

export async function unverifyTutorCourse(courseId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(courseId);

  const { error } = await adminClient
    .from("tutor_courses")
    .update({ verified: false })
    .eq("id", validId);

  if (error) throw new Error(`Failed to unverify course: ${sanitizeError(error)}`);

  revalidatePath("/admin");
  return { success: true };
}

export async function getTutorCoursesForAdmin(tutorId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(tutorId);

  const { data, error } = await adminClient
    .from("tutor_courses")
    .select("*")
    .eq("tutor_id", validId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch tutor courses: ${sanitizeError(error)}`);
  return data ?? [];
}

// ============================================================
// PLATFORM METRICS
// ============================================================

export interface PlatformMetrics {
  totalUsers: number;
  studentCount: number;
  tutorCount: number;
  sessionsToday: number;
  sessionsWeek: number;
  sessionsMonth: number;
  revenueMonth: number;
  activeQuests: number;
  pendingApprovals: number;
  activeDuels: number;
  totalClans: number;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    usersRes,
    sessionsTodayRes,
    sessionsWeekRes,
    sessionsMonthRes,
    activeQuestsRes,
    pendingApprovalsRes,
    activeDuelsRes,
    clansRes,
  ] = await Promise.all([
    adminClient.from("users").select("id, role", { count: "exact" }),
    adminClient.from("sessions").select("id", { count: "exact" }).gte("created_at", todayStart),
    adminClient.from("sessions").select("id", { count: "exact" }).gte("created_at", weekStart),
    adminClient.from("sessions").select("id, price_per_session", { count: "exact" }).gte("created_at", monthStart).neq("status", "cancelled"),
    adminClient.from("user_quest_progress").select("id", { count: "exact" }).eq("status", "in_progress"),
    adminClient.from("registration_requests").select("id", { count: "exact" }).eq("status", "pending"),
    adminClient.from("skill_duels").select("id", { count: "exact" }).eq("status", "active"),
    adminClient.from("clans").select("id", { count: "exact" }),
  ]);

  const users = usersRes.data ?? [];
  const studentCount = users.filter((u) => u.role === "student").length;
  const tutorCount = users.filter((u) => u.role === "tutor").length;

  const sessionsMonthData = sessionsMonthRes.data ?? [];
  const revenueMonth = sessionsMonthData.reduce((acc, s) => acc + (s.price_per_session ?? 0), 0);

  return {
    totalUsers: usersRes.count ?? 0,
    studentCount,
    tutorCount,
    sessionsToday: sessionsTodayRes.count ?? 0,
    sessionsWeek: sessionsWeekRes.count ?? 0,
    sessionsMonth: sessionsMonthRes.count ?? 0,
    revenueMonth,
    activeQuests: activeQuestsRes.count ?? 0,
    pendingApprovals: pendingApprovalsRes.count ?? 0,
    activeDuels: activeDuelsRes.count ?? 0,
    totalClans: clansRes.count ?? 0,
  };
}

// ============================================================
// USER MANAGEMENT
// ============================================================

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

// ============================================================
// SYSTEM SETTINGS
// ============================================================

export interface SystemSettings {
  autoApproveRegistrations: boolean;
  maxQuestsPerDay: number;
  platformFeePercent: number;
  maintenanceMode: boolean;
  duelsEnabled: boolean;
  clansEnabled: boolean;
  aiQuestsEnabled: boolean;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("system_settings")
    .select("key, value");

  const map: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }

  return {
    autoApproveRegistrations: map["auto_approve_registrations"]?.enabled === true,
    maxQuestsPerDay: (map["max_quests_per_day"]?.value as number) ?? 10,
    platformFeePercent: (map["platform_fee_percent"]?.value as number) ?? 15,
    maintenanceMode: map["maintenance_mode"]?.enabled === true,
    duelsEnabled: map["feature_duels_enabled"]?.enabled !== false,
    clansEnabled: map["feature_clans_enabled"]?.enabled !== false,
    aiQuestsEnabled: map["feature_ai_quests_enabled"]?.enabled !== false,
  };
}

export async function updateSystemSetting(key: string, value: Record<string, unknown>) {
  z.string().min(1).max(100).parse(key);
  z.record(z.string(), z.any()).parse(value);
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("system_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw new Error(sanitizeError(error));
  revalidatePath("/admin/settings");
  return { success: true };
}
