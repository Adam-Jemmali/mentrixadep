"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { sendWaitlistDecisionEmail } from "@/shared/integrations/email";
import { findAuthUserByEmail } from "@/features/admin/admin-internal";

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

    const { data: statusTransition, error: requestUpdateError } = await adminClient
      .from("registration_requests")
      .update(requestPatch)
      .eq("id", validRequestId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (requestUpdateError) {
      throw new Error(`Failed to update request status: ${sanitizeError(requestUpdateError)}`);
    }
    if (!statusTransition) {
      throw new Error("Request is not pending");
    }

    void sendWaitlistDecisionEmail(request.email, request.role, "approved");

    revalidatePath("/admin");
    revalidatePath("/admin/registrations");
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

/** Lift a rejected waitlist row back to approved so the email can sign up / use the waitlist like after a normal approval (works even if the auth account was removed on rejection). */
export async function reinstateRejectedRegistrationRequest(requestId: string) {
  try {
    const user = await requireRole("admin");
    const adminClient = createAdminClient();

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.adminAction,
      "reinstate rejected registration"
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

    if (request.status !== "rejected") {
      throw new Error("Only rejected registrations can be reinstated");
    }

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
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
    }

    const requestPatch: Record<string, unknown> = {
      status: "approved",
      updated_at: new Date().toISOString(),
    };
    if (authUser) {
      requestPatch.account_linked_at = new Date().toISOString();
    } else {
      requestPatch.account_linked_at = null;
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
    revalidatePath("/admin/registrations");
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

    // Keep the auth account; sign-in is blocked via registration_requests.status = rejected.
    // Deleting the user in Supabase Auth removes the waitlist row (DB trigger 086).

    if (request?.email && request?.role) {
      void sendWaitlistDecisionEmail(request.email, request.role, "rejected");
    }

    revalidatePath("/admin");
    revalidatePath("/admin/registrations");
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

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

    const { data: transitioned, error: transitionErr } = await adminClient
      .from("registration_requests")
      .update(batchPatch)
      .eq("id", request.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (transitionErr || !transitioned) continue;

    void sendWaitlistDecisionEmail(request.email, request.role, "approved");
    approved++;
  }

  revalidatePath("/admin");
  return { count: approved };
}
