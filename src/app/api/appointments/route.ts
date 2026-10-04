import { z } from "zod"
import { appointmentSchema } from "@/lib/validation/appointments"
import { dateRangeQuerySchema } from "@/lib/validation/query"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, parseQuery, route } from "@/server/http"
import { createAppointment, listAppointments } from "@/server/services/appointments"

const listQuery = dateRangeQuerySchema.extend({
  staffId: z.string().optional(),
  clientId: z.string().optional(),
})

export const GET = route(async (request) => {
  const query = parseQuery(request, listQuery)
  return ok(await listAppointments(await getRequestContext(), query))
})

export const POST = route(async (request) => {
  const input = await parseBody(request, appointmentSchema)
  return created(await createAppointment(await getRequestContext(), input), "Appointment booked")
})
