import { cookies } from "next/headers"
import { z } from "zod"
import { PLAN_COOKIE, TIER_IDS } from "@/lib/plans"
import { getRequestContext } from "@/server/context"
import { assertRole } from "@/server/entitlements"
import { ok, parseBody, route } from "@/server/http"
import { getPlanUsage } from "@/server/services/plan"

export const GET = route(async () => ok(await getPlanUsage(await getRequestContext())))

/**
 * Demo only: switches the organization's plan by setting a cookie.
 * Replace with a billing checkout + webhook that updates `subscriptions`.
 */
export const PUT = route(async (request) => {
  assertRole(await getRequestContext(), "ADMIN")
  const { plan } = await parseBody(request, z.object({ plan: z.enum(TIER_IDS) }))
  ;(await cookies()).set(PLAN_COOKIE, plan, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })
  return ok(await getPlanUsage({ ...(await getRequestContext()), plan }), "Plan updated")
})
