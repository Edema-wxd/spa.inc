import { CalendarDays, DollarSign, TrendingUp, Star, UserPlus, UserX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ClientStatsProps {
  memberSince: string
  stats: {
    visits: number
    spent: number
    averagePerVisit: number
    averageRating: number | null
    noShows: number
  }
}

export function ClientStats({ memberSince, stats }: ClientStatsProps) {
  const rows = [
    { label: "Completed Visits", value: stats.visits.toString(), icon: CalendarDays },
    { label: "Total Spent", value: formatCurrency(stats.spent), icon: DollarSign },
    { label: "Average per Visit", value: formatCurrency(stats.averagePerVisit), icon: TrendingUp },
    {
      label: "Avg. Satisfaction",
      value: stats.averageRating !== null ? `${stats.averageRating} / 5` : "No ratings",
      icon: Star,
    },
    { label: "No-shows", value: stats.noShows.toString(), icon: UserX },
    { label: "Client Since", value: formatDate(memberSince), icon: UserPlus },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
      {rows.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="truncate text-sm font-semibold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
