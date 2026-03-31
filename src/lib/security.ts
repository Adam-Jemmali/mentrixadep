/**
 * Security utilities for input validation, sanitization, and rate limiting
 */

import { z } from "zod";

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

/**
 * Sanitize course name
 */
export function sanitizeCourseName(course: string): string {
  return sanitizeString(course).slice(0, 100);
}

/**
 * Sanitize comment text
 */
export function sanitizeComment(comment: string): string {
  return sanitizeString(comment).slice(0, 1000);
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
  signIn: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  signUp: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  bookSession: { maxRequests: 10, windowMs: 60 * 1000 },
  createAvailability: { maxRequests: 20, windowMs: 60 * 1000 },
  rateSession: { maxRequests: 5, windowMs: 60 * 1000 },
  deletePastSession: { maxRequests: 30, windowMs: 60 * 1000 },
  adminAction: { maxRequests: 30, windowMs: 60 * 1000 },
  questAi: { maxRequests: 30, windowMs: 60 * 1000 },
  duelCreate: { maxRequests: 8, windowMs: 60 * 60 * 1000 },
  duelSubmit: { maxRequests: 40, windowMs: 60 * 1000 },
  duelQueueJoin: { maxRequests: 30, windowMs: 60 * 1000 },
  clanCreate: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  clanJoin: { maxRequests: 15, windowMs: 60 * 60 * 1000 },
  clanRegenerateCode: { maxRequests: 8, windowMs: 60 * 60 * 1000 },
} as const;

export function getRateLimitId(userId?: string, ip?: string): string {
  return userId ? `user:${userId}` : `ip:${ip || "unknown"}`;
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
  // Allow camera and microphone for same origin (required for video calling)
  // Block geolocation for security
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
  // Content Security Policy - strict but allows necessary resources
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js, unsafe-inline for some libs
    "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co", // Supabase API and Realtime
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  // Strict Transport Security (HSTS) - only in production
  ...(process.env.NODE_ENV === "production" && {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
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

  const message = rawMessage.toLowerCase();

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
    return rawMessage;
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

