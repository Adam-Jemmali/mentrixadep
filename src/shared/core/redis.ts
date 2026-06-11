import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    client = null;
    return null;
  }

  client = new Redis({ url, token });
  return client;
}

export function isRedisConfigured(): boolean {
  return getRedisClient() !== null;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    return (await redis.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Graceful degradation when Redis is unavailable
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // no-op
  }
}

/** Delete keys matching a prefix (Upstash SCAN). Best-effort; capped iterations. */
export async function redisDelByPrefix(prefix: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    let cursor = 0;
    let iterations = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: `${prefix}*`,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      iterations++;
    } while (cursor !== 0 && iterations < 20);
  } catch {
    // no-op
  }
}

/**
 * Cache-aside helper. Returns cached value when present; otherwise runs `loader`,
 * stores result with TTL, and returns it.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await redisGet<T>(key);
  if (cached !== null) return cached;

  const value = await loader();
  await redisSet(key, value, ttlSeconds);
  return value;
}

/** Redis sliding-window rate limit (atomic INCR + EXPIRE). */
export async function redisSlidingWindowRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const redis = getRedisClient();
  if (!redis) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    if (count > maxRequests) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : ttlSeconds),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export const cacheKeys = {
  rateLimit: (route: string, identifier: string) =>
    `rl:${route}:${identifier}`.slice(0, 200),
  leaderboard: (divisionKey: string) => `leaderboard:${divisionKey}`,
  landingStats: () => "landing:stats:v2",
  hub: (userId: string) => `hub:${userId}`,
  divisionHub: (userId: string) => `division:hub:${userId}`,
  availabilityBrowse: (courseKey: string) => `availability:browse:${courseKey}`,
  userMeta: (userId: string) => `user:meta:${userId}`,
  checkoutLock: (slotId: string) => `lock:checkout:${slotId}`,
} as const;

export const cacheTtl = {
  leaderboard: 60,
  landingStats: 300,
  hub: 30,
  divisionHub: 30,
  availabilityBrowse: 90,
  userMeta: 600,
  checkoutLock: 30,
} as const;
