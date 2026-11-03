import { PLAN_NAMES, formatCount, type Feature, type LimitedResource, type TierId } from "@/lib/plans"

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BOOKING_CONFLICT"
  | "OUTSIDE_WORKING_HOURS"
  | "PLAN_FEATURE_UNAVAILABLE"
  | "PLAN_LIMIT_REACHED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} not found`)
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have access to this resource") {
    super(403, "FORBIDDEN", message)
  }
}

/** The organization's plan does not include a feature. */
export class PlanFeatureError extends ApiError {
  constructor(feature: Feature, requiredPlan: TierId, featureLabel: string) {
    super(
      403,
      "PLAN_FEATURE_UNAVAILABLE",
      `${featureLabel} is not included in your plan. Upgrade to ${PLAN_NAMES[requiredPlan]} or higher.`,
      { feature, requiredPlan }
    )
  }
}

/** The organization has used all of a limited resource on its plan. */
export class PlanLimitError extends ApiError {
  constructor(resource: LimitedResource, limit: number, requiredPlan: TierId) {
    super(
      403,
      "PLAN_LIMIT_REACHED",
      `Your plan allows up to ${formatCount(resource, limit)}. Upgrade to ${PLAN_NAMES[requiredPlan]} to add more.`,
      { resource, limit, requiredPlan }
    )
  }
}

/** The requested time overlaps another booking for the therapist or client. */
export class BookingConflictError extends ApiError {
  constructor(message: string, conflictingAppointmentId: string) {
    super(409, "BOOKING_CONFLICT", message, { conflictingAppointmentId })
  }
}
