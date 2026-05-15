import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { identityEmailKey } from "@/lib/email-identity";

/** Auth user has Google linked and no email/password identity (Supabase provider id `email`). */
export function isGoogleOnlyAuthUser(user: User): boolean {
  const providers = new Set((user.identities ?? []).map((i) => i.provider));
  return providers.has("google") && !providers.has("email");
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createAdminClient();
  const key = identityEmailKey(email.trim());
  const perPage = 200;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[auth-user-lookup] listUsers failed:", error.message);
      return null;
    }

    const users = data?.users ?? [];
    const match = users.find(
      (u) => identityEmailKey((u.email ?? "").trim()) === key,
    );
    if (match) return match;

    if (users.length < perPage) {
      return null;
    }
  }
  return null;
}

export async function authUserExistsByEmail(email: string): Promise<boolean> {
  const u = await findAuthUserByEmail(email);
  return u != null;
}
