import { z } from "zod"
import { paymentSchema } from "@/lib/validation/payments"
import { dateRangeQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, parseQuery, route } from "@/server/http"
import { listPayments, recordPayment } from "@/server/services/payments"

const listQuery = dateRangeQuerySchema.extend({
  staffId: z.string().optional(),
  clientId: z.string().optional(),
})

export const GET = route(async (request) => {
  const query = parseQuery(request, listQuery)
  return ok(await listPayments(await getRequestContext(), query))
})

export const POST = route(async (request) => {
  const input = await parseBody(request, paymentSchema)
  return created(await recordPayment(await getRequestContext(), input), "Payment recorded")
})
