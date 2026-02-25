import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

const colorMap: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  ACTIVE: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  SCHEDULED: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  PENDING: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  CANCELLED: "bg-red-100 text-red-700 hover:bg-red-100",
  REFUNDED: "bg-red-100 text-red-700 hover:bg-red-100",
  NO_SHOW: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  IN_SPA: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  REMOTE: "bg-purple-100 text-purple-700 hover:bg-purple-100",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = colorMap[status] || "bg-gray-100 text-gray-600 hover:bg-gray-100"
  const label = status.replace(/_/g, " ")

  return (
    <Badge
      variant="secondary"
      className={cn(colors, "font-medium", className)}
    >
      {label}
    </Badge>
  )
}
