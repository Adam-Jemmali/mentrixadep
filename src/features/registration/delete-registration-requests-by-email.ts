import type { SupabaseClient } from "@supabase/supabase-js";
import { identityEmailKey } from "@/shared/integrations/email/identity";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";

/** Deletes waitlist rows for every stored variant of this email (Gmail identity + exact matches). */
export async function deleteRegistrationRequestsByIdentityEmail(
  admin: SupabaseClient,
  rawEmail: string | null | undefined,
): Promise<void> {
  const norm = rawEmail?.trim().toLowerCase();
  if (!norm) return;

  const { error: rpcError } = await admin.rpc("delete_registration_requests_by_identity_email", {
    p_email: norm,
  });

  if (!rpcError) return;

  // Fallback when migration 086 is not applied yet.
  console.warn(
    "[delete-registration-requests-by-email] RPC failed, using direct delete:",
    rpcError.message,
  );

  const emails = new Set<string>();
  emails.add(norm);
  emails.add(identityEmailKey(norm));

  const row = await fetchRegistrationRequestRow(admin, norm);
  if (row?.email) emails.add(row.email.trim().toLowerCase());

  await Promise.all(Array.from(emails).map((e) => admin.from("registration_requests").delete().eq("email", e)));
}
