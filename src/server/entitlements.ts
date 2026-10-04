import {
  FEATURE_LABELS,
  canAdd,
  getLimit,
  hasFeature,
  minimumPlanFor,
  minimumPlanForCount,
  type Feature,
  type LimitedResource,
} from "@/lib/plans"
import type { UserRole } from "@/types"
import type { RequestContext } from "@/server/context"
import { ForbiddenError, PlanFeatureError, PlanLimitError } from "@/server/errors"

/** Throws unless the organization's plan includes `feature`. */
export function assertFeature(ctx: RequestContext, feature: Feature) {
  if (!hasFeature(ctx.plan, feature)) {
    throw new PlanFeatureError(feature, minimumPlanFor(feature), FEATURE_LABELS[feature])
  }
}

/** Throws when adding one more `resource` would exceed the plan limit. */
export function assertCanAdd(ctx: RequestContext, resource: LimitedResource, currentCount: number) {
  if (!canAdd(ctx.plan, resource, currentCount)) {
    const limit = getLimit(ctx.plan, resource) as number
    throw new PlanLimitError(
      resource,
      limit,
      minimumPlanForCount(resource, currentCount + 1)
    )
  }
}

export function assertRole(ctx: RequestContext, ...roles: UserRole[]) {
  if (!roles.includes(ctx.role)) {
    throw new ForbiddenError()
  }
}
