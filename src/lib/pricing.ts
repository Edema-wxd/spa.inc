// ---------------------------------------------------------------------------
// Pricing configuration
//
// Single source of truth for the /pricing and /contact-sales pages.
// Prices are whole units per month in each currency: USD everywhere, NGN for
// visitors in Nigeria (see src/lib/region.ts). Limits and feature access come
// from src/lib/plans.ts so the pricing table always matches what is enforced.
// ---------------------------------------------------------------------------

import {
  FEATURE_LABELS,
  PLAN_LIMITS,
  PLAN_NAMES,
  formatLimit,
  hasFeature,
  type Feature,
  type TierId,
} from "@/lib/plans"

export type { TierId } from "@/lib/plans"

export type BillingCycle = "monthly" | "annual"

export const CURRENCIES = ["USD", "NGN"] as const

export type Currency = (typeof CURRENCIES)[number]

export type PriceList = Record<Currency, number>

export const ANNUAL_DISCOUNT = 0.1 // 10% off when billed annually

export const FREE_TRIAL_DAYS = 14

export interface PricingTier {
  id: TierId
  name: string
  audience: string
  description: string
  /** Monthly price per currency. `null` means custom quote (contact sales). */
  prices: PriceList | null
  mostPopular?: boolean
  freeTrial?: boolean
  highlights: string[]
  cta: { label: string; href: string }
}

export const pricingTiers: PricingTier[] = [
  {
    id: "essentials",
    name: PLAN_NAMES.essentials,
    audience: "Single users",
    description:
      "For independent therapists and solo practitioners running their own book of clients.",
    prices: { USD: 19, NGN: 15000 },
    freeTrial: true,
    highlights: [
      "1 admin account",
      `Up to ${formatLimit(PLAN_LIMITS.essentials.clients)} clients`,
      "Appointments & visit history",
      "Payment logging",
      "Dashboard overview",
    ],
    cta: { label: `Start ${FREE_TRIAL_DAYS}-day free trial`, href: "/login" },
  },
  {
    id: "manager",
    name: PLAN_NAMES.manager,
    audience: "Small stores, one office",
    description:
      "For a single-location spa with a small team that needs scheduling and revenue insight.",
    prices: { USD: 49, NGN: 35000 },
    mostPopular: true,
    highlights: [
      `${PLAN_LIMITS.manager.admins} admin accounts`,
      `Up to ${formatLimit(PLAN_LIMITS.manager.clients)} clients`,
      "Staff directory & schedules",
      "Revenue analytics",
      "Expense tracking",
    ],
    cta: { label: "Get started", href: "/login" },
  },
  {
    id: "executive",
    name: PLAN_NAMES.executive,
    audience: "Established single-office stores",
    description:
      "For busy single-location spas with a larger team and full financial reporting.",
    prices: { USD: 99, NGN: 75000 },
    highlights: [
      "Unlimited admin accounts",
      `Up to ${formatLimit(PLAN_LIMITS.executive.clients)} clients`,
      "Staff performance leaderboard",
      "Profit & Loss reports",
      "Email confirmations",
    ],
    cta: { label: "Get started", href: "/login" },
  },
  {
    id: "enterprise",
    name: PLAN_NAMES.enterprise,
    audience: "Stores with multiple locations",
    description:
      "For spa groups and chains operating across multiple branches.",
    prices: null,
    highlights: [
      "Unlimited admin accounts",
      "Unlimited clients",
      "Multi-location management",
      "Consolidated cross-branch reporting",
      "Guided onboarding & data migration",
    ],
    cta: { label: "Contact sales", href: "/contact-sales?plan=enterprise" },
  },
]

// ---------------------------------------------------------------------------
// Feature comparison table
// `true` / `false` render as check / dash; strings render verbatim.
// ---------------------------------------------------------------------------

export type FeatureValue = boolean | string

export interface FeatureRow {
  label: string
  values: Record<TierId, FeatureValue>
}

export interface FeatureGroup {
  title: string
  rows: FeatureRow[]
}

function byTier(fn: (tier: TierId) => FeatureValue): Record<TierId, FeatureValue> {
  return {
    essentials: fn("essentials"),
    manager: fn("manager"),
    executive: fn("executive"),
    enterprise: fn("enterprise"),
  }
}

function featureRow(feature: Feature): FeatureRow {
  return { label: FEATURE_LABELS[feature], values: byTier((tier) => hasFeature(tier, feature)) }
}

function sameForAll(label: string, value: FeatureValue): FeatureRow {
  return { label, values: byTier(() => value) }
}

export const featureGroups: FeatureGroup[] = [
  {
    title: "Capacity",
    rows: [
      {
        label: "Locations",
        values: byTier((tier) =>
          PLAN_LIMITS[tier].locations === null ? "Multiple" : formatLimit(PLAN_LIMITS[tier].locations)
        ),
      },
      { label: "Admin accounts", values: byTier((tier) => formatLimit(PLAN_LIMITS[tier].admins)) },
      { label: "Client directory", values: byTier((tier) => formatLimit(PLAN_LIMITS[tier].clients)) },
    ],
  },
  {
    title: "Clients & appointments",
    rows: [
      sameForAll("Client profiles & visit history", true),
      sameForAll("Appointment tracking", true),
      featureRow("emailConfirmations"),
    ],
  },
  {
    title: "Staff",
    rows: [featureRow("staffManagement"), featureRow("performanceLeaderboard")],
  },
  {
    title: "Payments & finance",
    rows: [
      sameForAll("Payment logging", true),
      {
        label: FEATURE_LABELS.revenueAnalytics,
        values: byTier((tier) => (hasFeature(tier, "revenueAnalytics") ? true : "Basic")),
      },
      featureRow("expenseTracking"),
      featureRow("profitAndLoss"),
      featureRow("consolidatedReporting"),
    ],
  },
  {
    title: "Service",
    rows: [
      sameForAll("Customer support", "Standard"),
      featureRow("guidedOnboarding"),
      {
        label: `${FREE_TRIAL_DAYS}-day free trial`,
        values: byTier((tier) => !!pricingTiers.find((t) => t.id === tier)?.freeTrial),
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Add-ons (future modules, billed on top of any plan)
// ---------------------------------------------------------------------------

export interface AddOn {
  id: string
  name: string
  description: string
  /** Monthly price per currency. `null` means contact sales. */
  prices: PriceList | null
  enterpriseOnly?: boolean
}

export const addOns: AddOn[] = [
  {
    id: "whatsapp",
    name: "WhatsApp notifications",
    description: "Booking confirmations and reminders sent straight to clients on WhatsApp.",
    prices: { USD: 10, NGN: 15000 },
  },
  {
    id: "online-booking",
    name: "Online booking page",
    description: "A client-facing page where customers book their own appointments.",
    prices: { USD: 19, NGN: 25000 },
  },
  {
    id: "paystack",
    name: "Paystack integration",
    description: "Accept card and transfer payments online and reconcile them automatically.",
    prices: { USD: 12, NGN: 20000 },
  },
  {
    id: "smart-scheduling",
    name: "Smart auto-scheduling",
    description: "Automatically match bookings to available therapists and fill gaps.",
    prices: { USD: 12, NGN: 18000 },
  },
  {
    id: "loyalty",
    name: "Loyalty & discounts",
    description: "Reward repeat clients with points, promo codes, and package deals.",
    prices: { USD: 8, NGN: 12000 },
  },
  {
    id: "pdf-reports",
    name: "PDF financial reports",
    description: "Export polished, shareable PDF reports of revenue, expenses, and P&L.",
    prices: { USD: 6, NGN: 10000 },
  },
  {
    id: "multi-location",
    name: "Multi-location support",
    description: "Run several branches from one account with per-location reporting.",
    prices: null,
    enterpriseOnly: true,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

/** Effective per-month price for the given billing cycle. */
export function getMonthlyEquivalent(monthlyPrice: number, cycle: BillingCycle): number {
  if (cycle === "monthly") return monthlyPrice
  // Keep cents for USD so small prices don't lose the discount to rounding
  return Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT) * 100) / 100
}

/** Total charged once per year on annual billing. */
export function getAnnualTotal(monthlyPrice: number): number {
  return Math.round(getMonthlyEquivalent(monthlyPrice, "annual") * 12 * 100) / 100
}
