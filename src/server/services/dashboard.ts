import "server-only"

import { hasFeature } from "@/lib/plans"
import {
  addDays,
  dateKeyInZone,
  startOfMonth,
  startOfWeek,
  timeToMinutes,
  weekdayOf,
  type DateKey,
} from "@/lib/time"
import type { RequestContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"
import {
  getBusinessClock,
  getDirectory,
  listAppointmentsByLocalDate,
  percentChange,
  sum,
} from "@/server/services/business"

export interface DashboardOverview {
  timezone: string
  todayKey: DateKey
  today: {
    /** Completed payments recorded today */
    collected: number
    /** Value of today's bookings that haven't happened yet */
    stillBooked: number
    appointments: number
    completed: number
    inProgress: number
    remaining: number
    /** Booked minutes / scheduled therapist minutes today, 0-100 */
    utilization: number | null
  }
  month: {
    revenue: number
    /**
     * Month to date through yesterday vs the same weekdays four weeks
     * earlier. Comparing calendar dates mixes up busy and quiet weekdays,
     * and today is never complete yet.
     */
    change: number | null
  }
  clients: {
    /** Clients with a completed visit in the last 90 days */
    active: number
    total: number
    newThisMonth: number
  }
  /** Running totals for the last 30 days. `expenses` is null without expense tracking. */
  runningTotals: { date: DateKey; revenue: number; expenses: number | null }[]
  /** Null when the plan has no revenue analytics */
  topEarners: { staffId: string; name: string; total: number; sessions: number }[] | null
  weekVisits: { date: DateKey; visits: number }[]
  upcoming: {
    id: string
    scheduled_at: string
    clientName: string
    staffName: string
    serviceName: string
    status: string
  }[]
}

export async function getDashboardOverview(ctx: RequestContext): Promise<DashboardOverview> {
  const repos = await getRepositories()
  const clock = await getBusinessClock(ctx)
  const { todayKey, timezone, now } = clock
  const monthStart = startOfMonth(todayKey)
  const windowStart = addDays(todayKey, -29)
  const earliest = [windowStart, addDays(monthStart, -28)].sort()[0]
  const weekStart = startOfWeek(todayKey)
  const canSeeExpenses = hasFeature(ctx.plan, "expenseTracking")

  const [payments, appointments, directory, expenses, schedules] = await Promise.all([
    repos.payments.list(ctx.organizationId, { from: earliest, to: todayKey }),
    listAppointmentsByLocalDate(ctx, timezone, { from: earliest < weekStart ? earliest : weekStart, to: addDays(todayKey, 60) }),
    getDirectory(ctx),
    canSeeExpenses ? repos.expenses.list(ctx.organizationId, { from: windowStart, to: todayKey }) : Promise.resolve([]),
    repos.users
      .list(ctx.organizationId, { activeOnly: true })
      .then((users) => users.filter((u) => u.is_bookable))
      .then((staff) => Promise.all(staff.map((s) => repos.schedules.listForStaff(ctx.organizationId, s.id))))
      .then((rows) => rows.flat()),
  ])

  const completed = payments.filter((p) => p.status === "COMPLETED")
  const revenueBetween = (from: DateKey, to: DateKey) =>
    sum(completed.filter((p) => p.payment_date >= from && p.payment_date <= to), (p) => p.amount)

  // Today
  const localDate = new Map(appointments.map((a) => [a.id, dateKeyInZone(a.scheduled_at, timezone)]))
  const todays = appointments.filter((a) => localDate.get(a.id) === todayKey)
  const live = todays.filter((a) => a.status === "SCHEDULED" || a.status === "COMPLETED")
  const upcomingToday = todays.filter((a) => a.status === "SCHEDULED" && Date.parse(a.scheduled_at) > now.getTime())
  const scheduledMinutes = sum(
    schedules.filter((s) => s.is_available && s.day_of_week === weekdayOf(todayKey)),
    (s) => timeToMinutes(s.end_time) - timeToMinutes(s.start_time)
  )

  // Month to date, and a like-for-like comparison (same weekdays, four weeks earlier)
  const monthRevenue = revenueBetween(monthStart, todayKey)
  const yesterday = addDays(todayKey, -1)
  const change =
    yesterday >= monthStart
      ? percentChange(revenueBetween(monthStart, yesterday), revenueBetween(addDays(monthStart, -28), addDays(yesterday, -28)))
      : null

  // Clients
  const recentVisitors = new Set(
    (await listAppointmentsByLocalDate(ctx, timezone, { from: addDays(todayKey, -89), to: todayKey }))
      .filter((a) => a.status === "COMPLETED")
      .map((a) => a.client_id)
  )
  const newThisMonth = directory.clients.filter((c) => dateKeyInZone(c.created_at, timezone) >= monthStart).length

  // Running totals over the last 30 days
  const runningTotals: DashboardOverview["runningTotals"] = []
  let revenueTotal = 0
  let expenseTotal = 0
  for (let key = windowStart; key <= todayKey; key = addDays(key, 1)) {
    revenueTotal += sum(completed.filter((p) => p.payment_date === key), (p) => p.amount)
    expenseTotal += sum(expenses.filter((e) => e.expense_date === key), (e) => e.amount)
    runningTotals.push({ date: key, revenue: revenueTotal, expenses: canSeeExpenses ? expenseTotal : null })
  }

  // Top earners over the last 30 days
  let topEarners: DashboardOverview["topEarners"] = null
  if (hasFeature(ctx.plan, "revenueAnalytics")) {
    const totals = new Map<string, { total: number; sessions: number }>()
    for (const p of completed) {
      if (p.payment_date < windowStart || !directory.user(p.staff_id)?.is_bookable) continue
      const row = totals.get(p.staff_id) ?? { total: 0, sessions: 0 }
      row.total += p.amount
      if (p.appointment_id) row.sessions += 1
      totals.set(p.staff_id, row)
    }
    topEarners = [...totals.entries()]
      .map(([staffId, row]) => ({ staffId, name: directory.userName(staffId), ...row }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }

  // Visits this week (Mon-Sun), booked or completed
  const weekVisits = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return {
      date,
      visits: appointments.filter(
        (a) => localDate.get(a.id) === date && (a.status === "COMPLETED" || a.status === "SCHEDULED")
      ).length,
    }
  })

  const upcoming = appointments
    .filter((a) => a.status === "SCHEDULED" && Date.parse(a.scheduled_at) >= now.getTime())
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      scheduled_at: a.scheduled_at,
      clientName: directory.clientName(a.client_id),
      staffName: directory.userName(a.staff_id),
      serviceName: directory.serviceName(a.service_id),
      status: a.status,
    }))

  return {
    timezone,
    todayKey,
    today: {
      collected: revenueBetween(todayKey, todayKey),
      stillBooked: sum(upcomingToday, (a) => directory.service(a.service_id)?.default_price ?? 0),
      appointments: live.length,
      completed: live.filter((a) => a.status === "COMPLETED").length,
      inProgress: live.filter((a) => a.status === "SCHEDULED").length - upcomingToday.length,
      remaining: upcomingToday.length,
      utilization: scheduledMinutes > 0 ? Math.round((sum(live, (a) => a.duration_minutes) / scheduledMinutes) * 100) : null,
    },
    month: { revenue: monthRevenue, change },
    clients: { active: recentVisitors.size, total: directory.clients.length, newThisMonth },
    runningTotals,
    topEarners,
    weekVisits,
    upcoming,
  }
}

