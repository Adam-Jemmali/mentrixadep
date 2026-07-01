/**
 * Security utilities for input validation, sanitization, and rate limiting
 */

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { cacheKeys, redisSlidingWindowRateLimit } from "@/shared/core/redis";

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const emailSchema = z.string().email().max(255).trim().toLowerCase();
export const passwordSchema = z.string().min(8).max(128);
export const uuidSchema = z.string().uuid();
export const roleSchema = z.enum(["student", "tutor", "admin"]);
export const courseSchema = z.string().min(1).max(100).trim();
export const ratingSchema = z.number().int().min(1).max(5);
export const commentSchema = z.string().max(1000).trim().optional();

// ============================================
// INPUT VALIDATION
// ============================================

export function validateEmail(email: unknown): string {
  return emailSchema.parse(email);
}

export function validatePassword(password: unknown): string {
  return passwordSchema.parse(password);
}

export function validateUUID(id: unknown): string {
  return uuidSchema.parse(id);
}

/** Safe UUID parse for server actions that should return `{ success: false }` instead of throwing. */
export function parseUUID(id: unknown): { ok: true; id: string } | { ok: false } {
  const r = uuidSchema.safeParse(id);
  return r.success ? { ok: true, id: r.data } : { ok: false };
}

export function validateRole(role: unknown): "student" | "tutor" | "admin" {
  return roleSchema.parse(role);
}

export function validateCourse(course: unknown): string {
  return courseSchema.parse(course);
}

export function validateRating(rating: unknown): number {
  return ratingSchema.parse(rating);
}

export function validateComment(comment: unknown): string | undefined {
  if (!comment) return undefined;
  return commentSchema.parse(comment);
}

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

// ============================================
// CONTENT MODERATION
// ============================================

const LEETSPEAK_NORMALIZATION: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};

const BLOCKED_LANGUAGE_PATTERNS: RegExp[] = [
  // Common profanity / insults
  /\bf+u+c*k+\b/i,
  /\bs+h+i+t+\b/i,
  /\bb+i+t+c+h+\b/i,
  /\ba+s+s+h+o+l+e+\b/i,
  /\bb+a+s+t+a+r+d+\b/i,
  /\bi+d+i+o+t+\b/i,
  /\bm+o+r+o+n+\b/i,
  /\bd+u+m+b+\b/i,
  /\bs+t+u+p+i+d+\b/i,

  // Sexual / explicit terms
  /\bs+e+x+\b/i,
  /\bp+o+r+n+\b/i,
  /\bn+u+d+e+\b/i,
  /\bn+u+d+i+t+y+\b/i,
  /\bs+l+u+t+\b/i,
  /\bw+h+o+r+e+\b/i,
  /\br+a+p+e+\b/i,
  /\bf+e+t+i+s+h+\b/i,
  /\bp+e+n+i+s+\b/i,
  /\bv+a+g+i+n+a+\b/i,

  // Explicit discriminatory slur family (compact stem-based guard)
  /\bn+i+g+g+e+r+\b/i,
  /\bf+a+g+g+o+t+\b/i,
  /\bk+i+k+e+\b/i,
  /\bc+h+i+n+k+\b/i,
  /\bs+p+i+c+\b/i,
];

function normalizeForModeration(input: string): string {
  const lowered = input.toLowerCase();
  const leetNormalized = lowered
    .split("")
    .map((ch) => LEETSPEAK_NORMALIZATION[ch] ?? ch)
    .join("");
  return leetNormalized
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsBlockedLanguage(input: string): boolean {
  if (!input.trim()) return false;
  const normalized = normalizeForModeration(input);
  if (!normalized) return false;
  return BLOCKED_LANGUAGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function assertNoBlockedLanguage(input: string, fieldName = "text"): void {
  if (containsBlockedLanguage(input)) {
    logSecurityEvent("blocked_language_rejected", {
      field: fieldName,
      sample: input.slice(0, 160),
    });
    throw new Error(
      `Please remove abusive, sexual, discriminatory, or inappropriate language from ${fieldName}.`,
    );
  }
}

const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\bunion\b\s+\bselect\b)/i,
  /(\bselect\b.+\bfrom\b)/i,
  /(\bdrop\b\s+\btable\b)/i,
  /(\binsert\b\s+\binto\b)/i,
  /(\bupdate\b.+\bset\b)/i,
  /(\bdelete\b\s+\bfrom\b)/i,
  /(--|\/\*|\*\/|;)/,
  /(\bor\b\s+1\s*=\s*1)/i,
  /(\bexec\b|\bxp_)/i,
];

function scrubSecrets(value: string): string {
  return value
    .replace(/(sk_(live|test)_[A-Za-z0-9]+)/g, "[REDACTED_STRIPE_KEY]")
    .replace(/(rk_(live|test)_[A-Za-z0-9]+)/g, "[REDACTED_RESEND_KEY]")
    .replace(/(AIza[0-9A-Za-z\-_]{20,})/g, "[REDACTED_GOOGLE_KEY]")
    .replace(/(eyJ[A-Za-z0-9._-]{20,})/g, "[REDACTED_TOKEN]");
}

export function scrubLogValue(value: string): string {
  return scrubSecrets(value);
}

export function hasSqlInjectionPattern(input: string): boolean {
  const s = input.toLowerCase();
  return SQL_INJECTION_PATTERNS.some((p) => p.test(s));
}

export function logSecurityEvent(event: string, metadata: Record<string, unknown>): void {
  try {
    const safe = JSON.stringify(metadata, (_k, v) =>
      typeof v === "string" ? scrubSecrets(v) : v,
    );
    console.warn(`[security] ${event}`, safe);
  } catch {
    console.warn(`[security] ${event}`);
  }
}

/**
 * Canonical input sanitizer for user-provided values before DB writes.
 * Detects obvious SQLi payloads and throws while logging the attempt.
 */
export function sanitizeInput(input: unknown, fieldName = "input"): string {
  const s = sanitizeString(String(input ?? ""));
  if (hasSqlInjectionPattern(s)) {
    logSecurityEvent("sql_injection_pattern_rejected", {
      field: fieldName,
      sample: s.slice(0, 160),
    });
    throw new Error(`Unsafe ${fieldName} value detected.`);
  }
  return s;
}

/**
 * Sanitize course name
 */
export function sanitizeCourseName(course: string): string {
  const value = sanitizeString(course).slice(0, 100);
  assertNoBlockedLanguage(value, "course name");
  return value;
}

/**
 * Sanitize comment text
 */
export function sanitizeComment(comment: string): string {
  const value = sanitizeString(comment).slice(0, 1000);
  assertNoBlockedLanguage(value, "comment");
  return value;
}

export const MAX_UPLOAD_BYTES_DEFAULT = 10 * 1024 * 1024; // 10MB
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "video/mp4",
] as const;

function inferMimeFromMagicBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 4) {
    // JPG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    // PNG
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    )
      return "image/png";
    // PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
      return "application/pdf";
    // WebM/Matroska EBML header
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
      return "video/webm";
  }
  if (bytes.length >= 12) {
    // MP4: 'ftyp' in bytes 4..7
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    )
      return "video/mp4";
  }
  return null;
}

export async function validateUploadedFile(
  file: File,
  options?: {
    allowedMimeTypes?: readonly string[];
    maxBytes?: number;
  },
): Promise<{ ok: true; mimeType: string } | { ok: false; error: string }> {
  const allowed = options?.allowedMimeTypes ?? ALLOWED_UPLOAD_MIME_TYPES;
  const maxBytes = options?.maxBytes ?? MAX_UPLOAD_BYTES_DEFAULT;
  if (!(file instanceof File)) return { ok: false, error: "Invalid upload payload." };
  if (file.size <= 0) return { ok: false, error: "Uploaded file is empty." };
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File too large. Maximum ${(maxBytes / 1024 / 1024).toFixed(0)}MB allowed.`,
    };
  }

  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const inferred = inferMimeFromMagicBytes(head);
  const declared = (file.type || "").toLowerCase();
  const effective = inferred ?? declared;

  if (!effective || !allowed.includes(effective)) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${allowed.join(", ")}.`,
    };
  }
  if (declared && inferred && declared !== inferred) {
    logSecurityEvent("upload_mime_mismatch", { declared, inferred, fileName: file.name });
    return { ok: false, error: "File content does not match declared MIME type." };
  }

  return { ok: true, mimeType: effective };
}

// ============================================
// RATE LIMITING (Simple in-memory store)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple rate limiter
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Same store as {@link checkRateLimit}, but returns seconds until reset when blocked (for Retry-After).
 */
export function checkRateLimitWithRetryAfter(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}

// ============================================
// RATE LIMIT CONFIGURATION & HELPERS
// ============================================

export const RATE_LIMITS = {
  /** Per-IP middleware guard for POST /auth/signin and /auth/signup (production only). */
  authPage: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  signIn: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  signInIpBurst: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  signInEmailBurst: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  signInIpEmailBurst: { maxRequests: 8, windowMs: 15 * 60 * 1000 },
  signUp: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  signUpIpBurst: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  signUpEmailBurst: { maxRequests: 4, windowMs: 60 * 60 * 1000 },
  bookSession: { maxRequests: 10, windowMs: 60 * 1000 },
  createAvailability: { maxRequests: 20, windowMs: 60 * 1000 },
  rateSession: { maxRequests: 5, windowMs: 60 * 1000 },
  deletePastSession: { maxRequests: 30, windowMs: 60 * 1000 },
  adminAction: { maxRequests: 30, windowMs: 60 * 1000 },
  questAi: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  /** Studio package stream — separate bucket from `questAi` so tutor generates aren’t capped by quest traffic. */
  studioPackageAi: { maxRequests: 40, windowMs: 60 * 60 * 1000 },
  stripeCheckout: { maxRequests: 5, windowMs: 60 * 1000 },
  duelCreate: { maxRequests: 8, windowMs: 60 * 60 * 1000 },
  duelSubmit: { maxRequests: 40, windowMs: 60 * 1000 },
  duelQueueJoin: { maxRequests: 30, windowMs: 60 * 1000 },
  divisionForumPost: { maxRequests: 20, windowMs: 15 * 60 * 1000 },
  divisionForumImage: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
} as const;

/**
 * Sliding window limiter — Redis first (cross-instance), then Supabase table, then in-memory.
 */
export async function checkSlidingWindowRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const redisKey = cacheKeys.rateLimit("sw", identifier.slice(0, 180));
  const redisResult = await redisSlidingWindowRateLimit(
    redisKey,
    maxRequests,
    windowMs,
  );
  if (redisResult.allowed === false) {
    return redisResult;
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return redisResult;
  }

  const now = Date.now();
  const bucketMs = windowMs;
  const bucketStartMs = Math.floor(now / bucketMs) * bucketMs;
  const prevBucketStartMs = bucketStartMs - bucketMs;
  const elapsedMs = now - bucketStartMs;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return checkRateLimitWithRetryAfter(identifier, maxRequests, windowMs);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const key = identifier.slice(0, 240);
  const bucketStartIso = new Date(bucketStartMs).toISOString();
  const prevBucketStartIso = new Date(prevBucketStartMs).toISOString();

  const { data: currentRow } = await admin
    .from("security_rate_limits")
    .select("hit_count")
    .eq("rate_key", key)
    .eq("bucket_start", bucketStartIso)
    .maybeSingle();
  const nextCount = (currentRow?.hit_count ?? 0) + 1;

  await admin.from("security_rate_limits").upsert(
    {
      rate_key: key,
      bucket_start: bucketStartIso,
      hit_count: nextCount,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "rate_key,bucket_start" },
  );

  const { data: prevRow } = await admin
    .from("security_rate_limits")
    .select("hit_count")
    .eq("rate_key", key)
    .eq("bucket_start", prevBucketStartIso)
    .maybeSingle();

  const prevCount = prevRow?.hit_count ?? 0;
  const weight = Math.max(0, 1 - elapsedMs / bucketMs);
  const estimated = nextCount + prevCount * weight;

  if (estimated > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucketMs - elapsedMs) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function enforceSlidingRateLimit(
  identifier: string,
  limit: { maxRequests: number; windowMs: number },
  action: string,
): Promise<void> {
  const { allowed } = await checkSlidingWindowRateLimit(
    identifier,
    limit.maxRequests,
    limit.windowMs,
  );
  if (!allowed) {
    throw new Error(`Rate limit exceeded for ${action}. Please try again later.`);
  }
}

export function getRateLimitId(userId?: string, ip?: string): string {
  return userId ? `user:${userId}` : `ip:${ip || "unknown"}`;
}

/** Client IP for edge middleware (Vercel / proxies). */
export function getClientIpFromRequest(request: {
  headers: Headers;
}): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Max JSON/body size for middleware Content-Length checks. */
export const MAX_BODY_BYTES_DEFAULT = 1 * 1024 * 1024; // 1MB
export const MAX_BODY_BYTES_VIDEO_UPLOAD = 10 * 1024 * 1024; // 10MB
export const MAX_BODY_BYTES_VIDEO_SERVER_ACTION_UPLOAD = 600 * 1024 * 1024; // 600MB

export function getMaxBodyBytesForPath(pathname: string): number {
  if (pathname.startsWith("/api/video/upload")) {
    return MAX_BODY_BYTES_VIDEO_UPLOAD;
  }
  // `saveRecording` currently runs as a Server Action from `/video/session/[sessionId]`,
  // so the request path is page-like and must allow large multipart payloads.
  if (pathname.startsWith("/video/session/")) {
    return MAX_BODY_BYTES_VIDEO_SERVER_ACTION_UPLOAD;
  }
  return MAX_BODY_BYTES_DEFAULT;
}

/**
 * CSRF protection for App Router API routes (POST/PUT/PATCH/DELETE).
 * Server Actions use Next.js built-in protection; this targets /api/* only.
 * Allows same-origin browser requests, matching csrf cookie + header, or Sec-Fetch-Site: same-origin.
 */
export function validateApiCsrf(request: {
  method: string;
  headers: Headers;
  cookies: { get: (name: string) => { value: string } | undefined };
}): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const headerToken =
    request.headers.get("x-csrf-token") ??
    request.headers.get("X-CSRF-Token") ??
    "";

  const cookieToken =
    request.cookies.get("csrf-token")?.value ??
    request.cookies.get("csrf_token")?.value ??
    "";

  if (headerToken && cookieToken && headerToken === cookieToken) {
    return true;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin") {
    return true;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}

/** Paths where CSRF checks are skipped (webhooks, cron, health, public waitlist). */
export function isCsrfExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/api/stripe/webhook")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname === "/api/health") return true;
  // Public unauthenticated endpoints — no session involved, admin service-role client used server-side
  if (pathname.startsWith("/api/waitlist/")) return true;
  return false;
}

/** Short prefix for logs (never log full UUIDs in middleware). */
export function redactUserIdForLogs(id: string | undefined | null): string {
  if (!id) return "anon";
  return `${id.slice(0, 4)}…`;
}

export function enforceRateLimit(
  identifier: string,
  limit: { maxRequests: number; windowMs: number },
  action: string
): void {
  if (!checkRateLimit(identifier, limit.maxRequests, limit.windowMs)) {
    throw new Error(
      `Rate limit exceeded for ${action}. Please try again later.`
    );
  }
}

// ============================================
// SECURITY HEADERS
// ============================================

export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Keep popups/postMessage flows (OAuth, browser integrations) functional.
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  // Allow camera and microphone for same origin (required for video calling)
  // identity-credentials-get: Google Identity Services / FedCM (Sign in with Google)
  "Permissions-Policy":
    "camera=(self), microphone=(self), geolocation=(), interest-cohort=(), payment=(), identity-credentials-get=(self)",
  // Content Security Policy - strict but allows necessary resources
  "Content-Security-Policy": [
    "default-src 'self'",
    "upgrade-insecure-requests",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://js.stripe.com https://*.stripe.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com https://www.gstatic.com",
    "img-src 'self' blob: data: https: https://*.googleusercontent.com https://*.stripe.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-src 'self' https://accounts.google.com https://js.stripe.com https://*.stripe.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://www.googleapis.com https://www.gstatic.com https://api.stripe.com https://*.stripe.com",
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  // Strict Transport Security (HSTS) - only in production
  ...(process.env.NODE_ENV === "production" && {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  }),
};

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: unknown): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : typeof error === "string"
          ? error
          : "";

  if (!rawMessage) {
    return "An unexpected error occurred.";
  }

  const sanitizedRaw = scrubSecrets(rawMessage);
  const message = sanitizedRaw.toLowerCase();

  // Safe, user-facing phrases (app validation + common DB/PostgREST hints)
  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("not found") ||
    message.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("already have") ||
    message.includes("already has") ||
    message.includes("cannot") ||
    message.includes("not approved") ||
    message.includes("rate limit") ||
    message.includes("failed to") ||
    message.includes("duplicate") ||
    message.includes("exists") ||
    message.includes("overlap") ||
    message.includes("not allowed") ||
    message.includes("must") ||
    message.includes("context") ||
    message.includes("violates") ||
    message.includes("column") ||
    message.includes("null value") ||
    message.includes("row-level") ||
    message.includes("expected") // zod / validation hints
  ) {
    return sanitizedRaw;
  }

  return "An error occurred. Please try again.";
}

// ============================================
// DATE/TIME VALIDATION
// ============================================

/**
 * Validate that a date is in the future
 */
export function validateFutureDate(date: Date | string): Date {
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  if (parsed <= new Date()) {
    throw new Error("Date must be in the future");
  }
  return parsed;
}

/**
 * Validate slot start instant (any minute; sub-minute precision is not required).
 */
export function validateTimeSlot(date: Date | string): Date {
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parsed;
}

