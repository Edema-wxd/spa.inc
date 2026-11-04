import "server-only"

import { cancellationPolicy, depositFor, formatMoney } from "@/lib/booking"
import { hasFeature } from "@/lib/plans"
import { phoneMatchKey } from "@/lib/phone"
import {
  addDays,
  dateKeyInZone,
  formatDateKey,
  formatInZone,
  formatMinutes,
  timeToMinutes,
  zonedTimeToUtc,
  type DateKey,
} from "@/lib/time"
import { ANY_THERAPIST, type PublicBookingInput } from "@/lib/validation/online-booking"
import type { Deposit, Organization } from "@/types"
import { getAppUrl, manageBookingPath } from "@/server/app-url"
import { withBookingLock } from "@/server/booking-lock"
import { getSystemContext, type RequestContext } from "@/server/context"
import { ApiError, NotFoundError } from "@/server/errors"
import { describeProvider, getDepositProvider, getProviderById } from "@/server/payments"
import { assertRateLimit, getClientIp } from "@/server/rate-limit"
import { getRepositories } from "@/server/repositories"
import { newManageToken, updateAppointment } from "@/server/services/appointments"
import { getBusinessClock } from "@/server/services/business"
import { markDepositPaid, releaseExpiredHolds, startDepositCheckout, withinFreeCancellation } from "@/server/services/deposits"
import { sendClientMessage } from "@/server/services/messaging"
import { assertNoConflicts, loadAvailability, requireBookableStaff } from "@/server/services/scheduling"

// ---------------------------------------------------------------------------
// Public booking page (/book/[slug]). No signed-in user: every function takes
// the business slug, and the client's own booking is addressed by its secret
// manage token. Nothing here exposes other clients' data.
// ---------------------------------------------------------------------------

async function resolve(slug: string): Promise<{ org: Organization; ctx: RequestContext }> {
  const { organizations } = await getRepositories()
  const org = await organizations.getBySlug(slug)
  if (!org) throw new NotFoundError("Business")
  const ctx = await getSystemContext(org.id)
  return { org, ctx }
}

function depositsActive(ctx: RequestContext, org: Organization) {
  return hasFeature(ctx.plan, "deposits") && org.booking.deposit_type !== "NONE" && getDepositProvider(org.currency) !== null
}

function assertTakingBookings(ctx: RequestContext, org: Organization) {
  if (!org.booking.enabled || !hasFeature(ctx.plan, "onlineBooking")) {
    throw new ApiError(403, "BOOKING_UNAVAILABLE", `${org.name} isn't taking online bookings right now. Please call to book.`)
  }
}

/** Earliest bookable instant under the business's minimum notice. */
function notBefore(org: Organization) {
  return new Date(Date.now() + Math.max(1, org.booking.min_notice_minutes) * 60_000)
}

// ---------------------------------------------------------------------------
// Business profile
// ---------------------------------------------------------------------------

export async function getPublicBusiness(slug: string) {
  const { org, ctx } = await resolve(slug)
  const repos = await getRepositories()
  const [services, staff, locations, clock] = await Promise.all([
    repos.services.list(org.id),
    repos.users.list(org.id, { role: "STAFF", activeOnly: true }),
    repos.locations.list(org.id),
    getBusinessClock(ctx),
  ])
  const location = locations.find((l) => l.is_active) ?? locations[0]
  const withDeposit = depositsActive(ctx, org)
  return {
    name: org.name,
    slug: org.slug,
    currency: org.currency,
    address: location?.address ?? null,
    phone: location?.phone ?? null,
    timezone: clock.timezone,
    todayKey: clock.todayKey,
    lastDay: addDays(clock.todayKey, org.booking.booking_window_days - 1),
    accepting: org.booking.enabled && hasFeature(ctx.plan, "onlineBooking") && services.some((s) => s.is_active) && staff.length > 0,
    welcomeMessage: org.booking.welcome_message,
    cancellationNoticeHours: org.booking.cancellation_notice_hours,
    holdMinutes: org.booking.hold_minutes,
    services: services
      .filter((s) => s.is_active)
      .map((s) => {
        const deposit = withDeposit ? depositFor(s.default_price, org.booking) : 0
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          duration: s.default_duration_minutes,
          price: s.default_price,
          priceLabel: formatMoney(s.default_price, org.currency),
          deposit,
          depositLabel: deposit ? formatMoney(deposit, org.currency) : null,
          policy: cancellationPolicy(org.booking, deposit ? formatMoney(deposit, org.currency) : null),
        }
      }),
    staff: staff.map((s) => ({ id: s.id, name: s.full_name, firstName: s.full_name.split(" ")[0] })),
  }
}

export type PublicBusiness = Awaited<ReturnType<typeof getPublicBusiness>>

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

async function serviceFor(org: Organization, serviceId: string) {
  const { services } = await getRepositories()
  const service = await services.get(org.id, serviceId)
  if (!service || !service.is_active) throw new ApiError(422, "VALIDATION_ERROR", "That service isn't available to book")
  return service
}

function staffIdsFor(engineStaff: { id: string }[], staffId: string) {
  if (staffId === ANY_THERAPIST) return engineStaff.map((s) => s.id)
  if (!engineStaff.some((s) => s.id === staffId)) throw new ApiError(422, "VALIDATION_ERROR", "That therapist isn't available to book")
  return [staffId]
}

/** Which days in the booking window have at least one free time. */
export async function getPublicDays(slug: string, query: { serviceId: string; staffId: string }) {
  const { org, ctx } = await resolve(slug)
  assertTakingBookings(ctx, org)
  assertRateLimit(`avail:${await getClientIp()}`, 240, 10 * 60_000)
  const service = await serviceFor(org, query.serviceId)
  await releaseExpiredHolds(org.id)
  const clock = await getBusinessClock(ctx)
  const last = addDays(clock.todayKey, org.booking.booking_window_days - 1)
  const engine = await loadAvailability(ctx, { from: clock.todayKey, to: last })
  const ids = staffIdsFor(engine.staff, query.staffId)
  const earliest = notBefore(org)
  const days: { date: DateKey; available: boolean }[] = []
  for (let date = clock.todayKey; date <= last; date = addDays(date, 1)) {
    days.push({
      date,
      available: ids.some((id) => engine.slotsFor(id, date, service.default_duration_minutes, earliest).length > 0),
    })
  }
  return { days }
}

/** Free start times on a date, for one therapist or anyone. */
export async function getPublicAvailability(slug: string, query: { serviceId: string; staffId: string; date: DateKey }) {
  const { org, ctx } = await resolve(slug)
  assertTakingBookings(ctx, org)
  assertRateLimit(`avail:${await getClientIp()}`, 240, 10 * 60_000)
  const service = await serviceFor(org, query.serviceId)
  await releaseExpiredHolds(org.id)
  const engine = await loadAvailability(ctx, { from: query.date, to: query.date })
  const ids = staffIdsFor(engine.staff, query.staffId)
  const earliest = notBefore(org)
  const slots = new Set<string>()
  for (const id of ids) for (const t of engine.slotsFor(id, query.date, service.default_duration_minutes, earliest)) slots.add(t)
  return { date: query.date, slots: [...slots].sort() }
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export async function createPublicBooking(slug: string, input: PublicBookingInput) {
  const { org, ctx } = await resolve(slug)
  assertTakingBookings(ctx, org)
  // Bots fill in the hidden field; people never see it
  if (input.company) throw new ApiError(422, "VALIDATION_ERROR", "We couldn't take this booking")
  const ip = await getClientIp()
  assertRateLimit(`book:ip:${ip}`, 8, 10 * 60_000)
  assertRateLimit(`book:phone:${phoneMatchKey(input.phone)}`, 4, 60 * 60_000, "Too many bookings for this phone number. Please call us to book.")

  const repos = await getRepositories()
  const service = await serviceFor(org, input.service_id)
  await releaseExpiredHolds(org.id)
  const clock = await getBusinessClock(ctx)
  const lastDay = addDays(clock.todayKey, org.booking.booking_window_days - 1)
  if (input.date < clock.todayKey || input.date > lastDay) {
    throw new ApiError(422, "BOOKING_UNAVAILABLE", "That date is outside the booking window")
  }
  const start = zonedTimeToUtc(input.date, input.time, clock.timezone)
  const earliest = notBefore(org)
  if (start < earliest) {
    throw new ApiError(422, "BOOKING_UNAVAILABLE", "That time is too soon to book online. Please pick a later time or call us.")
  }
  const duration = service.default_duration_minutes
  const deposit = depositsActive(ctx, org) ? depositFor(service.default_price, org.booking) : 0
  const holdExpiresAt = new Date(Date.now() + org.booking.hold_minutes * 60_000)

  const { appointment, client } = await withBookingLock(org.id, async () => {
    // Re-check under the lock: someone may have taken the time since it was shown
    const engine = await loadAvailability(ctx, { from: input.date, to: input.date })
    const candidates = staffIdsFor(engine.staff, input.staff_id)
    const free = candidates.filter((id) => engine.slotsFor(id, input.date, duration, earliest).includes(input.time))
    if (free.length === 0) {
      throw new ApiError(409, "BOOKING_UNAVAILABLE", "Sorry, that time was just taken. Please pick another.")
    }
    // "Anyone": give it to the therapist with the most free time that day
    const staffId = free.sort(
      (a, b) => engine.slotsFor(b, input.date, duration).length - engine.slotsFor(a, input.date, duration).length
    )[0]
    await requireBookableStaff(ctx, staffId)

    // Match returning clients by phone. Online bookings are never turned away
    // for the plan's client limit (see docs/ACTION_PLAN.md item 4).
    let client = await repos.clients.findByPhone(org.id, input.phone)
    if (!client) {
      client = await repos.clients.create(org.id, {
        full_name: input.full_name,
        phone: input.phone,
        email: input.email || "",
        notes: "Booked online",
      })
    } else if (!client.email && input.email) {
      client = (await repos.clients.update(org.id, client.id, { email: input.email }))!
    }

    await assertNoConflicts(ctx, { start, duration, staffId, clientId: client.id }, clock.timezone)
    const appointment = await repos.appointments.create(org.id, {
      client_id: client.id,
      staff_id: staffId,
      service_id: service.id,
      scheduled_at: start.toISOString(),
      duration_minutes: duration,
      location_type: "IN_SPA",
      notes: input.notes ? `Client note: ${input.notes}` : "",
      status: deposit > 0 ? "PENDING_DEPOSIT" : "SCHEDULED",
      source: "ONLINE",
      hold_expires_at: deposit > 0 ? holdExpiresAt.toISOString() : null,
      manage_token: newManageToken(),
    })
    return { appointment, client }
  })

  const manageUrl = `${await getAppUrl()}${manageBookingPath(org.slug, appointment.manage_token!)}`
  let checkoutUrl: string | null = null
  if (deposit > 0) {
    try {
      checkoutUrl = (
        await startDepositCheckout(ctx, {
          org,
          appointment,
          client,
          amount: deposit,
          serviceName: service.name,
          manageUrl,
          expiresAt: holdExpiresAt,
        })
      ).checkoutUrl
    } catch (err) {
      // Free the slot again if the payment couldn't start
      await repos.appointments.update(org.id, appointment.id, { status: "CANCELLED", hold_expires_at: null })
      throw err
    }
    await sendClientMessage(ctx, {
      kind: "DEPOSIT_REQUEST",
      org,
      appointment,
      client,
      extra: { amount: formatMoney(deposit, org.currency), minutes: org.booking.hold_minutes, link: checkoutUrl },
    })
  } else {
    await sendClientMessage(ctx, { kind: "BOOKING_CONFIRMATION", org, appointment, client })
  }

  return {
    status: appointment.status,
    manageUrl,
    checkoutUrl,
    token: appointment.manage_token!,
  }
}

// ---------------------------------------------------------------------------
// The client's own booking
// ---------------------------------------------------------------------------

async function bookingFor(slug: string, token: string) {
  const { org, ctx } = await resolve(slug)
  const { appointments } = await getRepositories()
  const appointment = await appointments.getByManageToken(org.id, token)
  if (!appointment) throw new NotFoundError("Booking")
  return { org, ctx, appointment }
}

/**
 * The manage page. When the client returns from the payment provider, the
 * stored reference is verified with the provider (query params are only a
 * hint that it's worth checking, never trusted as proof of payment).
 */
export async function getPublicBooking(slug: string, token: string, options: { checkPayment?: boolean } = {}) {
  let { org, ctx, appointment } = await bookingFor(slug, token)
  const repos = await getRepositories()

  const deposits = await repos.deposits.list(org.id, { appointmentId: appointment.id })
  let deposit: Deposit | null = deposits.find((d) => d.status !== "EXPIRED") ?? deposits[0] ?? null
  if (options.checkPayment && deposit?.status === "PENDING" && deposit.provider !== "DEMO") {
    try {
      const result = await getProviderById(deposit.provider).verify(deposit.provider_reference)
      if (result.paid && result.amount === deposit.amount) {
        await markDepositPaid(org.id, deposit.id)
        ;({ org, ctx, appointment } = await bookingFor(slug, token))
        deposit = await repos.deposits.get(org.id, deposit.id)
      }
    } catch (err) {
      console.error("[online-booking] payment verification failed", err)
    }
  }
  // Show an expired hold as released
  if (appointment.status === "PENDING_DEPOSIT" && appointment.hold_expires_at && Date.parse(appointment.hold_expires_at) <= Date.now()) {
    await releaseExpiredHolds(org.id)
    ;({ appointment } = await bookingFor(slug, token))
    deposit = deposit && (await repos.deposits.get(org.id, deposit.id))
  }

  const [service, staff, locations, clock] = await Promise.all([
    repos.services.get(org.id, appointment.service_id),
    repos.users.get(org.id, appointment.staff_id),
    repos.locations.list(org.id),
    getBusinessClock(ctx),
  ])
  const start = Date.parse(appointment.scheduled_at)
  const upcoming = start > Date.now()
  const freeUntil = start - org.booking.cancellation_notice_hours * 3_600_000
  const depositLabel = deposit ? formatMoney(deposit.amount, deposit.currency) : null
  const startMinutes = timeToMinutes(formatInZone(appointment.scheduled_at, clock.timezone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }))

  return {
    business: {
      name: org.name,
      slug: org.slug,
      address: locations[0]?.address ?? null,
      phone: locations[0]?.phone ?? null,
    },
    token,
    status: appointment.status,
    upcoming,
    confirmed: !!appointment.confirmed_at,
    serviceName: service?.name ?? "Appointment",
    staffName: staff?.full_name ?? "Your therapist",
    dateLabel: formatDateKey(dateKeyInZone(appointment.scheduled_at, clock.timezone), { weekday: "long", month: "long", day: "numeric" }),
    timeLabel: `${formatMinutes(startMinutes)} to ${formatMinutes(startMinutes + appointment.duration_minutes)}`,
    duration: appointment.duration_minutes,
    priceLabel: service ? formatMoney(service.default_price, org.currency) : null,
    deposit: deposit
      ? {
          status: deposit.status,
          amountLabel: depositLabel!,
          checkoutUrl: deposit.status === "PENDING" ? deposit.checkout_url : null,
          isDemo: deposit.provider === "DEMO",
          holdExpiresAt: appointment.status === "PENDING_DEPOSIT" ? appointment.hold_expires_at : null,
        }
      : null,
    policy: cancellationPolicy(org.booking, depositLabel),
    freeCancellationUntil:
      deposit?.status === "PAID" && upcoming && freeUntil > Date.now()
        ? formatInZone(freeUntil, clock.timezone, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : null,
    lateCancellation: deposit?.status === "PAID" && upcoming && !withinFreeCancellation(org, appointment),
    canCancel: upcoming && (appointment.status === "SCHEDULED" || appointment.status === "PENDING_DEPOSIT"),
  }
}

export type PublicBookingView = Awaited<ReturnType<typeof getPublicBooking>>

/** Client cancels from the manage page; the deposit follows the cancellation policy. */
export async function cancelPublicBooking(slug: string, token: string) {
  const { ctx, appointment } = await bookingFor(slug, token)
  assertRateLimit(`cancel:${await getClientIp()}`, 20, 10 * 60_000)
  if (!(appointment.status === "SCHEDULED" || appointment.status === "PENDING_DEPOSIT") || Date.parse(appointment.scheduled_at) <= Date.now()) {
    throw new ApiError(422, "BOOKING_UNAVAILABLE", "This booking can no longer be cancelled online. Please call us.")
  }
  await updateAppointment(ctx, appointment.id, { status: "CANCELLED" })
  return getPublicBooking(slug, token)
}

/** Demo checkout only: "pays" the deposit without a payment provider. */
export async function payDemoDeposit(slug: string, token: string) {
  const { org, appointment } = await bookingFor(slug, token)
  const { deposits } = await getRepositories()
  const deposit = (await deposits.list(org.id, { appointmentId: appointment.id })).find((d) => d.status === "PENDING")
  if (!deposit || deposit.provider !== "DEMO") throw new ApiError(422, "BOOKING_UNAVAILABLE", "There is no demo payment to make for this booking")
  return markDepositPaid(org.id, deposit.id)
}

/** iCalendar file so the client can add the booking to their calendar. */
export async function getBookingIcs(slug: string, token: string): Promise<string> {
  const { org, appointment } = await bookingFor(slug, token)
  const repos = await getRepositories()
  const [service, locations] = await Promise.all([
    repos.services.get(org.id, appointment.service_id),
    repos.locations.list(org.id),
  ])
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n")
  const start = Date.parse(appointment.scheduled_at)
  const manage = `${await getAppUrl()}${manageBookingPath(org.slug, token)}`
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spa.Inc//Online booking//EN",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@spa-inc`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + appointment.duration_minutes * 60_000)}`,
    `SUMMARY:${escape(`${service?.name ?? "Appointment"} at ${org.name}`)}`,
    `LOCATION:${escape(locations[0]?.address ?? org.name)}`,
    `DESCRIPTION:${escape(`Manage or cancel: ${manage}`)}`,
    appointment.status === "CANCELLED" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}

/** For the dashboard's booking settings: is a real payment provider connected? */
export function depositProviderStatus(org: Organization) {
  return describeProvider(org.currency)
}
