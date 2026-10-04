import "server-only"

import { PLAN_LIMITS, PLAN_NAMES, PLAN_FEATURES, type PlanUsage } from "@/lib/plans"
import type { RequestContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"

/** Current plan, enabled features, and usage against each limit. */
export async function getPlanUsage(ctx: RequestContext): Promise<PlanUsage> {
  const repos = await getRepositories()
  const [clients, admins, locations] = await Promise.all([
    repos.clients.count(ctx.organizationId),
    repos.users.count(ctx.organizationId, { role: "ADMIN", activeOnly: true }),
    repos.locations.count(ctx.organizationId),
  ])
  const limits = PLAN_LIMITS[ctx.plan]
  return {
    plan: ctx.plan,
    planName: PLAN_NAMES[ctx.plan],
    features: [...PLAN_FEATURES[ctx.plan]],
    usage: {
      clients: { used: clients, limit: limits.clients },
      admins: { used: admins, limit: limits.admins },
      locations: { used: locations, limit: limits.locations },
    },
  }
}
