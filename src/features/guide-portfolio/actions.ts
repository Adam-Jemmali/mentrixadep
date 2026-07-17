"use server";

import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

const idSchema = z.string().uuid();

async function markPortfolioNotificationRead(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  portfolioId: string,
) {
  await admin
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", studentId)
    .eq("kind", "guide_portfolio_opt_in")
    .eq("source_id", portfolioId);
}

/** Student approves Guide portfolio card. Name never shown publicly. */
export async function approveGuidePortfolioEntry(
  portfolioId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireRole(["student", "admin"]);
  const id = idSchema.safeParse(portfolioId);
  if (!id.success) return { ok: false, error: "Invalid request." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("guide_teaching_portfolio")
    .update({ student_opted_in: true })
    .eq("id", id.data)
    .eq("student_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Could not approve." };
  }

  await markPortfolioNotificationRead(admin, user.id, id.data);
  return { ok: true };
}

/** Skip leaves student_opted_in false. Clears the notice. */
export async function skipGuidePortfolioEntry(
  portfolioId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireRole(["student", "admin"]);
  const id = idSchema.safeParse(portfolioId);
  if (!id.success) return { ok: false, error: "Invalid request." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("guide_teaching_portfolio")
    .select("id")
    .eq("id", id.data)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!data) return { ok: false, error: "Not found." };

  await markPortfolioNotificationRead(admin, user.id, id.data);
  return { ok: true };
}

export type GuidePortfolioOptInNotice = {
  notificationId: string;
  portfolioId: string;
  body: string;
};

export async function loadGuidePortfolioOptInNotices(
  limit = 1,
): Promise<GuidePortfolioOptInNotice[]> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .select("id, body, source_id")
    .eq("user_id", user.id)
    .eq("kind", "guide_portfolio_opt_in")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[loadGuidePortfolioOptInNotices]", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.source_id)
    .map((row) => ({
      notificationId: String(row.id),
      portfolioId: String(row.source_id),
      body: String(row.body),
    }));
}
