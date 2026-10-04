import { summaryQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { ok, parseQuery, route } from "@/server/http"
import { getPaymentSummary } from "@/server/services/payments"

export const GET = route(async (request) => {
  const { period, ...range } = parseQuery(request, summaryQuerySchema)
  return ok(await getPaymentSummary(await getRequestContext(), range, period))
})
