import "server-only"

import { headers } from "next/headers"
import { ApiError } from "@/server/errors"

// Fixed-window counters in process memory. Good enough for one server and the
// demo; with several instances use a shared store (Upstash Redis, Postgres)
// so limits hold across them. See docs/ONLINE_BOOKING.md.

const globalForLimits = globalThis as unknown as { __spaRateLimits?: Map<string, { count: number; resetAt: number }> }
const buckets = (globalForLimits.__spaRateLimits ??= new Map())

/** Throws 429 RATE_LIMITED once `key` has been used `limit` times within `windowMs`. */
export function assertRateLimit(key: string, limit: number, windowMs: number, message = "Too many attempts. Please try again in a few minutes.") {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    }
    return
  }
  bucket.count += 1
  if (bucket.count > limit) {
    throw new ApiError(429, "RATE_LIMITED", message, { retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) })
  }
}

/** Best-effort client IP from proxy headers. */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown"
}
