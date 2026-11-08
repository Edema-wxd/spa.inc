import "server-only"

import { PLAN_LIMITS, PLAN_NAMES, PLAN_FEATURES, type PlanUsage, type TierId } from "@/lib/plans"
import type { RequestContext } from "@/server/context"
import { ApiError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"

/** Current plan, enabled features, usage against each limit, and trial status. */
export async function getPlanUsage(ctx: RequestContext): Promise<PlanUsage> {
  const repos = await getRepositories()
  const [clients, admins, locations, subscription] = await Promise.all([
    repos.clients.count(ctx.organizationId),
    repos.users.count(ctx.organizationId, { role: "ADMIN", activeOnly: true }),
    repos.locations.count(ctx.organizationId),
    ctx.isDemo ? Promise.resolve(null) : repos.subscriptions.get(ctx.organizationId),
  ])
  const limits = PLAN_LIMITS[ctx.plan]
  const trialEnds = subscription?.status === "TRIALING" && subscription.trial_ends_at ? Date.parse(subscription.trial_ends_at) : null
  const trialing = trialEnds !== null && trialEnds > Date.now()
  const chosenPlan: TierId = subscription?.plan ?? ctx.plan
  return {
    plan: ctx.plan,
    planName: PLAN_NAMES[ctx.plan],
    features: [...PLAN_FEATURES[ctx.plan]],
    usage: {
      clients: { used: clients, limit: limits.clients },
      admins: { used: admins, limit: limits.admins },
      locations: { used: locations, limit: limits.locations },
    },
    isDemo: ctx.isDemo,
    chosenPlan,
    trial: trialing
      ? {
          endsAt: subscription!.trial_ends_at!,
          daysLeft: Math.max(1, Math.ceil((trialEnds! - Date.now()) / 86_400_000)),
          chosenPlan,
          chosenPlanName: PLAN_NAMES[chosenPlan],
        }
      : null,
  }
}

/**
 * A real business choosing its plan. Billing isn't connected yet
 * (docs/ACTION_PLAN.md item 4), so this records the choice; during the trial
 * it is the plan that applies when the trial ends.
 */
export async function chooseSubscriptionPlan(ctx: RequestContext, plan: TierId) {
  if (plan === "enterprise") {
    throw new ApiError(422, "VALIDATION_ERROR", "Enterprise is set up with our sales team. Use Contact sales.")
  }
  const { subscriptions } = await getRepositories()
  const current = await subscriptions.get(ctx.organizationId)
  if (!current) throw new ApiError(404, "NOT_FOUND", "Subscription not found")
  // Outside the trial the chosen plan applies straight away
  await subscriptions.update(ctx.organizationId, current.status === "TRIALING" ? { plan } : { plan, status: "ACTIVE" })
}
