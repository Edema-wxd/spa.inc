import { clientUpdateSchema } from "@/lib/validation/clients"
import { getRequestContext } from "@/server/context"
import { ok, parseBody, route } from "@/server/http"
import { deleteClient, getClient, updateClient } from "@/server/services/clients"

type Params = { id: string }

export const GET = route<Params>(async (_request, { params }) => {
  const { id } = await params
  return ok(await getClient(await getRequestContext(), id))
})

export const PUT = route<Params>(async (request, { params }) => {
  const { id } = await params
  const input = await parseBody(request, clientUpdateSchema)
  return ok(await updateClient(await getRequestContext(), id, input), "Client updated")
})

export const DELETE = route<Params>(async (_request, { params }) => {
  const { id } = await params
  await deleteClient(await getRequestContext(), id)
  return ok(null, "Client deleted")
})
