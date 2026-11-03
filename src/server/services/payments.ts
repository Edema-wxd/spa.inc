import "server-only"

import type { PaymentInput } from "@/lib/validation/payments"
import type { RequestContext } from "@/server/context"
import { ApiError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import type { DateRange } from "@/server/repositories/types"
import { bucketKey, type Period } from "@/server/services/periods"
import { getBusinessClock, getDirectory } from "@/server/services/business"
import { dateKeyInZone, formatDateTimeInZone } from "@/lib/time"
import type { Payment } from "@/types"

export async function listPayments(
  ctx: RequestContext,
  filter: DateRange & { staffId?: string; clientId?: string } = {}
) {
  const { payments } = await getRepositories()
  const staffId = ctx.role === "STAFF" ? ctx.userId : filter.staffId
  return payments.list(ctx.organizationId, { ...filter, staffId })
}

export async function recordPayment(ctx: RequestContext, input: PaymentInput) {
  const repos = await getRepositories()
  const [client, staff, appointment] = await Promise.all([
    repos.clients.get(ctx.organizationId, input.client_id),
    repos.users.get(ctx.organizationId, input.staff_id),
    input.appointment_id ? repos.appointments.get(ctx.organizationId, input.appointment_id) : null,
  ])
  if (!client) throw new ApiError(422, "VALIDATION_ERROR", "Client does not exist")
  if (!staff) throw new ApiError(422, "VALIDATION_ERROR", "Staff member does not exist")
  if (input.appointment_id) {
    // The appointment must belong to this organization and match the payment
    if (!appointment) throw new ApiError(422, "VALIDATION_ERROR", "Appointment does not exist")
    if (appointment.client_id !== client.id) {
      throw new ApiError(422, "VALIDATION_ERROR", "That appointment belongs to a different client")
    }
  }
  if (ctx.role === "STAFF" && staff.id !== ctx.userId) {
    throw new ApiError(403, "FORBIDDEN", "Staff can only record their own payments")
  }
  return repos.payments.create(ctx.organizationId, input)
}

export interface PaymentRow extends Payment {
  client_name: string
  staff_name: string
  service_name: string
}

export async function listPaymentRows(ctx: RequestContext): Promise<PaymentRow[]> {
  const repos = await getRepositories()
  const [payments, appointments, directory] = await Promise.all([
    listPayments(ctx),
    repos.appointments.list(ctx.organizationId),
    getDirectory(ctx),
  ])
  const serviceOf = new Map(appointments.map((a) => [a.id, a.service_id]))
  return payments
    .map((p) => ({
      ...p,
      client_name: directory.clientName(p.client_id),
      staff_name: directory.userName(p.staff_id),
      service_name: p.appointment_id ? directory.serviceName(serviceOf.get(p.appointment_id)) : "Standalone",
    }))
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at))
}

/** Options for the Record Payment form, optionally prefilled from an appointment. */
export async function getPaymentFormData(ctx: RequestContext, appointmentId?: string) {
  const repos = await getRepositories()
  const [directory, clock, appointment] = await Promise.all([
    getDirectory(ctx),
    getBusinessClock(ctx),
    appointmentId ? repos.appointments.get(ctx.organizationId, appointmentId) : null,
  ])
  const service = appointment ? directory.service(appointment.service_id) : undefined
  return {
    today: clock.todayKey,
    clients: directory.clients
      .map((c) => ({ id: c.id, full_name: c.full_name }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    staff: directory.users
      .filter((u) => u.role === "STAFF" && u.is_active)
      .map((u) => ({ id: u.id, full_name: u.full_name })),
    services: directory.services
      .filter((s) => s.is_active)
      .map((s) => ({ id: s.id, name: s.name, price: s.default_price })),
    prefill: appointment
      ? {
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          staff_id: appointment.staff_id,
          service_id: appointment.service_id,
          amount: service?.default_price ?? 0,
          payment_date: dateKeyInZone(appointment.scheduled_at, clock.timezone),
          summary: `${directory.serviceName(appointment.service_id)} with ${directory.userName(appointment.staff_id)}, ${formatDateTimeInZone(appointment.scheduled_at, clock.timezone)}`,
        }
      : null,
  }
}

export type PaymentFormData = Awaited<ReturnType<typeof getPaymentFormData>>

/** Completed revenue totals bucketed by period. Available on every plan. */
export async function getPaymentSummary(ctx: RequestContext, range: DateRange, period: Period) {
  const payments = (await listPayments(ctx, range)).filter((p) => p.status === "COMPLETED")
  const buckets = new Map<string, number>()
  for (const p of payments) {
    const key = bucketKey(p.payment_date, period)
    buckets.set(key, (buckets.get(key) ?? 0) + p.amount)
  }
  return {
    period,
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    count: payments.length,
    series: [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, revenue]) => ({ bucket, revenue })),
  }
}
