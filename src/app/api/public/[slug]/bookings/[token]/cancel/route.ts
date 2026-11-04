import { ok, route } from "@/server/http"
import { cancelPublicBooking } from "@/server/services/online-booking"

/** Public: the client cancels their own booking (deposit follows the cancellation policy). */
export const POST = route<{ slug: string; token: string }>(async (_request, { params }) => {
  const { slug, token } = await params
  return ok(await cancelPublicBooking(slug, token), "Booking cancelled")
})
