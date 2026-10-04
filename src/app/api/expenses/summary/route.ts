import { summaryQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { ok, parseQuery, route } from "@/server/http"
import { getExpenseSummary } from "@/server/services/expenses"

export const GET = route(async (request) => {
  const { period, ...range } = parseQuery(request, summaryQuerySchema)
  return ok(await getExpenseSummary(await getRequestContext(), range, period))
})
