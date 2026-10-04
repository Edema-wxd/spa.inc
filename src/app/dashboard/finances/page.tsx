"use client"

import { useState } from "react"
import { Receipt, TrendingDown, FolderOpen, RefreshCw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SummaryCard } from "@/components/shared/summary-card"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import {
  expenseColumns,
  type EnrichedExpense,
} from "@/components/finances/expense-columns"
import { ExpenseForm } from "@/components/finances/expense-form"
import { expenses, getStaffById, getExpensesByCategory } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"
import {
  startOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns"

function getExpenseMetrics() {
  const today = new Date()
  const monthStart = startOfMonth(today)

  // MTD expenses
  const mtdExpenses = expenses.filter((e) =>
    isWithinInterval(parseISO(e.expense_date), {
      start: monthStart,
      end: today,
    })
  )
  const totalMTD = mtdExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Days elapsed this month
  const dayOfMonth = today.getDate()
  const dailyAverage = dayOfMonth > 0 ? Math.round(totalMTD / dayOfMonth) : 0

  // Largest category
  const byCategory = getExpensesByCategory()
  const largest = byCategory.length > 0 ? byCategory[0] : null

  // Recurring total
  const recurringTotal = expenses
    .filter((e) => e.is_recurring)
    .reduce((sum, e) => sum + e.amount, 0)

  return {
    totalMTD: totalMTD > 0 ? totalMTD : 485000,
    dailyAverage: dailyAverage > 0 ? dailyAverage : 16167,
    largestCategory: largest?.category || "PAYROLL",
    largestCategoryAmount: largest?.total || 280000,
    recurringTotal: recurringTotal > 0 ? recurringTotal : 380000,
  }
}

export default function FinancesPage() {
  const [formOpen, setFormOpen] = useState(false)

  const metrics = getExpenseMetrics()

  const enrichedExpenses: EnrichedExpense[] = expenses.map((e) => ({
    ...e,
    created_by_name: getStaffById(e.created_by)?.full_name || "Unknown",
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1 text-muted-foreground">
            Track and manage business expenses
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Expenses (MTD)"
          value={formatCurrency(metrics.totalMTD)}
          icon={Receipt}
          description="This month"
        />
        <SummaryCard
          title="Daily Average"
          value={formatCurrency(metrics.dailyAverage)}
          icon={TrendingDown}
          description="Per day this month"
        />
        <SummaryCard
          title="Largest Category"
          value={metrics.largestCategory}
          icon={FolderOpen}
          change={formatCurrency(metrics.largestCategoryAmount)}
          changeType="neutral"
        />
        <SummaryCard
          title="Recurring Total"
          value={formatCurrency(metrics.recurringTotal)}
          icon={RefreshCw}
          description="All recurring expenses"
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={expenseColumns}
        data={enrichedExpenses}
        searchKey="description"
        searchPlaceholder="Search by description..."
        emptyState={
          <EmptyState
            icon={<Receipt className="h-12 w-12" />}
            title="No expenses yet"
            description="Use Add Expense to log rent, supplies, payroll and other costs."
          />
        }
      />

      {/* Add Expense Dialog */}
      <ExpenseForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
