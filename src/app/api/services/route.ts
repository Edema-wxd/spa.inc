import { starterServicesSchema } from "@/lib/validation/services"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, route } from "@/server/http"
import { createServices, listServices } from "@/server/services/catalog"

export const GET = route(async () => ok(await listServices(await getRequestContext())))

/** Adds one or more treatments: `{ services: [...] }` (the onboarding starter menu sends several). */
export const POST = route(async (request) => {
  const { services } = await parseBody(request, starterServicesSchema)
  const rows = await createServices(await getRequestContext(), services)
  return created(rows, `Added ${rows.length} treatment${rows.length === 1 ? "" : "s"}`)
})
