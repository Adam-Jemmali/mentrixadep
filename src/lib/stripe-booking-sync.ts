import { createAdminClient } from "@/lib/supabase/admin";

/**
 * After Stripe reports payment success, the webhook may finish before the
 * browser hits `/api/stripe/checkout/success`. If the tutor auto-approves,
 * `availability` can be deleted while `sessions` is created — a second
 * `bookSessionAsUser` then fails with "Availability not found". This helper
 * detects that the booking already synced so the success redirect can be idempotent.
 */
export async function hasBookingSyncedForCheckout(
  availabilityId: string,
  studentId: string,
  tutorId: string | undefined
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data: existingReq } = await adminClient
    .from("session_requests")
    .select("id")
    .eq("student_id", studentId)
    .eq("availability_id", availabilityId)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle();

  if (existingReq) return true;

  if (!tutorId) return false;

  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recentSession } = await adminClient
    .from("sessions")
    .select("id")
    .eq("student_id", studentId)
    .eq("tutor_id", tutorId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return !!recentSession;
}
