import "server-only"

import type { ServiceInput } from "@/lib/validation/services"
import type { RequestContext } from "@/server/context"
import { assertRole } from "@/server/entitlements"
import { NotFoundError } from "@/server/errors"
import { getRepositories } from "@/server/repositories"

// The service menu: what clients can book and what it costs.

export async function listServices(ctx: RequestContext) {
  const { services } = await getRepositories()
  return (await services.list(ctx.organizationId)).sort(
    (a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name)
  )
}

export async function createServices(ctx: RequestContext, inputs: ServiceInput[]) {
  assertRole(ctx, "ADMIN")
  const { services } = await getRepositories()
  const created = []
  for (const input of inputs) created.push(await services.create(ctx.organizationId, input))
  return created
}

export async function updateService(ctx: RequestContext, id: string, input: Partial<ServiceInput>) {
  assertRole(ctx, "ADMIN")
  const { services } = await getRepositories()
  const service = await services.update(ctx.organizationId, id, input)
  if (!service) throw new NotFoundError("Service")
  return service
}
