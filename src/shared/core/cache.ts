/**
 * Shared cache layer — delegates to Upstash Redis when configured.
 * Falls back to no-op (callers should use unstable_cache or direct DB reads).
 */

import {
  redisDel,
  redisGet,
  redisSet,
  withCache,
} from "@/shared/core/redis";

export { withCache };

class RedisBackedCache {
  get<T>(key: string): T | null {
    // Sync get is not supported over HTTP Redis; use withCache / redisGet instead.
    void key;
    return null;
  }

  async getAsync<T>(key: string): Promise<T | null> {
    return redisGet<T>(key);
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttlSeconds = ttlMs ? Math.max(1, Math.ceil(ttlMs / 1000)) : 300;
    void redisSet(key, data, ttlSeconds);
  }

  async setAsync<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    const ttlSeconds = ttlMs ? Math.max(1, Math.ceil(ttlMs / 1000)) : 300;
    await redisSet(key, data, ttlSeconds);
  }

  delete(key: string): void {
    void redisDel(key);
  }

  async deleteAsync(key: string): Promise<void> {
    await redisDel(key);
  }

  cleanup(): void {}
  clear(): void {}
}

export const cache = new RedisBackedCache();
