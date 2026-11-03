import { SummaryCard } from "@/components/shared/summary-card"
import { formatCurrency } from "@/lib/utils"
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Star,
  XCircle,
} from "lucide-react"

interface StaffStatsProps {
  stats: {
    revenue: number
    sessions: number
    averagePerSession: number
    rating: number | null
    cancelRate: number
  }
}

export function StaffStats({ stats }: StaffStatsProps) {
  const totalRevenue = stats.revenue
  const sessionsCompleted = stats.sessions
  const avgPerSession = stats.averagePerSession
  const satisfactionScore = stats.rating ?? 0
  const cancellationRate = stats.cancelRate

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <SummaryCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        icon={DollarSign}
      />
      <SummaryCard
        title="Sessions Completed"
        value={sessionsCompleted.toString()}
        icon={Calendar}
      />
      <SummaryCard
        title="Avg per Session"
        value={formatCurrency(avgPerSession)}
        icon={TrendingUp}
      />
      <SummaryCard
        title="Satisfaction Score"
        value={satisfactionScore > 0 ? `${satisfactionScore} / 5` : "N/A"}
        icon={Star}
      />
      <SummaryCard
        title="Cancellation Rate"
        value={`${cancellationRate}%`}
        changeType={cancellationRate > 15 ? "negative" : "positive"}
        icon={XCircle}
      />
    </div>
  )
}
