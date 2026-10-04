import { dateRangeQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { ok, parseQuery, route } from "@/server/http"
import { getLeaderboard } from "@/server/services/analytics"

export const GET = route(async (request) => {
  const range = parseQuery(request, dateRangeQuerySchema)
  return ok(await getLeaderboard(await getRequestContext(), range))
})
