import { monthsQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { ok, parseQuery, route } from "@/server/http"
import { getProfitAndLoss } from "@/server/services/analytics"

export const GET = route(async (request) => {
  const { months } = parseQuery(request, monthsQuerySchema)
  return ok(await getProfitAndLoss(await getRequestContext(), months))
})
