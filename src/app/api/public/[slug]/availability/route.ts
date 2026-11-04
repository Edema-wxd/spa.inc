import { publicAvailabilityQuerySchema } from "@/lib/validation/online-booking"
import { ok, parseQuery, route } from "@/server/http"
import { getPublicAvailability } from "@/server/services/online-booking"

/** Public: free start times on a date. `?serviceId=&staffId=any&date=` */
export const GET = route<{ slug: string }>(async (request, { params }) => {
  const { slug } = await params
  return ok(await getPublicAvailability(slug, parseQuery(request, publicAvailabilityQuerySchema)))
})
