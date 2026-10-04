import "server-only"

import { cookies } from "next/headers"
import { DEFAULT_PLAN, PLAN_COOKIE, isTierId, type TierId } from "@/lib/plans"
import type { UserRole } from "@/types"

export const DEMO_ORGANIZATION_ID = "org-demo"
export const DEMO_USER_ID = "admin-001"

export interface RequestContext {
  organizationId: string
  userId: string
  role: UserRole
  plan: TierId
}

/** The demo organization's plan, chosen in Settings > Plan & Billing. */
export async function getCurrentPlan(): Promise<TierId> {
  const value = (await cookies()).get(PLAN_COOKIE)?.value
  return isTierId(value) ? value : DEFAULT_PLAN
}

/**
 * Who is making the request and what their organization may do.
 *
 * Demo: a fixed admin in a single organization, with the plan read from a
 * cookie. Once Supabase Auth is wired up this should read the session, then
 * load the user's organization and subscription from the database.
 */
export async function getRequestContext(): Promise<RequestContext> {
  return {
    organizationId: DEMO_ORGANIZATION_ID,
    userId: DEMO_USER_ID,
    role: "ADMIN",
    plan: await getCurrentPlan(),
  }
}
