import "server-only"

import { addDays, dateKeyInZone, minutesInZone, type DateKey } from "@/lib/time"
import type { Appointment, Client, Service, User } from "@/types"
import type { RequestContext } from "@/server/context"
import { getRepositories } from "@/server/repositories"

/**
 * "Now" as the spa sees it. Every service that buckets by day, decides what
 * "today" means, or checks working hours uses the location's timezone rather
 * than the server's clock.
 */
export interface BusinessClock {
  timezone: string
  now: Date
  todayKey: DateKey
  nowMinutes: number
}

export async function getBusinessClock(ctx: RequestContext): Promise<BusinessClock> {
  const { locations } = await getRepositories()
  const list = await locations.list(ctx.organizationId)
  const timezone = (list.find((l) => l.is_active) ?? list[0])?.timezone ?? "UTC"
  const now = new Date()
  return {
    timezone,
    now,
    todayKey: dateKeyInZone(now, timezone),
    nowMinutes: minutesInZone(now, timezone),
  }
}

/**
 * Appointments whose local (business timezone) date falls in [from, to].
 * Repositories filter by UTC date, so the query is padded by a day on each
 * side and trimmed here.
 */
export async function listAppointmentsByLocalDate(
  ctx: RequestContext,
  timezone: string,
  filter: { from?: DateKey; to?: DateKey; staffId?: string; clientId?: string } = {}
): Promise<Appointment[]> {
  const { appointments } = await getRepositories()
  const rows = await appointments.list(ctx.organizationId, {
    from: filter.from && addDays(filter.from, -1),
    to: filter.to && addDays(filter.to, 1),
    staffId: filter.staffId,
    clientId: filter.clientId,
  })
  if (!filter.from && !filter.to) return rows
  return rows.filter((a) => {
    const key = dateKeyInZone(a.scheduled_at, timezone)
    return (!filter.from || key >= filter.from) && (!filter.to || key <= filter.to)
  })
}

/** Name lookups used to enrich rows for display. */
export async function getDirectory(ctx: RequestContext) {
  const repos = await getRepositories()
  const [users, clients, services] = await Promise.all([
    repos.users.list(ctx.organizationId),
    repos.clients.list(ctx.organizationId),
    repos.services.list(ctx.organizationId),
  ])
  const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]))
  const userById: Map<string, User> = byId(users)
  const clientById: Map<string, Client> = byId(clients)
  const serviceById: Map<string, Service> = byId(services)
  return {
    users,
    clients,
    services,
    userName: (id: string) => userById.get(id)?.full_name ?? "Former team member",
    clientName: (id: string) => clientById.get(id)?.full_name ?? "Deleted client",
    serviceName: (id: string | undefined) => (id && serviceById.get(id)?.name) || "Other",
    service: (id: string) => serviceById.get(id),
    client: (id: string) => clientById.get(id),
    user: (id: string) => userById.get(id),
  }
}

/** Percent change from `previous` to `current`, or null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0)
}
