import "server-only"

import type { ClientInput, ClientUpdateInput } from "@/lib/validation/clients"
import type { RequestContext } from "@/server/context"
import { assertCanAdd } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"
import { getBusinessClock, getDirectory } from "@/server/services/business"
import type { Appointment, Client } from "@/types"
import { dateKeyInZone } from "@/lib/time"

export async function listClients(ctx: RequestContext, search?: string) {
  const { clients } = await getRepositories()
  return clients.list(ctx.organizationId, { search })
}

export async function getClient(ctx: RequestContext, id: string) {
  const { clients } = await getRepositories()
  const client = await clients.get(ctx.organizationId, id)
  if (!client) throw new NotFoundError("Client")
  return client
}

export async function getClientHistory(ctx: RequestContext, id: string) {
  await getClient(ctx, id)
  const { appointments, payments } = await getRepositories()
  const [visits, clientPayments] = await Promise.all([
    appointments.list(ctx.organizationId, { clientId: id }),
    payments.list(ctx.organizationId, { clientId: id }),
  ])
  return {
    appointments: visits.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    payments: clientPayments.sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
  }
}

export async function createClient(ctx: RequestContext, input: ClientInput) {
  const { clients } = await getRepositories()
  assertCanAdd(ctx, "clients", await clients.count(ctx.organizationId))
  return clients.create(ctx.organizationId, input)
}

export async function updateClient(ctx: RequestContext, id: string, input: ClientUpdateInput) {
  const { clients } = await getRepositories()
  const client = await clients.update(ctx.organizationId, id, input)
  if (!client) throw new NotFoundError("Client")
  return client
}

export async function deleteClient(ctx: RequestContext, id: string) {
  const { clients } = await getRepositories()
  if (!(await clients.delete(ctx.organizationId, id))) throw new NotFoundError("Client")
}

// ---------------------------------------------------------------------------
// Directory rows and profiles
// ---------------------------------------------------------------------------

export type ClientStatus = "NEW" | "ACTIVE" | "LAPSED"

export interface ClientRow extends Client {
  total_visits: number
  total_spent: number
  /** Business-local dates, "yyyy-MM-dd" */
  last_visit: string | null
  next_visit: string | null
  status: ClientStatus
}

/** Days without a completed visit before a client counts as lapsed. */
const LAPSED_AFTER_DAYS = 90

function statusFor(lastVisit: string | null, now: number): ClientStatus {
  if (!lastVisit) return "NEW"
  return now - Date.parse(lastVisit) > LAPSED_AFTER_DAYS * 86_400_000 ? "LAPSED" : "ACTIVE"
}

export async function listClientRows(ctx: RequestContext, search?: string): Promise<ClientRow[]> {
  const repos = await getRepositories()
  const [clients, appointments, payments, clock] = await Promise.all([
    repos.clients.list(ctx.organizationId, { search }),
    repos.appointments.list(ctx.organizationId),
    repos.payments.list(ctx.organizationId),
    getBusinessClock(ctx),
  ])
  const now = Date.now()
  const stats = new Map<string, { visits: number; spent: number; last: string | null; next: string | null }>()
  const get = (id: string) => {
    let row = stats.get(id)
    if (!row) stats.set(id, (row = { visits: 0, spent: 0, last: null, next: null }))
    return row
  }
  for (const a of appointments) {
    const row = get(a.client_id)
    if (a.status === "COMPLETED") {
      row.visits += 1
      if (!row.last || a.scheduled_at > row.last) row.last = a.scheduled_at
    } else if (a.status === "SCHEDULED" && Date.parse(a.scheduled_at) > now) {
      if (!row.next || a.scheduled_at < row.next) row.next = a.scheduled_at
    }
  }
  for (const p of payments) if (p.status === "COMPLETED") get(p.client_id).spent += p.amount

  return clients.map((c) => {
    const row = get(c.id)
    return {
      ...c,
      total_visits: row.visits,
      total_spent: row.spent,
      last_visit: row.last && dateKeyInZone(row.last, clock.timezone),
      next_visit: row.next && dateKeyInZone(row.next, clock.timezone),
      status: statusFor(row.last, now),
    }
  })
}

export interface ClientVisit {
  id: string
  scheduled_at: string
  status: Appointment["status"]
  service_name: string
  staff_name: string
  duration_minutes: number
  amount_paid: number | null
  satisfaction_rating: number | null
  notes: string
  location_type: Appointment["location_type"]
}

export async function getClientProfile(ctx: RequestContext, id: string) {
  const client = await getClient(ctx, id)
  const [history, directory, clock] = await Promise.all([
    getClientHistory(ctx, id),
    getDirectory(ctx),
    getBusinessClock(ctx),
  ])
  const paidByAppointment = new Map<string, number>()
  for (const p of history.payments) {
    if (p.status === "COMPLETED" && p.appointment_id) {
      paidByAppointment.set(p.appointment_id, (paidByAppointment.get(p.appointment_id) ?? 0) + p.amount)
    }
  }
  const visits: ClientVisit[] = history.appointments.map((a) => ({
    id: a.id,
    scheduled_at: a.scheduled_at,
    status: a.status,
    service_name: directory.serviceName(a.service_id),
    staff_name: directory.userName(a.staff_id),
    duration_minutes: a.duration_minutes,
    amount_paid: paidByAppointment.get(a.id) ?? null,
    satisfaction_rating: a.satisfaction_rating,
    notes: a.notes,
    location_type: a.location_type,
  }))

  const now = Date.now()
  const completed = history.appointments.filter((a) => a.status === "COMPLETED")
  const spent = history.payments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0)
  const ratings = completed.map((a) => a.satisfaction_rating).filter((r): r is number => r !== null)
  const lastVisit = completed[0]?.scheduled_at ?? null

  return {
    client,
    timezone: clock.timezone,
    upcoming: visits.filter((v) => v.status === "SCHEDULED" && Date.parse(v.scheduled_at) > now).reverse(),
    past: visits.filter((v) => !(v.status === "SCHEDULED" && Date.parse(v.scheduled_at) > now)),
    stats: {
      visits: completed.length,
      spent,
      averagePerVisit: completed.length ? Math.round(spent / completed.length) : 0,
      averageRating: ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
      noShows: history.appointments.filter((a) => a.status === "NO_SHOW").length,
      lastVisit,
      status: statusFor(lastVisit, now),
    },
  }
}
