import "server-only"

import {
  addDays,
  dateKeyInZone,
  minutesInZone,
  minutesToTime,
  timeToMinutes,
  weekdayOf,
  type DateKey,
} from "@/lib/time"
import type { Appointment, StaffSchedule, User } from "@/types"
import type { RequestContext } from "@/server/context"
import { ApiError, BookingConflictError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock, getDirectory, listAppointmentsByLocalDate, type BusinessClock } from "@/server/services/business"

// ---------------------------------------------------------------------------
// Scheduling rules shared by dashboard bookings, the public booking page and
// deposit handling. Everything that decides whether a slot is free lives here.
// ---------------------------------------------------------------------------

export const SLOT_MINUTES = 15

/**
 * Whether an appointment occupies its therapist's time. Cancelled and no-show
 * slots are free again; an unpaid online booking holds its slot until the
 * hold expires.
 */
export function isBlocking(a: Pick<Appointment, "status" | "hold_expires_at">, nowMs = Date.now()): boolean {
  if (a.status === "SCHEDULED" || a.status === "COMPLETED") return true
  if (a.status === "PENDING_DEPOSIT") return !!a.hold_expires_at && Date.parse(a.hold_expires_at) > nowMs
  return false
}

/** People who can take bookings: active therapists, and owners who also do treatments. */
export async function listBookableStaff(ctx: RequestContext): Promise<User[]> {
  const { users } = await getRepositories()
  return (await users.list(ctx.organizationId, { activeOnly: true })).filter((u) => u.is_bookable)
}

export async function requireBookableStaff(ctx: RequestContext, staffId: string) {
  const { users } = await getRepositories()
  const staff = await users.get(ctx.organizationId, staffId)
  if (!staff || !staff.is_bookable) throw new ApiError(422, "VALIDATION_ERROR", "Therapist does not exist")
  if (!staff.is_active) throw new ApiError(422, "VALIDATION_ERROR", `${staff.full_name} is inactive and can't take bookings`)
  return staff
}

function overlaps(startA: number, durationA: number, startB: number, durationB: number) {
  return startA < startB + durationB * 60_000 && startB < startA + durationA * 60_000
}

export interface Slot {
  start: Date
  duration: number
  staffId: string
  clientId: string
  excludeId?: string
}

/** Throws when the slot clashes with the therapist's or the client's other bookings. */
export async function assertNoConflicts(ctx: RequestContext, slot: Slot, timezone: string) {
  const day = dateKeyInZone(slot.start, timezone)
  const nearby = await listAppointmentsByLocalDate(ctx, timezone, { from: addDays(day, -1), to: addDays(day, 1) })
  const start = slot.start.getTime()
  const now = Date.now()
  const busy = nearby.filter((a) => a.id !== slot.excludeId && isBlocking(a, now))
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

export function shiftFor(schedules: StaffSchedule[], staffId: string, day: DateKey) {
  const weekday = weekdayOf(day)
  return schedules.find((s) => s.staff_id === staffId && s.day_of_week === weekday && s.is_available)
}

/** Throws when the slot falls outside the therapist's working hours. */
export async function assertWithinHours(ctx: RequestContext, slot: Slot, timezone: string, staffName: string) {
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
// Availability engine
// ---------------------------------------------------------------------------

export interface AvailabilityEngine {
  clock: BusinessClock
  staff: User[]
  shiftOf(staffId: string, date: DateKey): { start: string; end: string } | null
  /** Free start times ("HH:mm") for a therapist on a date, no earlier than `notBefore`. */
  slotsFor(staffId: string, date: DateKey, duration: number, notBefore?: Date): string[]
}

/** Loads schedules and bookings once for a date range, then answers slot queries in memory. */
export async function loadAvailability(
  ctx: RequestContext,
  range: { from: DateKey; to: DateKey; excludeId?: string }
): Promise<AvailabilityEngine> {
  const repos = await getRepositories()
  const clock = await getBusinessClock(ctx)
  const staff = await listBookableStaff(ctx)
  const [schedules, appointments] = await Promise.all([
    Promise.all(staff.map((s) => repos.schedules.listForStaff(ctx.organizationId, s.id))).then((r) => r.flat()),
    listAppointmentsByLocalDate(ctx, clock.timezone, { from: range.from, to: range.to }),
  ])

  const now = clock.now.getTime()
  const busy = new Map<string, { start: number; duration: number }[]>()
  for (const a of appointments) {
    if (a.id === range.excludeId || !isBlocking(a, now)) continue
    const key = `${a.staff_id}|${dateKeyInZone(a.scheduled_at, clock.timezone)}`
    const list = busy.get(key) ?? []
    list.push({ start: minutesInZone(a.scheduled_at, clock.timezone), duration: a.duration_minutes })
    busy.set(key, list)
  }

  return {
    clock,
    staff,
    shiftOf(staffId, date) {
      const shift = shiftFor(schedules, staffId, date)
      return shift ? { start: shift.start_time, end: shift.end_time } : null
    },
    slotsFor(staffId, date, duration, notBefore = new Date(now + 60_000)) {
      const shift = shiftFor(schedules, staffId, date)
      if (!shift) return []
      const earliestDay = dateKeyInZone(notBefore, clock.timezone)
      if (date < earliestDay) return []
      const earliest =
        date === earliestDay ? Math.ceil(minutesInZone(notBefore, clock.timezone) / SLOT_MINUTES) * SLOT_MINUTES : 0
      const taken = busy.get(`${staffId}|${date}`) ?? []
      const slots: string[] = []
      for (let t = Math.max(timeToMinutes(shift.start_time), earliest); t + duration <= timeToMinutes(shift.end_time); t += SLOT_MINUTES) {
        if (!taken.some((b) => t < b.start + b.duration && b.start < t + duration)) slots.push(minutesToTime(t))
      }
      return slots
    },
  }
}
