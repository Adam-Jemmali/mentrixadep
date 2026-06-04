import { createAdminClient } from "@/lib/supabase/admin";
import { captureUnexpectedError } from "@/lib/observability";

export interface InstitutionCreditCheck {
  isMember: boolean;
  institutionId: string | null;
  hasCredits: boolean;
  creditsRemaining: number;
}

/**
 * Check whether a student belongs to an institution with available session credits.
 * Returns membership and credit info without modifying anything.
 */
export async function checkInstitutionCredits(
  studentId: string
): Promise<InstitutionCreditCheck> {
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("institution_members")
    .select("institution_id")
    .eq("user_id", studentId)
    .maybeSingle();

  if (!membership) {
    return { isMember: false, institutionId: null, hasCredits: false, creditsRemaining: 0 };
  }

  const { data: institution } = await admin
    .from("institutions")
    .select("id, session_credits")
    .eq("id", membership.institution_id)
    .single();

  if (!institution) {
    return { isMember: true, institutionId: membership.institution_id, hasCredits: false, creditsRemaining: 0 };
  }

  return {
    isMember: true,
    institutionId: institution.id,
    hasCredits: (institution.session_credits ?? 0) > 0,
    creditsRemaining: institution.session_credits ?? 0,
  };
}

/**
 * Atomically decrement one session credit from an institution.
 * Uses optimistic concurrency: only updates if credits > 0 and matches expected count.
 * Returns true if credit was consumed, false otherwise.
 */
export async function consumeInstitutionCredit(
  institutionId: string
): Promise<boolean> {
  const admin = createAdminClient();

  try {
    const { data: inst } = await admin
      .from("institutions")
      .select("session_credits")
      .eq("id", institutionId)
      .single();

    if (!inst || (inst.session_credits ?? 0) <= 0) {
      return false;
    }

    const currentCredits = inst.session_credits;

    const { data: updated, error } = await admin
      .from("institutions")
      .update({ session_credits: currentCredits - 1 })
      .eq("id", institutionId)
      .eq("session_credits", currentCredits)
      .select("id")
      .maybeSingle();

    if (error) {
      captureUnexpectedError("consume-institution-credit", error, { institutionId });
      return false;
    }

    return !!updated;
  } catch (err) {
    captureUnexpectedError("consume-institution-credit", err, { institutionId });
    return false;
  }
}

/**
 * Restore a session credit (e.g. on booking cancellation or refund).
 */
export async function restoreInstitutionCredit(
  institutionId: string
): Promise<void> {
  const admin = createAdminClient();

  try {
    const { data: inst } = await admin
      .from("institutions")
      .select("session_credits")
      .eq("id", institutionId)
      .single();

    if (!inst) return;

    await admin
      .from("institutions")
      .update({ session_credits: (inst.session_credits ?? 0) + 1 })
      .eq("id", institutionId);
  } catch (err) {
    captureUnexpectedError("restore-institution-credit", err, { institutionId });
  }
}
