import { expenseUpdateSchema } from "@/lib/validation/expenses"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { deleteExpense, updateExpense } from "@/server/services/expenses"

type Params = { id: string }

export const PUT = route<Params>(async (request, { params }) => {
  const { id } = await params
  const input = await parseBody(request, expenseUpdateSchema)
  return ok(await updateExpense(await getRequestContext(), id, input), "Expense updated")
})

export const DELETE = route<Params>(async (_request, { params }) => {
  const { id } = await params
  await deleteExpense(await getRequestContext(), id)
  return ok(null, "Expense deleted")
})
