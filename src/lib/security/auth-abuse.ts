import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type LockState = {
  failureCount: number;
  lockedUntil: number | null;
};

const localFallback = new Map<string, LockState>();

function hashIdentifier(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function emailLockKey(email: string): string {
  return `signin:email:${hashIdentifier(email.trim().toLowerCase())}`;
}

export function emailRateKey(email: string): string {
  return `auth:email:${hashIdentifier(email.trim().toLowerCase())}`;
}

export function ipRateKey(ip: string): string {
  return `auth:ip:${ip || "unknown"}`;
}

export function compositeRateKey(ip: string, email: string): string {
  return `auth:ip_email:${hashIdentifier(`${ip || "unknown"}|${email.trim().toLowerCase()}`)}`;
}

function computeLockMs(failureCount: number): number {
  if (failureCount < 5) return 0;
  const step = Math.min(failureCount - 5, 6);
  return Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** step);
}

export async function getAuthLockState(key: string): Promise<LockState> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("auth_abuse_locks")
      .select("failure_count, locked_until")
      .eq("lock_key", key)
      .maybeSingle();
    return {
      failureCount: data?.failure_count ?? 0,
      lockedUntil: data?.locked_until ? new Date(data.locked_until).getTime() : null,
    };
  } catch {
    return localFallback.get(key) ?? { failureCount: 0, lockedUntil: null };
  }
}

export async function registerAuthFailure(key: string): Promise<LockState> {
  const now = Date.now();
  try {
    const admin = createAdminClient();
    const curr = await getAuthLockState(key);
    const nextFailure = curr.failureCount + 1;
    const lockMs = computeLockMs(nextFailure);
    const lockedUntil = lockMs > 0 ? new Date(now + lockMs).toISOString() : null;
    await admin.from("auth_abuse_locks").upsert(
      {
        lock_key: key,
        failure_count: nextFailure,
        locked_until: lockedUntil,
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "lock_key" },
    );
    return { failureCount: nextFailure, lockedUntil: lockedUntil ? new Date(lockedUntil).getTime() : null };
  } catch {
    const curr = localFallback.get(key) ?? { failureCount: 0, lockedUntil: null };
    const nextFailure = curr.failureCount + 1;
    const lockMs = computeLockMs(nextFailure);
    const next: LockState = {
      failureCount: nextFailure,
      lockedUntil: lockMs > 0 ? now + lockMs : null,
    };
    localFallback.set(key, next);
    return next;
  }
}

export async function clearAuthFailures(key: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("auth_abuse_locks").upsert(
      {
        lock_key: key,
        failure_count: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lock_key" },
    );
    return;
  } catch {
    localFallback.delete(key);
  }
}

