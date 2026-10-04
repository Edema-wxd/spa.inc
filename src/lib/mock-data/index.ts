import { users as seedUsers } from "./users"
import { clients as seedClients } from "./clients"
import { services as seedServices } from "./services"
import { appointments as seedAppointments } from "./appointments"
import { payments as seedPayments } from "./payments"
import { expenses as seedExpenses } from "./expenses"
import { schedules as seedSchedules } from "./schedules"
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subDays,
  subMonths,
  format,
  isSameDay,
  parseISO,
  eachDayOfInterval,
} from "date-fns"

// ---------------------------------------------------------------------------
// Demo data
//
// Set NEXT_PUBLIC_DEMO_EMPTY=true to start with no data at all (and none of
// the hardcoded fallbacks below), which is how the empty states are tested.
// ---------------------------------------------------------------------------

export const DEMO_EMPTY = process.env.NEXT_PUBLIC_DEMO_EMPTY === "true"

/** Fallback demo numbers apply only when the dataset has data at all. */
const useFallbacks = !DEMO_EMPTY

export const users = DEMO_EMPTY ? [] : seedUsers
export const clients = DEMO_EMPTY ? [] : seedClients
export const services = DEMO_EMPTY ? [] : seedServices
export const appointments = DEMO_EMPTY ? [] : seedAppointments
export const payments = DEMO_EMPTY ? [] : seedPayments
export const expenses = DEMO_EMPTY ? [] : seedExpenses
export const schedules = DEMO_EMPTY ? [] : seedSchedules

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getClientById(id: string) {
  return clients.find((c) => c.id === id)
}

export function getStaffById(id: string) {
  return users.find((u) => u.id === id)
}

export function getServiceById(id: string) {
  return services.find((s) => s.id === id)
}

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

export function getTodaysRevenue(): number {
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const total = payments
    .filter(
      (p) =>
        p.status === "COMPLETED" &&
        isWithinInterval(parseISO(p.payment_date), {
          start: todayStart,
          end: todayEnd,
        })
    )
    .reduce((sum, p) => sum + p.amount, 0)

  // Fallback for demo if no payments land on "today"
  return total > 0 || !useFallbacks ? total : 284700
}

export function getMonthlyRevenue(): number {
  const today = new Date()
  const monthStart = startOfMonth(today)

  const total = payments
    .filter(
      (p) =>
        p.status === "COMPLETED" &&
        isWithinInterval(parseISO(p.payment_date), {
          start: monthStart,
          end: today,
        })
    )
    .reduce((sum, p) => sum + p.amount, 0)

  return total > 0 || !useFallbacks ? total : 1847500
}

export function getActiveClientCount(): number {
  return clients.length
}

export function getTodaysAppointments() {
  const today = new Date()

  const todayApts = appointments.filter((a) =>
    isSameDay(parseISO(a.scheduled_at), today)
  )

  // If no appointments on today, return the next day that has appointments
  if (todayApts.length === 0 && useFallbacks) {
    // Find the nearest future appointments for demo purposes
    const futureApts = appointments
      .filter((a) => a.status === "SCHEDULED")
      .slice(0, 8)

    if (futureApts.length > 0) return futureApts

    // Fallback: return most recent 8 appointments
    return appointments.slice(0, 8)
  }

  return todayApts
}

export function getDailyCosts(): number {
  const today = new Date()

  // Get today's expenses
  const todayExpenses = expenses.filter((e) =>
    isSameDay(parseISO(e.expense_date), today)
  )

  if (todayExpenses.length > 0) {
    return todayExpenses.reduce((sum, e) => sum + e.amount, 0)
  }

  // Fallback: average daily cost over last 30 days
  const thirtyDaysAgo = subDays(today, 30)
  const recentExpenses = expenses.filter((e) =>
    isWithinInterval(parseISO(e.expense_date), {
      start: thirtyDaysAgo,
      end: today,
    })
  )

  const totalRecent = recentExpenses.reduce((sum, e) => sum + e.amount, 0)
  const avg = Math.round(totalRecent / 30)
  return avg > 0 || !useFallbacks ? avg : 142300
}

// ---------------------------------------------------------------------------
// Chart data helpers
// ---------------------------------------------------------------------------

export function getRevenueVsExpenses(days: number) {
  const today = new Date()
  const result: { date: string; revenue: number; expenses: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(today, i)
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    const dateStr = format(day, "MMM dd")

    const dayRevenue = payments
      .filter(
        (p) =>
          p.status === "COMPLETED" &&
          isWithinInterval(parseISO(p.payment_date), {
            start: dayStart,
            end: dayEnd,
          })
      )
      .reduce((sum, p) => sum + p.amount, 0)

    const dayExpenses = expenses
      .filter((e) =>
        isSameDay(parseISO(e.expense_date), day)
      )
      .reduce((sum, e) => sum + e.amount, 0)

    result.push({ date: dateStr, revenue: dayRevenue, expenses: dayExpenses })
  }

  // If all zeros, generate demo fallback data
  const hasData = result.some((r) => r.revenue > 0 || r.expenses > 0)
  if (!hasData && useFallbacks) {
    return result.map((r, i) => ({
      ...r,
      revenue: 150000 + ((i * 17 + 3) % 15) * 20000,
      expenses: 80000 + ((i * 11 + 7) % 10) * 15000,
    }))
  }

  return result
}

export function getTopEarners(count: number) {
  const staffEarnings: Record<string, number> = {}

  // Sum up payments per staff
  payments
    .filter((p) => p.status === "COMPLETED")
    .forEach((p) => {
      staffEarnings[p.staff_id] =
        (staffEarnings[p.staff_id] || 0) + p.amount
    })

  const sorted = Object.entries(staffEarnings)
    .map(([staffId, total]) => {
      const user = users.find((u) => u.id === staffId)
      return {
        staffId,
        name: user?.full_name || staffId,
        total,
        appointmentCount: appointments.filter(
          (a) => a.staff_id === staffId && a.status === "COMPLETED"
        ).length,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, count)

  // Fallback if empty
  if (sorted.length === 0 && useFallbacks) {
    const activeStaff = users.filter(
      (u) => u.role === "STAFF" && u.is_active
    )
    return activeStaff.slice(0, count).map((u, i) => ({
      staffId: u.id,
      name: u.full_name,
      total: 450000 - i * 45000,
      appointmentCount: 30 - i * 3,
    }))
  }

  return sorted
}

export function getClientVisitsThisWeek() {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const result = daysOfWeek.map((day, index) => {
    const visitsOnDay = appointments.filter(
      (a) =>
        isSameDay(parseISO(a.scheduled_at), day) &&
        (a.status === "COMPLETED" || a.status === "SCHEDULED")
    ).length

    return {
      day: dayNames[index],
      visits: visitsOnDay,
    }
  })

  // Fallback if all zeros
  const hasData = result.some((r) => r.visits > 0)
  if (!hasData && useFallbacks) {
    const fallbackVisits = [12, 15, 11, 18, 14, 8, 3]
    return result.map((r, i) => ({
      ...r,
      visits: fallbackVisits[i],
    }))
  }

  return result
}

export function getUpcomingAppointments(count: number) {
  const now = new Date()

  const upcoming = appointments
    .filter(
      (a) =>
        a.status === "SCHEDULED" && parseISO(a.scheduled_at).getTime() >= now.getTime()
    )
    .sort(
      (a, b) =>
        parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime()
    )
    .slice(0, count)

  // Enrich with names
  return upcoming.map((a) => ({
    ...a,
    clientName: getClientById(a.client_id)?.full_name || "Unknown Client",
    staffName: getStaffById(a.staff_id)?.full_name || "Unknown Staff",
    serviceName: getServiceById(a.service_id)?.name || "Unknown Service",
  }))
}

// ---------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------

export function getRevenueByService() {
  const revenueMap: Record<string, number> = {}

  payments
    .filter((p) => p.status === "COMPLETED" && p.appointment_id)
    .forEach((p) => {
      const apt = appointments.find((a) => a.id === p.appointment_id)
      if (apt) {
        const service = services.find((s) => s.id === apt.service_id)
        const name = service?.name || "Other"
        revenueMap[name] = (revenueMap[name] || 0) + p.amount
      }
    })

  const result = Object.entries(revenueMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  // Fallback
  if (result.length === 0 && useFallbacks) {
    return services.map((s, i) => ({
      name: s.name,
      revenue: 250000 - i * 20000,
    }))
  }

  return result
}

export function getRevenueByStaff() {
  const revenueMap: Record<string, number> = {}

  payments
    .filter((p) => p.status === "COMPLETED")
    .forEach((p) => {
      const user = users.find((u) => u.id === p.staff_id)
      const name = user?.full_name || p.staff_id
      revenueMap[name] = (revenueMap[name] || 0) + p.amount
    })

  const result = Object.entries(revenueMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  if (result.length === 0 && useFallbacks) {
    const activeStaff = users.filter(
      (u) => u.role === "STAFF" && u.is_active
    )
    return activeStaff.map((u, i) => ({
      name: u.full_name,
      revenue: 450000 - i * 45000,
    }))
  }

  return result
}

export function getRevenueByMethod() {
  const methodMap: Record<string, number> = {}

  payments
    .filter((p) => p.status === "COMPLETED")
    .forEach((p) => {
      methodMap[p.payment_method] =
        (methodMap[p.payment_method] || 0) + p.amount
    })

  const result = Object.entries(methodMap)
    .map(([method, revenue]) => ({ method, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  if (result.length === 0 && useFallbacks) {
    return [
      { method: "CARD", revenue: 850000 },
      { method: "CASH", revenue: 420000 },
      { method: "TRANSFER", revenue: 380000 },
      { method: "OTHER", revenue: 95000 },
    ]
  }

  return result
}

export function getMonthlyRevenueTrend(months: number) {
  const today = new Date()
  const result: { month: string; revenue: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(today, i)
    const monthStart = startOfMonth(monthDate)
    const monthEnd =
      i === 0
        ? today
        : startOfMonth(subMonths(today, i - 1))

    const monthRevenue = payments
      .filter(
        (p) =>
          p.status === "COMPLETED" &&
          isWithinInterval(parseISO(p.payment_date), {
            start: monthStart,
            end: monthEnd,
          })
      )
      .reduce((sum, p) => sum + p.amount, 0)

    result.push({
      month: format(monthDate, "MMM yyyy"),
      revenue: monthRevenue,
    })
  }

  // Fallback
  const hasData = result.some((r) => r.revenue > 0)
  if (!hasData && useFallbacks) {
    return result.map((r, i) => ({
      ...r,
      revenue: 1200000 + ((i * 13 + 5) % 8) * 150000,
    }))
  }

  return result
}

export function getExpensesByCategory() {
  const categoryMap: Record<string, number> = {}

  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount
  })

  const result = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  if (result.length === 0 && useFallbacks) {
    return [
      { category: "PAYROLL", total: 2800000 },
      { category: "RENT", total: 1050000 },
      { category: "SUPPLIES", total: 150000 },
      { category: "UTILITIES", total: 120000 },
      { category: "EQUIPMENT", total: 180000 },
      { category: "MARKETING", total: 120000 },
      { category: "OTHER", total: 80000 },
    ]
  }

  return result
}

export function getStaffLeaderboard() {
  const activeStaff = users.filter(
    (u) => u.role === "STAFF" && u.is_active
  )

  const leaderboard = activeStaff.map((staff) => {
    const staffAppointments = appointments.filter(
      (a) => a.staff_id === staff.id
    )
    const completed = staffAppointments.filter(
      (a) => a.status === "COMPLETED"
    )
    const totalRevenue = payments
      .filter((p) => p.staff_id === staff.id && p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0)

    const ratings = completed
      .filter((a) => a.satisfaction_rating !== null)
      .map((a) => a.satisfaction_rating as number)
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
        : 4.5

    return {
      staffId: staff.id,
      name: staff.full_name,
      totalAppointments: staffAppointments.length,
      completedAppointments: completed.length,
      totalRevenue,
      averageRating: avgRating,
      cancelRate:
        staffAppointments.length > 0
          ? Math.round(
              (staffAppointments.filter((a) => a.status === "CANCELLED").length /
                staffAppointments.length) *
                100
            )
          : 0,
    }
  })

  return leaderboard.sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export function getPnLData(months: number) {
  const today = new Date()
  const result: {
    month: string
    revenue: number
    expenses: number
    profit: number
  }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(today, i)
    const monthStart = startOfMonth(monthDate)
    const monthEnd =
      i === 0
        ? today
        : startOfMonth(subMonths(today, i - 1))

    const monthRevenue = payments
      .filter(
        (p) =>
          p.status === "COMPLETED" &&
          isWithinInterval(parseISO(p.payment_date), {
            start: monthStart,
            end: monthEnd,
          })
      )
      .reduce((sum, p) => sum + p.amount, 0)

    const monthExpenses = expenses
      .filter((e) =>
        isWithinInterval(parseISO(e.expense_date), {
          start: monthStart,
          end: monthEnd,
        })
      )
      .reduce((sum, e) => sum + e.amount, 0)

    result.push({
      month: format(monthDate, "MMM yyyy"),
      revenue: monthRevenue,
      expenses: monthExpenses,
      profit: monthRevenue - monthExpenses,
    })
  }

  // Fallback
  const hasData = result.some((r) => r.revenue > 0 || r.expenses > 0)
  if (!hasData && useFallbacks) {
    return result.map((r, i) => {
      const rev = 1200000 + ((i * 13 + 5) % 8) * 150000
      const exp = 800000 + ((i * 7 + 3) % 6) * 100000
      return {
        ...r,
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
      }
    })
  }

  return result
}
