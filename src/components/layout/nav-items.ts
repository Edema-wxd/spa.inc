import {
  LayoutDashboard,
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
