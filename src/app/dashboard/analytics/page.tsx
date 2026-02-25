"use client"

import {
  DollarSign,
  TrendingUp,
  Calendar,
  Star,
  Sparkles,
  Users,
} from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import { MonthlyRevenueChart } from "@/components/charts/monthly-revenue-chart"
import { ServiceDistributionChart } from "@/components/charts/service-distribution-chart"
import {
  getMonthlyRevenueTrend,
  getRevenueByService,
  getStaffLeaderboard,
} from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"
import { payments, appointments, clients } from "@/lib/mock-data"

// Calculate summary metrics
const allRevenue = payments
  .filter((p) => p.status === "COMPLETED")
  .reduce((sum, p) => sum + p.amount, 0)

const completedPayments = payments.filter((p) => p.status === "COMPLETED")
const daysWithPayments = new Set(
  completedPayments.map((p) => p.payment_date.split("T")[0])
)
const avgRevenuePerDay =
  daysWithPayments.size > 0 ? Math.round(allRevenue / daysWithPayments.size) : 0

const totalSessions = appointments.filter(
  (a) => a.status === "COMPLETED"
).length

const leaderboard = getStaffLeaderboard()
const avgSatisfaction =
  leaderboard.length > 0
    ? (
        leaderboard.reduce((sum, s) => sum + s.averageRating, 0) /
        leaderboard.length
      ).toFixed(1)
    : "0"

const serviceData = getRevenueByService()
const topService = serviceData.length > 0 ? serviceData[0].name : "N/A"

const uniqueClients = new Set(
  appointments
    .filter((a) => a.status === "COMPLETED")
    .map((a) => a.client_id)
)
const repeatClients = Array.from(uniqueClients).filter((clientId) => {
  const clientAppts = appointments.filter(
    (a) => a.client_id === clientId && a.status === "COMPLETED"
  )
  return clientAppts.length > 1
})
const repeatRate =
  uniqueClients.size > 0
    ? ((repeatClients.length / uniqueClients.size) * 100).toFixed(0)
    : "0"

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics Overview</h1>
        <p className="text-muted-foreground">
          Key metrics and insights for your spa business
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title="Total Revenue"
          value={formatCurrency(allRevenue)}
          icon={DollarSign}
          description="all time"
        />
        <SummaryCard
          title="Avg Revenue/Day"
          value={formatCurrency(avgRevenuePerDay)}
          icon={TrendingUp}
          description="per active day"
        />
        <SummaryCard
          title="Total Sessions"
          value={totalSessions.toString()}
          icon={Calendar}
          description="completed"
        />
        <SummaryCard
          title="Avg Satisfaction"
          value={avgSatisfaction}
          icon={Star}
          description="out of 5"
        />
        <SummaryCard
          title="Top Service"
          value={topService}
          icon={Sparkles}
          description="by revenue"
        />
        <SummaryCard
          title="Repeat Client Rate"
          value={`${repeatRate}%`}
          icon={Users}
          description="returning clients"
        />
      </div>

      {/* Charts Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyRevenueChart />
        <ServiceDistributionChart />
      </div>
    </div>
  )
}
