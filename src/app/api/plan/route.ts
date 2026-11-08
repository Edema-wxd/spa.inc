import { cookies } from "next/headers"
import { z } from "zod"
import { PLAN_COOKIE, TIER_IDS } from "@/lib/plans"
import { effectivePlan, getRequestContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"
import { assertRole } from "@/server/entitlements"
import { ok, parseBody, route } from "@/server/http"
import { chooseSubscriptionPlan, getPlanUsage } from "@/server/services/plan"

export const GET = route(async () => ok(await getPlanUsage(await getRequestContext())))

/**
 * The demo business switches plan with a cookie so visitors can see every
 * tier. Real businesses record their chosen plan on the subscription (applies
 * after the trial); replace with a billing checkout + webhook (item 4).
 */
export const PUT = route(async (request) => {
  const ctx = await getRequestContext()
  assertRole(ctx, "ADMIN")
  const { plan } = await parseBody(request, z.object({ plan: z.enum(TIER_IDS) }))
  if (ctx.isDemo) {
    ;(await cookies()).set(PLAN_COOKIE, plan, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 })
    return ok(await getPlanUsage({ ...ctx, plan }), "Plan updated")
  }
  await chooseSubscriptionPlan(ctx, plan)
  const updated = await getRequestContext()
  return ok(await getPlanUsage({ ...updated, plan: effectivePlan(await (await getRepositories()).subscriptions.get(ctx.organizationId)) }), "Plan saved")
})
