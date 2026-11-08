import { CalendarCheck, DollarSign, Receipt, Repeat, Star, UserX } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { SummaryCard } from "@/components/shared/summary-card"
import { MonthlyRevenueChart } from "@/components/charts/monthly-revenue-chart"
import { ServiceDistributionChart } from "@/components/charts/service-distribution-chart"
import { FeatureGate } from "@/components/plan/feature-gate"
import { formatCurrency } from "@/lib/utils"
import { getPageContext } from "@/server/context"
import { getAnalyticsOverview } from "@/server/services/analytics"

export default async function AnalyticsPage() {
  const data = await getAnalyticsOverview(await getPageContext())

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics Overview" description={`Key numbers for your spa, ${data.rangeLabel.toLowerCase()}`} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Revenue" value={formatCurrency(data.revenue)} icon={DollarSign} description="completed payments" />
        <SummaryCard title="Sessions" value={data.sessions.toLocaleString("en-US")} icon={CalendarCheck} description="completed" />
        <SummaryCard title="Average Ticket" value={formatCurrency(data.averageTicket)} icon={Receipt} description="per session" />
        <SummaryCard
          title="Satisfaction"
          value={data.averageRating !== null ? `${data.averageRating} / 5` : "No ratings"}
          icon={Star}
          description="average rating"
        />
        <SummaryCard
          title="Repeat Clients"
          value={data.repeatRate !== null ? `${data.repeatRate}%` : "N/A"}
          icon={Repeat}
          description="came back at least once"
        />
        <SummaryCard
          title="No-show Rate"
          value={data.noShowRate !== null ? `${data.noShowRate}%` : "N/A"}
          icon={UserX}
          changeType={data.noShowRate !== null && data.noShowRate > 5 ? "negative" : "neutral"}
          description="of past bookings"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyRevenueChart data={data.monthly} />
        {data.byService ? (
          <ServiceDistributionChart data={data.byService} />
        ) : (
          <FeatureGate feature="revenueAnalytics">{null}</FeatureGate>
        )}
      </div>
    </div>
  )
}
