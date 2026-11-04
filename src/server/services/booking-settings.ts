import "server-only"

import { depositFor, formatMoney } from "@/lib/booking"
import { hasFeature } from "@/lib/plans"
import { addDays } from "@/lib/time"
import type { BookingSettingsInput } from "@/lib/validation/online-booking"
import { getAppUrl, bookingPagePath } from "@/server/app-url"
import type { RequestContext } from "@/server/context"
import { assertFeature, assertRole } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { whatsappConfigured } from "@/server/messaging/whatsapp"
import { describeProvider } from "@/server/payments"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock, getDirectory, listAppointmentsByLocalDate } from "@/server/services/business"

/** Everything the dashboard's Online Booking page shows. */
export async function getOnlineBookingOverview(ctx: RequestContext) {
  assertRole(ctx, "ADMIN")
  const repos = await getRepositories()
  const org = await repos.organizations.get(ctx.organizationId)
  if (!org) throw new NotFoundError("Organization")
  const clock = await getBusinessClock(ctx)
  const since = addDays(clock.todayKey, -89)
  const [appointments, deposits, messages, directory, services] = await Promise.all([
    listAppointmentsByLocalDate(ctx, clock.timezone, { from: since, to: clock.todayKey }),
    repos.deposits.list(ctx.organizationId),
    repos.messages.list(ctx.organizationId, { limit: 60 }),
    getDirectory(ctx),
    repos.services.list(ctx.organizationId),
  ])

  // Last 90 days, only appointments that have happened
  const past = appointments.filter((a) => Date.parse(a.scheduled_at) <= Date.now() && a.status !== "SCHEDULED" && a.status !== "PENDING_DEPOSIT")
  const happened = past.filter((a) => a.status !== "CANCELLED")
  const withDeposit = new Set(
    deposits.filter((d) => d.status === "PAID" || d.status === "FORFEITED" || d.status === "REFUNDED").map((d) => d.appointment_id)
  )
  const rate = (rows: typeof happened) =>
    rows.length ? Math.round((rows.filter((a) => a.status === "NO_SHOW").length / rows.length) * 1000) / 10 : null
  const online = appointments.filter((a) => a.source === "ONLINE")
  const kept = deposits.filter((d) => d.status === "FORFEITED" && d.updated_at.slice(0, 10) >= since)

  const base = await getAppUrl()
  const prices = services.filter((s) => s.is_active).map((s) => s.default_price)
  const typicalPrice = prices.length ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0

  return {
    org: { name: org.name, slug: org.slug, currency: org.currency },
    timezone: clock.timezone,
    settings: org.booking,
    bookingUrl: `${base}${bookingPagePath(org.slug)}`,
    features: {
      deposits: hasFeature(ctx.plan, "deposits"),
      whatsappReminders: hasFeature(ctx.plan, "whatsappReminders"),
    },
    providers: {
      payments: describeProvider(org.currency),
      whatsapp: whatsappConfigured(),
    },
    exampleDeposit: typicalPrice ? { price: formatMoney(typicalPrice, org.currency), deposit: formatMoney(depositFor(typicalPrice, org.booking), org.currency) } : null,
    stats: {
      onlineShare: appointments.length ? Math.round((online.length / appointments.length) * 100) : null,
      onlineBookings: online.length,
      noShowWithDeposit: rate(happened.filter((a) => withDeposit.has(a.id))),
      noShowWithout: rate(happened.filter((a) => !withDeposit.has(a.id))),
      sampleWithDeposit: happened.filter((a) => withDeposit.has(a.id)).length,
      sampleWithout: happened.filter((a) => !withDeposit.has(a.id)).length,
      depositsKept: kept.reduce((sum, d) => sum + d.amount, 0),
      depositsKeptLabel: formatMoney(kept.reduce((sum, d) => sum + d.amount, 0), org.currency),
      confirmedByReply: appointments.filter((a) => a.confirmed_at).length,
      reminded: appointments.filter((a) => a.reminder_sent_at).length,
    },
    messages: messages.map((m) => ({
      ...m,
      client_name: m.client_id ? directory.clientName(m.client_id) : null,
    })),
  }
}

export type OnlineBookingOverview = Awaited<ReturnType<typeof getOnlineBookingOverview>>

export async function updateBookingSettings(ctx: RequestContext, input: BookingSettingsInput) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "onlineBooking")
  // Deposits and reminders are plan features; lower plans can't switch them on
  if (input.deposit_type !== "NONE") assertFeature(ctx, "deposits")
  const { organizations } = await getRepositories()
  const org = await organizations.updateBookingSettings(ctx.organizationId, input)
  if (!org) throw new NotFoundError("Organization")
  return org.booking
}
