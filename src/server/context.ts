import "server-only"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { DEFAULT_PLAN, PLAN_COOKIE, isTierId, type TierId } from "@/lib/plans"
import type { Organization, Subscription, UserRole } from "@/types"
import { getIdentity, type Identity } from "@/server/auth"
import { ApiError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"

export { DEMO_ORGANIZATION_ID } from "@/server/demo/seed"

/** The full product during the trial, so new businesses see everything. */
export const TRIAL_PLAN: TierId = "executive"
export const TRIAL_DAYS = 14

export interface RequestContext {
  organizationId: string
  userId: string
  role: UserRole
  /** The plan in effect right now (the trial plan while trialing) */
  plan: TierId
  isDemo: boolean
}

/** The demo business's plan, chosen in Settings > Plan & Billing. */
export async function getCurrentPlan(): Promise<TierId> {
  const value = (await cookies()).get(PLAN_COOKIE)?.value
  return isTierId(value) ? value : DEFAULT_PLAN
}

/** Reverse trial: everything until the trial ends, then the plan they chose. */
export function effectivePlan(subscription: Subscription | null, now = Date.now()): TierId {
  if (!subscription) return "essentials"
  if (subscription.status === "TRIALING" && subscription.trial_ends_at && Date.parse(subscription.trial_ends_at) > now) {
    return TRIAL_PLAN
  }
  return subscription.plan
}

async function planFor(org: Organization): Promise<TierId> {
  if (org.is_demo) return getCurrentPlan()
  const { subscriptions } = await getRepositories()
  return effectivePlan(await subscriptions.get(org.id))
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Please sign in") {
    super(401, "UNAUTHORIZED", message)
  }
}

/** Who is signed in and which business they belong to, or null. Cached per request. */
export const getSessionContext = cache(async (): Promise<RequestContext | null> => {
  const identity = await getIdentity()
  return identity ? resolveAccount(identity) : null
})

/**
 * The account behind an auth identity, or null. Links an invited person
 * (matched by email) the first time they sign in.
 */
export async function resolveAccount(identity: Identity): Promise<RequestContext | null> {
  const repos = await getRepositories()
  let found = await repos.users.findByAuthUserId(identity.authUserId)
  if (!found && identity.email) {
    const invited = await repos.users.findByEmail(identity.email)
    // Only link someone who hasn't signed in with a different identity before
    if (invited && !invited.user.auth_user_id) {
      await repos.users.linkAuthUser(invited.organizationId, invited.user.id, identity.authUserId)
      found = invited
    }
  }
  if (!found || !found.user.is_active) return null

  const org = await repos.organizations.get(found.organizationId)
  if (!org) return null
  return {
    organizationId: org.id,
    userId: found.user.id,
    role: found.user.role,
    plan: await planFor(org),
    isDemo: org.is_demo,
  }
}

/** For API routes: the signed-in context, or 401. */
export async function getRequestContext(): Promise<RequestContext> {
  const ctx = await getSessionContext()
  if (!ctx) throw new UnauthorizedError()
  return ctx
}

/** Dashboard pages staff can use; everything else is for admins until staff data scoping lands. */
const STAFF_PATHS = ["/dashboard/calendar", "/dashboard/payments/new"]

/**
 * For dashboard pages and layouts: the signed-in context, or a redirect to
 * sign in. Staff are sent to their calendar from admin-only pages.
 */
export async function getPageContext(): Promise<RequestContext> {
  const ctx = await getSessionContext()
  const path = (await headers()).get("x-pathname") ?? ""
  if (!ctx) redirect(`/login${path ? `?next=${encodeURIComponent(path)}` : ""}`)
  if (ctx.role === "STAFF" && path && !STAFF_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
    redirect("/dashboard/calendar")
  }
  return ctx
}

/**
 * Context for requests with no signed-in user: the public booking page,
 * payment webhooks and scheduled jobs. Only the online-booking, deposit and
 * messaging services use it, and only for the organization the request is
 * about. The plan is the business's own (the demo cookie for the demo).
 */
export async function getSystemContext(organizationId: string): Promise<RequestContext> {
  const { organizations } = await getRepositories()
  const org = await organizations.get(organizationId)
  return {
    organizationId,
    userId: "system",
    role: "ADMIN",
    plan: org ? await planFor(org) : "essentials",
    isDemo: org?.is_demo ?? false,
  }
}
