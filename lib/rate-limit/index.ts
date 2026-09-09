import { LRUCache } from "lru-cache";
import { NextRequest, NextResponse } from "next/server";

type RateLimitConfig = {
  uniqueTokenPerInterval?: number;
  interval?: number; // ms
  limit: number;
};

const tokenCache = new LRUCache<string, number[]>({
  max: 500,
  ttl: 60_000, // 1 minute default TTL
});

/**
 * Simple in-memory rate limiter using token bucket approach.
 * For production at scale, consider Upstash Redis rate limiter.
 */
export function rateLimit(config: RateLimitConfig) {
  const { limit, interval = 60_000 } = config;

  return {
    check: (key: string): { success: boolean; remaining: number; reset: number } => {
      const now = Date.now();
      const timestamps = tokenCache.get(key) ?? [];

      // Remove timestamps outside the window
      const windowStart = now - interval;
      const validTimestamps = timestamps.filter((ts) => ts > windowStart);

      if (validTimestamps.length >= limit) {
        const oldestTimestamp = validTimestamps[0];
        const reset = Math.ceil((oldestTimestamp + interval - now) / 1000);
        return { success: false, remaining: 0, reset };
      }

      validTimestamps.push(now);
      tokenCache.set(key, validTimestamps, { ttl: interval });

      return {
        success: true,
        remaining: limit - validTimestamps.length,
        reset: Math.ceil(interval / 1000),
      };
    },
  };
}

// Pre-configured limiters for different endpoints
export const loginLimiter = rateLimit({ limit: 5, interval: 60_000 }); // 5 per minute
export const registerLimiter = rateLimit({ limit: 3, interval: 60_000 }); // 3 per minute
export const pinVerifyLimiter = rateLimit({ limit: 5, interval: 300_000 }); // 5 per 5 minutes
export const presignLimiter = rateLimit({ limit: 30, interval: 60_000 }); // 30 per minute

/**
 * Get client IP from request (works with Vercel, Cloudflare, etc.)
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Apply rate limit middleware and return error response if exceeded.
 */
export function applyRateLimit(
  limiter: ReturnType<typeof rateLimit>,
  key: string
): NextResponse | null {
  const result = limiter.check(key);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: `Too many requests. Please try again in ${result.reset} seconds.`,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.reset),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  return null;
}
