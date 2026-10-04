import "server-only"

import { hasFeature } from "@/lib/plans"
import type { AppointmentInput, AppointmentUpdateInput } from "@/lib/validation/appointments"
import type { DateRange } from "@/server/repositories/types"
import type { RequestContext } from "@/server/context"
import { ApiError, NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import { sendAppointmentConfirmationEmail } from "@/server/services/notifications"

export async function listAppointments(
  ctx: RequestContext,
  filter: DateRange & { staffId?: string; clientId?: string } = {}
) {
  const { appointments } = await getRepositories()
  // Staff only ever see their own appointments
  const staffId = ctx.role === "STAFF" ? ctx.userId : filter.staffId
  return appointments.list(ctx.organizationId, { ...filter, staffId })
}

export async function createAppointment(ctx: RequestContext, input: AppointmentInput) {
  const repos = await getRepositories()
  const [client, staff, service] = await Promise.all([
    repos.clients.get(ctx.organizationId, input.client_id),
    repos.users.get(ctx.organizationId, input.staff_id),
    repos.services.get(ctx.organizationId, input.service_id),
  ])
  if (!client) throw new ApiError(422, "VALIDATION_ERROR", "Client does not exist")
  if (!staff) throw new ApiError(422, "VALIDATION_ERROR", "Staff member does not exist")
  if (!service) throw new ApiError(422, "VALIDATION_ERROR", "Service does not exist")

  const appointment = await repos.appointments.create(ctx.organizationId, input)

  // Email confirmations are an Executive+ feature; lower plans skip silently
  if (hasFeature(ctx.plan, "emailConfirmations") && client.email) {
    await sendAppointmentConfirmationEmail(client, appointment)
  }
  return appointment
}

export async function updateAppointment(ctx: RequestContext, id: string, input: AppointmentUpdateInput) {
  const { appointments } = await getRepositories()
  const existing = await appointments.get(ctx.organizationId, id)
  if (!existing || (ctx.role === "STAFF" && existing.staff_id !== ctx.userId)) {
    throw new NotFoundError("Appointment")
  }
  return (await appointments.update(ctx.organizationId, id, input))!
}
