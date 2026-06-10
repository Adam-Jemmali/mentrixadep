"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendSessionApprovedEmail, sendSessionConfirmedTutorEmail, type SessionEmailDetails } from "@/shared/integrations/email";
import { createRefundForRejectedRequest } from "@/shared/integrations/stripe/session-booking";
import { createPayoutLedgerForSession } from "@/features/payments/payout-ledger";
import { validateUUID } from "@/shared/core/security";
import { enrichTutorRowsWithStudentProfiles } from "@/features/tutor/tutor-internal";

export async function getSessionRequests() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data: availability, error: availError } = await supabase
    .from("availability")
    .select("id")
    .eq("tutor_id", user.id);

  if (availError) {
    throw new Error(`Failed to fetch availability: ${availError.message}`);
  }

  const availabilityIds = (availability || []).map((a) => a.id);

  if (availabilityIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("session_requests")
    .select(`*, availability:availability(*)`)
    .in("availability_id", availabilityIds)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch session requests: ${error.message}`);
  }

  const requests = data || [];
  if (requests.length === 0) return [];

  const adminClient = createAdminClient();
  const studentIds = Array.from(new Set(requests.map((r) => r.student_id)));
  const enrichedRequests = await enrichTutorRowsWithStudentProfiles(requests);

  // Enrich with institution badge (non-critical, best-effort)
  const institutionBadgeMap: Record<string, { institutionName: string; logoUrl: string | null } | null> = {};
  await Promise.all(
    studentIds.map(async (sid) => {
      try {
        const { data: membership } = await adminClient
          .from("institution_members")
          .select("institution_id, institutions(name, logo_url)")
          .eq("user_id", sid)
          .maybeSingle();
        if (membership) {
          const inst = (membership as unknown as { institutions: { name: string; logo_url: string | null } | null }).institutions;
          institutionBadgeMap[sid] = inst ? { institutionName: inst.name, logoUrl: inst.logo_url } : null;
        } else {
          institutionBadgeMap[sid] = null;
        }
      } catch {
        institutionBadgeMap[sid] = null;
      }
    })
  );

  return enrichedRequests.map((r) => ({
    ...r,
    institution: institutionBadgeMap[r.student_id] ?? null,
  }));
}

export async function approveSessionRequest(requestId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);
  let validRequestId: string;
  try {
    validRequestId = validateUUID(requestId);
  } catch {
    throw new Error("Invalid request ID");
  }

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const adminClient = createAdminClient();

  const rpcArgs = {
    p_request_id: validRequestId,
    p_actor_id: actingAsId,
  };

  // Prefer the explicit 3-arg signature to avoid PostgREST overload ambiguity.
  // Fallback keeps compatibility with environments that only have the legacy 2-arg function.
  let { data: rpcRow, error: rpcError } = await adminClient
    .rpc("approve_session_request_atomic", {
      ...rpcArgs,
      p_is_admin: user.role === "admin",
    })
    .single();

  if (rpcError) {
    const fallbackProbe = [rpcError.message, rpcError.details, rpcError.hint].join(" ").toLowerCase();
    const missingThreeArgSignature =
      fallbackProbe.includes("does not exist") ||
      fallbackProbe.includes("could not find the function") ||
      fallbackProbe.includes("p_is_admin");

    if (missingThreeArgSignature) {
      const fallbackResult = await adminClient.rpc("approve_session_request_atomic", rpcArgs).single();
      rpcRow = fallbackResult.data;
      rpcError = fallbackResult.error;
    }
  }

  if (rpcError || !rpcRow) {
    const code = (rpcError?.message ?? "").toLowerCase();
    if (code.includes("request_not_found")) {
      throw new Error("Session request not found");
    }
    if (code.includes("request_not_pending")) {
      throw new Error("Request is not pending");
    }
    if (code.includes("request_forbidden")) {
      throw new Error("You don't have permission to approve this request");
    }
    if (code.includes("availability_not_found")) {
      throw new Error("Availability not found");
    }
    if (code.includes("tutor_double_booked")) {
      throw new Error("Tutor already has a session at this time");
    }
    if (code.includes("student_double_booked")) {
      throw new Error("Student already has a session at this time");
    }
    if (code.includes("session_conflict")) {
      throw new Error("This request was already processed by another action");
    }
    throw new Error(`Failed to approve request: ${rpcError?.message ?? "Unknown error"}`);
  }

  const sessionId = (rpcRow as { session_id?: string | null }).session_id ?? null;
  if (!sessionId) {
    throw new Error("Failed to approve request: missing session id");
  }

  const { data: session, error: sessionError } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Approved session was created but could not be loaded");
  }

  // Create payout ledger at approval so transfer can release when session start time is reached.
  void createPayoutLedgerForSession(sessionId).catch((err) => {
    console.error("[approveSessionRequest] ledger creation failed:", err);
  });

  // Fire-and-forget emails: learner confirmation + guide calendar notification
  try {
    const [studentAuthData, tutorAuthData, settingsResult] = await Promise.all([
      adminClient.auth.admin.getUserById(session.student_id),
      adminClient.auth.admin.getUserById(session.tutor_id),
      adminClient
        .from("user_settings")
        .select("user_id, display_name")
        .in("user_id", [session.student_id, session.tutor_id]),
    ]);
    const studentEmail = studentAuthData.data?.user?.email;
    const tutorEmail = tutorAuthData.data?.user?.email;
    const nameByUser = Object.fromEntries(
      (settingsResult.data ?? []).map((r) => [r.user_id, r.display_name as string | null])
    );
    if (session) {
      const sessionDetails: SessionEmailDetails = {
        sessionId: session.id,
        course: session.course,
        startTime: session.start_time,
        endTime: session.end_time,
        studentDisplayName: nameByUser[session.student_id] ?? null,
        tutorDisplayName: nameByUser[session.tutor_id] ?? null,
        priceCents: session.price_per_session ?? null,
      };
      if (studentEmail) {
        void sendSessionApprovedEmail(studentEmail, sessionDetails);
      }
      if (tutorEmail) {
        void sendSessionConfirmedTutorEmail(tutorEmail, sessionDetails);
      }
    }
  } catch (emailErr) {
    console.error("[approveSessionRequest] email notification failed:", emailErr);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  return { success: true, session };
}

export async function rejectSessionRequest(requestId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);
  let validRequestId: string;
  try {
    validRequestId = validateUUID(requestId);
  } catch {
    throw new Error("Invalid request ID");
  }

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { data: request, error: requestError } = await client
    .from("session_requests")
    .select("tutor_id, status, stripe_payment_intent_id, stripe_refund_id")
    .eq("id", validRequestId)
    .single();

  if (requestError || !request) {
    throw new Error("Session request not found");
  }

  if (request.tutor_id !== actingAsId && user.role !== "admin") {
    throw new Error("You don't have permission to reject this request");
  }

  if (request.status !== "pending") {
    throw new Error("Request is not pending");
  }

  let refundId: string | null = (request as { stripe_refund_id?: string | null }).stripe_refund_id ?? null;
  const paymentIntentId = (request as { stripe_payment_intent_id?: string | null })
    .stripe_payment_intent_id;

  if (paymentIntentId && !refundId) {
    try {
      const refund = await createRefundForRejectedRequest(paymentIntentId, validRequestId);
      refundId = refund.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refund failed";
      console.error("[rejectSessionRequest] Stripe refund failed:", err);
      throw new Error(
        `Could not issue refund: ${msg}. Try again or contact support so the student is not charged for a rejected session.`
      );
    }
  }

  const { error } = await client
    .from("session_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
      ...(refundId ? { stripe_refund_id: refundId } : {}),
    })
    .eq("id", validRequestId);

  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  return { success: true, refunded: Boolean(paymentIntentId && refundId) };
}

export async function getAutoApprove() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("auto_approve")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch auto-approve setting: ${error.message}`);
  }

  return data?.auto_approve || false;
}

export async function toggleAutoApprove(enabled: boolean, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { error } = await client
    .from("users")
    .update({ auto_approve: enabled })
    .eq("id", actingAsId);

  if (error) {
    throw new Error(`Failed to update auto-approve setting: ${error.message}`);
  }

  revalidatePath("/tutor");
  return { success: true };
}