import "server-only"

import { hasFeature } from "@/lib/plans"
import {
  addDays,
  dateKeyInZone,
  isDateKey,
  minutesInZone,
  minutesToTime,
  startOfWeek,
  timeToMinutes,
  weekdayOf,
  type DateKey,
} from "@/lib/time"
import type {
  AppointmentInput,
  AppointmentUpdateInput,
  AvailabilityQuery,
} from "@/lib/validation/appointments"
import type { AppointmentStatus, LocationType, StaffSchedule, User } from "@/types"
import type { DateRange } from "@/server/repositories/types"
import type { RequestContext } from "@/server/context"
import { ApiError, BookingConflictError, NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock, getDirectory, listAppointmentsByLocalDate } from "@/server/services/business"
import { sendAppointmentConfirmationEmail } from "@/server/services/notifications"

/** Statuses that occupy a therapist's time. Cancelled and no-show slots are free again. */
const BLOCKING: AppointmentStatus[] = ["SCHEDULED", "COMPLETED"]
const SLOT_MINUTES = 15

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
// Rules
// ---------------------------------------------------------------------------

/** Therapists who can take bookings: active staff members. */
export async function listBookableStaff(ctx: RequestContext): Promise<User[]> {
  const { users } = await getRepositories()
  return users.list(ctx.organizationId, { role: "STAFF", activeOnly: true })
}

async function requireBookableStaff(ctx: RequestContext, staffId: string) {
  const { users } = await getRepositories()
  const staff = await users.get(ctx.organizationId, staffId)
  if (!staff || staff.role !== "STAFF") throw new ApiError(422, "VALIDATION_ERROR", "Therapist does not exist")
  if (!staff.is_active) throw new ApiError(422, "VALIDATION_ERROR", `${staff.full_name} is inactive and can't take bookings`)
  return staff
}

function overlaps(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB * 60_000 && startB < startA + durationA * 60_000
}

interface Slot {
  start: Date
  duration: number
  staffId: string
  clientId: string
  excludeId?: string
}

/** Throws when the slot clashes with the therapist's or the client's other bookings. */
async function assertNoConflicts(ctx: RequestContext, slot: Slot, timezone: string) {
  const day = dateKeyInZone(slot.start, timezone)
  const sameDay = await listAppointmentsByLocalDate(ctx, timezone, { from: addDays(day, -1), to: addDays(day, 1) })
  const start = slot.start.getTime()
  const busy = sameDay.filter((a) => a.id !== slot.excludeId && BLOCKING.includes(a.status))
  const directory = await getDirectory(ctx)

  const staffClash = busy.find(
    (a) => a.staff_id === slot.staffId && overlaps(start, slot.duration, Date.parse(a.scheduled_at), a.duration_minutes)
  )
  if (staffClash) {
    throw new BookingConflictError(
      `${directory.userName(slot.staffId)} is already booked with ${directory.clientName(staffClash.client_id)} at that time.`,
      staffClash.id
    )
  }
  const clientClash = busy.find(
    (a) => a.client_id === slot.clientId && overlaps(start, slot.duration, Date.parse(a.scheduled_at), a.duration_minutes)
  )
  if (clientClash) {
    throw new BookingConflictError(
      `${directory.clientName(slot.clientId)} already has an appointment with ${directory.userName(clientClash.staff_id)} at that time.`,
      clientClash.id
    )
  }
}

function shiftFor(schedules: StaffSchedule[], staffId: string, day: DateKey) {
  const weekday = weekdayOf(day)
  return schedules.find((s) => s.staff_id === staffId && s.day_of_week === weekday && s.is_available)
}

/** Throws when the slot falls outside the therapist's working hours. */
async function assertWithinHours(ctx: RequestContext, slot: Slot, timezone: string, staffName: string) {
  const { schedules } = await getRepositories()
  const day = dateKeyInZone(slot.start, timezone)
  const shift = shiftFor(await schedules.listForStaff(ctx.organizationId, slot.staffId), slot.staffId, day)
  const startMinutes = minutesInZone(slot.start, timezone)
  if (!shift) {
    throw new ApiError(422, "OUTSIDE_WORKING_HOURS", `${staffName} doesn't work on that day.`)
  }
  if (startMinutes < timeToMinutes(shift.start_time) || startMinutes + slot.duration > timeToMinutes(shift.end_time)) {
    throw new ApiError(
      422,
      "OUTSIDE_WORKING_HOURS",
      `That time is outside ${staffName}'s hours (${shift.start_time} to ${shift.end_time}).`
    )
  }
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export async function createAppointment(ctx: RequestContext, input: AppointmentInput) {
  const repos = await getRepositories()
  const [client, service] = await Promise.all([
    repos.clients.get(ctx.organizationId, input.client_id),
    repos.services.get(ctx.organizationId, input.service_id),
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
  if (!(allow_outside_hours && ctx.role === "ADMIN")) {
    await assertWithinHours(ctx, slot, timezone, staff.full_name)
  }
  await assertNoConflicts(ctx, slot, timezone)

  const appointment = await repos.appointments.create(ctx.organizationId, {
    ...data,
    scheduled_at: slot.start.toISOString(),
    duration_minutes: duration,
  })

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
  if (ctx.role === "STAFF" && input.staff_id && input.staff_id !== ctx.userId) {
    throw new ApiError(403, "FORBIDDEN", "Only an admin can move a booking to another therapist")
  }

  const { allow_outside_hours, ...changes } = input
  const staffId = changes.staff_id ?? existing.staff_id
  const start = new Date(changes.scheduled_at ?? existing.scheduled_at)
  const duration = changes.duration_minutes ?? existing.duration_minutes
  const status = changes.status ?? existing.status
  const moved =
    staffId !== existing.staff_id ||
    start.getTime() !== Date.parse(existing.scheduled_at) ||
    duration !== existing.duration_minutes
  const reopened = !BLOCKING.includes(existing.status) && BLOCKING.includes(status)

  if (moved || reopened) {
    const staff = await requireBookableStaff(ctx, staffId)
    const { timezone } = await getBusinessClock(ctx)
    const slot: Slot = { start, duration, staffId, clientId: existing.client_id, excludeId: id }
    if (moved && !(allow_outside_hours && ctx.role === "ADMIN")) {
      await assertWithinHours(ctx, slot, timezone, staff.full_name)
    }
    await assertNoConflicts(ctx, slot, timezone)
  }

  if (changes.status === "COMPLETED" && start.getTime() > Date.now()) {
    throw new ApiError(422, "VALIDATION_ERROR", "An appointment can't be completed before it starts")
  }

  return (await appointments.update(ctx.organizationId, id, {
    ...changes,
    ...(changes.scheduled_at && { scheduled_at: start.toISOString() }),
  }))!
}

// ---------------------------------------------------------------------------
// Availability
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
  const clock = await getBusinessClock(ctx)

  const shift = shiftFor(await repos.schedules.listForStaff(ctx.organizationId, staff.id), staff.id, query.date)
  if (!shift) return { date: query.date, workingHours: null, duration, slots: [] }

  const busy = (await listAppointmentsByLocalDate(ctx, clock.timezone, { from: query.date, to: query.date, staffId: staff.id }))
    .filter((a) => a.id !== query.excludeId && BLOCKING.includes(a.status))
    .map((a) => ({ start: minutesInZone(a.scheduled_at, clock.timezone), duration: a.duration_minutes }))

  const open = timeToMinutes(shift.start_time)
  const close = timeToMinutes(shift.end_time)
  // No start times in the past
  const earliest = query.date === clock.todayKey ? Math.ceil((clock.nowMinutes + 1) / SLOT_MINUTES) * SLOT_MINUTES : 0
  const slots: string[] = []
  if (query.date >= clock.todayKey) {
    for (let t = Math.max(open, earliest); t + duration <= close; t += SLOT_MINUTES) {
      if (!busy.some((b) => t < b.start + b.duration && b.start < t + duration)) slots.push(minutesToTime(t))
    }
  }
  return { date: query.date, workingHours: { start: shift.start_time, end: shift.end_time }, duration, slots }
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
  paid: boolean
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
  const clock = await getBusinessClock(ctx)
  const view: CalendarView = params.view === "week" ? "week" : "day"
  const date = isDateKey(params.date) ? params.date : clock.todayKey

  let staff = await listBookableStaff(ctx)
  if (ctx.role === "STAFF") staff = staff.filter((s) => s.id === ctx.userId)
  const selectedStaffId = staff.find((s) => s.id === params.staffId)?.id ?? staff[0]?.id ?? null

  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i)) : [date]
  const columns = view === "week" ? (selectedStaffId ? [selectedStaffId] : []) : staff.map((s) => s.id)

  const [rows, schedules, payments, directory] = await Promise.all([
    listAppointmentsByLocalDate(ctx, clock.timezone, { from: days[0], to: days[days.length - 1] }),
    Promise.all(staff.map((s) => repos.schedules.listForStaff(ctx.organizationId, s.id))).then((r) => r.flat()),
    repos.payments.list(ctx.organizationId, { from: days[0], to: days[days.length - 1] }),
    getDirectory(ctx),
  ])
  const paid = new Set(payments.filter((p) => p.status !== "REFUNDED").map((p) => p.appointment_id))

  const appointments = rows
    .filter((a) => columns.includes(a.staff_id))
    .map((a): CalendarAppointment => {
      const client = directory.client(a.client_id)
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
        price: directory.service(a.service_id)?.default_price ?? 0,
        location_type: a.location_type,
        location_notes: a.location_notes,
        notes: a.notes,
        satisfaction_rating: a.satisfaction_rating,
        paid: paid.has(a.id),
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
