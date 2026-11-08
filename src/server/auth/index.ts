import "server-only"

import { createHash, randomInt, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { getAppUrl } from "@/server/app-url"
import { ApiError } from "@/server/errors"
import { authMode, demoAllowed, DEMO_OWNER_IDENTITY, DEMO_SESSION_COOKIE } from "@/server/auth/config"
import { seal, unseal } from "@/server/auth/signed"
import { getSupabase } from "@/server/auth/supabase"

/** Who is signed in, as the auth provider knows them. */
export interface Identity {
  authUserId: string
  email: string | null
}

const SESSION_DAYS = 30
const CODE_MINUTES = 10
const MAX_ATTEMPTS = 5

/** Secure whenever the app is served over https (always in production deployments). */
async function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: (await getAppUrl()).startsWith("https://"),
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

function assertAvailable() {
  if (authMode() === "disabled") {
    throw new ApiError(503, "INTERNAL_ERROR", "Sign-in isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
}

// ---------------------------------------------------------------------------
// Demo one-time codes (no email is sent; the code is shown on screen)
// ---------------------------------------------------------------------------

const globalForCodes = globalThis as unknown as {
  __spaLoginCodes?: Map<string, { hash: string; expiresAt: number; attempts: number }>
}
const codes = (globalForCodes.__spaLoginCodes ??= new Map())

const hashCode = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex")

function issueDemoCode(email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  codes.set(email, { hash: hashCode(email, code), expiresAt: Date.now() + CODE_MINUTES * 60_000, attempts: 0 })
  return code
}

function checkDemoCode(email: string, code: string) {
  const entry = codes.get(email)
  if (!entry || entry.expiresAt < Date.now()) return false
  entry.attempts += 1
  if (entry.attempts > MAX_ATTEMPTS) {
    codes.delete(email)
    return false
  }
  const ok = timingSafeEqual(Buffer.from(entry.hash), Buffer.from(hashCode(email, code)))
  if (ok) codes.delete(email)
  return ok
}

// ---------------------------------------------------------------------------
// Sign-in with a one-time email code
// ---------------------------------------------------------------------------

/**
 * Sends a 6-digit code to `email`. In demo mode the code is returned for
 * display instead of being emailed. `createUser` is false for sign-in, so a
 * stranger can't create an auth account through the login form.
 */
export async function startEmailSignIn(email: string, options: { createUser: boolean }): Promise<{ demoCode: string | null }> {
  assertAvailable()
  if (authMode() === "demo") return { demoCode: issueDemoCode(email) }

  const supabase = await getSupabase()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: options.createUser, emailRedirectTo: `${await getAppUrl()}/auth/callback` },
  })
  // For sign-in, don't reveal whether the address has an account
  if (error && options.createUser) {
    throw new ApiError(422, "VALIDATION_ERROR", error.message)
  }
  if (error) console.info("[auth] sign-in code not sent:", error.message)
  return { demoCode: null }
}

/** Checks the code and starts a session. Returns the identity, or throws 401. */
export async function verifyEmailCode(email: string, code: string): Promise<Identity> {
  assertAvailable()
  if (authMode() === "demo") {
    if (!checkDemoCode(email, code)) throw new ApiError(401, "UNAUTHORIZED", "That code is wrong or has expired. Request a new one.")
    const identity = { authUserId: `demo:${email}`, email }
    await startDemoSession(identity)
    return identity
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" })
  if (error || !data.user) throw new ApiError(401, "UNAUTHORIZED", "That code is wrong or has expired. Request a new one.")
  // Leaving the demo for a real account
  ;(await cookies()).delete(DEMO_SESSION_COOKIE)
  return { authUserId: data.user.id, email: data.user.email ?? email }
}

/** Magic-link sign-in (Supabase email link): exchanges the code from the link for a session. */
export async function exchangeMagicLink(code: string): Promise<Identity | null> {
  if (authMode() !== "supabase") return null
  const supabase = await getSupabase()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return null
  return { authUserId: data.user.id, email: data.user.email ?? null }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Signed demo session (demo sign-in and the /demo entry). Never accepted with Supabase on a real database. */
export async function startDemoSession(identity: Identity) {
  ;(await cookies()).set(DEMO_SESSION_COOKIE, seal(identity, SESSION_DAYS * 86_400), await cookieOptions(SESSION_DAYS * 86_400))
}

/** The signed-in identity for this request, or null. A real (Supabase) session wins over a demo one. */
export async function getIdentity(): Promise<Identity | null> {
  const store = await cookies()
  if (authMode() === "supabase") {
    const supabase = await getSupabase()
    // getUser() validates the token with Supabase rather than trusting the cookie
    const { data } = await supabase.auth.getUser()
    if (data.user) return { authUserId: data.user.id, email: data.user.email ?? null }
  }
  const demo = unseal<Identity>(store.get(DEMO_SESSION_COOKIE)?.value)
  // Demo sessions only count where the demo store exists
  if (demo && demoAllowed() && (authMode() === "demo" || demo.authUserId === DEMO_OWNER_IDENTITY)) return demo
  return null
}

export async function signOut() {
  const store = await cookies()
  store.delete(DEMO_SESSION_COOKIE)
  if (authMode() === "supabase") {
    const supabase = await getSupabase()
    await supabase.auth.signOut()
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export { cookieOptions }
