import { availabilityQuerySchema } from "@/lib/validation/appointments"
import { getRequestContext } from "@/server/context"
import { ok, parseQuery, route } from "@/server/http"
import { getAvailability } from "@/server/services/appointments"

/** Free start times for a therapist on a date: `?staffId=&date=&serviceId=` */
export const GET = route(async (request) => {
  const query = parseQuery(request, availabilityQuerySchema)
  return ok(await getAvailability(await getRequestContext(), query))
})
