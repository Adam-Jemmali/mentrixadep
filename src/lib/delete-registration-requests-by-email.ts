import type { SupabaseClient } from "@supabase/supabase-js";
import { identityEmailKey } from "@/lib/email-identity";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";

/** Deletes waitlist rows for every stored variant of this email (canonical Gmail identity + RPC lookup). */
export async function deleteRegistrationRequestsByIdentityEmail(
  admin: SupabaseClient,
  rawEmail: string | null | undefined,
): Promise<void> {
  const norm = rawEmail?.trim().toLowerCase();
  if (!norm) return;

  const emails = new Set<string>();
  emails.add(norm);
  emails.add(identityEmailKey(norm));

  const row = await fetchRegistrationRequestRow(admin, norm);
  if (row?.email) emails.add(row.email.trim().toLowerCase());

  await Promise.all(Array.from(emails).map((e) => admin.from("registration_requests").delete().eq("email", e)));
}
