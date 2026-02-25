"use client"

import {
  DollarSign,
  TrendingUp,
  CalendarDays,
  Sparkles,
} from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import { RevenueByServiceChart } from "@/components/charts/revenue-by-service-chart"
import { RevenueByStaffChart } from "@/components/charts/revenue-by-staff-chart"
import { RevenueByMethodChart } from "@/components/charts/revenue-by-method-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { payments } from "@/lib/mock-data"
import { getRevenueByService } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

// Calculate revenue metrics
const completedPayments = payments.filter((p) => p.status === "COMPLETED")
const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0)
const avgTransaction =
  completedPayments.length > 0
    ? Math.round(totalRevenue / completedPayments.length)
    : 0

// Find highest revenue day
const dailyRevenue: Record<string, number> = {}
completedPayments.forEach((p) => {
  const day = p.payment_date.split("T")[0]
  dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount
})
const highestDay = Object.entries(dailyRevenue).sort(
  (a, b) => b[1] - a[1]
)[0]
const highestDayRevenue = highestDay ? highestDay[1] : 0

// Most popular service
const serviceData = getRevenueByService()
const topService = serviceData.length > 0 ? serviceData[0].name : "N/A"

export default function RevenueAnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Revenue Analytics</h1>
        <p className="text-muted-foreground">
          Detailed breakdown of revenue across services, staff, and payment
          methods
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          description="all completed payments"
        />
        <SummaryCard
          title="Avg Transaction"
          value={formatCurrency(avgTransaction)}
          icon={TrendingUp}
          description="per payment"
        />
        <SummaryCard
          title="Highest Day"
          value={formatCurrency(highestDayRevenue)}
          icon={CalendarDays}
          description="peak daily revenue"
        />
        <SummaryCard
          title="Top Service"
          value={topService}
          icon={Sparkles}
          description="by revenue"
        />
      </div>

      {/* Revenue Breakdown Tabs */}
      <div className="mt-6">
        <Tabs defaultValue="by-service">
          <TabsList>
            <TabsTrigger value="by-service">By Service</TabsTrigger>
            <TabsTrigger value="by-staff">By Staff</TabsTrigger>
            <TabsTrigger value="by-method">By Payment Method</TabsTrigger>
          </TabsList>
          <TabsContent value="by-service" className="mt-4">
            <RevenueByServiceChart />
          </TabsContent>
          <TabsContent value="by-staff" className="mt-4">
            <RevenueByStaffChart />
          </TabsContent>
          <TabsContent value="by-method" className="mt-4">
            <RevenueByMethodChart />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
