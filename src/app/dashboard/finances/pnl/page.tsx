import { DollarSign, TrendingDown, TrendingUp, Percent } from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import { PnLChart } from "@/components/charts/pnl-chart"
import { DailyPnLChart } from "@/components/charts/daily-pnl-chart"
import { ExpenseBreakdown } from "@/components/finances/expense-breakdown"
import { getPnLData } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

function getPnLMetrics() {
  const data = getPnLData(6)

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin =
    totalRevenue > 0
      ? ((netProfit / totalRevenue) * 100).toFixed(1)
      : "0.0"

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
  }
}

export default function PnLPage() {
  const metrics = getPnLMetrics()
  const isProfit = metrics.netProfit >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profit & Loss</h1>
        <p className="mt-1 text-muted-foreground">
          Financial overview across all revenue and expenses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          icon={DollarSign}
          description="Last 6 months"
        />
        <SummaryCard
          title="Total Expenses"
          value={formatCurrency(metrics.totalExpenses)}
          icon={TrendingDown}
          description="Last 6 months"
        />
        <SummaryCard
          title={isProfit ? "Net Profit" : "Net Loss"}
          value={formatCurrency(Math.abs(metrics.netProfit))}
          icon={TrendingUp}
          change={isProfit ? "Profitable" : "Loss"}
          changeType={isProfit ? "positive" : "negative"}
        />
        <SummaryCard
          title="Profit Margin"
          value={`${metrics.profitMargin}%`}
          icon={Percent}
          change={isProfit ? "Healthy" : "Needs attention"}
          changeType={isProfit ? "positive" : "negative"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PnLChart />
        <DailyPnLChart />
      </div>

      {/* Expense Breakdown */}
      <ExpenseBreakdown />
    </div>
  )
}
