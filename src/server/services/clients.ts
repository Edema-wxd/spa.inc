import "server-only"

import type { ClientInput, ClientUpdateInput } from "@/lib/validation/clients"
import type { RequestContext } from "@/server/context"
import { assertCanAdd } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"

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
