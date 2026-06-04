/**
 * Cache utilities — v2 replaces the singleton in-memory Map
 * (which does not persist across Vercel serverless instances)
 * with a thin wrapper around `next/cache` for request dedup
 * and direct Supabase reads for longer-lived data.
 *
 * Import sites that previously used `cache.get/set` should
 * switch to `unstable_cache` from "next/cache" or query
 * Supabase `ai_package_cache` directly.
 *
 * This module is kept as a no-op stub so any stale imports
 * compile without error while they are migrated.
 */

class NoOpCache {
  get<T>(_key: string): T | null {
    return null;
  }

  set<T>(_key: string, _data: T, _ttlMs?: number): void {
    // no-op on serverless — callers should use unstable_cache or Supabase
  }

  delete(_key: string): void {}
  cleanup(): void {}
  clear(): void {}
}

export const cache = new NoOpCache();
