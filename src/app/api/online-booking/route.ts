import { bookingSettingsSchema } from "@/lib/validation/online-booking"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { getOnlineBookingOverview, updateBookingSettings } from "@/server/services/booking-settings"

/** Admin: online booking settings, share link, stats and recent messages. */
export const GET = route(async () => ok(await getOnlineBookingOverview(await getRequestContext())))

export const PUT = route(async (request) => {
  const input = await parseBody(request, bookingSettingsSchema)
  return ok(await updateBookingSettings(await getRequestContext(), input), "Booking settings saved")
})
