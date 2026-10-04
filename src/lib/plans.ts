// ---------------------------------------------------------------------------
// Plan entitlements
//
// Single source of truth for what each plan is allowed to do. Shared by the
// UI (nav locks, upgrade prompts, usage meters), the pricing comparison table,
// and the API layer (src/server/entitlements.ts), which enforces it.
// ---------------------------------------------------------------------------

export const TIER_IDS = ["essentials", "manager", "executive", "enterprise"] as const

export type TierId = (typeof TIER_IDS)[number]

export const PLAN_NAMES: Record<TierId, string> = {
  essentials: "Essentials",
  manager: "Manager",
  executive: "Executive",
  enterprise: "Enterprise",
}

/** Plan used by the demo when no plan has been selected yet. */
export const DEFAULT_PLAN: TierId = "executive"

/** Cookie that stores the demo organization's plan until billing exists. */
export const PLAN_COOKIE = "spa-plan"

export function isTierId(value: unknown): value is TierId {
  return typeof value === "string" && (TIER_IDS as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Limits (`null` = unlimited)
// ---------------------------------------------------------------------------

export type LimitedResource = "clients" | "admins" | "locations"

export type PlanLimits = Record<LimitedResource, number | null>

export const PLAN_LIMITS: Record<TierId, PlanLimits> = {
  essentials: { clients: 50, admins: 1, locations: 1 },
  manager: { clients: 200, admins: 3, locations: 1 },
  executive: { clients: 500, admins: null, locations: 1 },
  enterprise: { clients: null, admins: null, locations: null },
}

export const RESOURCE_LABELS: Record<LimitedResource, string> = {
  clients: "Clients",
  admins: "Admin accounts",
  locations: "Locations",
}

const RESOURCE_NOUNS: Record<LimitedResource, [singular: string, plural: string]> = {
  clients: ["client", "clients"],
  admins: ["admin account", "admin accounts"],
  locations: ["location", "locations"],
}

/** "1 admin account", "50 clients" */
export function formatCount(resource: LimitedResource, count: number): string {
  const [singular, plural] = RESOURCE_NOUNS[resource]
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export type Feature =
  | "staffManagement"
  | "revenueAnalytics"
  | "expenseTracking"
  | "performanceLeaderboard"
  | "profitAndLoss"
  | "emailConfirmations"
  | "multiLocation"
  | "consolidatedReporting"
  | "guidedOnboarding"

export const FEATURE_LABELS: Record<Feature, string> = {
  staffManagement: "Staff directory & schedules",
  revenueAnalytics: "Revenue analytics",
  expenseTracking: "Expense tracking",
  performanceLeaderboard: "Performance leaderboard",
  profitAndLoss: "Profit & Loss reports",
  emailConfirmations: "Email confirmations",
  multiLocation: "Multi-location management",
  consolidatedReporting: "Consolidated multi-branch reporting",
  guidedOnboarding: "Guided onboarding & data migration",
}

const MANAGER_FEATURES: Feature[] = ["staffManagement", "revenueAnalytics", "expenseTracking"]

const EXECUTIVE_FEATURES: Feature[] = [
  ...MANAGER_FEATURES,
  "performanceLeaderboard",
  "profitAndLoss",
  "emailConfirmations",
]

export const PLAN_FEATURES: Record<TierId, ReadonlySet<Feature>> = {
  essentials: new Set<Feature>(),
  manager: new Set(MANAGER_FEATURES),
  executive: new Set(EXECUTIVE_FEATURES),
  enterprise: new Set<Feature>([
    ...EXECUTIVE_FEATURES,
    "multiLocation",
    "consolidatedReporting",
    "guidedOnboarding",
  ]),
}

/** Current plan and usage, computed server-side and shared with the UI. */
export interface PlanUsage {
  plan: TierId
  planName: string
  features: Feature[]
  usage: Record<LimitedResource, { used: number; limit: number | null }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function hasFeature(plan: TierId, feature: Feature): boolean {
  return PLAN_FEATURES[plan].has(feature)
}

export function getLimit(plan: TierId, resource: LimitedResource): number | null {
  return PLAN_LIMITS[plan][resource]
}

/** True when one more item of `resource` can be added at the current usage. */
export function canAdd(plan: TierId, resource: LimitedResource, currentCount: number): boolean {
  const limit = getLimit(plan, resource)
  return limit === null || currentCount < limit
}

/** Cheapest plan that includes the feature. */
export function minimumPlanFor(feature: Feature): TierId {
  return TIER_IDS.find((tier) => hasFeature(tier, feature)) ?? "enterprise"
}

/** Cheapest plan whose limit allows `count` items of `resource`. */
export function minimumPlanForCount(resource: LimitedResource, count: number): TierId {
  return (
    TIER_IDS.find((tier) => {
      const limit = getLimit(tier, resource)
      return limit === null || count <= limit
    }) ?? "enterprise"
  )
}

export function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString("en-US")
}
