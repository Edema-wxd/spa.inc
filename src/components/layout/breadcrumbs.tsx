"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  staff: "Staff",
  payments: "Payments",
  analytics: "Analytics",
  revenue: "Revenue",
  performance: "Performance",
  finances: "Finances",
  pnl: "Profit & Loss",
  settings: "Settings",
  new: "New",
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getSegmentLabel(segment: string): string {
  if (UUID_REGEX.test(segment)) return "Detail"
  return segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // Do not render breadcrumbs on the dashboard root
  if (segments.length <= 1) return null

  // Build breadcrumb items starting after "dashboard"
  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const label = getSegmentLabel(segment)
    const isLast = index === segments.length - 1

    return { href, label, isLast, segment }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home crumb */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">
              <Home className="size-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Dynamic crumbs - skip "dashboard" since it is the Home icon */}
        {crumbs.slice(1).map((crumb) => (
          <span key={crumb.href} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
