"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError } from "@/lib/security";
import { enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/lib/rate-limit";

export async function getRegistrationRequests() {
  await requireRole("admin");
  // Use admin client to bypass RLS for admin operations
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

    // Rate limiting
    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.adminAction,
      "approve registration"
    );

    // Validate UUID
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
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function rejectRegistrationRequest(requestId: string) {
  try {
    const user = await requireRole("admin");
    const adminClient = createAdminClient();

    // Rate limiting
    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.adminAction,
      "reject registration"
    );

    // Validate UUID
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
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function getAllUsers() {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("users")
    .select("id, role, approved, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data;
}

