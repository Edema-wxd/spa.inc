import { CalendarDays, DollarSign, Sparkles, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { RangeTabs } from "@/components/shared/range-tabs"
import { SummaryCard } from "@/components/shared/summary-card"
import { RevenueByServiceChart } from "@/components/charts/revenue-by-service-chart"
import { RevenueByStaffChart } from "@/components/charts/revenue-by-staff-chart"
import { RevenueByMethodChart } from "@/components/charts/revenue-by-method-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { hasFeature } from "@/lib/plans"
import { isRangePreset } from "@/lib/ranges"
import { formatDateKey } from "@/lib/time"
import { formatCurrency } from "@/lib/utils"
import { getPageContext } from "@/server/context"
import { getRevenueBreakdownForPreset } from "@/server/services/analytics"

export default async function RevenueAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const preset = isRangePreset(rangeParam) ? rangeParam : "30d"
  const ctx = await getPageContext()
  // The segment layout shows the upgrade prompt on lower plans
  if (!hasFeature(ctx.plan, "revenueAnalytics")) return null
  const data = await getRevenueBreakdownForPreset(ctx, preset)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Analytics"
        description="Where your revenue comes from: services, therapists and payment methods"
      >
        <RangeTabs basePath="/dashboard/analytics/revenue" active={preset} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={formatCurrency(data.total)}
          icon={DollarSign}
          description={data.range.label.toLowerCase()}
        />
        <SummaryCard
          title="Avg Transaction"
          value={formatCurrency(data.averageTransaction)}
          icon={TrendingUp}
          description={`${data.count.toLocaleString("en-US")} payments`}
        />
        <SummaryCard
          title="Best Day"
          value={data.bestDay ? formatCurrency(data.bestDay.revenue) : formatCurrency(0)}
          icon={CalendarDays}
          description={
            data.bestDay ? formatDateKey(data.bestDay.date, { weekday: "short", month: "short", day: "numeric" }) : "no payments yet"
          }
        />
        <SummaryCard title="Top Service" value={data.topService ?? "N/A"} icon={Sparkles} description="by revenue" />
      </div>

      <Tabs defaultValue="by-service">
        <TabsList>
          <TabsTrigger value="by-service">By Service</TabsTrigger>
          <TabsTrigger value="by-staff">By Staff</TabsTrigger>
          <TabsTrigger value="by-method">By Payment Method</TabsTrigger>
        </TabsList>
        <TabsContent value="by-service" className="mt-4">
          <RevenueByServiceChart data={data.byService} />
        </TabsContent>
        <TabsContent value="by-staff" className="mt-4">
          <RevenueByStaffChart data={data.byStaff} />
        </TabsContent>
        <TabsContent value="by-method" className="mt-4">
          <RevenueByMethodChart data={data.byMethod} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
