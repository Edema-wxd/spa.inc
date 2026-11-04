import { publicBookingSchema } from "@/lib/validation/online-booking"
import { created, parseBody, route } from "@/server/http"
import { createPublicBooking } from "@/server/services/online-booking"

/** Public: a client books from the booking page. Returns where to send them next. */
export const POST = route<{ slug: string }>(async (request, { params }) => {
  const { slug } = await params
  const input = await parseBody(request, publicBookingSchema)
  const result = await createPublicBooking(slug, input)
  return created(result, result.checkoutUrl ? "Booking held, deposit due" : "Booked")
})
