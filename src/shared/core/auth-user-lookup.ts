import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { identityEmailKey } from "@/shared/integrations/email/identity";

/** Auth user has Google linked and no email/password identity (Supabase provider id `email`). */
export function isGoogleOnlyAuthUser(user: User): boolean {
  const providers = authProviderIds(user);
  return providers.has("google") && !providers.has("email");
}

/** True when this account signed in with Google (used to finish activation without a password). */
export function authUserHasGoogleProvider(user: User): boolean {
  const providers = authProviderIds(user);
  return providers.has("google");
}

function authProviderIds(user: User): Set<string> {
  const fromIdentities = (user.identities ?? []).map((i) => i.provider);
  const fromMeta = user.app_metadata?.providers;
  const metaList = Array.isArray(fromMeta) ? fromMeta.map(String) : [];
  const primary = user.app_metadata?.provider ? [String(user.app_metadata.provider)] : [];
  return new Set([...fromIdentities, ...metaList, ...primary]);
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
    const match = users.find((u) => {
      const candidate = (u.email ?? "").trim().toLowerCase();
      return candidate === email.trim().toLowerCase() || identityEmailKey(candidate) === key;
    });
    if (match) {
      const { data: full } = await admin.auth.admin.getUserById(match.id);
      return full?.user ?? match;
    }

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
