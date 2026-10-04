import { clientSchema } from "@/lib/validation/clients"
import { getRequestContext } from "@/server/context"
import { created, ok, parseBody, route } from "@/server/http"
import { createClient, listClients } from "@/server/services/clients"

export const GET = route(async (request) => {
  const search = new URL(request.url).searchParams.get("search") ?? undefined
  return ok(await listClients(await getRequestContext(), search))
})

export const POST = route(async (request) => {
  const input = await parseBody(request, clientSchema)
  return created(await createClient(await getRequestContext(), input), "Client created")
})
