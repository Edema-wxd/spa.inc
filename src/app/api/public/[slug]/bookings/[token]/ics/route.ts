import { route } from "@/server/http"
import { getBookingIcs } from "@/server/services/online-booking"

/** Public: "Add to calendar" file for the client's booking. */
export const GET = route<{ slug: string; token: string }>(async (_request, { params }) => {
  const { slug, token } = await params
  return new Response(await getBookingIcs(slug, token), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment.ics"`,
      "Cache-Control": "no-store",
    },
  })
})
