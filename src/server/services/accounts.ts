import "server-only"

import { cookies } from "next/headers"
import { countryFor } from "@/lib/countries"
import type { SignupInput } from "@/lib/validation/accounts"
import { cookieOptions, signOut, startEmailSignIn, verifyEmailCode, type Identity } from "@/server/auth"
import { authMode, SIGNUP_COOKIE } from "@/server/auth/config"
import { seal, unseal } from "@/server/auth/signed"
import { TRIAL_DAYS, resolveAccount } from "@/server/context"
import { ApiError } from "@/server/errors"
import { assertRateLimit, getClientIp } from "@/server/rate-limit"
import { getRepositories } from "@/server/repositories"

// ---------------------------------------------------------------------------
// Sign-up and sign-in with a one-time email code.
//
// Sign-up: form -> details kept in a signed cookie -> code emailed -> code
// verified -> business, location, owner and trial created together.
// ---------------------------------------------------------------------------

const SIGNUP_MINUTES = 30

async function limit(email: string) {
  assertRateLimit(`auth:ip:${await getClientIp()}`, 20, 10 * 60_000)
  assertRateLimit(`auth:email:${email}`, 5, 10 * 60_000, "Too many codes requested for this email. Try again in a few minutes.")
}

export async function startSignup(input: SignupInput) {
  await limit(input.email)
  const { users } = await getRepositories()
  if (await users.findByEmail(input.email)) {
    throw new ApiError(409, "VALIDATION_ERROR", "An account already uses this email. Sign in instead.", {
      email: ["An account already uses this email. Sign in instead."],
    })
  }
  ;(await cookies()).set(SIGNUP_COOKIE, seal(input, SIGNUP_MINUTES * 60), await cookieOptions(SIGNUP_MINUTES * 60))
  const { demoCode } = await startEmailSignIn(input.email, { createUser: true })
  return { email: input.email, demoCode, mode: authMode() }
}

export async function startLogin(email: string) {
  await limit(email)
  if (authMode() === "demo") {
    // Demo codes appear on screen, so say plainly when there's no account
    const { users } = await getRepositories()
    if (!(await users.findByEmail(email))) {
      throw new ApiError(404, "NOT_FOUND", "No account uses this email. Start a free trial instead.")
    }
  }
  const { demoCode } = await startEmailSignIn(email, { createUser: false })
  return { email, demoCode, mode: authMode() }
}

/** Unique, readable booking-page slug from the business name: "Glow Spa" -> "glow-spa" (-2, -3...). */
async function uniqueSlug(name: string) {
  const { organizations } = await getRepositories()
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)
      .replace(/^-|-$/g, "") || "spa"
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    if (!(await organizations.getBySlug(slug))) return slug
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`
}

async function createAccount(identity: Identity, input: SignupInput) {
  const repos = await getRepositories()
  const country = countryFor(input.country_code)!
  const { organization, owner } = await repos.organizations.createWithOwner({
    name: input.business_name,
    slug: await uniqueSlug(input.business_name),
    country_code: country.code,
    currency: country.currency,
    timezone: input.timezone,
    phone: input.phone,
    owner: { full_name: input.full_name, email: input.email, phone: input.phone, auth_user_id: identity.authUserId },
    plan: input.plan,
    trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
  })
  return { organization, owner }
}

/**
 * Checks the code. With a pending sign-up for this email, creates the
 * business; otherwise signs in to the existing account. Returns where to go.
 */
export async function verifyCode(email: string, code: string, next?: string): Promise<{ redirect: string; created: boolean }> {
  assertRateLimit(`auth:verify:${await getClientIp()}`, 30, 10 * 60_000)
  const identity = await verifyEmailCode(email, code)
  return completeSignIn(identity, next)
}

/** Shared by code entry and the Supabase magic-link callback. */
export async function completeSignIn(identity: Identity, next?: string): Promise<{ redirect: string; created: boolean }> {
  const store = await cookies()
  const pending = unseal<SignupInput>(store.get(SIGNUP_COOKIE)?.value)
  const existing = await resolveAccount(identity)

  if (!existing && pending && pending.email === identity.email) {
    const { users } = await getRepositories()
    if (await users.findByEmail(pending.email)) {
      throw new ApiError(409, "VALIDATION_ERROR", "An account already uses this email. Sign in instead.")
    }
    await createAccount(identity, pending)
    store.delete(SIGNUP_COOKIE)
    return { redirect: "/dashboard/welcome", created: true }
  }
  store.delete(SIGNUP_COOKIE)
  if (!existing) {
    await signOut()
    throw new ApiError(404, "NOT_FOUND", "No account uses this email. Start a free trial instead.")
  }
  const home = existing.role === "STAFF" ? "/dashboard/calendar" : "/dashboard"
  return { redirect: next && existing.role !== "STAFF" ? next : home, created: false }
}
