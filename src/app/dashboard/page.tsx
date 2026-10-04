"use client"

import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Receipt,
} from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import { RevenueExpensesChart } from "@/components/charts/revenue-expenses-chart"
import { TopEarnersChart } from "@/components/charts/top-earners-chart"
import { WeeklyVisitsChart } from "@/components/charts/weekly-visits-chart"
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments"
import { FeatureGate } from "@/components/plan/feature-gate"
import {
  getTodaysRevenue,
  getMonthlyRevenue,
  getActiveClientCount,
  getTodaysAppointments,
  getDailyCosts,
} from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

const todaysRevenue = getTodaysRevenue()
const monthlyRevenue = getMonthlyRevenue()
const activeClients = getActiveClientCount()
const todaysAppointments = getTodaysAppointments()
const dailyCosts = getDailyCosts()

export default function DashboardPage() {
  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          title="Today's Revenue"
          value={formatCurrency(todaysRevenue)}
          change={todaysRevenue ? "+12.5%" : undefined}
          changeType="positive"
          icon={DollarSign}
          description="vs last week"
        />
        <SummaryCard
          title="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          change={monthlyRevenue ? "+8.2%" : undefined}
          changeType="positive"
          icon={TrendingUp}
          description="vs last month"
        />
        <SummaryCard
          title="Active Clients"
          value={activeClients.toString()}
          icon={Users}
          description="total registered"
        />
        <SummaryCard
          title="Appointments Today"
          value={todaysAppointments.length.toString()}
          icon={Calendar}
          description="scheduled"
        />
        <SummaryCard
          title="Daily Costs"
          value={formatCurrency(dailyCosts)}
          change={dailyCosts ? "-3.1%" : undefined}
          changeType="positive"
          icon={Receipt}
          description="vs last week"
        />
      </div>

      {/* Charts Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueExpensesChart />
        <FeatureGate feature="staffManagement">
          <TopEarnersChart />
        </FeatureGate>
        <WeeklyVisitsChart />
        <UpcomingAppointments />
      </div>
    </div>
  )
}
