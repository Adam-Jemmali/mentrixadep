"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { createClient } from "@/shared/integrations/supabase/server";
import { type BundleSize, BUNDLE_OPTIONS, computeBundlePrice } from "@/features/booking/booking-pricing";
import { captureUnexpectedError } from "@/shared/integrations/observability";

export interface StudentBundle {
  id: string;
  tutorId: string;
  bundleSize: number;
  sessionsRemaining: number;
  perSessionCents: number;
  expiresAt: string;
  purchasedAt: string;
}

export async function getStudentBundles(): Promise<StudentBundle[]> {
  const user = await requireRole("student");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_bundles")
    .select("id, tutor_id, bundle_size, sessions_remaining, per_session_cents, expires_at, purchased_at")
    .eq("student_id", user.id)
    .gt("sessions_remaining", 0)
    .gte("expires_at", new Date().toISOString())
    .order("purchased_at", { ascending: false });

  if (error) {
    captureUnexpectedError("get-student-bundles", error);
    return [];
  }

  return (data ?? []).map((b) => ({
    id: b.id,
    tutorId: b.tutor_id,
    bundleSize: b.bundle_size,
    sessionsRemaining: b.sessions_remaining,
    perSessionCents: b.per_session_cents,
    expiresAt: b.expires_at,
    purchasedAt: b.purchased_at,
  }));
}

export async function consumeBundleSession(
  bundleId: string,
  _availabilityId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireRole("student");
  const admin = createAdminClient();

  const { data: bundle, error: bundleError } = await admin
    .from("session_bundles")
    .select("id, student_id, sessions_remaining, expires_at")
    .eq("id", bundleId)
    .eq("student_id", user.id)
    .gt("sessions_remaining", 0)
    .gte("expires_at", new Date().toISOString())
    .single();

  if (bundleError || !bundle) {
    return { success: false, error: "Bundle not found or expired." };
  }

  const { error: updateError } = await admin
    .from("session_bundles")
    .update({ sessions_remaining: bundle.sessions_remaining - 1 })
    .eq("id", bundleId)
    .eq("sessions_remaining", bundle.sessions_remaining);

  if (updateError) {
    captureUnexpectedError("consume-bundle-session", updateError);
    return { success: false, error: "Could not redeem bundle session." };
  }

  return { success: true };
}

export function getBundlePriceBreakdown(perSessionCents: number, bundleSize: BundleSize) {
  if (!BUNDLE_OPTIONS[bundleSize]) {
    return null;
  }
  return computeBundlePrice(perSessionCents, bundleSize);
}
