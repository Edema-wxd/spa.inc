import { DollarSign, Percent, TrendingDown, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { SummaryCard } from "@/components/shared/summary-card"
import { PnLChart } from "@/components/charts/pnl-chart"
import { DailyPnLChart } from "@/components/charts/daily-pnl-chart"
import { ExpenseBreakdown } from "@/components/finances/expense-breakdown"
import { hasFeature } from "@/lib/plans"
import { formatCurrency } from "@/lib/utils"
import { getRequestContext } from "@/server/context"
import { getExpenseCategories, getProfitAndLoss, getRunningProfit } from "@/server/services/analytics"

const FULL_MONTHS = 6

export default async function PnLPage() {
  const ctx = await getRequestContext()
  // The segment layout shows the upgrade prompt on lower plans
  if (!hasFeature(ctx.plan, "profitAndLoss")) return null

  const [months, running, categories] = await Promise.all([
    // Six complete months plus the current month to date
    getProfitAndLoss(ctx, FULL_MONTHS + 1),
    getRunningProfit(ctx, 30),
    getExpenseCategories(ctx, FULL_MONTHS),
  ])

  const complete = months.filter((m) => !m.partial)
  const revenue = complete.reduce((sum, m) => sum + m.revenue, 0)
  const expenses = complete.reduce((sum, m) => sum + m.expenses, 0)
  const profit = revenue - expenses
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0
  const isProfit = profit >= 0
  const period = `Last ${complete.length} full months`

  return (
    <div className="space-y-6">
      <PageHeader title="Profit & Loss" description="Revenue minus expenses, by month and over the last 30 days" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SummaryCard title="Revenue" value={formatCurrency(revenue)} icon={DollarSign} description={period} />
        <SummaryCard title="Expenses" value={formatCurrency(expenses)} icon={TrendingDown} description={period} />
        <SummaryCard
          title={isProfit ? "Net Profit" : "Net Loss"}
          value={formatCurrency(Math.abs(profit))}
          icon={TrendingUp}
          change={isProfit ? "Profitable" : "Loss"}
          changeType={isProfit ? "positive" : "negative"}
          description={period}
        />
        <SummaryCard
          title="Profit Margin"
          value={`${margin.toFixed(1)}%`}
          icon={Percent}
          changeType={isProfit ? "positive" : "negative"}
          description={period}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PnLChart data={months} />
        <DailyPnLChart data={running} />
      </div>

      <ExpenseBreakdown data={categories} />
    </div>
  )
}
