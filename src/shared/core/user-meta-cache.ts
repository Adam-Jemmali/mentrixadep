import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cacheKeys, cacheTtl, redisGet, redisSet } from "@/shared/core/redis";

export type CachedUserMeta = {
  email: string | null;
  displayName: string | null;
};

/**
 * Cached auth user metadata — avoids N+1 `auth.admin.getUserById` calls.
 */
export async function getCachedUserMeta(userId: string): Promise<CachedUserMeta> {
  const key = cacheKeys.userMeta(userId);
  const cached = await redisGet<CachedUserMeta>(key);
  if (cached) return cached;

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const meta = data?.user?.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    typeof meta?.display_name === "string"
      ? meta.display_name.trim().slice(0, 100)
      : typeof meta?.full_name === "string"
        ? meta.full_name.trim().slice(0, 100)
        : null;

  const result: CachedUserMeta = {
    email: data?.user?.email ?? null,
    displayName: displayName || null,
  };

  await redisSet(key, result, cacheTtl.userMeta);
  return result;
}

export async function getCachedUserMetaBatch(
  userIds: string[],
): Promise<Record<string, CachedUserMeta>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const out: Record<string, CachedUserMeta> = {};
  await Promise.all(
    unique.map(async (uid) => {
      out[uid] = await getCachedUserMeta(uid);
    }),
  );
  return out;
}
