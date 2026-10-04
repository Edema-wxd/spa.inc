import { expenseSchema } from "@/lib/validation/expenses"
import { dateRangeQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, parseQuery, route } from "@/server/http"
import { createExpense, listExpenses } from "@/server/services/expenses"

export const GET = route(async (request) => {
  const range = parseQuery(request, dateRangeQuerySchema)
  return ok(await listExpenses(await getRequestContext(), range))
})

export const POST = route(async (request) => {
  const input = await parseBody(request, expenseSchema)
  return created(await createExpense(await getRequestContext(), input), "Expense added")
})
