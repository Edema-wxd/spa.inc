import { SummaryCard } from "@/components/shared/summary-card"
import { appointments, payments } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Star,
  XCircle,
} from "lucide-react"

interface StaffStatsProps {
  staffId: string
}

export function StaffStats({ staffId }: StaffStatsProps) {
  const staffAppointments = appointments.filter((a) => a.staff_id === staffId)
  const completedAppointments = staffAppointments.filter(
    (a) => a.status === "COMPLETED"
  )
  const cancelledAppointments = staffAppointments.filter(
    (a) => a.status === "CANCELLED"
  )

  const staffPayments = payments.filter(
    (p) => p.staff_id === staffId && p.status === "COMPLETED"
  )
  const totalRevenue = staffPayments.reduce((sum, p) => sum + p.amount, 0)

  const sessionsCompleted = completedAppointments.length
  const avgPerSession =
    sessionsCompleted > 0 ? Math.round(totalRevenue / sessionsCompleted) : 0

  const ratedAppointments = completedAppointments.filter(
    (a) => a.satisfaction_rating !== null
  )
  const satisfactionScore =
    ratedAppointments.length > 0
      ? Math.round(
          (ratedAppointments.reduce(
            (sum, a) => sum + (a.satisfaction_rating as number),
            0
          ) /
            ratedAppointments.length) *
            10
        ) / 10
      : 0

  const cancellationRate =
    staffAppointments.length > 0
      ? Math.round(
          (cancelledAppointments.length / staffAppointments.length) * 100
        )
      : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
