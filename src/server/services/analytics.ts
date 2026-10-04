import "server-only"

import { format, parseISO, startOfMonth, subMonths } from "date-fns"
import type { RequestContext } from "@/server/context"
import { assertFeature, assertRole } from "@/server/entitlements"
import { getRepositories } from "@/server/repositories"
import type { DateRange } from "@/server/repositories/types"

/** Revenue broken down by service, staff member and payment method. Manager+. */
export async function getRevenueBreakdown(ctx: RequestContext, range: DateRange) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "revenueAnalytics")
  const repos = await getRepositories()
  const [payments, appointments, services, users] = await Promise.all([
    repos.payments.list(ctx.organizationId, range),
    repos.appointments.list(ctx.organizationId),
    repos.services.list(ctx.organizationId),
    repos.users.list(ctx.organizationId),
  ])

  const completed = payments.filter((p) => p.status === "COMPLETED")
  const appointmentById = new Map(appointments.map((a) => [a.id, a]))
  const serviceName = new Map(services.map((s) => [s.id, s.name]))
  const userName = new Map(users.map((u) => [u.id, u.full_name]))

  const add = (map: Map<string, number>, key: string, amount: number) =>
    map.set(key, (map.get(key) ?? 0) + amount)
  const byService = new Map<string, number>()
  const byStaff = new Map<string, number>()
  const byMethod = new Map<string, number>()

  for (const p of completed) {
    const serviceId = p.appointment_id ? appointmentById.get(p.appointment_id)?.service_id : undefined
    add(byService, (serviceId && serviceName.get(serviceId)) || "Other", p.amount)
    add(byStaff, userName.get(p.staff_id) ?? p.staff_id, p.amount)
    add(byMethod, p.payment_method, p.amount)
  }

  const toRows = (map: Map<string, number>) =>
    [...map.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue)

  return {
    total: completed.reduce((sum, p) => sum + p.amount, 0),
    byService: toRows(byService),
    byStaff: toRows(byStaff),
    byMethod: toRows(byMethod),
  }
}

/** Staff ranked by revenue, with sessions, ratings and cancel rate. Executive+. */
export async function getLeaderboard(ctx: RequestContext, range: DateRange) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "performanceLeaderboard")
  const repos = await getRepositories()
  const [staff, appointments, payments] = await Promise.all([
    repos.users.list(ctx.organizationId, { role: "STAFF", activeOnly: true }),
    repos.appointments.list(ctx.organizationId, range),
    repos.payments.list(ctx.organizationId, range),
  ])

  return staff
    .map((member) => {
      const own = appointments.filter((a) => a.staff_id === member.id)
      const completed = own.filter((a) => a.status === "COMPLETED")
      const ratings = completed
        .map((a) => a.satisfaction_rating)
        .filter((r): r is number => r !== null)
      const revenue = payments
        .filter((p) => p.staff_id === member.id && p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0)
      return {
        staffId: member.id,
        name: member.full_name,
        totalRevenue: revenue,
        totalAppointments: own.length,
        completedAppointments: completed.length,
        averageRevenuePerSession: completed.length ? Math.round(revenue / completed.length) : 0,
        averageRating: ratings.length
          ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
          : null,
        cancelRate: own.length
          ? Math.round((own.filter((a) => a.status === "CANCELLED").length / own.length) * 100)
          : 0,
      }
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

/** Monthly revenue, expenses and profit for the last `months` months. Executive+. */
export async function getProfitAndLoss(ctx: RequestContext, months: number) {
  assertRole(ctx, "ADMIN")
  assertFeature(ctx, "profitAndLoss")
  const repos = await getRepositories()
  const from = format(startOfMonth(subMonths(new Date(), months - 1)), "yyyy-MM-dd")
  const [payments, expenses] = await Promise.all([
    repos.payments.list(ctx.organizationId, { from }),
    repos.expenses.list(ctx.organizationId, { from }),
  ])

  const rows = new Map<string, { revenue: number; expenses: number }>()
  for (let i = months - 1; i >= 0; i--) {
    rows.set(format(subMonths(new Date(), i), "yyyy-MM"), { revenue: 0, expenses: 0 })
  }
  for (const p of payments) {
    if (p.status !== "COMPLETED") continue
    const row = rows.get(format(parseISO(p.payment_date), "yyyy-MM"))
    if (row) row.revenue += p.amount
  }
  for (const e of expenses) {
    const row = rows.get(format(parseISO(e.expense_date), "yyyy-MM"))
    if (row) row.expenses += e.amount
  }

  return [...rows.entries()].map(([month, { revenue, expenses: cost }]) => ({
    month,
    revenue,
    expenses: cost,
    profit: revenue - cost,
  }))
}
