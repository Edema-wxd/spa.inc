import "server-only"

import { headers } from "next/headers"

/**
 * Absolute base URL for links in messages and payment redirects.
 * `APP_URL` wins (set it in production); otherwise it is derived from the
 * request's host headers, which is right for local and preview deployments.
 */
export async function getAppUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "")
  try {
    const h = await headers()
    const host = h.get("x-forwarded-host") ?? h.get("host")
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")
      return `${proto}://${host}`
    }
  } catch {
    // Outside a request (scheduled job without headers)
  }
  return "http://localhost:3000"
}

export function bookingPagePath(slug: string) {
  return `/book/${slug}`
}

export function manageBookingPath(slug: string, token: string) {
  return `/book/${slug}/booking/${token}`
}
