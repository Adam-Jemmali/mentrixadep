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
};

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose internal error details
    const message = error.message.toLowerCase();
    
    // Whitelist safe error messages
    if (
      message.includes("required") ||
      message.includes("invalid") ||
      message.includes("not found") ||
      message.includes("permission") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return error.message;
    }
    
    // Generic error for everything else
    return "An error occurred. Please try again.";
  }
  
  return "An unexpected error occurred.";
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
 * Validate that time is at :00 or :30 minutes
 */
export function validateTimeSlot(date: Date | string): Date {
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  const minutes = parsed.getMinutes();
  if (minutes !== 0 && minutes !== 30) {
    throw new Error("Time must be at :00 or :30 minutes");
  }
  return parsed;
}

