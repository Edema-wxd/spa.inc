import { FolderOpen, Receipt, RefreshCw, TrendingDown } from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import { ExpensesView } from "@/components/finances/expenses-view"
import { hasFeature } from "@/lib/plans"
import { formatCurrency, humanize } from "@/lib/utils"
import { getPageContext } from "@/server/context"
import { getExpensesOverview } from "@/server/services/expenses"

export default async function FinancesPage() {
  const ctx = await getPageContext()
  // The segment layout shows the upgrade prompt on lower plans
  if (!hasFeature(ctx.plan, "expenseTracking")) return null
  const { rows, metrics, today } = await getExpensesOverview(ctx)

  return (
    <ExpensesView
      rows={rows}
      today={today}
      summary={
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SummaryCard
            title="Expenses This Month"
            value={formatCurrency(metrics.mtdTotal)}
            icon={Receipt}
            description="month to date"
          />
          <SummaryCard
            title="Daily Average"
            value={formatCurrency(metrics.dailyAverage)}
            icon={TrendingDown}
            description="per day this month"
          />
          <SummaryCard
            title="Largest Category"
            value={metrics.largestCategory ? humanize(metrics.largestCategory.category) : "None yet"}
            icon={FolderOpen}
            description={metrics.largestCategory ? `${formatCurrency(metrics.largestCategory.total)} this month` : "this month"}
          />
          <SummaryCard
            title="Recurring Costs"
            value={formatCurrency(metrics.recurringMonthly)}
            icon={RefreshCw}
            description="logged in the last 30 days"
          />
        </div>
      }
    />
  )
}
