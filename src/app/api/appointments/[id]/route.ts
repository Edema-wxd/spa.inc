import { appointmentUpdateSchema } from "@/lib/validation/appointments"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { updateAppointment } from "@/server/services/appointments"

export const PUT = route<{ id: string }>(async (request, { params }) => {
  const { id } = await params
  const input = await parseBody(request, appointmentUpdateSchema)
  return ok(await updateAppointment(await getRequestContext(), id, input), "Appointment updated")
})
