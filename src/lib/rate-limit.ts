/**
 * Rate limiting middleware for server actions
 */

import { checkRateLimit } from "./security";

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  signIn: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  signUp: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  
  // Session booking
  bookSession: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  
  // Availability creation
  createAvailability: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  
  // Rating submission
  rateSession: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  
  // Admin actions
  adminAction: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
} as const;

/**
 * Get rate limit identifier from request
 */
export function getRateLimitId(userId?: string, ip?: string): string {
  return userId ? `user:${userId}` : `ip:${ip || "unknown"}`;
}

/**
 * Check rate limit and throw if exceeded
 */
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

