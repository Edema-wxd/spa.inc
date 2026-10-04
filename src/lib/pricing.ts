// ---------------------------------------------------------------------------
// Pricing configuration
//
// Single source of truth for the /pricing and /contact-sales pages.
// All prices are whole Naira (NGN) per month. Edit values here; the UI
// derives annual prices, badges, and the comparison table from this file.
// ---------------------------------------------------------------------------

export type TierId = "essentials" | "manager" | "executive" | "enterprise"

export type BillingCycle = "monthly" | "annual"

export const ANNUAL_DISCOUNT = 0.1 // 10% off when billed annually

export const FREE_TRIAL_DAYS = 14

export interface PricingTier {
  id: TierId
  name: string
  audience: string
  description: string
  /** Monthly price in Naira. `null` means custom quote (contact sales). */
  monthlyPrice: number | null
  mostPopular?: boolean
  freeTrial?: boolean
  highlights: string[]
  cta: { label: string; href: string }
}

export const pricingTiers: PricingTier[] = [
  {
    id: "essentials",
    name: "Essentials",
    audience: "Single users",
    description:
      "For independent therapists and solo practitioners running their own book of clients.",
    monthlyPrice: 15000,
    freeTrial: true,
    highlights: [
      "1 admin account",
      "Up to 50 clients",
      "Appointments & visit history",
      "Payment logging",
      "Dashboard overview",
    ],
    cta: { label: `Start ${FREE_TRIAL_DAYS}-day free trial`, href: "/login" },
  },
  {
    id: "manager",
    name: "Manager",
    audience: "Small stores, one office",
    description:
      "For a single-location spa with a small team that needs scheduling and revenue insight.",
    monthlyPrice: 35000,
    mostPopular: true,
    highlights: [
      "3 admin accounts",
      "Up to 200 clients",
      "Staff directory & schedules",
      "Revenue analytics",
      "Expense tracking",
    ],
    cta: { label: "Get started", href: "/login" },
  },
  {
    id: "executive",
    name: "Executive",
    audience: "Established single-office stores",
    description:
      "For busy single-location spas with a larger team and full financial reporting.",
    monthlyPrice: 75000,
    highlights: [
      "Unlimited admin accounts",
      "Up to 500 clients",
      "Staff performance leaderboard",
      "Profit & Loss reports",
      "Email confirmations",
    ],
    cta: { label: "Get started", href: "/login" },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    audience: "Stores with multiple locations",
    description:
      "For spa groups and chains operating across multiple branches.",
    monthlyPrice: null,
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

export const featureGroups: FeatureGroup[] = [
  {
    title: "Capacity",
    rows: [
      {
        label: "Locations",
        values: { essentials: "1", manager: "1", executive: "1", enterprise: "Multiple" },
      },
      {
        label: "Admin accounts",
        values: { essentials: "1", manager: "3", executive: "Unlimited", enterprise: "Unlimited" },
      },
      {
        label: "Client directory",
        values: { essentials: "50", manager: "200", executive: "500", enterprise: "Unlimited" },
      },
    ],
  },
  {
    title: "Clients & appointments",
    rows: [
      {
        label: "Client profiles & visit history",
        values: { essentials: true, manager: true, executive: true, enterprise: true },
      },
      {
        label: "Appointment tracking",
        values: { essentials: true, manager: true, executive: true, enterprise: true },
      },
      {
        label: "Email confirmations",
        values: { essentials: false, manager: false, executive: true, enterprise: true },
      },
    ],
  },
  {
    title: "Staff",
    rows: [
      {
        label: "Staff directory & schedules",
        values: { essentials: false, manager: true, executive: true, enterprise: true },
      },
      {
        label: "Performance leaderboard",
        values: { essentials: false, manager: false, executive: true, enterprise: true },
      },
    ],
  },
  {
    title: "Payments & finance",
    rows: [
      {
        label: "Payment logging",
        values: { essentials: true, manager: true, executive: true, enterprise: true },
      },
      {
        label: "Revenue analytics",
        values: { essentials: "Basic", manager: true, executive: true, enterprise: true },
      },
      {
        label: "Expense tracking",
        values: { essentials: false, manager: true, executive: true, enterprise: true },
      },
      {
        label: "Profit & Loss reports",
        values: { essentials: false, manager: false, executive: true, enterprise: true },
      },
      {
        label: "Consolidated multi-branch reporting",
        values: { essentials: false, manager: false, executive: false, enterprise: true },
      },
    ],
  },
  {
    title: "Service",
    rows: [
      {
        label: "Customer support",
        values: { essentials: "Standard", manager: "Standard", executive: "Standard", enterprise: "Standard" },
      },
      {
        label: "Guided onboarding & data migration",
        values: { essentials: false, manager: false, executive: false, enterprise: true },
      },
      {
        label: `${FREE_TRIAL_DAYS}-day free trial`,
        values: { essentials: true, manager: false, executive: false, enterprise: false },
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
  /** Monthly price in Naira. `null` means contact sales. */
  monthlyPrice: number | null
  enterpriseOnly?: boolean
}

export const addOns: AddOn[] = [
  {
    id: "whatsapp",
    name: "WhatsApp notifications",
    description: "Booking confirmations and reminders sent straight to clients on WhatsApp.",
    monthlyPrice: 15000,
  },
  {
    id: "online-booking",
    name: "Online booking page",
    description: "A client-facing page where customers book their own appointments.",
    monthlyPrice: 25000,
  },
  {
    id: "paystack",
    name: "Paystack integration",
    description: "Accept card and transfer payments online and reconcile them automatically.",
    monthlyPrice: 20000,
  },
  {
    id: "smart-scheduling",
    name: "Smart auto-scheduling",
    description: "Automatically match bookings to available therapists and fill gaps.",
    monthlyPrice: 18000,
  },
  {
    id: "loyalty",
    name: "Loyalty & discounts",
    description: "Reward repeat clients with points, promo codes, and package deals.",
    monthlyPrice: 12000,
  },
  {
    id: "pdf-reports",
    name: "PDF financial reports",
    description: "Export polished, shareable PDF reports of revenue, expenses, and P&L.",
    monthlyPrice: 10000,
  },
  {
    id: "multi-location",
    name: "Multi-location support",
    description: "Run several branches from one account with per-location reporting.",
    monthlyPrice: null,
    enterpriseOnly: true,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Effective per-month price for the given billing cycle. */
export function getMonthlyEquivalent(monthlyPrice: number, cycle: BillingCycle): number {
  return cycle === "annual"
    ? Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT))
    : monthlyPrice
}

/** Total charged once per year on annual billing. */
export function getAnnualTotal(monthlyPrice: number): number {
  return getMonthlyEquivalent(monthlyPrice, "annual") * 12
}
