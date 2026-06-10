import type { SupabaseClient } from "@supabase/supabase-js";
import { identityEmailKey } from "@/shared/integrations/email/identity";

export type RegistrationRequestIdentityRow = {
  status: string;
  role: string;
  email?: string;
};

/**
 * Finds `registration_requests` by Gmail-safe identity (dots ignored for gmail.com).
 * Prefer RPC `registration_request_by_identity_email` (migration 071); fall back to exact / canonical string match.
 */
export async function fetchRegistrationRequestRow(
  admin: SupabaseClient,
  email: string,
): Promise<RegistrationRequestIdentityRow | null> {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;

  const { data: rpcData, error: rpcErr } = await admin.rpc("registration_request_by_identity_email", {
    p_email: norm,
  });

  if (!rpcErr && rpcData != null) {
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (row && typeof row === "object" && "status" in row && "role" in row) {
      return row as RegistrationRequestIdentityRow;
    }
  }

  const { data: exact } = await admin
    .from("registration_requests")
    .select("status, role, email")
    .eq("email", norm)
    .maybeSingle();
  if (exact) return exact as RegistrationRequestIdentityRow;

  const canon = identityEmailKey(norm);
  if (canon !== norm) {
    const { data: canonRow } = await admin
      .from("registration_requests")
      .select("status, role, email")
      .eq("email", canon)
      .maybeSingle();
    if (canonRow) return canonRow as RegistrationRequestIdentityRow;
  }

  return null;
}
