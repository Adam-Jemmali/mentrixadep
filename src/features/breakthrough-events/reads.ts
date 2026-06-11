"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getSiteUrl } from "@/shared/core/site";

export async function markBreakthroughShared(eventId: string): Promise<void> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  await admin
    .from("breakthrough_events")
    .update({ shared_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("student_id", user.id);
}

export async function getBreakthroughForShare(eventId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("breakthrough_events")
    .select("id, student_id, subject, concept, accuracy_before, accuracy_after, detected_at")
    .eq("id", eventId)
    .maybeSingle();

  if (!data) return null;

  const siteUrl = getSiteUrl();
  return {
    eventId: data.id,
    subject: data.subject,
    concept: data.concept,
    accuracyBefore: Number(data.accuracy_before),
    accuracyAfter: Number(data.accuracy_after),
    detectedAt: String(data.detected_at),
    shareUrl: `${siteUrl}/breakthrough/${data.id}`,
    ogImageUrl: `${siteUrl}/api/og/breakthrough?event_id=${data.id}`,
  };
}
