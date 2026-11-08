import "server-only"

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

// HMAC-signed values for small cookies (demo session, pending sign-up).
// AUTH_SECRET signs them; without it (demo store only) a per-process random
// secret is used, so sessions end when the server restarts, like the data.

const globalForSecret = globalThis as unknown as { __spaAuthSecret?: string }

function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  // Real data runs on several instances, which must share the secret
  if (process.env.DATA_SOURCE === "prisma") throw new Error("Set AUTH_SECRET (32+ random characters) when DATA_SOURCE=prisma")
  globalForSecret.__spaAuthSecret ??= randomBytes(32).toString("hex")
  return globalForSecret.__spaAuthSecret
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

/** Encodes `value` with an expiry and a signature. */
export function seal<T>(value: T, maxAgeSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ v: value, exp: Date.now() + maxAgeSeconds * 1000 })).toString("base64url")
  return `${payload}.${sign(payload)}`
}

/** Returns the value if the signature is valid and it hasn't expired. */
export function unseal<T>(token: string | undefined | null): T | null {
  if (!token) return null
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { v, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { v: T; exp: number }
    return exp > Date.now() ? v : null
  } catch {
    return null
  }
}
