"use server";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getSiteUrl } from "@/shared/core/site";
import { PARENT_CUSTODIAN_INVITE_TTL_DAYS } from "@/features/parent-custodian/parent-custodian-pure";

const inviteSchema = z.object({
  custodianEmail: z.string().email(),
});

export async function inviteParentCustodian(input: z.infer<typeof inviteSchema>): Promise<
  | { ok: true; inviteUrl: string }
  | { ok: false; error: string }
> {
  const user = await requireRole(["student", "admin"]);
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid custodian email." };
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + PARENT_CUSTODIAN_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const admin = createAdminClient();
  const { error } = await admin.from("parent_custodian_invites").insert({
    student_id: user.id,
    custodian_email: parsed.data.custodianEmail.toLowerCase(),
    invite_token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const origin = getSiteUrl().replace(/\/$/, "");
  return { ok: true, inviteUrl: `${origin}/parent/${token}` };
}
