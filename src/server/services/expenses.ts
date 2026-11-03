import "server-only"

import type { ExpenseInput, ExpenseUpdateInput } from "@/lib/validation/expenses"
import type { RequestContext } from "@/server/context"
import { assertFeature, assertRole } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import type { DateRange } from "@/server/repositories/types"
import { bucketKey, type Period } from "@/server/services/periods"
import { getBusinessClock, getDirectory } from "@/server/services/business"
import { addDays, startOfMonth } from "@/lib/time"
import type { Expense } from "@/types"

// Expenses are admin-only and require Manager or higher.
function guard(ctx: RequestContext) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "expenseTracking")
}

export async function listExpenses(ctx: RequestContext, range: DateRange = {}) {
  guard(ctx)
  const { expenses } = await getRepositories()
  return expenses.list(ctx.organizationId, range)
}

export async function createExpense(ctx: RequestContext, input: ExpenseInput) {
  guard(ctx)
  const { expenses } = await getRepositories()
  return expenses.create(ctx.organizationId, { ...input, created_by: ctx.userId })
}

export async function updateExpense(ctx: RequestContext, id: string, input: ExpenseUpdateInput) {
  guard(ctx)
  const { expenses } = await getRepositories()
  const expense = await expenses.update(ctx.organizationId, id, input)
  if (!expense) throw new NotFoundError("Expense")
  return expense
}

export async function deleteExpense(ctx: RequestContext, id: string) {
  guard(ctx)
  const { expenses } = await getRepositories()
  if (!(await expenses.delete(ctx.organizationId, id))) throw new NotFoundError("Expense")
}

export async function getExpenseSummary(ctx: RequestContext, range: DateRange, period: Period) {
  const expenses = await listExpenses(ctx, range)
  const byCategory: Record<string, number> = {}
  const buckets = new Map<string, number>()
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
    const key = bucketKey(e.expense_date, period)
    buckets.set(key, (buckets.get(key) ?? 0) + e.amount)
  }
  return {
    period,
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    byCategory,
    series: [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, amount]) => ({ bucket, amount })),
  }
}

export interface ExpenseRow extends Expense {
  created_by_name: string
}

/** Expense log plus this month's headline numbers. */
export async function getExpensesOverview(ctx: RequestContext) {
  guard(ctx)
  const [rows, directory, clock] = await Promise.all([listExpenses(ctx), getDirectory(ctx), getBusinessClock(ctx)])
  const monthStart = startOfMonth(clock.todayKey)
  const mtd = rows.filter((e) => e.expense_date >= monthStart && e.expense_date <= clock.todayKey)
  const mtdTotal = mtd.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = new Map<string, number>()
  for (const e of mtd) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount)
  const largest = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]
  // Recurring costs logged in the last 30 days approximate the monthly fixed base
  const since = addDays(clock.todayKey, -29)
  const recurring = rows.filter((e) => e.is_recurring && e.expense_date >= since && e.expense_date <= clock.todayKey)

  return {
    today: clock.todayKey,
    rows: rows
      .map((e) => ({ ...e, created_by_name: directory.userName(e.created_by) }))
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at)),
    metrics: {
      mtdTotal,
      dailyAverage: Math.round(mtdTotal / Number(clock.todayKey.slice(8, 10))),
      largestCategory: largest ? { category: largest[0], total: largest[1] } : null,
      recurringMonthly: recurring.reduce((sum, e) => sum + e.amount, 0),
    },
  }
}
