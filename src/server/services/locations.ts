import "server-only"

import type { LocationInput } from "@/lib/validation/locations"
import type { RequestContext } from "@/server/context"
import { assertCanAdd, assertRole } from "@/server/entitlements"
import { getRepositories } from "@/server/repositories"

export async function listLocations(ctx: RequestContext) {
  const { locations } = await getRepositories()
  return locations.list(ctx.organizationId)
}

/** Only Enterprise allows more than one location. */
export async function createLocation(ctx: RequestContext, input: LocationInput) {
  assertRole(ctx, "ADMIN")
  const { locations } = await getRepositories()
  assertCanAdd(ctx, "locations", await locations.count(ctx.organizationId))
  return locations.create(ctx.organizationId, input)
}
