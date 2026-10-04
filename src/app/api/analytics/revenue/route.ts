import { dateRangeQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { ok, parseQuery, route } from "@/server/http"
import { getRevenueBreakdown } from "@/server/services/analytics"

export const GET = route(async (request) => {
  const range = parseQuery(request, dateRangeQuerySchema)
  return ok(await getRevenueBreakdown(await getRequestContext(), range))
})
