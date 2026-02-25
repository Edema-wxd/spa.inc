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

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
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
      { label: "Staff", href: "/dashboard/staff", icon: UserCog },
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
      },
      {
        label: "Performance",
        href: "/dashboard/analytics/performance",
        icon: Trophy,
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Expenses", href: "/dashboard/finances", icon: Receipt },
      {
        label: "Profit & Loss",
        href: "/dashboard/finances/pnl",
        icon: PieChart,
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
