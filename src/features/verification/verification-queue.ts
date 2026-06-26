"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  validateUUID,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/shared/core/security";
import {
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail,
  sendVerificationBlacklistedEmail,
  sendVerificationInfoRequestEmail,
} from "@/shared/integrations/email";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VerificationStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "blacklisted"
  | "info_requested";

export interface VerificationRecord {
  id: string;
  user_id: string;
  role: "tutor" | "student";
  status: VerificationStatus;
  submitted_at: string;
  deadline_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  info_requested_at: string | null;
  info_request_message: string | null;
  info_responded_at: string | null;
  info_response: string | null;
  outcome_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_email?: string | null;
  user_display_name?: string | null;
  hours_remaining?: number;
  is_overdue?: boolean;
}

// ─── Admin: Get verification queue ───────────────────────────────────────────

export async function getVerificationQueue(
  statusFilter?: VerificationStatus | "all"
): Promise<VerificationRecord[]> {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();

  let query = adminClient
    .from("user_verifications")
    .select("*")
    .neq("user_id", admin.id)
    .order("deadline_at", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  } else {
    // Default: show active/pending
    query = query.in("status", ["pending", "in_review", "info_requested"]);
  }

  const { data, error } = await query;
  if (error) {
    // Table may not exist yet — return empty list gracefully so the page loads
    console.error("[getVerificationQueue] raw error:", JSON.stringify(error));
    if (
      error.code === "42P01" || // relation does not exist
      error.message?.includes("does not exist") ||
      error.message?.includes("relation")
    ) {
      return [];
    }
    throw new Error(`Failed to fetch verification queue: ${sanitizeError(error)}`);
  }

  const records = data ?? [];
  const userIds = Array.from(new Set(records.map((r) => r.user_id)));

  // Fetch emails
  const emailMap: Record<string, string> = {};
  const displayNameMap: Record<string, string> = {};

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const { data: auth } = await adminClient.auth.admin.getUserById(uid);
        if (auth?.user?.email) emailMap[uid] = auth.user.email;
      } catch {/* best-effort */}
    })
  );

  // Fetch display names from user_settings
  const { data: settings } = await adminClient
    .from("user_settings")
    .select("user_id, display_name")
    .in("user_id", userIds);

  for (const s of settings ?? []) {
    if (s.display_name) displayNameMap[s.user_id] = s.display_name;
  }

  const now = Date.now();
  return records.map((r) => {
    const deadline = new Date(r.deadline_at).getTime();
    const msRemaining = deadline - now;
    const hoursRemaining = Math.max(0, Math.ceil(msRemaining / 3_600_000));
    return {
      ...r,
      user_email: emailMap[r.user_id] ?? null,
      user_display_name: displayNameMap[r.user_id] ?? null,
      hours_remaining: hoursRemaining,
      is_overdue: msRemaining < 0 && r.status !== "approved" && r.status !== "rejected" && r.status !== "blacklisted",
    };
  });
}

// ─── Admin: Start review ──────────────────────────────────────────────────────

export async function startVerificationReview(verificationId: string) {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();
  enforceRateLimit(getRateLimitId(admin.id), RATE_LIMITS.adminAction, "start verification review");
  const validId = validateUUID(verificationId);

  const { data: verification, error: fetchError } = await adminClient
    .from("user_verifications")
    .select("id, user_id")
    .eq("id", validId)
    .single();
  if (fetchError || !verification) throw new Error("Verification not found");
  if (verification.user_id === admin.id) {
    throw new Error("You cannot review or verify your own account.");
  }

  const { error } = await adminClient
    .from("user_verifications")
    .update({ status: "in_review", reviewed_by: admin.id })
    .eq("id", validId)
    .in("status", ["pending", "info_requested"]);

  if (error) throw new Error(sanitizeError(error));

  await adminClient.from("verification_audit_log").insert({
    verification_id: validId,
    user_id: verification.user_id,
    admin_id: admin.id,
    action: "started_review",
  });

  revalidatePath("/admin/verification");
  return { success: true };
}

// ─── Admin: Approve verification ──────────────────────────────────────────────

const ApproveSchema = z.object({
  verificationId: z.string().uuid(),
  adminNotes: z.string().max(1000).optional(),
});

export async function approveVerification(input: z.infer<typeof ApproveSchema>) {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();
  enforceRateLimit(getRateLimitId(admin.id), RATE_LIMITS.adminAction, "approve verification");

  const parsed = ApproveSchema.parse(input);
  const validId = validateUUID(parsed.verificationId);

  const { data: verification, error: fetchError } = await adminClient
    .from("user_verifications")
    .select("*")
    .eq("id", validId)
    .single();

  if (fetchError || !verification) throw new Error("Verification not found");
  if (verification.user_id === admin.id) {
    throw new Error("You cannot review or verify your own account.");
  }

  const { error } = await adminClient
    .from("user_verifications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      admin_notes: parsed.adminNotes ?? null,
    })
    .eq("id", validId);

  if (error) throw new Error(sanitizeError(error));

  // Update user verification status
  await adminClient
    .from("users")
    .update({ verification_status: "approved" })
    .eq("id", verification.user_id);

  // Audit log
  await adminClient.from("verification_audit_log").insert({
    verification_id: validId,
    user_id: verification.user_id,
    admin_id: admin.id,
    action: "approved",
    notes: parsed.adminNotes ?? null,
  });

  // Send email
  const { data: auth } = await adminClient.auth.admin.getUserById(verification.user_id);
  const { data: settings } = await adminClient
    .from("user_settings")
    .select("display_name")
    .eq("user_id", verification.user_id)
    .maybeSingle();

  if (auth?.user?.email) {
    await sendVerificationApprovedEmail({
      email: auth.user.email,
      displayName: settings?.display_name ?? null,
      role: verification.role as "tutor" | "student",
    });
  }

  revalidatePath("/admin/verification");
  return { success: true };
}

// ─── Admin: Reject verification ───────────────────────────────────────────────

const RejectSchema = z.object({
  verificationId: z.string().uuid(),
  reason: z.string().min(10).max(500),
  adminNotes: z.string().max(1000).optional(),
});

export async function rejectVerification(input: z.infer<typeof RejectSchema>) {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();
  enforceRateLimit(getRateLimitId(admin.id), RATE_LIMITS.adminAction, "reject verification");

  const parsed = RejectSchema.parse(input);
  const validId = validateUUID(parsed.verificationId);

  const { data: verification, error: fetchError } = await adminClient
    .from("user_verifications")
    .select("*")
    .eq("id", validId)
    .single();

  if (fetchError || !verification) throw new Error("Verification not found");
  if (verification.user_id === admin.id) {
    throw new Error("You cannot review or verify your own account.");
  }

  const { error } = await adminClient
    .from("user_verifications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      admin_notes: parsed.adminNotes ?? null,
      outcome_reason: parsed.reason,
    })
    .eq("id", validId);

  if (error) throw new Error(sanitizeError(error));

  await adminClient
    .from("users")
    .update({ verification_status: "rejected" })
    .eq("id", verification.user_id);

  await adminClient.from("verification_audit_log").insert({
    verification_id: validId,
    user_id: verification.user_id,
    admin_id: admin.id,
    action: "rejected",
    notes: parsed.reason,
  });

  const { data: auth } = await adminClient.auth.admin.getUserById(verification.user_id);
  const { data: settings } = await adminClient
    .from("user_settings")
    .select("display_name")
    .eq("user_id", verification.user_id)
    .maybeSingle();

  if (auth?.user?.email) {
    await sendVerificationRejectedEmail({
      email: auth.user.email,
      displayName: settings?.display_name ?? null,
      role: verification.role as "tutor" | "student",
      reason: parsed.reason,
    });
  }

  revalidatePath("/admin/verification");
  return { success: true };
}

// ─── Admin: Blacklist user ────────────────────────────────────────────────────

const BlacklistSchema = z.object({
  verificationId: z.string().uuid(),
  reason: z.string().min(10).max(1000),
});

export async function blacklistUser(input: z.infer<typeof BlacklistSchema>) {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();
  enforceRateLimit(getRateLimitId(admin.id), RATE_LIMITS.adminAction, "blacklist user");

  const parsed = BlacklistSchema.parse(input);
  const validId = validateUUID(parsed.verificationId);

  const { data: verification, error: fetchError } = await adminClient
    .from("user_verifications")
    .select("*")
    .eq("id", validId)
    .single();

  if (fetchError || !verification) throw new Error("Verification not found");
  if (verification.user_id === admin.id) {
    throw new Error("You cannot review or verify your own account.");
  }

  // Update verification
  await adminClient
    .from("user_verifications")
    .update({
      status: "blacklisted",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      outcome_reason: parsed.reason,
    })
    .eq("id", validId);

  // Update user
  await adminClient
    .from("users")
    .update({
      approved: false,
      is_blacklisted: true,
      verification_status: "blacklisted",
    })
    .eq("id", verification.user_id);

  // Insert into blacklist table
  await adminClient
    .from("blacklisted_users")
    .upsert({
      user_id: verification.user_id,
      blacklisted_by: admin.id,
      reason: parsed.reason,
    });

  await adminClient.from("verification_audit_log").insert({
    verification_id: validId,
    user_id: verification.user_id,
    admin_id: admin.id,
    action: "blacklisted",
    notes: parsed.reason,
  });

  const { data: auth } = await adminClient.auth.admin.getUserById(verification.user_id);
  const { data: settings } = await adminClient
    .from("user_settings")
    .select("display_name")
    .eq("user_id", verification.user_id)
    .maybeSingle();

  if (auth?.user?.email) {
    await sendVerificationBlacklistedEmail({
      email: auth.user.email,
      displayName: settings?.display_name ?? null,
      reason: parsed.reason,
    });
  }

  revalidatePath("/admin/verification");
  revalidatePath("/admin/users");
  return { success: true };
}

// ─── Admin: Request more info ─────────────────────────────────────────────────

const InfoRequestSchema = z.object({
  verificationId: z.string().uuid(),
  message: z.string().min(10).max(2000),
});

export async function requestVerificationInfo(input: z.infer<typeof InfoRequestSchema>) {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();
  enforceRateLimit(getRateLimitId(admin.id), RATE_LIMITS.adminAction, "request verification info");

  const parsed = InfoRequestSchema.parse(input);
  const validId = validateUUID(parsed.verificationId);

  const { data: verification, error: fetchError } = await adminClient
    .from("user_verifications")
    .select("*")
    .eq("id", validId)
    .single();

  if (fetchError || !verification) throw new Error("Verification not found");
  if (verification.user_id === admin.id) {
    throw new Error("You cannot review or verify your own account.");
  }

  await adminClient
    .from("user_verifications")
    .update({
      status: "info_requested",
      info_requested_at: new Date().toISOString(),
      info_request_message: parsed.message,
      reviewed_by: admin.id,
    })
    .eq("id", validId);

  await adminClient.from("verification_audit_log").insert({
    verification_id: validId,
    user_id: verification.user_id,
    admin_id: admin.id,
    action: "info_requested",
    notes: parsed.message,
  });

  const { data: auth } = await adminClient.auth.admin.getUserById(verification.user_id);
  const { data: settings } = await adminClient
    .from("user_settings")
    .select("display_name")
    .eq("user_id", verification.user_id)
    .maybeSingle();

  if (auth?.user?.email) {
    await sendVerificationInfoRequestEmail({
      email: auth.user.email,
      displayName: settings?.display_name ?? null,
      role: verification.role as "tutor" | "student",
      message: parsed.message,
    });
  }

  revalidatePath("/admin/verification");
  return { success: true };
}

// ─── System: Create verification on registration ──────────────────────────────

export async function createVerificationForUser(
  userId: string,
  role: "tutor" | "student",
  email: string,
  displayName?: string | null
) {
  const adminClient = createAdminClient();
  const validId = validateUUID(userId);
  const now = new Date().toISOString();
  const deadlineHours = role === "tutor" ? 24 : 48;
  const deadline = new Date(Date.now() + deadlineHours * 3_600_000).toISOString();

  const { data: existing } = await adminClient
    .from("user_verifications")
    .select("id, status")
    .eq("user_id", validId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.status === "approved") {
    return { verificationId: existing.id };
  }

  if (existing && ["pending", "in_review", "info_requested"].includes(existing.status)) {
    await adminClient
      .from("user_verifications")
      .update({
        status: "approved",
        reviewed_at: now,
        deadline_at: deadline,
        updated_at: now,
      })
      .eq("id", existing.id);

    await adminClient
      .from("users")
      .update({ verification_id: existing.id, verification_status: "approved" })
      .eq("id", validId);

    return { verificationId: existing.id };
  }

  const { data, error } = await adminClient
    .from("user_verifications")
    .insert({
      user_id: validId,
      role,
      deadline_at: deadline,
      status: "approved",
      reviewed_at: now,
    })
    .select("id")
    .single();

  if (error) throw new Error(sanitizeError(error));

  await adminClient.from("verification_audit_log").insert({
    verification_id: data.id,
    user_id: validId,
    action: "approved",
    notes: "Auto-approved on registration",
  });

  await adminClient
    .from("users")
    .update({ verification_id: data.id, verification_status: "approved" })
    .eq("id", validId);

  sendVerificationApprovedEmail({
    email,
    displayName,
    role,
  }).catch(() => {});

  return { verificationId: data.id };
}

// ─── Admin: Get verification stats ───────────────────────────────────────────

const EMPTY_STATS = {
  pending: 0,
  inReview: 0,
  approved: 0,
  rejected: 0,
  blacklisted: 0,
  infoRequested: 0,
  overdue: 0,
};

export async function getVerificationStats() {
  const admin = await requireRole("admin");
  const adminClient = createAdminClient();

  // Test table existence first — avoids parallel Promise.all noise if migration not run
  const { error: testError } = await adminClient
    .from("user_verifications")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (testError) {
    console.error("[getVerificationStats] table not available:", JSON.stringify(testError));
    return EMPTY_STATS;
  }

  const [pendingRes, inReviewRes, approvedRes, rejectedRes, blacklistedRes, infoRes, overdueRes] =
    await Promise.all([
      adminClient.from("user_verifications").select("id", { count: "exact" }).neq("user_id", admin.id).eq("status", "pending"),
      adminClient.from("user_verifications").select("id", { count: "exact" }).neq("user_id", admin.id).eq("status", "in_review"),
      adminClient.from("user_verifications").select("id", { count: "exact" }).neq("user_id", admin.id).eq("status", "approved"),
      adminClient.from("user_verifications").select("id", { count: "exact" }).neq("user_id", admin.id).eq("status", "rejected"),
      adminClient.from("user_verifications").select("id", { count: "exact" }).neq("user_id", admin.id).eq("status", "blacklisted"),
      adminClient.from("user_verifications").select("id", { count: "exact" }).neq("user_id", admin.id).eq("status", "info_requested"),
      adminClient
        .from("user_verifications")
        .select("id", { count: "exact" })
        .neq("user_id", admin.id)
        .lt("deadline_at", new Date().toISOString())
        .in("status", ["pending", "in_review", "info_requested"]),
    ]);

  return {
    pending: pendingRes.count ?? 0,
    inReview: inReviewRes.count ?? 0,
    approved: approvedRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
    blacklisted: blacklistedRes.count ?? 0,
    infoRequested: infoRes.count ?? 0,
    overdue: overdueRes.count ?? 0,
  };
}

// ─── Admin: Get audit trail for a verification ────────────────────────────────

export async function getVerificationAuditLog(verificationId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(verificationId);

  const { data, error } = await adminClient
    .from("verification_audit_log")
    .select("*")
    .eq("verification_id", validId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(sanitizeError(error));
  return data ?? [];
}
