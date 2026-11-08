// Which sign-in system is active. Kept free of server-only imports so the
// proxy (src/proxy.ts) can use it too.

export type AuthMode = "supabase" | "demo" | "disabled"

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/**
 * The demo store and demo sign-in only exist without a real database, unless
 * a staging environment opts in explicitly.
 */
export function demoAllowed() {
  return process.env.DATA_SOURCE !== "prisma" || process.env.ALLOW_DEMO === "true"
}

/**
 * supabase: real email codes and sessions (production).
 * demo: codes are shown on screen instead of emailed; only without a real database.
 * disabled: a real database without Supabase configured; nobody can sign in.
 */
export function authMode(): AuthMode {
  if (supabaseConfigured()) return "supabase"
  return demoAllowed() ? "demo" : "disabled"
}

/** Signed session cookie used by demo sign-in and the /demo entry. */
export const DEMO_SESSION_COOKIE = "spa-session"
/** Signed cookie carrying sign-up details between the form and the code step. */
export const SIGNUP_COOKIE = "spa-signup"
/** Auth identity of the demo business's owner (Rebecca Torres). */
export const DEMO_OWNER_IDENTITY = "demo:owner"

export function hasSessionCookie(names: string[]) {
  return names.some((name) => name === DEMO_SESSION_COOKIE || (name.startsWith("sb-") && name.includes("-auth-token")))
}
