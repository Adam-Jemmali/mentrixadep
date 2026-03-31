"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/lib/security";

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

  return data;
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
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) {
      throw new Error("Failed to fetch users");
    }

    const authUser = authUsers.users.find((u) => u.email === request.email);

    if (!authUser) {
      throw new Error("User not found in authentication system");
    }

    const { error: updateError } = await adminClient
      .from("users")
      .update({
        role: request.role,
        approved: true,
      })
      .eq("id", authUser.id);

    if (updateError) {
      throw new Error(`Failed to approve user: ${updateError.message}`);
    }

    const { error: requestUpdateError } = await adminClient
      .from("registration_requests")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validRequestId);

    if (requestUpdateError) {
      throw new Error(`Failed to update request status: ${sanitizeError(requestUpdateError)}`);
    }

    revalidatePath("/admin");
    revalidatePath("/", "layout");
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

    revalidatePath("/admin");
    revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
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

  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  if (!authUsers) return { count: 0 };

  let approved = 0;

  for (const request of pendingRequests) {
    const authUser = authUsers.users.find((u) => u.email === request.email);
    if (!authUser) continue;

    const { error: updateError } = await adminClient
      .from("users")
      .update({ role: request.role, approved: true })
      .eq("id", authUser.id);

    if (updateError) continue;

    await adminClient
      .from("registration_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", request.id);

    approved++;
  }

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { count: approved };
}

export async function getAllUsers(): Promise<AdminUser[]> {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data: users, error } = await adminClient
    .from("users")
    .select("id, role, approved, created_at")
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

  return users.map((u) => ({
    id: u.id,
    email: emailById.get(u.id) ?? null,
    role: u.role,
    approved: u.approved,
    created_at: u.created_at,
  }));
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
  revalidatePath("/student");
  revalidatePath("/tutor");
  revalidatePath("/", "layout");
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
  revalidatePath("/student");
  revalidatePath("/tutor");
  revalidatePath("/", "layout");
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
