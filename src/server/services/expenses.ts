import "server-only"

import type { ExpenseInput, ExpenseUpdateInput } from "@/lib/validation/expenses"
import type { RequestContext } from "@/server/context"
import { assertFeature, assertRole } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import type { DateRange } from "@/server/repositories/types"
import { bucketKey, type Period } from "@/server/services/periods"

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
