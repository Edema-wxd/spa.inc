import "server-only"

import { hasFeature } from "@/lib/plans"
import { resolveRange, type RangePreset } from "@/lib/ranges"
import { addDays, monthsBefore, type DateKey } from "@/lib/time"
import type { RequestContext } from "@/server/context"
import { assertFeature, assertRole } from "@/server/entitlements"
import { getRepositories } from "@/server/repositories"
import type { DateRange } from "@/server/repositories/types"
import {
  getBusinessClock,
  getDirectory,
  listAppointmentsByLocalDate,
  sum,
} from "@/server/services/business"

type Row = { name: string; revenue: number }

function toRows(map: Map<string, number>): Row[] {
  return [...map.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue)
}

function addTo(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

/** Month keys ("yyyy-MM") from `months - 1` months ago through the current month. */
function monthKeys(todayKey: DateKey, months: number) {
  return Array.from({ length: months }, (_, i) => monthsBefore(todayKey, months - 1 - i).slice(0, 7))
}

// ---------------------------------------------------------------------------
// Overview (every plan)
// ---------------------------------------------------------------------------

export async function getAnalyticsOverview(ctx: RequestContext) {
  assertRole(ctx, "ADMIN")
  const repos = await getRepositories()
  const clock = await getBusinessClock(ctx)
  const range = resolveRange("12m", clock.todayKey)
  const [payments, appointments] = await Promise.all([
    repos.payments.list(ctx.organizationId, range),
    listAppointmentsByLocalDate(ctx, clock.timezone, range),
  ])

  const completedPayments = payments.filter((p) => p.status === "COMPLETED")
  const completedVisits = appointments.filter((a) => a.status === "COMPLETED")
  const revenue = sum(completedPayments, (p) => p.amount)
  const ratings = completedVisits.map((a) => a.satisfaction_rating).filter((r): r is number => r !== null)
  const visitsByClient = new Map<string, number>()
  for (const a of completedVisits) visitsByClient.set(a.client_id, (visitsByClient.get(a.client_id) ?? 0) + 1)
  const repeatClients = [...visitsByClient.values()].filter((n) => n > 1).length
  const booked = appointments.filter((a) => a.status !== "SCHEDULED")
  const noShows = booked.filter((a) => a.status === "NO_SHOW").length

  const byMonth = new Map(monthKeys(clock.todayKey, 12).map((m) => [m, 0]))
  for (const p of completedPayments) {
    const m = p.payment_date.slice(0, 7)
    if (byMonth.has(m)) byMonth.set(m, byMonth.get(m)! + p.amount)
  }

  let byService: Row[] | null = null
  if (hasFeature(ctx.plan, "revenueAnalytics")) {
    const directory = await getDirectory(ctx)
    const serviceOf = new Map(appointments.map((a) => [a.id, a.service_id]))
    const map = new Map<string, number>()
    for (const p of completedPayments) {
      addTo(map, directory.serviceName(p.appointment_id ? serviceOf.get(p.appointment_id) : undefined), p.amount)
    }
    byService = toRows(map)
  }

  return {
    rangeLabel: range.label,
    currentMonth: clock.todayKey.slice(0, 7),
    revenue,
    sessions: completedVisits.length,
    averageTicket: completedVisits.length ? Math.round(revenue / completedVisits.length) : 0,
    averageRating: ratings.length ? Math.round((sum(ratings, (r) => r) / ratings.length) * 10) / 10 : null,
    repeatRate: visitsByClient.size ? Math.round((repeatClients / visitsByClient.size) * 100) : null,
    noShowRate: booked.length ? Math.round((noShows / booked.length) * 1000) / 10 : null,
    monthly: [...byMonth.entries()].map(([month, value]) => ({ month, revenue: value })),
    byService,
  }
}

// ---------------------------------------------------------------------------
// Revenue analytics (Manager+)
// ---------------------------------------------------------------------------

/** Revenue broken down by service, staff member and payment method. */
export async function getRevenueBreakdown(ctx: RequestContext, range: DateRange) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "revenueAnalytics")
  const repos = await getRepositories()
  const [payments, appointments, directory] = await Promise.all([
    repos.payments.list(ctx.organizationId, range),
    repos.appointments.list(ctx.organizationId, {
      from: range.from && addDays(range.from, -1),
      to: range.to && addDays(range.to, 1),
    }),
    getDirectory(ctx),
  ])

  const completed = payments.filter((p) => p.status === "COMPLETED")
  const serviceOf = new Map(appointments.map((a) => [a.id, a.service_id]))
  const byService = new Map<string, number>()
  const byStaff = new Map<string, number>()
  const byMethod = new Map<string, number>()
  const byDay = new Map<string, number>()

  for (const p of completed) {
    addTo(byService, directory.serviceName(p.appointment_id ? serviceOf.get(p.appointment_id) : undefined), p.amount)
    addTo(byStaff, directory.userName(p.staff_id), p.amount)
    addTo(byMethod, p.payment_method, p.amount)
    addTo(byDay, p.payment_date, p.amount)
  }

  const total = sum(completed, (p) => p.amount)
  const bestDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0]
  const services = toRows(byService)
  return {
    total,
    count: completed.length,
    averageTransaction: completed.length ? Math.round(total / completed.length) : 0,
    bestDay: bestDay ? { date: bestDay[0], revenue: bestDay[1] } : null,
    topService: services[0]?.name ?? null,
    byService: services,
    byStaff: toRows(byStaff),
    byMethod: toRows(byMethod),
  }
}

export async function getRevenueBreakdownForPreset(ctx: RequestContext, preset: RangePreset) {
  const clock = await getBusinessClock(ctx)
  const range = resolveRange(preset, clock.todayKey)
  return { range, ...(await getRevenueBreakdown(ctx, range)) }
}

// ---------------------------------------------------------------------------
// Leaderboard (Executive+)
// ---------------------------------------------------------------------------

export interface LeaderboardRow {
  staffId: string
  name: string
  totalRevenue: number
  totalAppointments: number
  completedAppointments: number
  averageRevenuePerSession: number
  averageRating: number | null
  cancelRate: number
  noShowRate: number
}

/** Staff ranked by revenue, with sessions, ratings and cancel rate. */
export async function getLeaderboard(ctx: RequestContext, range: DateRange): Promise<LeaderboardRow[]> {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "performanceLeaderboard")
  const repos = await getRepositories()
  const { timezone } = await getBusinessClock(ctx)
  const [staff, appointments, payments] = await Promise.all([
    repos.users.list(ctx.organizationId, { activeOnly: true }).then((rows) => rows.filter((u) => u.is_bookable)),
    listAppointmentsByLocalDate(ctx, timezone, range),
    repos.payments.list(ctx.organizationId, range),
  ])

  return staff
    .map((member) => {
      // Only appointments that have happened count towards rates
      const own = appointments.filter((a) => a.staff_id === member.id && a.status !== "SCHEDULED")
      const completed = own.filter((a) => a.status === "COMPLETED")
      const ratings = completed.map((a) => a.satisfaction_rating).filter((r): r is number => r !== null)
      const revenue = sum(
        payments.filter((p) => p.staff_id === member.id && p.status === "COMPLETED"),
        (p) => p.amount
      )
      const rate = (status: string) =>
        own.length ? Math.round((own.filter((a) => a.status === status).length / own.length) * 100) : 0
      return {
        staffId: member.id,
        name: member.full_name,
        totalRevenue: revenue,
        totalAppointments: own.length,
        completedAppointments: completed.length,
        averageRevenuePerSession: completed.length ? Math.round(revenue / completed.length) : 0,
        averageRating: ratings.length ? Math.round((sum(ratings, (r) => r) / ratings.length) * 10) / 10 : null,
        cancelRate: rate("CANCELLED"),
        noShowRate: rate("NO_SHOW"),
      }
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export async function getLeaderboardForPreset(ctx: RequestContext, preset: RangePreset) {
  const clock = await getBusinessClock(ctx)
  const range = resolveRange(preset, clock.todayKey)
  return { range, rows: await getLeaderboard(ctx, range) }
}

// ---------------------------------------------------------------------------
// Profit & loss (Executive+)
// ---------------------------------------------------------------------------

export interface PnLMonth {
  month: string
  revenue: number
  expenses: number
  profit: number
  /** The current month, still in progress */
  partial: boolean
}

/** Monthly revenue, expenses and profit for the last `months` months, including this one. */
export async function getProfitAndLoss(ctx: RequestContext, months: number): Promise<PnLMonth[]> {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "profitAndLoss")
  const repos = await getRepositories()
  const { todayKey } = await getBusinessClock(ctx)
  const from = monthsBefore(todayKey, months - 1)
  const [payments, expenses] = await Promise.all([
    repos.payments.list(ctx.organizationId, { from, to: todayKey }),
    repos.expenses.list(ctx.organizationId, { from, to: todayKey }),
  ])

  const rows = new Map(monthKeys(todayKey, months).map((m) => [m, { revenue: 0, expenses: 0 }]))
  for (const p of payments) {
    if (p.status === "COMPLETED") {
      const row = rows.get(p.payment_date.slice(0, 7))
      if (row) row.revenue += p.amount
    }
  }
  for (const e of expenses) {
    const row = rows.get(e.expense_date.slice(0, 7))
    if (row) row.expenses += e.amount
  }

  const currentMonth = todayKey.slice(0, 7)
  return [...rows.entries()].map(([month, { revenue, expenses: cost }]) => ({
    month,
    revenue,
    expenses: cost,
    profit: revenue - cost,
    partial: month === currentMonth,
  }))
}

/** Running profit for each of the last `days` days. */
export async function getRunningProfit(ctx: RequestContext, days: number) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "profitAndLoss")
  const repos = await getRepositories()
  const { todayKey } = await getBusinessClock(ctx)
  const from = addDays(todayKey, -(days - 1))
  const [payments, expenses] = await Promise.all([
    repos.payments.list(ctx.organizationId, { from, to: todayKey }),
    repos.expenses.list(ctx.organizationId, { from, to: todayKey }),
  ])
  const net = new Map<string, number>()
  for (const p of payments) if (p.status === "COMPLETED") addTo(net, p.payment_date, p.amount)
  for (const e of expenses) addTo(net, e.expense_date, -e.amount)

  const series: { date: DateKey; profit: number }[] = []
  let running = 0
  for (let key = from; key <= todayKey; key = addDays(key, 1)) {
    running += net.get(key) ?? 0
    series.push({ date: key, profit: running })
  }
  return series
}

/** Expense totals by category over the last `months` months. */
export async function getExpenseCategories(ctx: RequestContext, months: number) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "expenseTracking")
  const repos = await getRepositories()
  const { todayKey } = await getBusinessClock(ctx)
  const expenses = await repos.expenses.list(ctx.organizationId, { from: monthsBefore(todayKey, months - 1), to: todayKey })
  const map = new Map<string, number>()
  for (const e of expenses) addTo(map, e.category, e.amount)
  return [...map.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total)
}
