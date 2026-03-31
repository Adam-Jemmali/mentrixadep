/**
 * Performance utilities for monitoring and optimization
 */

import React from "react";

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  if (label && process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
}

/**
 * Batch database queries to reduce round trips
 */
export function batchQueries<T>(
  queries: Array<() => Promise<T>>,
  batchSize = 10
): Promise<T[]> {
  const results: T[] = [];
  
  const processBatch = async (batch: Array<() => Promise<T>>) => {
    return Promise.all(batch.map((query) => query()));
  };
  
  const executeBatches = async () => {
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await processBatch(batch);
      results.push(...batchResults);
    }
    return results;
  };
  
  return executeBatches();
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize async function results
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  ttlMs = 5 * 60 * 1000 // 5 minutes default
): T {
  const cache = new Map<string, { data: unknown; expiresAt: number }>();
  
  return (async (...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    const result = await fn(...args);
    cache.set(key, {
      data: result,
      expiresAt: Date.now() + ttlMs,
    });
    
    // Cleanup expired entries
    if (cache.size > 100) {
      const now = Date.now();
      cache.forEach((value, k) => {
        if (now >= value.expiresAt) {
          cache.delete(k);
        }
      });
    }
    
    return result;
  }) as T;
}

/**
 * Lazy load component with error boundary
 * Note: Use React.lazy() directly in components for better type safety
 */
export function createLazyComponent<T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType<unknown>
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    importFn().catch((error) => {
      console.error("Failed to load component:", error);
      return {
        default: (fallback || (() => null)) as T,
      };
    })
  );
}
