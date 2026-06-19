import { createAdminClient } from "@/shared/integrations/supabase/admin";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export async function getAppCache<T>(cacheKey: string, ttlMs = DEFAULT_TTL_MS): Promise<T | null> {
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - ttlMs).toISOString();
    const { data, error } = await admin
      .from("app_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .gte("created_at", cutoff)
      .maybeSingle();

    if (error || !data?.payload) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

export async function setAppCache<T>(
  cacheKey: string,
  payload: T,
  _ttlMs = DEFAULT_TTL_MS
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("app_cache").upsert(
      {
        cache_key: cacheKey,
        payload: payload as Record<string, unknown>,
        created_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );
  } catch {
    // Non-critical: next request recomputes.
  }
}
