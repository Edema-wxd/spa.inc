import {
  CalendarDays,
  Globe,
  LayoutDashboard,
  Sparkles,
  Users,
  UserCog,
  CreditCard,
  BarChart3,
  TrendingUp,
  Trophy,
  Receipt,
  PieChart,
  Settings,
  type LucideIcon,
} from "lucide-react"
import type { Feature } from "@/lib/plans"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Plan feature required to use the page; shown with a lock when missing */
  feature?: Feature
}

export interface NavSection {
  title: string
  items: NavItem[]
}

/** Pages staff (therapists) can open; the rest are for admins. Mirrors STAFF_PATHS in server/context.ts. */
export const STAFF_NAV = ["/dashboard/calendar"]

/** The sidebar for a role: staff get their calendar only. */
export function navFor(role: "ADMIN" | "STAFF"): NavSection[] {
  if (role === "ADMIN") return navSections
  return navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => STAFF_NAV.includes(item.href)) }))
    .filter((section) => section.items.length > 0)
}

export const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
      { label: "Online Booking", href: "/dashboard/online-booking", icon: Globe },
      { label: "Services", href: "/dashboard/services", icon: Sparkles },
      { label: "Clients", href: "/dashboard/clients", icon: Users },
      { label: "Staff", href: "/dashboard/staff", icon: UserCog, feature: "staffManagement" },
      { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { label: "Overview", href: "/dashboard/analytics", icon: BarChart3 },
      {
        label: "Revenue",
        href: "/dashboard/analytics/revenue",
        icon: TrendingUp,
        feature: "revenueAnalytics",
      },
      {
        label: "Performance",
        href: "/dashboard/analytics/performance",
        icon: Trophy,
        feature: "performanceLeaderboard",
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Expenses", href: "/dashboard/finances", icon: Receipt, feature: "expenseTracking" },
      {
        label: "Profit & Loss",
        href: "/dashboard/finances/pnl",
        icon: PieChart,
        feature: "profitAndLoss",
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
]
