import { locationSchema } from "@/lib/validation/locations"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, route } from "@/server/http"
import { createLocation, listLocations } from "@/server/services/locations"

export const GET = route(async () => ok(await listLocations(await getRequestContext())))

export const POST = route(async (request) => {
  const input = await parseBody(request, locationSchema)
  return created(await createLocation(await getRequestContext(), input), "Location created")
})
