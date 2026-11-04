import { publicDaysQuerySchema } from "@/lib/validation/online-booking"
import { ok, parseQuery, route } from "@/server/http"
import { getPublicDays } from "@/server/services/online-booking"

/** Public: which days in the booking window have free times. `?serviceId=&staffId=any` */
export const GET = route<{ slug: string }>(async (request, { params }) => {
  const { slug } = await params
  return ok(await getPublicDays(slug, parseQuery(request, publicDaysQuerySchema)))
})
