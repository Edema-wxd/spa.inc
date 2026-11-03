import "server-only"

import type { ScheduleInput, StaffUpdateInput, UserInviteInput } from "@/lib/validation/users"
import type { RequestContext } from "@/server/context"
import { assertCanAdd, assertFeature, assertRole } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock, getDirectory } from "@/server/services/business"
import { addDays, dateKeyInZone, startOfWeek } from "@/lib/time"
import type { User } from "@/types"

// Team members (Settings > Team). Admin seats are limited per plan.

export async function listTeam(ctx: RequestContext) {
  assertRole(ctx, "ADMIN")
  const { users } = await getRepositories()
  return users.list(ctx.organizationId)
}

export async function inviteUser(ctx: RequestContext, input: UserInviteInput) {
  assertRole(ctx, "ADMIN")
  const { users } = await getRepositories()
  if (input.role === "ADMIN") {
    assertCanAdd(ctx, "admins", await users.count(ctx.organizationId, { role: "ADMIN", activeOnly: true }))
  } else {
    assertFeature(ctx, "staffManagement")
  }
  // TODO: send the Supabase Auth invite email
  return users.create(ctx.organizationId, input)
}

// Staff (therapists). The staff module requires Manager or higher.

export async function listStaff(ctx: RequestContext) {
  assertFeature(ctx, "staffManagement")
  const { users } = await getRepositories()
  return users.list(ctx.organizationId, { role: "STAFF" })
}

export async function getStaff(ctx: RequestContext, id: string) {
  assertFeature(ctx, "staffManagement")
  const { users } = await getRepositories()
  const staff = await users.get(ctx.organizationId, id)
  if (!staff || staff.role !== "STAFF") throw new NotFoundError("Staff member")
  return staff
}

export async function createStaff(ctx: RequestContext, input: Omit<UserInviteInput, "role">) {
  return inviteUser(ctx, { ...input, role: "STAFF" })
}

export async function updateStaff(ctx: RequestContext, id: string, input: StaffUpdateInput) {
  assertRole(ctx, "ADMIN")
  await getStaff(ctx, id)
  const { users } = await getRepositories()
  return (await users.update(ctx.organizationId, id, input))!
}

export async function getStaffSchedule(ctx: RequestContext, id: string) {
  await getStaff(ctx, id)
  const { schedules } = await getRepositories()
  return schedules.listForStaff(ctx.organizationId, id)
}

export async function updateStaffSchedule(ctx: RequestContext, id: string, input: ScheduleInput) {
  assertRole(ctx, "ADMIN")
  await getStaff(ctx, id)
  const { schedules } = await getRepositories()
  return schedules.replaceForStaff(ctx.organizationId, id, input)
}

// ---------------------------------------------------------------------------
// Staff directory rows and profiles
// ---------------------------------------------------------------------------

export interface StaffRow extends User {
  sessions: number
  revenue: number
  rating: number | null
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : null
}

export async function listStaffRows(ctx: RequestContext): Promise<StaffRow[]> {
  const staff = await listStaff(ctx)
  const repos = await getRepositories()
  const [appointments, payments] = await Promise.all([
    repos.appointments.list(ctx.organizationId),
    repos.payments.list(ctx.organizationId),
  ])
  return staff.map((member) => {
    const completed = appointments.filter((a) => a.staff_id === member.id && a.status === "COMPLETED")
    return {
      ...member,
      sessions: completed.length,
      revenue: payments
        .filter((p) => p.staff_id === member.id && p.status === "COMPLETED")
        .reduce((s, p) => s + p.amount, 0),
      rating: average(completed.map((a) => a.satisfaction_rating).filter((r): r is number => r !== null)),
    }
  })
}

export async function getStaffProfile(ctx: RequestContext, id: string) {
  const staff = await getStaff(ctx, id)
  const repos = await getRepositories()
  const [appointments, payments, schedule, directory, clock] = await Promise.all([
    repos.appointments.list(ctx.organizationId, { staffId: id }),
    repos.payments.list(ctx.organizationId, { staffId: id }),
    repos.schedules.listForStaff(ctx.organizationId, id),
    getDirectory(ctx),
    getBusinessClock(ctx),
  ])

  const happened = appointments.filter((a) => a.status !== "SCHEDULED")
  const completed = happened.filter((a) => a.status === "COMPLETED")
  const paid = payments.filter((p) => p.status === "COMPLETED")
  const revenue = paid.reduce((s, p) => s + p.amount, 0)

  // Weekly revenue for the last 12 weeks (Monday starts)
  const thisWeek = startOfWeek(clock.todayKey)
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(thisWeek, -7 * (11 - i))
    const end = addDays(start, 6)
    return {
      week: start,
      revenue: paid.filter((p) => p.payment_date >= start && p.payment_date <= end).reduce((s, p) => s + p.amount, 0),
    }
  })

  // Clients served, most frequent first
  const byClient = new Map<string, { visits: number; lastVisit: string; spent: number }>()
  for (const a of completed) {
    const row = byClient.get(a.client_id) ?? { visits: 0, lastVisit: a.scheduled_at, spent: 0 }
    row.visits += 1
    if (a.scheduled_at > row.lastVisit) row.lastVisit = a.scheduled_at
    byClient.set(a.client_id, row)
  }
  for (const p of paid) {
    const row = byClient.get(p.client_id)
    if (row) row.spent += p.amount
  }
  const clients = [...byClient.entries()]
    .map(([clientId, row]) => ({
      clientId,
      clientName: directory.clientName(clientId),
      ...row,
      // Business-local date for display
      lastVisit: dateKeyInZone(row.lastVisit, clock.timezone),
    }))
    .sort((a, b) => b.visits - a.visits)

  return {
    staff,
    timezone: clock.timezone,
    schedule,
    weekly,
    clients,
    stats: {
      revenue,
      sessions: completed.length,
      averagePerSession: completed.length ? Math.round(revenue / completed.length) : 0,
      rating: average(completed.map((a) => a.satisfaction_rating).filter((r): r is number => r !== null)),
      cancelRate: happened.length
        ? Math.round((happened.filter((a) => a.status === "CANCELLED").length / happened.length) * 100)
        : 0,
      upcoming: appointments.filter((a) => a.status === "SCHEDULED" && Date.parse(a.scheduled_at) > Date.now()).length,
    },
  }
}
