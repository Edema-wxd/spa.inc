import "server-only"

import { randomBytes } from "node:crypto"
import { formatMoney } from "@/lib/booking"
import { hasFeature } from "@/lib/plans"
import {
  addDays,
  dateKeyInZone,
  isDateKey,
  minutesInZone,
  startOfWeek,
  timeToMinutes,
  type DateKey,
} from "@/lib/time"
import type {
  AppointmentInput,
  AppointmentUpdateInput,
  AvailabilityQuery,
} from "@/lib/validation/appointments"
import type { AppointmentStatus, BookingSource, DepositStatus, LocationType, StaffSchedule } from "@/types"
import { withBookingLock } from "@/server/booking-lock"
import type { DateRange } from "@/server/repositories/types"
import type { RequestContext } from "@/server/context"
import { ApiError, NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock, getDirectory, listAppointmentsByLocalDate } from "@/server/services/business"
import { releaseExpiredHolds, settleDeposit, withinFreeCancellation } from "@/server/services/deposits"
import { sendClientMessage } from "@/server/services/messaging"
import { sendAppointmentConfirmationEmail } from "@/server/services/notifications"
import {
  assertNoConflicts,
  assertWithinHours,
  isBlocking,
  listBookableStaff,
  loadAvailability,
  requireBookableStaff,
  type Slot,
} from "@/server/services/scheduling"

export { listBookableStaff } from "@/server/services/scheduling"

/** Secret for a client's manage-booking link. */
export function newManageToken() {
  return randomBytes(18).toString("base64url")
}

export async function listAppointments(
  ctx: RequestContext,
  filter: DateRange & { staffId?: string; clientId?: string } = {}
) {
  const { appointments } = await getRepositories()
  // Staff only ever see their own appointments
  const staffId = ctx.role === "STAFF" ? ctx.userId : filter.staffId
  return appointments.list(ctx.organizationId, { ...filter, staffId })
}

// ---------------------------------------------------------------------------
// Create / update (dashboard)
// ---------------------------------------------------------------------------

export async function createAppointment(ctx: RequestContext, input: AppointmentInput) {
  const repos = await getRepositories()
  const [client, service, org] = await Promise.all([
    repos.clients.get(ctx.organizationId, input.client_id),
    repos.services.get(ctx.organizationId, input.service_id),
    repos.organizations.get(ctx.organizationId),
  ])
  if (!client) throw new ApiError(422, "VALIDATION_ERROR", "Client does not exist")
  if (!service || !service.is_active) throw new ApiError(422, "VALIDATION_ERROR", "Service does not exist")
  const staff = await requireBookableStaff(ctx, input.staff_id)
  // Staff members can only book themselves
  if (ctx.role === "STAFF" && staff.id !== ctx.userId) throw new NotFoundError("Therapist")

  const { allow_outside_hours, ...data } = input
  const { timezone } = await getBusinessClock(ctx)
  const duration = input.duration_minutes ?? service.default_duration_minutes
  const slot: Slot = { start: new Date(input.scheduled_at), duration, staffId: staff.id, clientId: client.id }

  const appointment = await withBookingLock(ctx.organizationId, async () => {
    if (!(allow_outside_hours && ctx.role === "ADMIN")) {
      await assertWithinHours(ctx, slot, timezone, staff.full_name)
    }
    await assertNoConflicts(ctx, slot, timezone)
    return repos.appointments.create(ctx.organizationId, {
      ...data,
      scheduled_at: slot.start.toISOString(),
      duration_minutes: duration,
      source: "DASHBOARD",
      // Lets the client manage the booking from the WhatsApp confirmation
      manage_token: newManageToken(),
    })
  })

  if (org) await sendClientMessage(ctx, { kind: "BOOKING_CONFIRMATION", org, appointment, client })
  // Email confirmations are an Executive+ feature; lower plans skip silently
  if (hasFeature(ctx.plan, "emailConfirmations") && client.email) {
    await sendAppointmentConfirmationEmail(client, appointment)
  }
  return appointment
}

export async function updateAppointment(ctx: RequestContext, id: string, input: AppointmentUpdateInput) {
  const repos = await getRepositories()
  const existing = await repos.appointments.get(ctx.organizationId, id)
  if (!existing || (ctx.role === "STAFF" && existing.staff_id !== ctx.userId)) {
    throw new NotFoundError("Appointment")
  }
  if (ctx.role === "STAFF" && input.staff_id && input.staff_id !== ctx.userId) {
    throw new ApiError(403, "FORBIDDEN", "Only an admin can move a booking to another therapist")
  }

  const { allow_outside_hours, deposit: depositAction, ...changes } = input
  const previous = { ...existing }
  const staffId = changes.staff_id ?? existing.staff_id
  const start = new Date(changes.scheduled_at ?? existing.scheduled_at)
  const duration = changes.duration_minutes ?? existing.duration_minutes
  const status: AppointmentStatus = changes.status ?? existing.status
  const moved =
    staffId !== existing.staff_id ||
    start.getTime() !== Date.parse(existing.scheduled_at) ||
    duration !== existing.duration_minutes
  const reopened = !isBlocking(existing) && (status === "SCHEDULED" || status === "COMPLETED")

  if (changes.status === "COMPLETED" && start.getTime() > Date.now()) {
    throw new ApiError(422, "VALIDATION_ERROR", "An appointment can't be completed before it starts")
  }

  const updated = await withBookingLock(ctx.organizationId, async () => {
    if (moved || reopened) {
      const staff = await requireBookableStaff(ctx, staffId)
      const { timezone } = await getBusinessClock(ctx)
      const slot: Slot = { start, duration, staffId, clientId: existing.client_id, excludeId: id }
      if (moved && !(allow_outside_hours && ctx.role === "ADMIN")) {
        await assertWithinHours(ctx, slot, timezone, staff.full_name)
      }
      await assertNoConflicts(ctx, slot, timezone)
    }
    return (await repos.appointments.update(ctx.organizationId, id, {
      ...changes,
      ...(changes.scheduled_at && { scheduled_at: start.toISOString() }),
      // Staff confirming a booking by hand waives its pending deposit
      ...(existing.status === "PENDING_DEPOSIT" && status !== "PENDING_DEPOSIT" && { hold_expires_at: null }),
      // A moved booking gets a fresh reminder
      ...(moved && { reminder_sent_at: null, confirmed_at: null }),
    }))!
  })

  // Deposits follow the status: cancellations refund (or keep, if late), no-shows keep
  if (status !== previous.status && (status === "CANCELLED" || status === "NO_SHOW")) {
    const org = await repos.organizations.get(ctx.organizationId)
    const action =
      status === "NO_SHOW" ? "keep" : (depositAction ?? (org && !withinFreeCancellation(org, previous) ? "keep" : "refund"))
    const settled = await settleDeposit(ctx.organizationId, updated, action)
    const client = await repos.clients.get(ctx.organizationId, updated.client_id)
    if (status === "CANCELLED" && org && client && Date.parse(updated.scheduled_at) > Date.now()) {
      await sendClientMessage(ctx, {
        kind: "CANCELLATION",
        org,
        appointment: updated,
        client,
        extra: {
          refund_line: settled
            ? settled.outcome === "refunded"
              ? `Your ${formatMoney(settled.deposit.amount, settled.deposit.currency)} deposit has been refunded.`
              : `As this was within ${org.booking.cancellation_notice_hours} hours, the deposit is kept.`
            : "",
        },
      })
    }
  }
  return updated
}

// ---------------------------------------------------------------------------
// Availability (dashboard booking dialog)
// ---------------------------------------------------------------------------

export interface Availability {
  date: DateKey
  workingHours: { start: string; end: string } | null
  duration: number
  /** Free start times, "HH:mm" in the business timezone */
  slots: string[]
}

export async function getAvailability(ctx: RequestContext, query: AvailabilityQuery): Promise<Availability> {
  const repos = await getRepositories()
  const staff = await requireBookableStaff(ctx, query.staffId)
  const service = query.serviceId ? await repos.services.get(ctx.organizationId, query.serviceId) : null
  const duration = query.duration ?? service?.default_duration_minutes ?? 60
  await releaseExpiredHolds(ctx.organizationId)
  const engine = await loadAvailability(ctx, { from: query.date, to: query.date, excludeId: query.excludeId })
  return {
    date: query.date,
    workingHours: engine.shiftOf(staff.id, query.date),
    duration,
    slots: engine.slotsFor(staff.id, query.date, duration),
  }
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export type CalendarView = "day" | "week"

export interface CalendarAppointment {
  id: string
  date: DateKey
  /** Minutes since local midnight */
  start: number
  duration: number
  scheduled_at: string
  status: AppointmentStatus
  staff_id: string
  staff_name: string
  client_id: string
  client_name: string
  client_phone: string
  service_id: string
  service_name: string
  price: number
  location_type: LocationType
  location_notes: string
  notes: string
  satisfaction_rating: number | null
  /** Completed payments so far, including any deposit */
  amount_paid: number
  paid: boolean
  source: BookingSource
  deposit: { amount: number; status: DepositStatus } | null
  /** Client confirmed (e.g. replied 1 on WhatsApp) */
  confirmed: boolean
  hold_expires_at: string | null
}

export interface CalendarData {
  view: CalendarView
  timezone: string
  todayKey: DateKey
  nowMinutes: number
  /** Server time when the data was loaded (ISO) */
  now: string
  date: DateKey
  days: DateKey[]
  staff: { id: string; full_name: string }[]
  /** Staff shown in this view (all bookable staff for day view, one for week view) */
  columns: string[]
  selectedStaffId: string | null
  schedules: StaffSchedule[]
  appointments: CalendarAppointment[]
  /** Visible hour range in minutes */
  range: { start: number; end: number }
}

export async function getCalendar(
  ctx: RequestContext,
  params: { view?: string; date?: string; staffId?: string }
): Promise<CalendarData> {
  const repos = await getRepositories()
  await releaseExpiredHolds(ctx.organizationId)
  const clock = await getBusinessClock(ctx)
  const view: CalendarView = params.view === "week" ? "week" : "day"
  const date = isDateKey(params.date) ? params.date : clock.todayKey

  let staff = await listBookableStaff(ctx)
  if (ctx.role === "STAFF") staff = staff.filter((s) => s.id === ctx.userId)
  const selectedStaffId = staff.find((s) => s.id === params.staffId)?.id ?? staff[0]?.id ?? null

  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i)) : [date]
  const columns = view === "week" ? (selectedStaffId ? [selectedStaffId] : []) : staff.map((s) => s.id)

  const [rows, schedules, payments, deposits, directory] = await Promise.all([
    listAppointmentsByLocalDate(ctx, clock.timezone, { from: days[0], to: days[days.length - 1] }),
    Promise.all(staff.map((s) => repos.schedules.listForStaff(ctx.organizationId, s.id))).then((r) => r.flat()),
    // Deposits are paid when booking, up to the booking window before the visit
    repos.payments.list(ctx.organizationId, { from: addDays(days[0], -190), to: days[days.length - 1] }),
    repos.deposits.list(ctx.organizationId),
    getDirectory(ctx),
  ])
  const paidByAppointment = new Map<string, number>()
  for (const p of payments) {
    if (p.status === "COMPLETED" && p.appointment_id) {
      paidByAppointment.set(p.appointment_id, (paidByAppointment.get(p.appointment_id) ?? 0) + p.amount)
    }
  }
  const depositByAppointment = new Map(
    deposits.filter((d) => d.status !== "EXPIRED").map((d) => [d.appointment_id, d])
  )

  const appointments = rows
    .filter((a) => columns.includes(a.staff_id))
    .map((a): CalendarAppointment => {
      const client = directory.client(a.client_id)
      const price = directory.service(a.service_id)?.default_price ?? 0
      const amountPaid = paidByAppointment.get(a.id) ?? 0
      const deposit = depositByAppointment.get(a.id)
      return {
        id: a.id,
        date: dateKeyInZone(a.scheduled_at, clock.timezone),
        start: minutesInZone(a.scheduled_at, clock.timezone),
        duration: a.duration_minutes,
        scheduled_at: a.scheduled_at,
        status: a.status,
        staff_id: a.staff_id,
        staff_name: directory.userName(a.staff_id),
        client_id: a.client_id,
        client_name: client?.full_name ?? "Deleted client",
        client_phone: client?.phone ?? "",
        service_id: a.service_id,
        service_name: directory.serviceName(a.service_id),
        price,
        location_type: a.location_type,
        location_notes: a.location_notes,
        notes: a.notes,
        satisfaction_rating: a.satisfaction_rating,
        amount_paid: amountPaid,
        paid: price > 0 && amountPaid >= price,
        source: a.source,
        deposit: deposit ? { amount: deposit.amount, status: deposit.status } : null,
        confirmed: !!a.confirmed_at,
        hold_expires_at: a.hold_expires_at,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)

  // Visible hours: the earliest shift start to the latest shift end (and any booking outside them)
  const visibleShifts = schedules.filter((s) => s.is_available && columns.includes(s.staff_id))
  let start = Math.min(9 * 60, ...visibleShifts.map((s) => timeToMinutes(s.start_time)), ...appointments.map((a) => a.start))
  let end = Math.max(18 * 60, ...visibleShifts.map((s) => timeToMinutes(s.end_time)), ...appointments.map((a) => a.start + a.duration))
  start = Math.floor(start / 60) * 60
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60)

  return {
    view,
    timezone: clock.timezone,
    todayKey: clock.todayKey,
    nowMinutes: clock.nowMinutes,
    now: clock.now.toISOString(),
    date,
    days,
    staff: staff.map((s) => ({ id: s.id, full_name: s.full_name })),
    columns,
    selectedStaffId,
    schedules: visibleShifts,
    appointments,
    range: { start, end },
  }
}

/** Options for the booking form. */
export async function getBookingOptions(ctx: RequestContext) {
  const [directory, staff] = await Promise.all([getDirectory(ctx), listBookableStaff(ctx)])
  return {
    clients: directory.clients
      .map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    services: directory.services
      .filter((s) => s.is_active)
      .map((s) => ({ id: s.id, name: s.name, duration: s.default_duration_minutes, price: s.default_price })),
    staff: staff.map((s) => ({ id: s.id, full_name: s.full_name })),
  }
}

export type BookingOptions = Awaited<ReturnType<typeof getBookingOptions>>
