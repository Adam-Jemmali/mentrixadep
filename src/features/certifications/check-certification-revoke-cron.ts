import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getSiteUrl } from "@/shared/core/site";
import { sendEmail, escapeHtml } from "@/shared/integrations/email/shared";
import { loadVerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import {
  certificationRevokeEmailCopy,
  tickCertificationRevocation,
} from "@/features/certifications/certification-pure";

type Admin = ReturnType<typeof createAdminClient>;

async function resolveUserEmail(
  admin: Admin,
  userId: string,
): Promise<{ email: string | null; displayName: string | null }> {
  const { data: settings } = await admin
    .from("user_settings")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return {
      email: data.user?.email ?? null,
      displayName: settings?.display_name ?? null,
    };
  } catch {
    return { email: null, displayName: settings?.display_name ?? null };
  }
}

export async function runCheckCertificationRevoke(params?: {
  now?: Date;
}): Promise<{ scanned: number; revoked: number; watching: number }> {
  const now = params?.now ?? new Date();
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("mentrixa_certifications")
    .select("id, user_id, subject, below_threshold_since")
    .is("revoked_at", null)
    .limit(2000);

  if (error) {
    console.error("[certification-revoke]", error.message);
    return { scanned: 0, revoked: 0, watching: 0 };
  }

  let revoked = 0;
  let watching = 0;
  const site = getSiteUrl().replace(/\/$/, "");

  for (const row of rows ?? []) {
    const userId = String(row.user_id);
    const stats = await loadVerifiedFirstAttemptRankStats(userId);
    const tick = tickCertificationRevocation({
      currentPercentile: stats.percentile,
      belowThresholdSince:
        typeof row.below_threshold_since === "string" ? row.below_threshold_since : null,
      now,
    });

    if (tick.action === "clear_watch") {
      if (row.below_threshold_since) {
        await admin
          .from("mentrixa_certifications")
          .update({ below_threshold_since: null })
          .eq("id", row.id);
      }
      continue;
    }

    if (tick.action === "start_watch") {
      watching += 1;
      await admin
        .from("mentrixa_certifications")
        .update({ below_threshold_since: tick.sinceIso })
        .eq("id", row.id);
      continue;
    }

    if (tick.action === "keep_watch") {
      watching += 1;
      continue;
    }

    const { error: revokeError } = await admin
      .from("mentrixa_certifications")
      .update({
        revoked_at: now.toISOString(),
        revoke_reason: tick.reason,
        below_threshold_since: null,
      })
      .eq("id", row.id);

    if (revokeError) {
      console.error("[certification-revoke] update", row.id, revokeError.message);
      continue;
    }

    revoked += 1;
    const subject = String(row.subject);
    const copy = certificationRevokeEmailCopy(subject);
    const { email, displayName } = await resolveUserEmail(admin, userId);
    if (email) {
      const hi = escapeHtml(displayName?.split(/\s+/)[0] || "there");
      await sendEmail(
        email,
        copy.subjectLine,
        `<p>Hi ${hi},</p><p>${escapeHtml(copy.body)}</p><p><a href="${site}/student">Open Mentrixa</a></p>`,
      );
    }
  }

  return { scanned: (rows ?? []).length, revoked, watching };
}
