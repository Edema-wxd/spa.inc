import { CalendarCheck, DollarSign, Gauge, TrendingUp, Users } from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import { RevenueExpensesChart } from "@/components/charts/revenue-expenses-chart"
import { TopEarnersChart } from "@/components/charts/top-earners-chart"
import { WeeklyVisitsChart } from "@/components/charts/weekly-visits-chart"
import { UpcomingAppointments } from "@/components/dashboard/upcoming-appointments"
import { FeatureGate } from "@/components/plan/feature-gate"
import { formatCurrency, formatPercentChange } from "@/lib/utils"
import { getPageContext } from "@/server/context"
import { getDashboardOverview } from "@/server/services/dashboard"
import { getOnboarding } from "@/server/services/onboarding"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const ctx = await getPageContext()
  const [data, onboarding] = await Promise.all([getDashboardOverview(ctx), getOnboarding(ctx)])
  const { today, month, clients } = data

  return (
    <div>
      {!onboarding.complete && !onboarding.dismissed && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-spa-200 bg-spa-50 p-4">
          <div>
            <p className="font-semibold">Finish setting up {onboarding.business.name}</p>
            <p className="text-sm text-muted-foreground">
              {onboarding.done} of {onboarding.total} done. Add your treatments and hours, then share your booking link.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/welcome">Continue setup</Link>
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          title="Today's Revenue"
          value={formatCurrency(today.collected)}
          icon={DollarSign}
          description={today.stillBooked > 0 ? `+${formatCurrency(today.stillBooked)} still booked` : "collected today"}
        />
        <SummaryCard
          title="Month to Date"
          value={formatCurrency(month.revenue)}
          icon={TrendingUp}
          change={month.change !== null ? formatPercentChange(month.change) : undefined}
          changeType={month.change === null ? "neutral" : month.change >= 0 ? "positive" : "negative"}
          description={month.change !== null ? "vs same weekdays 4 weeks ago" : "first day of the month"}
        />
        <SummaryCard
          title="Active Clients"
          value={clients.active.toLocaleString("en-US")}
          icon={Users}
          description={`visited in 90 days, ${clients.newThisMonth} new this month`}
        />
        <SummaryCard
          title="Appointments Today"
          value={today.appointments.toString()}
          icon={CalendarCheck}
          description={[
            `${today.completed} done`,
            today.inProgress > 0 ? `${today.inProgress} in progress` : null,
            `${today.remaining} to go`,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        <SummaryCard
          title="Booked Today"
          value={today.utilization !== null ? `${today.utilization}%` : "Closed"}
          icon={Gauge}
          description={today.utilization !== null ? "of therapist hours" : "no shifts today"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueExpensesChart data={data.runningTotals} />
        {data.topEarners ? (
          <TopEarnersChart data={data.topEarners} />
        ) : (
          <FeatureGate feature="revenueAnalytics">{null}</FeatureGate>
        )}
        <WeeklyVisitsChart data={data.weekVisits} />
        <UpcomingAppointments appointments={data.upcoming} timezone={data.timezone} />
      </div>
    </div>
  )
}
